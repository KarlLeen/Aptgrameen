import { AptosContractService } from '../lib/merkle/AptosContractService';
import { AptosAccount } from 'aptos';
import { ContractConfig } from '../lib/merkle/types';
import * as fs from 'fs';

describe('Contract Integration Tests', () => {
    let contractService: AptosContractService;
    let testAccount: AptosAccount;
    let contractConfig: ContractConfig;

    beforeAll(async () => {
        contractService = AptosContractService.getInstance(
            'https://fullnode.testnet.aptoslabs.com'
        );
        
        testAccount = new AptosAccount();
        
        // 设置合约配置
        contractConfig = {
            name: 'credit_pool',
            address: testAccount.address().hex(),
            version: '1.0.0',
            functions: [
                {
                    name: 'initialize_pool',
                    visibility: 'public',
                    isEntry: true,
                    parameters: [
                        { name: 'initial_amount', type: 'u64' }
                    ]
                },
                {
                    name: 'deposit',
                    visibility: 'public',
                    isEntry: true,
                    parameters: [
                        { name: 'amount', type: 'u64' }
                    ]
                }
            ],
            events: [
                {
                    name: 'PoolInitialized',
                    type: 'u64',
                    data: null,
                    sequenceNumber: '0',
                    timestamp: 0
                },
                {
                    name: 'Deposit',
                    type: 'u64',
                    data: null,
                    sequenceNumber: '0',
                    timestamp: 0
                }
            ]
        };
    });

    describe('Contract Deployment', () => {
        it('should deploy contract successfully', async () => {
            const moduleBytes = fs.readFileSync('../move/build/APL/bytecode_modules/credit_pool.mv');
            
            const tx = await contractService.deployContract(
                testAccount,
                moduleBytes,
                contractConfig
            );

            expect(tx.hash).toBeTruthy();
            expect(tx.hash).toBeTruthy();

            // 验证合约配置已保存
            const savedConfig = contractService.getContractConfig('credit_pool');
            expect(savedConfig).toBeDefined();
            expect(savedConfig?.address).toBe(testAccount.address().hex());
        });

        it('should initialize pool', async () => {
            const initialAmount = 1000000;
            
            const tx = await contractService.callFunction(
                testAccount,
                'credit_pool',
                'initialize_pool',
                [initialAmount]
            );

            expect(tx.hash).toBeTruthy();

            // 验证池状态
            const poolState = await contractService.queryState(
                'credit_pool',
                'Pool',
                testAccount.address()
            );
            expect(poolState.data.total_amount).toBe(initialAmount.toString());
        });
    });

    describe('Contract Events', () => {
        it('should emit and receive events', (done) => {
            const depositAmount = 500000;
            let eventReceived = false;

            // 订阅存款事件
            contractService.subscribeToEvents('credit_pool', 'Deposit', (event) => {
                expect(event.data).toBe(depositAmount.toString());
                eventReceived = true;
                done();
            });

            // 执行存款
            contractService.callFunction(
                testAccount,
                'credit_pool',
                'deposit',
                [depositAmount]
            );

            // 设置超时
            setTimeout(() => {
                if (!eventReceived) {
                    done(new Error('Event not received within timeout'));
                }
            }, 10000);
        });

        it('should handle multiple event subscriptions', (done) => {
            const events = new Set<string>();
            const requiredEvents = ['PoolInitialized', 'Deposit'];
            
            requiredEvents.forEach(eventName => {
                contractService.subscribeToEvents('credit_pool', eventName, (event) => {
                    events.add(eventName);
                    
                    if (events.size === requiredEvents.length) {
                        done();
                    }
                });
            });

            // 初始化池并存款
            contractService.callFunction(
                testAccount,
                'credit_pool',
                'initialize_pool',
                [1000000]
            ).then(() => {
                return contractService.callFunction(
                    testAccount,
                    'credit_pool',
                    'deposit',
                    [500000]
                );
            });

            // 设置超时
            setTimeout(() => {
                if (events.size !== requiredEvents.length) {
                    done(new Error('Not all events received within timeout'));
                }
            }, 10000);
        });
    });

    describe('Contract State', () => {
        it('should query contract state', async () => {
            const state = await contractService.queryState(
                'credit_pool',
                'Pool',
                testAccount.address()
            );

            expect(state).toBeDefined();
            expect(state.data.total_amount).toBeDefined();
        });

        it('should handle state updates', async () => {
            const initialState = await contractService.queryState(
                'credit_pool',
                'Pool',
                testAccount.address()
            );

            const depositAmount = 100000;
            await contractService.callFunction(
                testAccount,
                'credit_pool',
                'deposit',
                [depositAmount]
            );

            const updatedState = await contractService.queryState(
                'credit_pool',
                'Pool',
                testAccount.address()
            );

            const initialTotal = BigInt(initialState.data.total_amount);
            const updatedTotal = BigInt(updatedState.data.total_amount);
            expect(updatedTotal - initialTotal).toBe(BigInt(depositAmount));
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid function calls', async () => {
            await expect(
                contractService.callFunction(
                    testAccount,
                    'credit_pool',
                    'non_existent_function',
                    []
                )
            ).rejects.toThrow();
        });

        it('should handle invalid state queries', async () => {
            await expect(
                contractService.queryState(
                    'credit_pool',
                    'NonExistentResource',
                    testAccount.address()
                )
            ).rejects.toThrow();
        });

        it('should handle transaction timeouts', async () => {
            const tx = await contractService.callFunction(
                testAccount,
                'credit_pool',
                'deposit',
                [100000]
            );

            await expect(
                contractService.waitForTransaction(tx.hash, 1) // 1ms timeout
            ).rejects.toThrow();
        });
    });
});
