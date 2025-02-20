import { MerkleService } from '../merkle/MerkleService';
import { WalletService } from '../wallet/walletService';
import { LoanParameters, RiskMetrics } from '../merkle/types';
import { Types } from 'aptos';

export interface LoanRequest {
    borrower: string;
    groupId: string;
    collateralAsset: string;
    loanAsset: string;
    collateralAmount: number;
    loanAmount: number;
    duration: number;
}

export interface LoanStatus {
    id: string;
    borrower: string;
    groupId: string;
    collateralAmount: number;
    loanAmount: number;
    interestRate: number;
    startTime: number;
    endTime: number;
    status: 'active' | 'repaid' | 'defaulted' | 'liquidated';
}

export class LoanManager {
    private priceCache: PriceCache;
    private batchProcessor: BatchProcessor;
    private merkleService: MerkleService;
    private walletService: WalletService;
    private moduleAddress: string;

    constructor(
        merkleService: MerkleService,
        moduleAddress: string
    ) {
        this.priceCache = PriceCache.getInstance();
        this.batchProcessor = BatchProcessor.getInstance(moduleAddress);
        this.merkleService = merkleService;
        this.moduleAddress = moduleAddress;
        this.walletService = WalletService.getInstance(moduleAddress);
    }

    public async createLoan(request: LoanRequest): Promise<string> {
        // 检查缓存中的价格数据
        const cachedPrice = this.priceCache.get(`${request.collateralAsset}/USD`);
        if (cachedPrice) {
            console.log('Using cached price:', cachedPrice);
        }
        try {
            // 1. 计算贷款参数
            const loanParams: LoanParameters = {
                collateralAsset: request.collateralAsset,
                loanAsset: request.loanAsset,
                collateralAmount: request.collateralAmount,
                loanAmount: request.loanAmount,
                interestRate: await this.calculateBaseInterestRate(),
                duration: request.duration
            };

            // 2. 处理贷款参数（包括风险评估和利率调整）
            await this.merkleService.processLoanParameters(loanParams);

            // 3. 构建智能合约交易
            const payload = {
                type: 'entry_function_payload',
                function: `${this.moduleAddress}::loan_core::create_loan`,
                type_arguments: [],
                arguments: [
                    request.groupId,
                    request.collateralAsset,
                    request.loanAsset,
                    request.collateralAmount.toString(),
                    request.loanAmount.toString(),
                    loanParams.interestRate.toString(),
                    request.duration.toString()
                ]
            };

            // 4. 提交交易
            const response = await this.walletService.submitTransaction(payload);
            return response.hash;

        } catch (error) {
            console.error('Failed to create loan:', error);
            throw error;
        }
    }

    public async repayLoan(loanId: string, amount: number): Promise<string> {
        try {
            const payload = {
                type: 'entry_function_payload',
                function: `${this.moduleAddress}::loan_core::repay_loan`,
                type_arguments: [],
                arguments: [loanId, amount.toString()]
            };

            const response = await this.walletService.submitTransaction(payload);
            return response.hash;

        } catch (error) {
            console.error('Failed to repay loan:', error);
            throw error;
        }
    }

    public async liquidateLoan(loanId: string): Promise<string> {
        try {
            // 1. 获取贷款状态
            const loanStatus = await this.getLoanStatus(loanId);
            
            // 2. 获取当前市场价格和风险指标
            const riskMetrics = await this.merkleService.calculateRiskMetrics(
                loanStatus.collateralAmount.toString()
            );

            // 3. 检查是否需要清算
            if (await this.shouldLiquidate(loanStatus, riskMetrics)) {
                const payload = {
                    type: 'entry_function_payload',
                    function: `${this.moduleAddress}::loan_core::liquidate_loan`,
                    type_arguments: [],
                    arguments: [loanId]
                };

                const response = await this.walletService.submitTransaction(payload);
                return response.hash;
            }

            throw new Error('Loan does not meet liquidation criteria');

        } catch (error) {
            console.error('Failed to liquidate loan:', error);
            throw error;
        }
    }

    private async calculateBaseInterestRate(): Promise<number> {
        // 基础利率计算逻辑
        const baseRate = 0.05; // 5% 基础利率
        return baseRate;
    }

    private async shouldLiquidate(
        loan: LoanStatus,
        riskMetrics: RiskMetrics
    ): Promise<boolean> {
        // 清算条件检查逻辑
        const liquidationThreshold = 0.75; // 75% 清算阈值
        const currentRatio = loan.collateralAmount / loan.loanAmount;
        
        return currentRatio < liquidationThreshold || 
               riskMetrics.volatility24h > 0.5; // 50% 波动性阈值
    }

    public async getLoanStatus(loanId: string): Promise<LoanStatus> {
        try {
            const response = await this.walletService.viewResource(
                this.moduleAddress,
                `${this.moduleAddress}::loan_core::Loan`,
                loanId
            );

            return {
                id: loanId,
                borrower: response.borrower,
                groupId: response.group_id,
                collateralAmount: Number(response.collateral_amount),
                loanAmount: Number(response.loan_amount),
                interestRate: Number(response.interest_rate),
                startTime: Number(response.start_time),
                endTime: Number(response.end_time),
                status: response.status
            };

        } catch (error) {
            console.error('Failed to get loan status:', error);
            throw error;
        }
    }

    public subscribeToPriceUpdates(
        asset: string,
        callback: (price: number) => void
    ): void {
        this.merkleService.subscribeToPriceUpdates({
            pair: `${asset}/USD`,
            callback: (update) => callback(update.price)
        });
    }

    public unsubscribeFromPriceUpdates(
        asset: string,
        callback: (price: number) => void
    ): void {
        this.merkleService.unsubscribeFromPriceUpdates(
            `${asset}/USD`,
            callback
        );
    }
}
