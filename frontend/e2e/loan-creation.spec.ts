import { test, expect } from '@playwright/test';

test.describe('Loan Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // 访问贷款创建页面
    await page.goto('/loan/create');
    
    // 模拟钱包连接
    await page.evaluate(() => {
      window.localStorage.setItem('walletConnected', 'true');
      window.localStorage.setItem('walletAddress', '0x123...456');
    });
  });

  test('should display loan creation form', async ({ page }) => {
    // 验证表单元素存在
    await expect(page.locator('form')).toBeVisible();
    await expect(page.getByLabel('Collateral Amount')).toBeVisible();
    await expect(page.getByLabel('Loan Amount')).toBeVisible();
    await expect(page.getByLabel('Duration')).toBeVisible();
  });

  test('should validate input fields', async ({ page }) => {
    // 尝试提交空表单
    await page.getByRole('button', { name: 'Create Loan' }).click();
    
    // 验证错误消息
    await expect(page.getByText('Collateral amount is required')).toBeVisible();
    await expect(page.getByText('Loan amount is required')).toBeVisible();
  });

  test('should calculate loan parameters', async ({ page }) => {
    // 输入抵押品金额
    await page.getByLabel('Collateral Amount').fill('100');
    
    // 等待计算结果
    await expect(page.getByText('Maximum Loan Amount:')).toBeVisible();
    await expect(page.getByText('Interest Rate:')).toBeVisible();
  });

  test('should create loan successfully', async ({ page }) => {
    // 填写表单
    await page.getByLabel('Collateral Amount').fill('100');
    await page.getByLabel('Loan Amount').fill('50');
    await page.getByLabel('Duration').fill('30');

    // 提交表单
    await page.getByRole('button', { name: 'Create Loan' }).click();

    // 验证成功消息
    await expect(page.getByText('Loan created successfully')).toBeVisible();
    
    // 验证重定向
    await expect(page).toHaveURL(/\/loan\/details/);
  });

  test('should handle network errors', async ({ page }) => {
    // 模拟网络错误
    await page.route('**/api/loan/create', route => 
      route.fulfill({
        status: 500,
        body: 'Internal Server Error'
      })
    );

    // 填写并提交表单
    await page.getByLabel('Collateral Amount').fill('100');
    await page.getByLabel('Loan Amount').fill('50');
    await page.getByLabel('Duration').fill('30');
    await page.getByRole('button', { name: 'Create Loan' }).click();

    // 验证错误消息
    await expect(page.getByText('Failed to create loan')).toBeVisible();
  });

  test('should update risk metrics in real-time', async ({ page }) => {
    // 监听 WebSocket 消息
    await page.route('**/ws', route => {
      route.fulfill({
        body: JSON.stringify({ price: '10.5' })
      });
    });

    // 输入抵押品金额
    await page.getByLabel('Collateral Amount').fill('100');
    
    // 验证风险指标更新
    await expect(page.getByText('Collateral Ratio:')).toBeVisible();
    await expect(page.getByText('Liquidation Price:')).toBeVisible();
  });

  test('should integrate with wallet', async ({ page }) => {
    // 填写表单
    await page.getByLabel('Collateral Amount').fill('100');
    await page.getByLabel('Loan Amount').fill('50');
    
    // 点击创建按钮
    await page.getByRole('button', { name: 'Create Loan' }).click();
    
    // 验证钱包交互
    await expect(page.getByText('Confirm transaction in your wallet')).toBeVisible();
  });
});
