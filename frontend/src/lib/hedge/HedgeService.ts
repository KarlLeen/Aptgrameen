import { MerkleService } from '../merkle/MerkleService';
import { EventTracker } from '../analytics/EventTracker';
import { SmartCache } from '../cache/SmartCache';
import { RateLimiter } from '../rate-limiter/RateLimiter';

interface HedgeConfig {
    creditScoreThreshold: number;    // 触发对冲的信用分阈值
    hedgeRatio: number;             // 对冲比率
    maxHedgeAmount: number;         // 最大对冲金额
    minCreditScoreToClose: number;  // 平仓的最小信用分
    rebalanceInterval: number;      // 重新平衡间隔（毫秒）
}

interface HedgePosition {
    id: string;
    openPrice: number;
    amount: number;
    timestamp: number;
    creditScore: number;
    status: 'open' | 'closed';
    pnl?: number;
}

export class HedgeService {
    private static instance: HedgeService;
    private merkleService: MerkleService;
    private eventTracker: EventTracker;
    private cache: SmartCache;
    private rateLimiter: RateLimiter;
    private config: HedgeConfig;
    private positions: Map<string, HedgePosition>;
    private rebalanceTimer: NodeJS.Timeout | null;

    private constructor(
        merkleService: MerkleService,
        config: HedgeConfig
    ) {
        this.merkleService = merkleService;
        this.eventTracker = EventTracker.getInstance();
        this.cache = SmartCache.getInstance();
        this.rateLimiter = RateLimiter.getInstance();
        this.config = config;
        this.positions = new Map();
        this.rebalanceTimer = null;
        this.startRebalancing();
    }

    public static getInstance(
        merkleService: MerkleService,
        config: HedgeConfig = {
            creditScoreThreshold: 600,
            hedgeRatio: 0.5,
            maxHedgeAmount: 100000,
            minCreditScoreToClose: 700,
            rebalanceInterval: 60000 // 1分钟
        }
    ): HedgeService {
        if (!HedgeService.instance) {
            HedgeService.instance = new HedgeService(merkleService, config);
        }
        return HedgeService.instance;
    }

    public async evaluateAndHedge(
        borrowerId: string,
        creditScore: number,
        loanAmount: number
    ): Promise<void> {
        try {
            // 检查是否需要对冲
            if (creditScore > this.config.creditScoreThreshold) {
                return;
            }

            // 检查限流
            const canProceed = await this.rateLimiter.acquire('hedge', 1);
            if (!canProceed) {
                throw new Error('Rate limit exceeded for hedge operations');
            }

            // 计算对冲金额
            const hedgeAmount = this.calculateHedgeAmount(loanAmount, creditScore);
            
            // 获取当前ETH价格
            const ethPrice = await this.getETHPrice();

            // 执行对冲交易
            const order = {
                symbol: 'ETH/USDC',
                side: 'sell',
                amount: hedgeAmount / ethPrice,
                type: 'market'
            };

            const result = await this.merkleService.executeMarketOrder(order);

            // 记录对冲位置
            const position: HedgePosition = {
                id: `hedge_${Date.now()}_${borrowerId}`,
                openPrice: ethPrice,
                amount: hedgeAmount,
                timestamp: Date.now(),
                creditScore: creditScore,
                status: 'open'
            };

            this.positions.set(position.id, position);

            // 记录事件
            this.eventTracker.trackEvent('hedge', 'open_position', 'success', hedgeAmount, {
                borrowerId,
                creditScore,
                ethPrice
            });

        } catch (error) {
            this.eventTracker.trackEvent('hedge', 'open_position', 'error', 0, {
                borrowerId,
                creditScore,
                error: error.message
            });
            throw error;
        }
    }

    private calculateHedgeAmount(loanAmount: number, creditScore: number): number {
        // 根据信用分计算对冲比率的调整因子
        const scoreAdjustment = (this.config.creditScoreThreshold - creditScore) / 
                               this.config.creditScoreThreshold;
        
        // 计算基础对冲金额
        let hedgeAmount = loanAmount * this.config.hedgeRatio * scoreAdjustment;

        // 确保不超过最大对冲金额
        hedgeAmount = Math.min(hedgeAmount, this.config.maxHedgeAmount);

        return hedgeAmount;
    }

