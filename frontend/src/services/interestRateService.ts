import { APLCreditSystem } from '../lib/move-agent/credit-system';

export class InterestRateService {
    private creditSystem: APLCreditSystem;
    private baseRate: number;
    private priceThresholds: Map<string, { lower: number; upper: number }>;

    constructor(creditSystem: APLCreditSystem, baseRate: number = 0.05) {
        this.creditSystem = creditSystem;
        this.baseRate = baseRate;
        this.priceThresholds = new Map([
            ['BTC_USD', { lower: 35000, upper: 45000 }],
            ['ETH_USD', { lower: 2000, upper: 3000 }],
            ['APT_USD', { lower: 8, upper: 12 }],
            ['BNB_USD', { lower: 250, upper: 350 }]
        ]);
    }

    /**
     * 根据价格变化调整利率
     * @param pair 交易对
     * @param currentPrice 当前价格
     * @returns 调整后的利率
     */
    public async adjustInterestRate(pair: string, currentPrice: number): Promise<number> {
        const threshold = this.priceThresholds.get(pair);
        if (!threshold) {
            return this.baseRate;
        }

        let rateAdjustment = 0;

        // 根据价格区间调整利率
        if (currentPrice < threshold.lower) {
            // 价格低于下限，增加利率
            rateAdjustment = 0.02;
        } else if (currentPrice > threshold.upper) {
            // 价格高于上限，降低利率
            rateAdjustment = -0.01;
        }

        const newRate = Math.max(0.01, this.baseRate + rateAdjustment);

        // 更新链上利率
        try {
            await this.updateChainRate(newRate);
            return newRate;
        } catch (error) {
            console.error('Failed to update chain rate:', error);
            return this.baseRate;
        }
    }

    /**
     * 更新链上利率
     * @param newRate 新利率
     */
    private async updateChainRate(newRate: number): Promise<void> {
        // TODO: 实现链上利率更新逻辑
        // 这里需要调用 Move 合约的利率更新方法
        console.log('Updating chain rate to:', newRate);
    }

    /**
     * 获取当前基准利率
     */
    public getBaseRate(): number {
        return this.baseRate;
    }

    /**
     * 设置价格阈值
     * @param pair 交易对
     * @param lower 下限
     * @param upper 上限
     */
    public setPriceThreshold(pair: string, lower: number, upper: number): void {
        this.priceThresholds.set(pair, { lower, upper });
    }
}
