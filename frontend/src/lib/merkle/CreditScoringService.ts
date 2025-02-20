import { AptosClient, AptosAccount, Types } from 'aptos';
import { CreditScoreConfig, CreditScoreData, CreditScoreEvent, RiskLevel } from './types';

export class CreditScoringService {
    private static instance: CreditScoringService;
    private client: AptosClient;
    private creditScores: Map<string, CreditScoreData>;
    private eventListeners: Map<string, ((event: CreditScoreEvent) => void)[]>;
    private updateInterval?: NodeJS.Timeout;

    private constructor(nodeUrl: string) {
        this.client = new AptosClient(nodeUrl);
        this.creditScores = new Map();
        this.eventListeners = new Map();
        this.startPeriodicUpdate();
    }

    public static getInstance(nodeUrl: string): CreditScoringService {
        if (!CreditScoringService.instance) {
            CreditScoringService.instance = new CreditScoringService(nodeUrl);
        }
        return CreditScoringService.instance;
    }

    private startPeriodicUpdate(): void {
        // 每5分钟更新一次信用分
        this.updateInterval = setInterval(() => {
            this.updateAllCreditScores();
        }, 5 * 60 * 1000);
    }

    private async updateAllCreditScores(): Promise<void> {
        for (const [address, data] of this.creditScores) {
            await this.updateCreditScore(address);
        }
    }

    public async initializeCreditScore(
        account: string,
        config?: Partial<CreditScoreConfig>
    ): Promise<CreditScoreData> {
        const defaultConfig: CreditScoreConfig = {
            baseScore: 650,
            minScore: 300,
            maxScore: 850,
            updateFrequency: 5 * 60 * 1000, // 5分钟
            riskLevels: {
                low: { min: 700, max: 850 },
                medium: { min: 600, max: 699 },
                high: { min: 300, max: 599 }
            },
            weights: {
                paymentHistory: 0.35,
                creditUtilization: 0.30,
                creditHistory: 0.15,
                newCredit: 0.10,
                creditMix: 0.10
            }
        };

        const mergedConfig: CreditScoreConfig = {
            ...defaultConfig,
            ...config
        };

        const initialData: CreditScoreData = {
            address: account,
            score: mergedConfig.baseScore,
            lastUpdate: Date.now(),
            history: [],
            factors: {
                paymentHistory: 100,
                creditUtilization: 0,
                creditHistory: 0,
                newCredit: 100,
                creditMix: 0
            },
            riskLevel: this.calculateRiskLevel(mergedConfig.baseScore, mergedConfig.riskLevels),
            config: mergedConfig
        };

        this.creditScores.set(account, initialData);
        this.emitScoreUpdate(account, initialData);
        return initialData;
    }

    public async updateCreditScore(address: string): Promise<CreditScoreData> {
        const data = this.creditScores.get(address);
        if (!data) {
            throw new Error(`No credit score data found for address ${address}`);
        }

        try {
            // 获取链上数据
            const onChainData = await this.fetchOnChainData(address);
            
            // 更新信用因素
            const updatedFactors = await this.updateCreditFactors(address, onChainData);
            
            // 计算新的信用分
            const newScore = this.calculateCreditScore(updatedFactors, data.config.weights);
            
            // 更新历史记录
            const historyEntry = {
                timestamp: Date.now(),
                score: newScore,
                factors: { ...updatedFactors }
            };

            // 保持最近12个月的历史记录
            const maxHistory = 12;
            const updatedHistory = [historyEntry, ...data.history].slice(0, maxHistory);

            const updatedData: CreditScoreData = {
                ...data,
                score: newScore,
                lastUpdate: Date.now(),
                history: updatedHistory,
                factors: updatedFactors,
                riskLevel: this.calculateRiskLevel(newScore, data.config.riskLevels)
            };

            this.creditScores.set(address, updatedData);
            this.emitScoreUpdate(address, updatedData);
            return updatedData;

        } catch (error) {
            console.error('Failed to update credit score:', error);
            throw error;
        }
    }

