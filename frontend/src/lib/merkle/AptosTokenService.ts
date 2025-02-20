import { AptosClient, CoinClient, FaucetClient, Types } from 'aptos';
import { TokenConfig, TokenInfo } from './types';

export class AptosTokenService {
    private static instance: AptosTokenService;
    private aptosClient: AptosClient;
    private coinClient: CoinClient;
    private faucetClient: FaucetClient;
    private tokenConfigs: Map<string, TokenConfig>;

    private constructor(nodeUrl: string, faucetUrl: string) {
        this.aptosClient = new AptosClient(nodeUrl);
        this.coinClient = new CoinClient(this.aptosClient);
        this.faucetClient = new FaucetClient(nodeUrl, faucetUrl);
        this.tokenConfigs = new Map();

        // 初始化代币配置
        this.initializeTokenConfigs();
    }

    public static getInstance(nodeUrl: string, faucetUrl: string): AptosTokenService {
        if (!AptosTokenService.instance) {
            AptosTokenService.instance = new AptosTokenService(nodeUrl, faucetUrl);
        }
        return AptosTokenService.instance;
    }

    private initializeTokenConfigs() {
        // 添加测试网代币配置
        this.tokenConfigs.set('APT', {
            symbol: 'APT',
            decimals: 8,
            moduleAddress: '0x1',
            moduleName: 'aptos_coin',
            structName: 'AptosCoin'
        });

        this.tokenConfigs.set('USDC', {
            symbol: 'USDC',
            decimals: 6,
            moduleAddress: '0x2',
            moduleName: 'test_usdc',
            structName: 'TestUSDC'
        });
    }

    public async getTokenBalance(account: string, symbol: string): Promise<bigint> {
        const config = this.tokenConfigs.get(symbol);
        if (!config) {
            throw new Error(`Token ${symbol} not supported`);
        }

        try {
            const balance = await this.coinClient.checkBalance(account);
            return balance;
        } catch (error) {
            console.error(`Failed to get ${symbol} balance:`, error);
            throw error;
        }
    }

    public async mintTestTokens(account: string, symbol: string, amount: number): Promise<string> {
        const config = this.tokenConfigs.get(symbol);
        if (!config) {
            throw new Error(`Token ${symbol} not supported`);
        }

        try {
            // 在测试网上铸造代币
            await this.faucetClient.fundAccount(account, amount * Math.pow(10, config.decimals));
            return `Minted ${amount} ${symbol} to ${account}`;
        } catch (error) {
            console.error(`Failed to mint ${symbol}:`, error);
            throw error;
        }
    }

    public async getTokenInfo(symbol: string): Promise<TokenInfo> {
        const config = this.tokenConfigs.get(symbol);
        if (!config) {
            throw new Error(`Token ${symbol} not supported`);
        }

        try {
            const resourceType = `${config.moduleAddress}::${config.moduleName}::${config.structName}`;
            const tokenInfo = await this.aptosClient.getAccountResource(
                config.moduleAddress,
                resourceType
            );

            return {
                symbol: config.symbol,
                decimals: config.decimals,
                supply: BigInt(tokenInfo.data.supply),
                moduleAddress: config.moduleAddress,
                resourceType
            };
        } catch (error) {
            console.error(`Failed to get ${symbol} info:`, error);
            throw error;
        }
    }

    public async transferTokens(
        from: Types.AccountAddress,
        to: Types.AccountAddress,
        symbol: string,
        amount: number
    ): Promise<Types.Transaction> {
        const config = this.tokenConfigs.get(symbol);
        if (!config) {
            throw new Error(`Token ${symbol} not supported`);
        }

        try {
            const tx = await this.coinClient.transfer(
                from,
                to,
                amount * Math.pow(10, config.decimals)
            );
            return tx;
        } catch (error) {
            console.error(`Failed to transfer ${symbol}:`, error);
            throw error;
        }
    }

    public getSupportedTokens(): string[] {
        return Array.from(this.tokenConfigs.keys());
    }

    public getTokenConfig(symbol: string): TokenConfig | undefined {
        return this.tokenConfigs.get(symbol);
    }
}
