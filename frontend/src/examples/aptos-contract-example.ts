import { AptosContractService } from '../lib/merkle/AptosContractService';
import { AptosAccount } from 'aptos';
import { ContractConfig } from '../lib/merkle/types';
import * as fs from 'fs';

async function aptosContractExample() {
    // 初始化 AptosContractService
    const contractService = AptosContractService.getInstance(
        'https://fullnode.testnet.aptoslabs.com'
    );

    try {
        // 创建测试账户
        const account = new AptosAccount();
        console.log('Contract deployer address:', account.address().hex());

        // 读取合约字节码
        const moduleBytes = fs.readFileSync('../move/build/APL/bytecode_modules/credit_pool.mv');

        // 合约配置
        const contractConfig: ContractConfig = {
            name: 'credit_pool',
            address: account.address().hex(),
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
                },
                {
                    name: 'withdraw',
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
                },
                {
                    name: 'Withdraw',
                    type: 'u64',
                    data: null,
                    sequenceNumber: '0',
                    timestamp: 0
                }
            ]
        };

        // 部署合约
        console.log('Deploying contract...');
        const deployTx = await contractService.deployContract(
            account,
            moduleBytes,
            contractConfig
        );
        console.log('Contract deployed:', deployTx.hash);

        // 初始化信用池
        console.log('Initializing credit pool...');
        const initTx = await contractService.callFunction(
            account,
            'credit_pool',
            'initialize_pool',
            [1000000] // 初始金额
        );
        console.log('Pool initialized:', initTx.hash);

        // 订阅事件
        contractService.subscribeToEvents('credit_pool', 'PoolInitialized', (event) => {
            console.log('Pool initialized event:', event);
        });

        contractService.subscribeToEvents('credit_pool', 'Deposit', (event) => {
            console.log('Deposit event:', event);
        });

        // 存款
        console.log('Making deposit...');
        const depositTx = await contractService.callFunction(
            account,
            'credit_pool',
            'deposit',
            [500000]
        );
        console.log('Deposit made:', depositTx.hash);

        // 查询状态
        const poolState = await contractService.queryState(
            'credit_pool',
            'Pool',
            account.address()
        );
        console.log('Pool state:', poolState);

        // 等待交易确认
        const confirmedTx = await contractService.waitForTransaction(depositTx.hash);
        console.log('Transaction confirmed:', confirmedTx);

    } catch (error) {
        console.error('Error:', error);
    }
}

// 运行示例
aptosContractExample().catch(console.error);
