import { AptosTokenService } from '../lib/merkle/AptosTokenService';
import { AptosAccount, HexString } from 'aptos';

async function aptosTokenExample() {
    // 初始化 AptosTokenService
    const tokenService = AptosTokenService.getInstance(
        'https://fullnode.testnet.aptoslabs.com',
        'https://faucet.testnet.aptoslabs.com'
    );

    try {
        // 创建测试账户
        const account1 = new AptosAccount();
        const account2 = new AptosAccount();

        console.log('Account 1 address:', account1.address().hex());
        console.log('Account 2 address:', account2.address().hex());

        // 获取支持的代币列表
        const supportedTokens = tokenService.getSupportedTokens();
        console.log('Supported tokens:', supportedTokens);

        // 为账户铸造测试代币
        for (const symbol of supportedTokens) {
            await tokenService.mintTestTokens(account1.address().hex(), symbol, 1000);
            console.log(`Minted 1000 ${symbol} to account 1`);
        }

        // 获取代币信息
        for (const symbol of supportedTokens) {
            const tokenInfo = await tokenService.getTokenInfo(symbol);
            console.log(`${symbol} info:`, tokenInfo);
        }

        // 获取账户余额
        for (const symbol of supportedTokens) {
            const balance = await tokenService.getTokenBalance(account1.address().hex(), symbol);
            console.log(`Account 1 ${symbol} balance:`, balance.toString());
        }

        // 转账测试
        const transferAmount = 100;
        const symbol = 'APT';
        await tokenService.transferTokens(
            account1.address(),
            account2.address(),
            symbol,
            transferAmount
        );
        console.log(`Transferred ${transferAmount} ${symbol} from account 1 to account 2`);

        // 验证转账结果
        const account1Balance = await tokenService.getTokenBalance(account1.address().hex(), symbol);
        const account2Balance = await tokenService.getTokenBalance(account2.address().hex(), symbol);
        
        console.log(`After transfer:`);
        console.log(`Account 1 ${symbol} balance:`, account1Balance.toString());
        console.log(`Account 2 ${symbol} balance:`, account2Balance.toString());

    } catch (error) {
        console.error('Error:', error);
    }
}

// 运行示例
aptosTokenExample().catch(console.error);