    private async getETHPrice(): Promise<number> {
        // 先检查缓存
        const cachedPrice = this.cache.get('ETH/USDC_price');
        if (cachedPrice) {
            return cachedPrice;
        }

        // 获取实时价格
        const price = await this.merkleService.getPrice('ETH/USDC');
        this.cache.set('ETH/USDC_price', price, { maxAge: 10000 }); // 10秒缓存
        return price;
    }

    private async closePosition(
        positionId: string,
        currentCreditScore: number
    ): Promise<void> {
        const position = this.positions.get(positionId);
        if (!position || position.status === 'closed') {
            return;
        }

        try {
            // 获取当前价格
            const currentPrice = await this.getETHPrice();

            // 执行平仓交易
            const order = {
                symbol: 'ETH/USDC',
                side: 'buy', // 买入平仓
                amount: position.amount / position.openPrice,
                type: 'market'
            };

            await this.merkleService.executeMarketOrder(order);

            // 计算盈亏
            const pnl = position.amount * (1 - currentPrice / position.openPrice);

            // 更新位置状态
            position.status = 'closed';
            position.pnl = pnl;

            // 记录事件
            this.eventTracker.trackEvent('hedge', 'close_position', 'success', pnl, {
                positionId,
                openPrice: position.openPrice,
                closePrice: currentPrice,
                creditScore: currentCreditScore
            });

        } catch (error) {
            this.eventTracker.trackEvent('hedge', 'close_position', 'error', 0, {
                positionId,
                error: error.message
            });
            throw error;
        }
    }

    private startRebalancing(): void {
        if (this.rebalanceTimer) {
            clearInterval(this.rebalanceTimer);
        }

        this.rebalanceTimer = setInterval(
            async () => {
                try {
                    await this.rebalancePositions();
                } catch (error) {
                    console.error('Rebalancing error:', error);
                }
            },
            this.config.rebalanceInterval
        );
    }

    private async rebalancePositions(): Promise<void> {
        for (const [id, position] of this.positions.entries()) {
            if (position.status === 'closed') continue;

            try {
                // 获取最新信用分
                const currentCreditScore = await this.getCurrentCreditScore(id);

                // 如果信用分恢复，关闭对冲位置
                if (currentCreditScore >= this.config.minCreditScoreToClose) {
                    await this.closePosition(id, currentCreditScore);
                }
                // 如果信用分进一步下降，可能需要增加对冲金额
                else if (currentCreditScore < position.creditScore) {
                    await this.adjustHedgePosition(id, currentCreditScore);
                }
            } catch (error) {
                console.error(`Failed to rebalance position ${id}:`, error);
            }
        }
    }

    private async getCurrentCreditScore(positionId: string): Promise<number> {
        // 这里需要实现获取最新信用分的逻辑
        // 可以通过调用信用评分服务或查询链上数据
        return 0; // 临时返回值
    }

    private async adjustHedgePosition(
        positionId: string,
        newCreditScore: number
    ): Promise<void> {
        const position = this.positions.get(positionId);
        if (!position) return;

        // 计算需要调整的金额
        const currentHedgeAmount = position.amount;
        const newHedgeAmount = this.calculateHedgeAmount(
            currentHedgeAmount / this.config.hedgeRatio,
            newCreditScore
        );

        if (newHedgeAmount <= currentHedgeAmount) return;

        // 增加对冲金额
        const additionalAmount = newHedgeAmount - currentHedgeAmount;
        await this.evaluateAndHedge(
            positionId.split('_')[2], // borrowerId
            newCreditScore,
            additionalAmount
        );
    }

    public getPositions(): HedgePosition[] {
        return Array.from(this.positions.values());
    }

    public getConfig(): HedgeConfig {
        return { ...this.config };
    }

    public updateConfig(newConfig: Partial<HedgeConfig>): void {
        this.config = { ...this.config, ...newConfig };
        this.startRebalancing(); // 重启再平衡定时器
    }

    public destroy(): void {
        if (this.rebalanceTimer) {
            clearInterval(this.rebalanceTimer);
            this.rebalanceTimer = null;
        }
        this.positions.clear();
    }
}
