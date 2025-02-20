import { TestUtils } from '../src/utils/testUtils';
import { FEATURES } from '../src/config';

async function runTestScenario() {
    try {
        console.log('Starting test scenario...');
        
        // 1. 设置测试环境
        const { accounts, moduleAddress } = await TestUtils.setupTestEnvironment();
        console.log('Test environment setup completed');
        
        // 2. 测试贷款流程
        console.log('\nTesting loan application process...');
        const loanResult = await TestUtils.simulateLoanApplication(
            accounts[1].address().hex(),
            50000,
            30 // 30天期限
        );
        console.log('Loan application result:', loanResult);

        // 3. 测试信用分变化触发对冲
        if (FEATURES.enableHedging) {
            console.log('\nTesting hedge triggering...');
            // 降低信用分
            await TestUtils.simulateCreditScoreChange(
                accounts[1].address().hex(),
                550
            );
            console.log('Credit score changed, hedge should be triggered');
        }

        // 4. 测试价格波动
        console.log('\nTesting price fluctuation...');
        await TestUtils.simulatePriceChange('ETH/USDC', 2200);
        
        // 5. 测试自动清算
        if (FEATURES.enableAutoLiquidation) {
            console.log('\nTesting auto-liquidation...');
            // 进一步降低信用分
            await TestUtils.simulateCreditScoreChange(
                accounts[1].address().hex(),
                400
            );
            console.log('Credit score critically low, liquidation should be triggered');
        }

        // 6. 生成测试事件
        console.log('\nGenerating test events...');
        await TestUtils.generateTestEvents();

        // 7. 检查账户余额
        console.log('\nChecking account balances...');
        for (const account of accounts) {
            const balance = await TestUtils.getAccountBalance(account.address().hex());
            console.log(`Account ${account.address().hex()}: ${balance} APT`);
        }

        console.log('\nTest scenario completed successfully');

    } catch (error) {
        console.error('Test scenario failed:', error);
        throw error;
    } finally {
        // 清理测试环境
        await TestUtils.cleanupTestEnvironment();
    }
}

// 运行测试场景
runTestScenario().then(() => {
    console.log('All tests completed');
    process.exit(0);
}).catch((error) => {
    console.error('Tests failed:', error);
    process.exit(1);
});
