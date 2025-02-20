// Network Configuration
export const APTOS_NODE_URL = 'https://fullnode.testnet.aptoslabs.com';
export const APTOS_FAUCET_URL = 'https://faucet.testnet.aptoslabs.com';
export const MODULE_ADDRESS = process.env.REACT_APP_MODULE_ADDRESS || '0x1234...'; // 替换为实际部署的合约地址

// Merkle Trade Configuration
export const MERKLE_API_URL = 'https://api.merkle.io';
export const MERKLE_WS_URL = 'wss://api.merkle.io';

// Application Configuration
export const DEFAULT_HEDGE_CONFIG = {
    creditScoreThreshold: 600,
    hedgeRatio: 0.5,
    maxHedgeAmount: 100000,
    minCreditScoreToClose: 700,
    rebalanceInterval: 60000
};

export const LOAN_CONFIG = {
    minAmount: 1000,
    maxAmount: 1000000,
    minDuration: 7, // days
    maxDuration: 365, // days
    defaultInterestRate: 0.05
};

// Feature Flags
export const FEATURES = {
    enableHedging: true,
    enableAutoLiquidation: true,
    enableCreditScoring: true,
    enableTestMode: true // 测试模式开关
};

// Test Configuration
export const TEST_CONFIG = {
    mockWallet: {
        address: '0xtest...',
        publicKey: '0xtest_pub...',
        privateKey: '0xtest_priv...' // 仅用于测试
    },
    testAccounts: [
        {
            address: '0xtest1...',
            balance: '1000000',
            creditScore: 750
        },
        {
            address: '0xtest2...',
            balance: '500000',
            creditScore: 600
        }
    ],
    mockPrices: {
        'ETH/USDC': 2000,
        'BTC/USDC': 30000
    }
};
