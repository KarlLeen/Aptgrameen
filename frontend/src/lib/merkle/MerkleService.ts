import { AptosClient, CoinClient, FaucetClient, Types } from 'aptos';
import { WebSocket } from 'ws';
import {
    MerkleConfig,
    MarketOrder,
    OrderResponse,
    PriceSubscription,
    PriceUpdate,
    RiskMetrics,
    LoanParameters,
    TestnetConfig
} from './types';

export class MerkleService {
    private static instance: MerkleService;
    private client?: MerkleClient;
    private aptosTokenService?: AptosTokenService;
    private ws: WebSocket | null = null;
    private priceSubscriptions: Map<string, PriceSubscription[]> = new Map();
    private config: MerkleConfig | TestnetConfig;
    private testnetPrices: Map<string, number> = new Map();
    private testnetUpdateInterval?: NodeJS.Timeout;

    private constructor(config: MerkleConfig | TestnetConfig) {
        this.config = config;
        
        if ('isTestnet' in config && config.isTestnet) {
            // 使用 Testnet 配置
            this.aptosTokenService = AptosTokenService.getInstance(
                config.nodeUrl,
                config.faucetUrl
            );
            this.initializeTestnet();
        } else {
            // 使用生产环境配置
            this.client = new MerkleClient({
                apiKey: (config as MerkleConfig).apiKey,
                apiSecret: (config as MerkleConfig).apiSecret,
                baseUrl: (config as MerkleConfig).restUrl
            });
        }
        this.initializeWebSocket();
    }

    public static getInstance(config: MerkleConfig): MerkleService {
        if (!MerkleService.instance) {
            MerkleService.instance = new MerkleService(config);
        }
        return MerkleService.instance;
    }