    private async fetchOnChainData(address: string): Promise<any> {
        try {
            // 获取账户资源
            const resources = await this.client.getAccountResources(address);
            
            // 解析相关数据
            const loanHistory = resources.find(r => r.type.includes('LoanHistory'));
            const creditActivity = resources.find(r => r.type.includes('CreditActivity'));
            
            return {
                loanHistory: loanHistory?.data || {},
                creditActivity: creditActivity?.data || {}
            };
        } catch (error) {
            console.error('Failed to fetch on-chain data:', error);
            throw error;
        }
    }

    private async updateCreditFactors(
        address: string,
        onChainData: any
    ): Promise<Record<string, number>> {
        const { loanHistory, creditActivity } = onChainData;

        // 计算支付历史分数
        const paymentHistory = this.calculatePaymentHistory(loanHistory);

        // 计算信用利用率
        const creditUtilization = this.calculateCreditUtilization(creditActivity);

        // 计算信用历史长度
        const creditHistory = this.calculateCreditHistory(loanHistory);

        // 计算新信用申请
        const newCredit = this.calculateNewCredit(creditActivity);

        // 计算信用类型组合
        const creditMix = this.calculateCreditMix(creditActivity);

        return {
            paymentHistory,
            creditUtilization,
            creditHistory,
            newCredit,
            creditMix
        };
    }

    private calculatePaymentHistory(loanHistory: any): number {
        // 实现支付历史评分逻辑
        return 100; // 示例返回值
    }

    private calculateCreditUtilization(creditActivity: any): number {
        // 实现信用利用率计算逻辑
        return 0; // 示例返回值
    }

    private calculateCreditHistory(loanHistory: any): number {
        // 实现信用历史长度评分逻辑
        return 0; // 示例返回值
    }

    private calculateNewCredit(creditActivity: any): number {
        // 实现新信用申请评分逻辑
        return 100; // 示例返回值
    }

    private calculateCreditMix(creditActivity: any): number {
        // 实现信用类型组合评分逻辑
        return 0; // 示例返回值
    }

    private calculateCreditScore(
        factors: Record<string, number>,
        weights: Record<string, number>
    ): number {
        let score = 0;
        for (const [factor, value] of Object.entries(factors)) {
            score += value * weights[factor];
        }
        return Math.round(score);
    }

    private calculateRiskLevel(
        score: number,
        riskLevels: Record<RiskLevel, { min: number; max: number }>
    ): RiskLevel {
        if (score >= riskLevels.low.min && score <= riskLevels.low.max) {
            return 'low';
        } else if (score >= riskLevels.medium.min && score <= riskLevels.medium.max) {
            return 'medium';
        } else {
            return 'high';
        }
    }

    public subscribeToCreditScoreUpdates(
        address: string,
        callback: (event: CreditScoreEvent) => void
    ): void {
        const listeners = this.eventListeners.get(address) || [];
        listeners.push(callback);
        this.eventListeners.set(address, listeners);
    }

    public unsubscribeFromCreditScoreUpdates(
        address: string,
        callback: (event: CreditScoreEvent) => void
    ): void {
        const listeners = this.eventListeners.get(address) || [];
        const updatedListeners = listeners.filter(cb => cb !== callback);
        this.eventListeners.set(address, updatedListeners);
    }

    private emitScoreUpdate(address: string, data: CreditScoreData): void {
        const event: CreditScoreEvent = {
            type: 'score_update',
            address,
            score: data.score,
            previousScore: data.history[1]?.score || data.score,
            riskLevel: data.riskLevel,
            timestamp: Date.now(),
            factors: data.factors
        };

        const listeners = this.eventListeners.get(address) || [];
        listeners.forEach(callback => callback(event));
    }

    public async getCreditScore(address: string): Promise<CreditScoreData> {
        const data = this.creditScores.get(address);
        if (!data) {
            throw new Error(`No credit score data found for address ${address}`);
        }
        return data;
    }

    public async getCreditHistory(
        address: string,
        months: number = 12
    ): Promise<CreditScoreData['history']> {
        const data = this.creditScores.get(address);
        if (!data) {
            throw new Error(`No credit score data found for address ${address}`);
        }
        return data.history.slice(0, months);
    }

    public destroy(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        this.eventListeners.clear();
        this.creditScores.clear();
    }
}
