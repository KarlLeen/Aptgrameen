import { AptosClient, FaucetClient, Types } from 'aptos';
import { APTOS_NODE_URL, APTOS_FAUCET_URL, TEST_CONFIG } from '../config';

export class TestUtils {
    private static client: AptosClient;
    private static faucetClient: FaucetClient;

    static initialize() {
        this.client = new AptosClient(APTOS_NODE_URL);
        this.faucetClient = new FaucetClient(APTOS_NODE_URL, APTOS_FAUCET_URL);
    }

    // 创建测试账户
    static async createTestAccount(): Promise<{
        address: string;
        privateKey: string;
        publicKey: string;
    }> {
        const account = new aptos.Account();
        await this.faucetClient.fundAccount(account.address(), 100_000_000);
        return {
            address: account.address().hex(),
            privateKey: account.privateKey.hex(),
            publicKey: account.publicKey.hex()
        };
    }

    // 部署测试合约
    static async deployTestContract(
        account: Types.Account,
        moduleBytes: Uint8Array
    ): Promise<string> {
        const txnHash = await this.client.publishPackage(
            account,
            moduleBytes,
            []
        );
        await this.client.waitForTransaction(txnHash);
        return txnHash;
    }

    // 模拟信用分变化
    static async simulateCreditScoreChange(
        borrowerId: string,
        newScore: number
    ): Promise<void> {
        // 这里应该调用合约来更新信用分
        console.log(`Simulating credit score change for ${borrowerId}: ${newScore}`);
    }

    // 模拟贷款申请
    static async simulateLoanApplication(
        borrowerId: string,
        amount: number,
        duration: number
    ): Promise<{
        loanId: string;
        status: 'approved' | 'rejected';
        reason?: string;
    }> {
        const mockResponse = {
            loanId: `LOAN_${Date.now()}`,
            status: amount <= 100000 ? 'approved' : 'rejected',
            reason: amount > 100000 ? 'Amount exceeds maximum limit' : undefined
        };
        return mockResponse;
    }

    // 模拟市场价格变化
    static async simulatePriceChange(
        pair: string,
        newPrice: number
    ): Promise<void> {
        TEST_CONFIG.mockPrices[pair] = newPrice;
        console.log(`Simulated price change for ${pair}: ${newPrice}`);
    }

    // 获取测试账户余额
    static async getAccountBalance(
        address: string
    ): Promise<number> {
        const resources = await this.client.getAccountResources(address);
        const aptosCoin = resources.find(
            (r) => r.type === '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>'
        );
        return parseInt(aptosCoin?.data?.coin?.value || '0');
    }

    // 模拟交易
    static async simulateTransaction(
        sender: Types.Account,
        payload: Types.TransactionPayload
    ): Promise<Types.UserTransaction> {
        const pendingTxn = await this.client.simulateTransaction(sender, payload);
        return pendingTxn[0];
    }

    // 创建测试环境
    static async setupTestEnvironment(): Promise<{
        accounts: Types.Account[];
        moduleAddress: string;
    }> {
        // 创建测试账户
        const accounts = await Promise.all(
            Array(3).fill(0).map(() => this.createTestAccount())
        );

        // 部署测试合约
        const moduleAddress = accounts[0].address().hex();
        
        // 初始化测试数据
        await Promise.all([
            this.simulateCreditScoreChange(accounts[1].address().hex(), 750),
            this.simulateCreditScoreChange(accounts[2].address().hex(), 600)
        ]);

        return {
            accounts,
            moduleAddress
        };
    }

    // 清理测试环境
    static async cleanupTestEnvironment(): Promise<void> {
        // 清理测试数据
        console.log('Cleaning up test environment...');
    }

    // 生成测试事件
    static async generateTestEvents(): Promise<void> {
        const events = [
            { type: 'loan_created', amount: 10000 },
            { type: 'credit_score_changed', oldScore: 750, newScore: 600 },
            { type: 'hedge_triggered', amount: 5000 }
        ];

        for (const event of events) {
            console.log(`Generated test event: ${JSON.stringify(event)}`);
            // 这里可以触发实际的事件
        }
    }
}
