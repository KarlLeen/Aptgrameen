import { Types, AptosClient, AptosAccount, TxnBuilderTypes, BCS } from 'aptos';

export interface TestConfig {
    nodeUrl: string;
    mockPrices: {
        'ETH/USDC': number;
        'BTC/USDC': number;
    };
}

export const TEST_CONFIG: TestConfig = {
    nodeUrl: 'https://fullnode.testnet.aptoslabs.com',
    mockPrices: {
        'ETH/USDC': 2000,
        'BTC/USDC': 40000
    }
};

export class TestUtils {
    private client: AptosClient;

    constructor() {
        this.client = new AptosClient(TEST_CONFIG.nodeUrl);
    }

    public async createTestAccount(): Promise<AptosAccount> {
        return new AptosAccount();
    }

    public async fundAccount(
        account: AptosAccount,
        amount: number = 100000000
    ): Promise<void> {
        // 在测试网上给账户充值
        const faucetClient = new AptosClient('https://faucet.testnet.aptoslabs.com');
        await faucetClient.fundAccount(account.address(), amount);
    }

    public async getAccountBalance(address: string): Promise<bigint> {
        try {
            const resource = await this.client.getAccountResource(
                address,
                '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>'
            );
            const coinStore = resource.data as { coin: { value: string } };
            return BigInt(coinStore.coin.value);
        } catch {
            return BigInt(0);
        }
    }

    public async simulateTransactionResult(
        account: AptosAccount,
        success: boolean = true,
        reason?: string
    ): Promise<{ loanId: string; status: 'approved' | 'rejected'; reason?: string }> {
        const mockResponse = {
            loanId: '0x123',
            status: success ? 'approved' as const : 'rejected' as const,
            reason
        };
        return mockResponse;
    }

    public mockPriceUpdate(pair: 'ETH/USDC' | 'BTC/USDC', newPrice: number): void {
        TEST_CONFIG.mockPrices[pair] = newPrice;
    }

    public async simulateTransaction(
        sender: AptosAccount,
        payload: TxnBuilderTypes.TransactionPayload
    ): Promise<Types.Transaction> {
        const rawTxn = await this.client.generateTransaction(sender.address(), payload);
        const signedTxn = await this.client.signTransaction(sender, rawTxn);
        const pendingTxn = await this.client.submitTransaction(signedTxn);
        return this.client.waitForTransactionWithResult(pendingTxn.hash);
    }

    public async simulateBatchTransactions(
        accounts: AptosAccount[]
    ): Promise<Types.Transaction[]> {
        if (accounts.length < 3) {
            throw new Error('Need at least 3 accounts for batch simulation');
        }

        const moduleAddress = accounts[0].address().toString();
        
        // 模拟一批交易
        const transactions = await Promise.all([
            this.simulateCreditScoreChange(accounts[1].address().toString(), 750),
            this.simulateCreditScoreChange(accounts[2].address().toString(), 600)
        ]);

        return transactions;
    }

    private async simulateCreditScoreChange(
        address: string,
        newScore: number
    ): Promise<Types.Transaction> {
        // 创建一个模拟交易
        const mockTxn: Types.Transaction = {
            type: 'user_transaction',
            version: '1000',
            hash: `0x${Math.random().toString(16).substr(2, 40)}`,
            state_change_hash: '0x1',
            event_root_hash: '0x2',
            state_checkpoint_hash: '0x3',
            gas_used: '1000',
            success: true,
            vm_status: 'Executed successfully',
            accumulator_root_hash: '0x4',
            changes: [],
            timestamp: Date.now().toString(),
            sender: address,
            sequence_number: '1',
            max_gas_amount: '2000',
            gas_unit_price: '1',
            expiration_timestamp_secs: (Date.now() + 3600000).toString(),
            payload: {
                function: '0x1::credit_score::update_score',
                type_arguments: [],
                arguments: [address, newScore.toString()]
            },
            signature: {
                type: 'ed25519_signature',
                public_key: '0x5',
                signature: '0x6'
            }
        };

        return mockTxn;
    }

    public async delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export class MockWebSocket {
    private listeners: { [event: string]: ((data: any) => void)[] } = {};

    constructor() {
        this.listeners = {};
    }

    public addEventListener(event: string, callback: (data: any) => void): void {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    public removeEventListener(event: string, callback: (data: any) => void): void {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    }

    public send(data: any): void {
        // 模拟发送消息
        console.log('MockWebSocket sending:', data);
    }

    public close(): void {
        // 模拟关闭连接
        this.emit('close', {});
    }

    public mockReceiveMessage(data: any): void {
        this.emit('message', { data: JSON.stringify(data) });
    }

    public mockError(error: any): void {
        this.emit('error', error);
    }

    private emit(event: string, data: any): void {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    }
}
