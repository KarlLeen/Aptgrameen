import { test, expect } from '@playwright/test';
import { TestUtils } from '../utils/testUtils';

test.describe('AptGrameen E2E Tests', () => {
    let testAccounts: any[];
    let moduleAddress: string;

    test.beforeAll(async () => {
        const env = await TestUtils.setupTestEnvironment();
        testAccounts = env.accounts;
        moduleAddress = env.moduleAddress;
    });

    test('complete loan cycle with hedge', async ({ page }) => {
        // 1. 连接钱包
        await page.goto('/');
        await page.click('[data-testid="connect-wallet"]');
        await page.waitForSelector('[data-testid="wallet-connected"]');

        // 2. 申请贷款
        await page.goto('/loans');
        await page.fill('[data-testid="loan-amount"]', '50000');
        await page.fill('[data-testid="loan-duration"]', '30');
        await page.click('[data-testid="submit-loan"]');

        // 等待贷款创建
        await page.waitForSelector('[data-testid="loan-created"]');
        const loanId = await page.getAttribute('[data-testid="loan-id"]', 'value');
        expect(loanId).toBeTruthy();

        // 3. 检查信用分变化
        await TestUtils.simulateCreditScoreChange(testAccounts[0].address().hex(), 550);
        await page.goto('/credit');
        await page.waitForSelector('[data-testid="credit-score"]');
        const creditScore = await page.textContent('[data-testid="credit-score"]');
        expect(Number(creditScore)).toBe(550);

        // 4. 验证对冲触发
        await page.goto('/hedge');
        await page.waitForSelector('[data-testid="hedge-position"]');
        const hedgeStatus = await page.textContent('[data-testid="hedge-status"]');
        expect(hedgeStatus).toBe('open');

        // 5. 检查市场订单
        const orderStatus = await page.textContent('[data-testid="order-status"]');
        expect(orderStatus).toBe('filled');

        // 6. 模拟还款
        await page.click('[data-testid="repay-loan"]');
        await page.waitForSelector('[data-testid="loan-repaid"]');

        // 7. 验证对冲平仓
        await page.waitForSelector('[data-testid="hedge-closed"]');
        const finalHedgeStatus = await page.textContent('[data-testid="hedge-status"]');
        expect(finalHedgeStatus).toBe('closed');
    });

    test('credit score monitoring and alerts', async ({ page }) => {
        await page.goto('/credit');

        // 1. 检查初始信用分
        await page.waitForSelector('[data-testid="credit-score"]');
        const initialScore = await page.textContent('[data-testid="credit-score"]');
        expect(Number(initialScore)).toBeGreaterThan(0);

        // 2. 模拟信用分下降
        await TestUtils.simulateCreditScoreChange(testAccounts[0].address().hex(), 500);
        await page.waitForSelector('[data-testid="credit-alert"]');
        
        // 3. 验证警报显示
        const alertMessage = await page.textContent('[data-testid="alert-message"]');
        expect(alertMessage).toContain('Credit score has dropped');

        // 4. 检查风险等级
        const riskLevel = await page.textContent('[data-testid="risk-level"]');
        expect(riskLevel).toBe('high');
    });

    test('hedge position management', async ({ page }) => {
        await page.goto('/hedge');

        // 1. 创建对冲位置
        await page.click('[data-testid="create-hedge"]');
        await page.fill('[data-testid="hedge-amount"]', '10000');
        await page.fill('[data-testid="hedge-ratio"]', '0.5');
        await page.click('[data-testid="confirm-hedge"]');

        // 2. 验证位置创建
        await page.waitForSelector('[data-testid="hedge-position"]');
        const positionAmount = await page.textContent('[data-testid="position-amount"]');
        expect(Number(positionAmount)).toBe(10000);

        // 3. 调整对冲比率
        await page.click('[data-testid="adjust-hedge"]');
        await page.fill('[data-testid="new-ratio"]', '0.7');
        await page.click('[data-testid="confirm-adjustment"]');

        // 4. 验证调整
        await page.waitForSelector('[data-testid="ratio-updated"]');
        const newRatio = await page.textContent('[data-testid="hedge-ratio"]');
        expect(Number(newRatio)).toBe(0.7);

        // 5. 关闭位置
        await page.click('[data-testid="close-hedge"]');
        await page.waitForSelector('[data-testid="hedge-closed"]');
    });

    test('market integration', async ({ page }) => {
        await page.goto('/market');

        // 1. 检查价格订阅
        await page.waitForSelector('[data-testid="eth-price"]');
        const initialPrice = await page.textContent('[data-testid="eth-price"]');
        expect(Number(initialPrice)).toBeGreaterThan(0);

        // 2. 模拟价格变化
        await TestUtils.simulatePriceChange('ETH/USDC', 2200);
        await page.waitForFunction(() => {
            const price = document.querySelector('[data-testid="eth-price"]')?.textContent;
            return Number(price) === 2200;
        });

        // 3. 验证对冲位置更新
        await page.waitForSelector('[data-testid="position-updated"]');
        const pnl = await page.textContent('[data-testid="position-pnl"]');
        expect(Number(pnl)).not.toBe(0);
    });
});
