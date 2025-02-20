import { MerkleService } from '../lib/merkle/MerkleService';
import { TestnetConfig } from '../lib/merkle/types';
import { AptosAccount } from 'aptos';

describe('Token Integration Tests', () => {
    let merkleService: MerkleService;
    let testAccount1: AptosAccount;
    let testAccount2: AptosAccount;

    beforeAll(async () => {
        const testnetConfig: TestnetConfig = {
            isTestnet: true,
            nodeUrl: 'https://fullnode.testnet.aptoslabs.com',
            faucetUrl: 'https://faucet.testnet.aptoslabs.com',
            wsUrl: 'wss://testnet-ws.aptoslabs.com'
        };

        merkleService = MerkleService.getInstance(testnetConfig);
        
        // 创建测试账户
        testAccount1 = new AptosAccount();
        testAccount2 = new AptosAccount();
    });

    describe('Token Management', () => {
        it('should mint test tokens', async () => {
            const symbol = 'APT';
            const amount = 1000;

            const result = await merkleService.mintTestTokens(
                testAccount1.address().hex(),
                symbol,
                amount
            );

            expect(result).toContain('Minted');
            
            const balance = await merkleService.getTokenBalance(
                testAccount1.address().hex(),
                symbol
            );
            
            expect(balance).toBeGreaterThan(BigInt(0));
        });

        it('should check token balance', async () => {
            const symbol = 'USDC';
            const amount = 5000;

            // 先铸造代币
            await merkleService.mintTestTokens(
                testAccount1.address().hex(),
                symbol,
                amount
            );

            // 检查余额
            const balance = await merkleService.getTokenBalance(
                testAccount1.address().hex(),
                symbol
            );

            expect(balance).toBeGreaterThan(BigInt(0));
        });

        it('should subscribe to token price updates', (done) => {
            const pair = 'APT/USDC';
            let updateCount = 0;

            merkleService.subscribeToPriceUpdates({
                pair,
                callback: (update) => {
                    expect(update.price).toBeGreaterThan(0);
                    expect(update.timestamp).toBeGreaterThan(0);
                    updateCount++;

                    if (updateCount >= 2) {
                        done();
                    }
                }
            });
        });

        it('should execute token swap', async () => {
            const order = {
                symbol: 'APT/USDC',
                side: 'sell',
                amount: 10,
                price: 0,
                type: 'market'
            };

            const result = await merkleService.executeMarketOrder(order);
            
            expect(result.status).toBe('filled');
            expect(result.filledAmount).toBe(order.amount);
            expect(result.avgPrice).toBeGreaterThan(0);
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid token symbol', async () => {
            const invalidSymbol = 'INVALID';
            
            await expect(
                merkleService.mintTestTokens(
                    testAccount1.address().hex(),
                    invalidSymbol,
                    1000
                )
            ).rejects.toThrow();
        });

        it('should handle insufficient balance', async () => {
            const order = {
                symbol: 'APT/USDC',
                side: 'sell',
                amount: 1000000, // 大量代币
                price: 0,
                type: 'market'
            };

            await expect(
                merkleService.executeMarketOrder(order)
            ).rejects.toThrow();
        });
    });

    describe('Price Feed', () => {
        it('should maintain consistent price updates', async () => {
            const pair = 'APT/USDC';
            const prices: number[] = [];

            return new Promise<void>((resolve) => {
                merkleService.subscribeToPriceUpdates({
                    pair,
                    callback: (update) => {
                        prices.push(update.price);

                        if (prices.length >= 3) {
                            // 检查价格变化是否在合理范围内
                            for (let i = 1; i < prices.length; i++) {
                                const change = Math.abs(prices[i] - prices[i-1]) / prices[i-1];
                                expect(change).toBeLessThan(0.1); // 变化不超过 10%
                            }
                            resolve();
                        }
                    }
                });
            });
        });

        it('should handle multiple price subscriptions', async () => {
            const pairs = ['APT/USDC', 'USDC/APT'];
            const updates = new Map<string, number>();

            return new Promise<void>((resolve) => {
                pairs.forEach(pair => {
                    merkleService.subscribeToPriceUpdates({
                        pair,
                        callback: (update) => {
                            updates.set(pair, (updates.get(pair) || 0) + 1);

                            if (Array.from(updates.values()).every(count => count >= 2)) {
                                resolve();
                            }
                        }
                    });
                });
            });
        });
    });
});
