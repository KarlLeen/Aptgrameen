import { HedgeService } from '../lib/hedge/HedgeService';
import { MerkleService } from '../lib/merkle/MerkleService';
import { TestUtils } from '../utils/testUtils';
import { TestnetConfig } from '../lib/merkle/types';

describe('Merkle Trade Integration Tests', () => {
    let merkleService: MerkleService;
    let hedgeService: HedgeService;
    let testAccounts: any[];

    beforeAll(async () => {
        const { accounts } = await TestUtils.setupTestEnvironment();
        testAccounts = accounts;

        const testnetConfig: TestnetConfig = {
            isTestnet: true,
            nodeUrl: 'https://fullnode.testnet.aptoslabs.com',
            faucetUrl: 'https://faucet.testnet.aptoslabs.com',
            wsUrl: 'wss://testnet-ws.aptoslabs.com'
        };

        merkleService = MerkleService.getInstance(testnetConfig);
        hedgeService = HedgeService.getInstance(merkleService);
    });

    describe('Market Order Tests', () => {
        it('should execute market order', async () => {
            const order = {
                symbol: 'ETH/USDC',
                side: 'sell',
                amount: 1.0,
                type: 'market'
            };

            const result = await merkleService.executeMarketOrder(order);
            expect(result).toBeTruthy();
            expect(result.status).toBe('filled');
        });

        it('should handle order rejection', async () => {
            const order = {
                symbol: 'ETH/USDC',
                side: 'sell',
                amount: 1000000, // 超大金额
                type: 'market'
            };

            await expect(
                merkleService.executeMarketOrder(order)
            ).rejects.toThrow();
        });
    });

    describe('Price Subscription Tests', () => {
        it('should receive price updates', (done) => {
            const symbol = 'ETH/USDC';
            
            merkleService.subscribeToPriceUpdates(symbol, (price) => {
                expect(price).toBeGreaterThan(0);
                done();
            });

            // 模拟价格更新
            setTimeout(() => {
                TestUtils.simulatePriceChange(symbol, 2200);
            }, 1000);
        });

        it('should handle connection errors', (done) => {
            const symbol = 'INVALID/PAIR';
            
            merkleService.subscribeToPriceUpdates(symbol, () => {}, (error) => {
                expect(error).toBeTruthy();
                done();
            });
        });
    });

    describe('Hedge Integration Tests', () => {
        it('should create hedge position based on credit score', async () => {
            const borrowerId = testAccounts[1].address().hex();
            const creditScore = 550;
            const loanAmount = 50000;

            await hedgeService.evaluateAndHedge(
                borrowerId,
                creditScore,
                loanAmount
            );

            const positions = hedgeService.getPositions();
            expect(positions.length).toBeGreaterThan(0);
            expect(positions[0].status).toBe('open');
        });

        it('should adjust hedge ratio on credit score change', async () => {
            const borrowerId = testAccounts[1].address().hex();
            const initialScore = 650;
            const newScore = 500;
            const loanAmount = 50000;

            // 创建初始对冲位置
            await hedgeService.evaluateAndHedge(
                borrowerId,
                initialScore,
                loanAmount
            );

            const initialPositions = hedgeService.getPositions();
            const initialRatio = initialPositions[0].hedgeRatio;

            // 降低信用分
            await TestUtils.simulateCreditScoreChange(borrowerId, newScore);
            await hedgeService.evaluateAndHedge(
                borrowerId,
                newScore,
                loanAmount
            );

            const updatedPositions = hedgeService.getPositions();
            expect(updatedPositions[0].hedgeRatio).toBeGreaterThan(initialRatio);
        });

        it('should close hedge position on credit score recovery', async () => {
            const borrowerId = testAccounts[1].address().hex();
            const initialScore = 550;
            const recoveredScore = 750;
            const loanAmount = 50000;

            // 创建对冲位置
            await hedgeService.evaluateAndHedge(
                borrowerId,
                initialScore,
                loanAmount
            );

            // 提高信用分
            await TestUtils.simulateCreditScoreChange(borrowerId, recoveredScore);
            await hedgeService.evaluateAndHedge(
                borrowerId,
                recoveredScore,
                loanAmount
            );

            const positions = hedgeService.getPositions();
            expect(positions[0].status).toBe('closed');
        });
    });

    describe('Performance Tests', () => {
        it('should handle multiple concurrent orders', async () => {
            const orders = Array(5).fill(null).map(() => ({
                symbol: 'ETH/USDC',
                side: 'sell',
                amount: 0.1,
                type: 'market'
            }));

            const results = await Promise.all(
                orders.map(order => merkleService.executeMarketOrder(order))
            );

            results.forEach(result => {
                expect(result.status).toBe('filled');
            });
        });

        it('should maintain price subscription under load', (done) => {
            const symbols = ['ETH/USDC', 'BTC/USDC'];
            let updateCount = 0;

            symbols.forEach(symbol => {
                merkleService.subscribeToPriceUpdates(symbol, () => {
                    updateCount++;
                    if (updateCount >= symbols.length) {
                        done();
                    }
                });
            });

            // 模拟多个价格更新
            symbols.forEach(symbol => {
                TestUtils.simulatePriceChange(symbol, 2200);
            });
        });
    });
});
