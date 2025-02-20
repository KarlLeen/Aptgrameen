import { CreditScoringService } from '../lib/merkle/CreditScoringService';
import { AptosAccount } from 'aptos';
import { CreditScoreConfig, CreditScoreData, CreditScoreEvent } from '../lib/merkle/types';

describe('Credit Scoring Integration Tests', () => {
    let creditService: CreditScoringService;
    let testAccount: AptosAccount;
    let customConfig: Partial<CreditScoreConfig>;

    beforeAll(() => {
        creditService = CreditScoringService.getInstance(
            'https://fullnode.testnet.aptoslabs.com'
        );
        testAccount = new AptosAccount();
        
        customConfig = {
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
    });

    afterAll(() => {
        creditService.destroy();
    });

    describe('Credit Score Initialization', () => {
        it('should initialize credit score with default config', async () => {
            const data = await creditService.initializeCreditScore(
                testAccount.address().hex()
            );

            expect(data).toBeDefined();
            expect(data.score).toBe(650); // 默认基础分
            expect(data.riskLevel).toBe('medium');
            expect(data.history).toHaveLength(0);
        });

        it('should initialize credit score with custom config', async () => {
            const data = await creditService.initializeCreditScore(
                testAccount.address().hex(),
                customConfig
            );

            expect(data.score).toBe(customConfig.baseScore);
            expect(data.config.weights.paymentHistory).toBe(customConfig.weights?.paymentHistory ?? 0.40);
            expect(data.riskLevel).toBe('medium');
        });
    });

    describe('Credit Score Updates', () => {
        let initialData: CreditScoreData;

        beforeEach(async () => {
            initialData = await creditService.initializeCreditScore(
                testAccount.address().hex(),
                customConfig
            );
        });

        it('should update credit score', async () => {
            const updatedData = await creditService.updateCreditScore(
                testAccount.address().hex()
            );

            expect(updatedData.lastUpdate).toBeGreaterThan(initialData.lastUpdate);
            expect(updatedData.history).toHaveLength(1);
            expect(updatedData.history[0].timestamp).toBeDefined();
            expect(updatedData.history[0].score).toBeDefined();
        });

        it('should emit score update events', (done) => {
            const address = testAccount.address().hex();
            let eventReceived = false;

            creditService.subscribeToCreditScoreUpdates(
                address,
                (event: CreditScoreEvent) => {
                    expect(event.address).toBe(address);
                    expect(event.score).toBeDefined();
                    expect(event.previousScore).toBeDefined();
                    expect(event.riskLevel).toBeDefined();
                    expect(event.factors).toBeDefined();
                    eventReceived = true;
                    done();
                }
            );

            creditService.updateCreditScore(address);

            // 设置超时
            setTimeout(() => {
                if (!eventReceived) {
                    done(new Error('Event not received within timeout'));
                }
            }, 5000);
        });

        it('should maintain credit score history', async () => {
            const address = testAccount.address().hex();

            // 执行多次更新
            for (let i = 0; i < 3; i++) {
                await creditService.updateCreditScore(address);
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            const history = await creditService.getCreditHistory(address, 12);
            expect(history.length).toBe(3);
            expect(history[0].timestamp).toBeGreaterThan(history[1].timestamp);
        });
    });

    describe('Risk Level Assessment', () => {
        it('should correctly assess risk levels', async () => {
            const address = testAccount.address().hex();
            const data = await creditService.initializeCreditScore(address, {
                ...customConfig,
                baseScore: 800 // 高分
            });

            expect(data.riskLevel).toBe('low');

            // 初始化低分账户
            const lowScoreData = await creditService.initializeCreditScore(
                new AptosAccount().address().hex(),
                {
                    ...customConfig,
                    baseScore: 500 // 低分
                }
            );

            expect(lowScoreData.riskLevel).toBe('high');
        });
    });

    describe('Credit Factors', () => {
        it('should calculate all credit factors', async () => {
            const data = await creditService.initializeCreditScore(
                testAccount.address().hex()
            );

            expect(data.factors).toHaveProperty('paymentHistory');
            expect(data.factors).toHaveProperty('creditUtilization');
            expect(data.factors).toHaveProperty('creditHistory');
            expect(data.factors).toHaveProperty('newCredit');
            expect(data.factors).toHaveProperty('creditMix');

            // 验证因素值在有效范围内
            Object.values(data.factors).forEach(value => {
                expect(value).toBeGreaterThanOrEqual(0);
                expect(value).toBeLessThanOrEqual(100);
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle non-existent credit scores', async () => {
            const invalidAddress = new AptosAccount().address().hex();

            await expect(
                creditService.getCreditScore(invalidAddress)
            ).rejects.toThrow();

            await expect(
                creditService.updateCreditScore(invalidAddress)
            ).rejects.toThrow();
        });

        it('should handle invalid config values', async () => {
            const address = testAccount.address().hex();
            const invalidConfig = {
                baseScore: 1000, // 超出正常范围
                weights: {
                    paymentHistory: 1.5 // 权重总和超过1
                }
            };

            await expect(
                creditService.initializeCreditScore(address, {
                    ...invalidConfig,
                    weights: {
                        paymentHistory: 1.5,
                        creditUtilization: 0,
                        creditHistory: 0,
                        newCredit: 0,
                        creditMix: 0
                    }
                })
            ).rejects.toThrow();
        });
    });

    describe('Event Management', () => {
        it('should handle multiple event subscriptions', async () => {
            const address = testAccount.address().hex();
            const events: CreditScoreEvent[] = [];

            // 添加多个订阅
            const callback1 = (event: CreditScoreEvent) => events.push(event);
            const callback2 = (event: CreditScoreEvent) => events.push(event);

            creditService.subscribeToCreditScoreUpdates(address, callback1);
            creditService.subscribeToCreditScoreUpdates(address, callback2);

            await creditService.updateCreditScore(address);

            // 等待事件处理
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(events.length).toBe(2);

            // 取消订阅
            creditService.unsubscribeFromCreditScoreUpdates(address, callback1);
            await creditService.updateCreditScore(address);

            // 等待事件处理
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(events.length).toBe(3); // 只有callback2还在监听
        });
    });
});
