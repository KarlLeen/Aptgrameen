export interface HedgeMetrics {
    totalHedgeAmount: number;
    activePositions: number;
    averageCreditScore: number;
    totalPnL: number;
    hedgeRatio: number;
    currentRisk: 'low' | 'medium' | 'high';
}

export interface HedgeAlert {
    type: 'warning' | 'danger' | 'info';
    message: string;
    timestamp: number;
    positionId?: string;
    metrics?: Partial<HedgeMetrics>;
}

export interface HedgeStrategy {
    name: string;
    description: string;
    config: {
        creditScoreThreshold: number;
        hedgeRatio: number;
        maxHedgeAmount: number;
        minCreditScoreToClose: number;
        rebalanceInterval: number;
    };
}

export interface HedgeReport {
    startTime: number;
    endTime: number;
    metrics: HedgeMetrics;
    alerts: HedgeAlert[];
    recommendations: string[];
    positions: {
        open: number;
        closed: number;
        pnl: number;
    };
}
