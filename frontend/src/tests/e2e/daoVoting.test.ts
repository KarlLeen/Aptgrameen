import { test, expect } from '@playwright/test';

test.describe('DAO Voting Flow', () => {
    test.beforeEach(async ({ page }) => {
        // 导航到投票页面
        await page.goto('/dao/vote');
    });

    test('complete voting flow', async ({ page }) => {
        // 检查初始状态
        await expect(page.getByText('Connect your wallet to vote')).toBeVisible();

        // 连接钱包
        await page.click('text=Connect Wallet');
        await page.click('text=Petra');

        // 等待连接完成
        await expect(page.getByText('0x123...abc')).toBeVisible();

        // 检查提案信息
        await expect(page.getByText('Adjust Interest Rate Parameters')).toBeVisible();
        await expect(page.getByText('Your Voting Power: 100')).toBeVisible();

        // 提交投票
        await page.click('text=Support');

        // 等待交易确认
        await expect(page.getByText('Vote submitted successfully!')).toBeVisible();
        await expect(page.getByText(/0x[0-9a-f]+/)).toBeVisible();
    });

    test('handles wallet connection errors', async ({ page }) => {
        // 模拟钱包未安装
        await page.addInitScript(() => {
            window.petra = undefined;
        });

        await page.click('text=Connect Wallet');
        await page.click('text=Petra');

        await expect(page.getByText('Petra wallet is not installed')).toBeVisible();
    });

    test('handles vote submission errors', async ({ page }) => {
        // 连接钱包
        await page.click('text=Connect Wallet');
        await page.click('text=Petra');

        // 模拟交易失败
        await page.addInitScript(() => {
            const originalSignAndSubmit = window.petra.signAndSubmitTransaction;
            window.petra.signAndSubmitTransaction = () => {
                throw new Error('Transaction failed');
            };
        });

        await page.click('text=Support');
        await expect(page.getByText('Failed to submit vote')).toBeVisible();
    });

    test('displays loading states', async ({ page }) => {
        // 连接钱包
        await page.click('text=Connect Wallet');
        await page.click('text=Petra');

        // 检查投票按钮加载状态
        await page.click('text=Support');
        await expect(page.getByText('Voting...')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Against' })).toBeDisabled();
    });
});
