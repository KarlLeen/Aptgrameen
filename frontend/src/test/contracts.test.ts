import { TestUtils } from '../utils/testUtils';
import { HedgeContractService } from '../lib/contracts/HedgeContractService';
import { APTOS_NODE_URL, MODULE_ADDRESS } from '../config';

describe('Contract Integration Tests', () => {
    let testAccounts: any[];
    let hedgeContractService: HedgeContractService;

    beforeAll(async () => {
        // 设置测试环境
        const { accounts, moduleAddress } = await TestUtils.setupTestEnvironment();
        testAccounts = accounts;
        
        hedgeContractService = HedgeContractService.getInstance({
            moduleAddress,
            nodeUrl: APTOS_NODE_URL,
            contractName: 'hedge_contract'
        });
    });

    describe('Hedge Contract Tests', () => {
        it('should create hedge position', async () => {
            const borrowerId = testAccounts[1].address().hex();
            const amount = 50000;
            const hedgeRatio = 0.5;

            const txHash = await hedgeContractService.createHedgePosition(
                borrowerId,
                amount,
                hedgeRatio
            );

            expect(txHash).toBeTruthy();
            
            // 验证位置创建
            const position = await hedgeContractService.getHedgePosition(txHash);
            expect(position).toBeTruthy();
            expect(position?.amount).toBe(amount);
            expect(position?.hedgeRatio).toBe(hedgeRatio);
        });

        it('should adjust hedge ratio', async () => {
            const borrowerId = testAccounts[1].address().hex();
            const amount = 50000;
            const initialRatio = 0.5;

            // 创建位置
            const txHash = await hedgeContractService.createHedgePosition(
                borrowerId,
                amount,
                initialRatio
            );

            // 调整比率
            const newRatio = 0.7;
            await hedgeContractService.adjustHedgeRatio(txHash, newRatio);

            // 验证调整
            const position = await hedgeContractService.getHedgePosition(txHash);
            expect(position?.hedgeRatio).toBe(newRatio);
        });

        it('should close hedge position', async () => {
            const borrowerId = testAccounts[1].address().hex();
            const amount = 50000;
            const hedgeRatio = 0.5;

            // 创建位置
            const txHash = await hedgeContractService.createHedgePosition(
                borrowerId,
                amount,
                hedgeRatio
            );

            // 关闭位置
            await hedgeContractService.closeHedgePosition(txHash);

            // 验证关闭
            const position = await hedgeContractService.getHedgePosition(txHash);
            expect(position?.status).toBe('closed');
        });
    });

    describe('Credit Score Tests', () => {
        it('should trigger hedge on low credit score', async () => {
            const borrowerId = testAccounts[1].address().hex();
            
            // 设置初始信用分
            await TestUtils.simulateCreditScoreChange(borrowerId, 750);
            
            // 降低信用分
            await TestUtils.simulateCreditScoreChange(borrowerId, 550);

            // 验证是否触发对冲
            const positions = await hedgeContractService.getUserHedgePositions(borrowerId);
            expect(positions.length).toBeGreaterThan(0);
            expect(positions[positions.length - 1].status).toBe('open');
        });
    });

    describe('Market Integration Tests', () => {
        it('should handle price changes', async () => {
            // 模拟价格变化
            await TestUtils.simulatePriceChange('ETH/USDC', 2200);

            // 验证对冲位置是否相应调整
            const stats = await hedgeContractService.getHedgeStats();
            expect(stats.totalHedgedAmount).toBeGreaterThan(0);
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid hedge ratio', async () => {
            const borrowerId = testAccounts[1].address().hex();
            
            await expect(
                hedgeContractService.createHedgePosition(
                    borrowerId,
                    50000,
                    1.5 // 无效的对冲比率
                )
            ).rejects.toThrow();
        });

        it('should handle non-existent position', async () => {
            await expect(
                hedgeContractService.closeHedgePosition('non_existent_position')
            ).rejects.toThrow();
        });
    });
});
