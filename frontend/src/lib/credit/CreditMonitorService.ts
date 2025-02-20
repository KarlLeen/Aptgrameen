import { HedgeService } from '../hedge/HedgeService';
import { HedgeContractService } from '../contracts/HedgeContractService';
import { EventTracker } from '../analytics/EventTracker';
import { SmartCache } from '../cache/SmartCache';

interface CreditMonitorConfig {
    creditScoreThreshold: number;     // 触发对冲的信用分阈值
    checkInterval: number;            // 检查间隔（毫秒）
    minCheckInterval: number;         // 最小检查间隔
    maxRetries: number;              // 最大重试次数
}

interface CreditAlert {
    borrowerId: string;
    oldScore: number;
    newScore: number;
    timestamp: number;
    riskLevel: 'low' | 'medium' | 'high';
}

export class CreditMonitorService {
    private static instance: CreditMonitorService;
    private hedgeService: HedgeService;
    private hedgeContractService: HedgeContractService;
    private eventTracker: EventTracker;
    private cache: SmartCache;
    private config: CreditMonitorConfig;
    private monitoringMap: Map<string, NodeJS.Timeout>;
    private alertCallbacks: ((alert: CreditAlert) => void)[];

    private constructor(
        hedgeService: HedgeService,
        hedgeContractService: HedgeContractService,
        config: CreditMonitorConfig
    ) {
        this.hedgeService = hedgeService;
        this.hedgeContractService = hedgeContractService;
        this.eventTracker = EventTracker.getInstance();
        this.cache = SmartCache.getInstance();
        this.config = config;
        this.monitoringMap = new Map();
        this.alertCallbacks = [];
    }

    public static getInstance(
        hedgeService: HedgeService,
        hedgeContractService: HedgeContractService,
        config: CreditMonitorConfig = {
            creditScoreThreshold: 600,
            checkInterval: 60000,     // 1分钟
            minCheckInterval: 10000,  // 10秒
            maxRetries: 3
        }
    ): CreditMonitorService {
        if (!CreditMonitorService.instance) {
            CreditMonitorService.instance = new CreditMonitorService(
                hedgeService,
                hedgeContractService,
                config
            );
        }
        return CreditMonitorService.instance;
    }

    // 开始监控借款人的信用分
    public async startMonitoring(
        borrowerId: string,
        initialCreditScore: number,
        loanAmount: number
    ): Promise<void> {
        if (this.monitoringMap.has(borrowerId)) {
            return;
        }

        // 缓存初始信用分
        this.cache.set(`credit_score_${borrowerId}`, initialCreditScore, {
            maxAge: this.config.checkInterval
        });

        // 设置监控间隔
        const intervalId = setInterval(
            async () => {
                await this.checkCreditScore(borrowerId, loanAmount);
            },
            this.config.checkInterval
        );

        this.monitoringMap.set(borrowerId, intervalId);

        // 记录开始监控事件
        this.eventTracker.trackEvent('credit_monitor', 'start_monitoring', 'success', 0, {
            borrowerId,
            initialCreditScore,
            loanAmount
        });
    }

    // 停止监控
    public stopMonitoring(borrowerId: string): void {
        const intervalId = this.monitoringMap.get(borrowerId);
        if (intervalId) {
            clearInterval(intervalId);
            this.monitoringMap.delete(borrowerId);
            
            this.eventTracker.trackEvent('credit_monitor', 'stop_monitoring', 'success', 0, {
                borrowerId
            });
        }
    }

    // 检查信用分并触发对冲
    private async checkCreditScore(
        borrowerId: string,
        loanAmount: number,
        retryCount: number = 0
    ): Promise<void> {
        try {
            // 获取上一次的信用分
            const lastScore = this.cache.get(`credit_score_${borrowerId}`);
            
            // 获取最新信用分
            const newScore = await this.getCurrentCreditScore(borrowerId);
            
            // 缓存新的信用分
            this.cache.set(`credit_score_${borrowerId}`, newScore, {
                maxAge: this.config.checkInterval
            });

            // 如果信用分低于阈值，触发对冲
            if (newScore < this.config.creditScoreThreshold) {
                await this.triggerHedge(borrowerId, newScore, loanAmount);
            }

            // 发送信用分变化提醒
            if (lastScore && lastScore !== newScore) {
                const alert: CreditAlert = {
                    borrowerId,
                    oldScore: lastScore,
                    newScore,
                    timestamp: Date.now(),
                    riskLevel: this.calculateRiskLevel(newScore)
                };

                this.notifyAlertCallbacks(alert);
            }

        } catch (error) {
            console.error('Credit score check failed:', error);
            
            // 重试逻辑
            if (retryCount < this.config.maxRetries) {
                setTimeout(
                    () => this.checkCreditScore(borrowerId, loanAmount, retryCount + 1),
                    this.config.minCheckInterval
                );
            } else {
                this.eventTracker.trackEvent('credit_monitor', 'check_failed', 'error', 0, {
                    borrowerId,
                    error: error.message
                });
            }
        }
    }

    // 触发对冲操作
    private async triggerHedge(
        borrowerId: string,
        creditScore: number,
        loanAmount: number
    ): Promise<void> {
        try {
            // 1. 创建链上对冲位置
            const txHash = await this.hedgeContractService.createHedgePosition(
                borrowerId,
                loanAmount,
                this.calculateHedgeRatio(creditScore)
            );

            // 2. 执行Merkle Trade对冲
            await this.hedgeService.evaluateAndHedge(
                borrowerId,
                creditScore,
                loanAmount
            );

            this.eventTracker.trackEvent('credit_monitor', 'hedge_triggered', 'success', loanAmount, {
                borrowerId,
                creditScore,
                txHash
            });

        } catch (error) {
            this.eventTracker.trackEvent('credit_monitor', 'hedge_triggered', 'error', 0, {
                borrowerId,
                creditScore,
                error: error.message
            });
            throw error;
        }
    }

    // 计算对冲比率
    private calculateHedgeRatio(creditScore: number): number {
        // 信用分越低，对冲比率越高
        const baseRatio = 0.5; // 基础对冲比率50%
        const scoreFactor = (this.config.creditScoreThreshold - creditScore) / 
                           this.config.creditScoreThreshold;
        
        return Math.min(baseRatio + (scoreFactor * 0.5), 1.0); // 最高100%对冲
    }

    // 计算风险等级
    private calculateRiskLevel(creditScore: number): 'low' | 'medium' | 'high' {
        if (creditScore < 500) return 'high';
        if (creditScore < 650) return 'medium';
        return 'low';
    }

    // 获取当前信用分
    private async getCurrentCreditScore(borrowerId: string): Promise<number> {
        // TODO: 实现从信用分合约获取最新分数
        return 0;
    }

    // 添加提醒回调
    public onAlert(callback: (alert: CreditAlert) => void): void {
        this.alertCallbacks.push(callback);
    }

    // 通知所有提醒回调
    private notifyAlertCallbacks(alert: CreditAlert): void {
        this.alertCallbacks.forEach(callback => callback(alert));
    }

    // 更新配置
    public updateConfig(newConfig: Partial<CreditMonitorConfig>): void {
        this.config = { ...this.config, ...newConfig };
        
        // 重新设置所有监控间隔
        this.monitoringMap.forEach((intervalId, borrowerId) => {
            clearInterval(intervalId);
            const loanAmount = this.cache.get(`loan_amount_${borrowerId}`);
            if (loanAmount) {
                this.startMonitoring(borrowerId, this.cache.get(`credit_score_${borrowerId}`), loanAmount);
            }
        });
    }
}
