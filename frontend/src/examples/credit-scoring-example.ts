import { CreditScoringService } from '../lib/merkle/CreditScoringService';
import { AptosAccount } from 'aptos';

async function creditScoringExample() {
    // 初始化信用评分服务
    const creditService = CreditScoringService.getInstance(
        'https://fullnode.testnet.aptoslabs.com'
    );

    try {
        // 创建测试账户
        const account = new AptosAccount();
        console.log('Test account address:', account.address().hex());

        // 自定义信用评分配置
        const customConfig = {
            baseScore: 700,
            riskLevels: {
                low: { min: 750, max: 850 },
                medium: { min: 650, max: 749 },
                high: { min: 300, max: 649 }
            },
            weights: {
                paymentHistory: 0.40,
                creditUtilization: 0.35,
                creditHistory: 0.10,
                newCredit: 0.10,
                creditMix: 0.05
            }
        };

        // 初始化信用评分
        console.log('Initializing credit score...');
        const initialData = await creditService.initializeCreditScore(
            account.address().hex(),
            customConfig
        );
        console.log('Initial credit score data:', initialData);

        // 订阅信用分更新
        creditService.subscribeToCreditScoreUpdates(
            account.address().hex(),
            (event) => {
                console.log('Credit score update event:', event);
                
                // 检查风险等级变化
                if (event.riskLevel !== 'low') {
                    console.log('Risk level warning:', {
                        address: event.address,
                        currentScore: event.score,
                        previousScore: event.previousScore,
                        riskLevel: event.riskLevel
                    });
                }
            }
        );

        // 模拟一些活动来触发信用分更新
        console.log('Simulating credit activities...');
        await creditService.updateCreditScore(account.address().hex());

        // 获取当前信用分
        const currentScore = await creditService.getCreditScore(account.address().hex());
        console.log('Current credit score:', currentScore);

        // 获取信用历史
        const history = await creditService.getCreditHistory(account.address().hex(), 6);
        console.log('Credit score history (last 6 months):', history);

        // 等待一段时间以观察自动更新
        console.log('Waiting for automatic updates...');
        await new Promise(resolve => setTimeout(resolve, 6 * 60 * 1000)); // 等待6分钟

        // 获取更新后的信用分
        const updatedScore = await creditService.getCreditScore(account.address().hex());
        console.log('Updated credit score:', updatedScore);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        // 清理资源
        creditService.destroy();
    }
}

// 运行示例
creditScoringExample().catch(console.error);