    private initializeWebSocket(): void {
        this.ws = new WebSocket(this.config.wsUrl);

        this.ws.on('open', () => {
            console.log('WebSocket connected');
            // 重新订阅所有价格订阅
            this.resubscribeAll();
        });

        this.ws.on('message', (data: string) => {
            try {
                const message = JSON.parse(data);
                if (message.type === 'price') {
                    this.handlePriceUpdate(message);
                }
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        });

        this.ws.on('close', () => {
            console.log('WebSocket disconnected, attempting to reconnect...');
            setTimeout(() => this.initializeWebSocket(), 5000);
        });

        this.ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });
    }

    private handlePriceUpdate(update: PriceUpdate): void {
        const subscribers = this.priceSubscriptions.get(update.pair) || [];
        subscribers.forEach(sub => sub.callback(update));
    }

    private resubscribeAll(): void {
        if (!this.ws) return;
        this.priceSubscriptions.forEach((_, pair) => {
            this.ws!.send(JSON.stringify({
                type: 'subscribe',
                channel: 'price',
                pair
            }));
        });
    }

    private async initializeTestnet(): Promise<void> {
        if (!this.aptosTokenService) return;

        // 初始化测试网价格
        const supportedTokens = this.aptosTokenService.getSupportedTokens();
        const baseTokens = supportedTokens.filter(t => t !== 'USDC');

        // 为每个基础代币设置对 USDC 的初始价格
        baseTokens.forEach(token => {
            const initialPrice = token === 'APT' ? 10 : 2000; // APT = $10, 其他代币 = $2000
            this.testnetPrices.set(`${token}/USDC`, initialPrice);
        });
        
        // 每 10 秒更新一次价格
        this.testnetUpdateInterval = setInterval(() => {
            this.updateTestnetPrices();
        }, 10000);
    }

    private updateTestnetPrices(): void {
        this.testnetPrices.forEach((price, pair) => {
            // 模拟价格波动，范围为当前价格的 ±5%
            const change = (Math.random() - 0.5) * 0.1 * price;
            const newPrice = price + change;
            this.testnetPrices.set(pair, newPrice);

            // 触发价格更新
            const subscribers = this.priceSubscriptions.get(pair) || [];
            subscribers.forEach(sub => sub.callback({
                pair,
                price: newPrice,
                timestamp: Date.now()
            }));
        });
    }

    public async getTokenBalance(account: string, symbol: string): Promise<bigint> {
        if ('isTestnet' in this.config && this.config.isTestnet && this.aptosTokenService) {
            return this.aptosTokenService.getTokenBalance(account, symbol);
        }
        throw new Error('Token balance check only available in testnet mode');
    }

    public async mintTestTokens(account: string, symbol: string, amount: number): Promise<string> {
        if ('isTestnet' in this.config && this.config.isTestnet && this.aptosTokenService) {
            return this.aptosTokenService.mintTestTokens(account, symbol, amount);
        }
        throw new Error('Token minting only available in testnet mode');
    }

    public async executeMarketOrder(order: MarketOrder): Promise<OrderResponse> {
        if ('isTestnet' in this.config && this.config.isTestnet) {
            // Testnet 环境下模拟订单执行
            const price = this.testnetPrices.get(order.symbol) || 0;
            const orderId = `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            
            return {
                orderId,
                status: 'filled',
                filledAmount: order.amount,
                avgPrice: price,
                timestamp: Date.now()
            };
        } else {
            try {
                const response = await this.client!.createOrder({
                    symbol: order.symbol,
                    side: order.side,
                    type: order.type,
                    quantity: order.amount,
                    price: order.price
                });

                return {
                    orderId: response.orderId,
                    status: response.status,
                    filledAmount: response.filledQuantity,
                    avgPrice: response.averagePrice,
                    timestamp: response.timestamp
                };
            } catch (error) {
                console.error('Failed to execute market order:', error);
                throw error;
            }
        }
    }

    public subscribeToPriceUpdates(subscription: PriceSubscription): void {
        const { pair } = subscription;
        const subscribers = this.priceSubscriptions.get(pair) || [];
        subscribers.push(subscription);
        this.priceSubscriptions.set(pair, subscribers);

        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'subscribe',
                channel: 'price',
                pair
            }));
        }
    }

    public unsubscribeFromPriceUpdates(pair: string, callback: Function): void {
        const subscribers = this.priceSubscriptions.get(pair) || [];
        const updatedSubscribers = subscribers.filter(sub => sub.callback !== callback);
        
        if (updatedSubscribers.length === 0) {
            this.priceSubscriptions.delete(pair);
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    type: 'unsubscribe',
                    channel: 'price',
                    pair
                }));
            }
        } else {
            this.priceSubscriptions.set(pair, updatedSubscribers);
        }
    }

    public async calculateRiskMetrics(asset: string): Promise<RiskMetrics> {
        if ('isTestnet' in this.config && this.config.isTestnet) {
            // Testnet 环境下返回模拟的风险指标
            return {
                volatility24h: 0.1, // 10% 波动率
                liquidityScore: 0.8, // 80% 流动性分数
                marketDepth: 1000000 // 100万美元市场深度
            };
        } else {
            try {
                const marketData = await this.client!.getMarketData(asset);
                return {
                    volatility24h: marketData.volatility24h,
                    liquidityScore: marketData.liquidityScore,
                    marketDepth: marketData.marketDepth
                };
            } catch (error) {
                console.error('Failed to calculate risk metrics:', error);
                throw error;
            }
        }
    }

    public async processLoanParameters(params: LoanParameters): Promise<void> {
        try {
            // 获取抵押品价格
            const collateralPrice = await this.client.getPrice(params.collateralAsset);
            
            // 获取贷款资产价格
            const loanPrice = await this.client.getPrice(params.loanAsset);
            
            // 计算抵押率
            const collateralRatio = (collateralPrice * params.collateralAmount) / 
                                  (loanPrice * params.loanAmount);
            
            // 获取风险指标
            const riskMetrics = await this.calculateRiskMetrics(params.collateralAsset);
            
            // 调整利率
            const adjustedRate = this.calculateAdjustedInterestRate(
                params.interestRate,
                collateralRatio,
                riskMetrics
            );
            
            // 更新贷款参数
            params.interestRate = adjustedRate;
            
        } catch (error) {
            console.error('Failed to process loan parameters:', error);
            throw error;
        }
    }

    private calculateAdjustedInterestRate(
        baseRate: number,
        collateralRatio: number,
        riskMetrics: RiskMetrics
    ): number {
        // 基于抵押率的调整
        let adjustedRate = baseRate * (1 / collateralRatio);
        
        // 基于波动性的调整
        adjustedRate *= (1 + riskMetrics.volatility24h);
        
        // 基于流动性的调整
        adjustedRate *= (1 + (1 - riskMetrics.liquidityScore));
        
        return adjustedRate;
    }

    public destroy(): void {
        if (this.testnetUpdateInterval) {
            clearInterval(this.testnetUpdateInterval);
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.priceSubscriptions.clear();
    }
}
