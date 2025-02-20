import { MerkleService } from '../lib/merkle/MerkleService';
import { TestnetConfig } from '../lib/merkle/types';

// Testnet 配置
const testnetConfig: TestnetConfig = {
    isTestnet: true,
    nodeUrl: 'https://fullnode.testnet.aptoslabs.com',
    faucetUrl: 'https://faucet.testnet.aptoslabs.com',
    wsUrl: 'wss://testnet-ws.aptoslabs.com'
};

async function testnetExample() {
    // 初始化 MerkleService 使用 Testnet
    const merkleService = MerkleService.getInstance(testnetConfig);

    // 订阅价格更新
    merkleService.subscribeToPriceUpdates({
        pair: 'ETH/USDC',
        callback: (update) => {
            console.log('Price update:', update);
        }
    });

    // 执行市场订单
    const order = {
        symbol: 'ETH/USDC',
        side: 'buy',
        amount: 1.0,
        price: 0, // 市价单
        type: 'market'
    };

    try {
        const result = await merkleService.executeMarketOrder(order);
        console.log('Order result:', result);

        // 获取风险指标
        const riskMetrics = await merkleService.calculateRiskMetrics('ETH/USDC');
        console.log('Risk metrics:', riskMetrics);

    } catch (error) {
        console.error('Error:', error);
    }
}

// 运行示例
testnetExample().catch(console.error);
