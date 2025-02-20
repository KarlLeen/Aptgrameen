export interface MerkleConfig {
    apiKey: string;
    apiSecret: string;
    wsUrl: string;
    restUrl: string;
}

export interface TestnetConfig {
    isTestnet: true;
    nodeUrl: string;
    faucetUrl: string;
    wsUrl: string;
}

export interface TokenConfig {
    symbol: string;
    decimals: number;
    moduleAddress: string;
    moduleName: string;
    structName: string;
}

export interface TokenInfo {
    symbol: string;
    decimals: number;
    supply: bigint;
    moduleAddress: string;
    resourceType: string;
}

export interface TokenBalance {
    symbol: string;
    balance: bigint;
    usdValue: number;
}

export interface ContractConfig {
    name: string;
    address: string;
    version: string;
    functions: ContractFunction[];
    events: ContractEvent[];
    metadata?: Record<string, any>;
}

export interface ContractFunction {
    name: string;
    visibility: 'public' | 'private' | 'friend';
    isEntry: boolean;
    parameters: {
        name: string;
        type: string;
    }[];
    returnType?: string;
}

export interface ContractEvent {
    name: string;
    type: string;
    data: any;
    sequenceNumber: string;
    timestamp: number;
}

export type RiskLevel = 'low' | 'medium' | 'high';

export interface CreditScoreConfig {
    baseScore: number;
    minScore: number;
    maxScore: number;
    updateFrequency: number;
    riskLevels: Record<RiskLevel, { min: number; max: number }>;
    weights: {
        paymentHistory: number;
        creditUtilization: number;
        creditHistory: number;
        newCredit: number;
        creditMix: number;
    };
}

export interface CreditScoreData {
    address: string;
    score: number;
    lastUpdate: number;
    history: Array<{
        timestamp: number;
        score: number;
        factors: Record<string, number>;
    }>;
    factors: {
        paymentHistory: number;
        creditUtilization: number;
        creditHistory: number;
        newCredit: number;
        creditMix: number;
    };
    riskLevel: RiskLevel;
    config: CreditScoreConfig;
}

export interface CreditScoreEvent {
    type: 'score_update';
    address: string;
    score: number;
    previousScore: number;
    riskLevel: RiskLevel;
    timestamp: number;
    factors: Record<string, number>;
}

export interface MarketOrder {
    symbol: string;
    side: 'buy' | 'sell';
    amount: number;
    price: number;
    type: 'market' | 'limit';
}

export interface OrderResponse {
    orderId: string;
    status: 'open' | 'filled' | 'cancelled' | 'failed';
    filledAmount: number;
    avgPrice: number;
    timestamp: number;
}

export interface PriceSubscription {
    pair: string;
    callback: (price: PriceUpdate) => void;
}

export interface PriceUpdate {
    pair: string;
    price: number;
    timestamp: number;
    change24h: number;
    volume24h: number;
}

export interface RiskMetrics {
    volatility24h: number;
    liquidityScore: number;
    marketDepth: number;
}

export interface LoanParameters {
    collateralAsset: string;
    loanAsset: string;
    collateralAmount: number;
    loanAmount: number;
    interestRate: number;
    duration: number;
}
