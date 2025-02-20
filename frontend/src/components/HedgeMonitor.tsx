import React, { useEffect, useState } from 'react';
import { HedgeService } from '../lib/hedge/HedgeService';
import { HedgeMetrics, HedgeAlert } from '../lib/hedge/types';
import { MerkleService } from '../lib/merkle/MerkleService';

interface Props {
    merkleService: MerkleService;
}

export const HedgeMonitor: React.FC<Props> = ({ merkleService }) => {
    const [metrics, setMetrics] = useState<HedgeMetrics | null>(null);
    const [alerts, setAlerts] = useState<HedgeAlert[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hedgeService] = useState(() => 
        HedgeService.getInstance(merkleService)
    );

    useEffect(() => {
        const updateMetrics = () => {
            const positions = hedgeService.getPositions();
            const activePositions = positions.filter(p => p.status === 'open');
            
            const metrics: HedgeMetrics = {
                totalHedgeAmount: activePositions.reduce((sum, p) => sum + p.amount, 0),
                activePositions: activePositions.length,
                averageCreditScore: activePositions.reduce((sum, p) => sum + p.creditScore, 0) / 
                                  (activePositions.length || 1),
                totalPnL: positions.reduce((sum, p) => sum + (p.pnl || 0), 0),
                hedgeRatio: hedgeService.getConfig().hedgeRatio,
                currentRisk: calculateRiskLevel(activePositions)
            };

            setMetrics(metrics);
            setIsLoading(false);
        };

        const intervalId = setInterval(updateMetrics, 5000); // 每5秒更新一次
        updateMetrics(); // 初始更新

        return () => clearInterval(intervalId);
    }, [hedgeService]);

    const calculateRiskLevel = (positions: any[]): 'low' | 'medium' | 'high' => {
        if (positions.length === 0) return 'low';
        
        const avgCreditScore = positions.reduce((sum, p) => sum + p.creditScore, 0) / 
                              positions.length;
        
        if (avgCreditScore < 500) return 'high';
        if (avgCreditScore < 650) return 'medium';
        return 'low';
    };

    if (isLoading) {
        return <div>Loading hedge metrics...</div>;
    }

    return (
        <div className="p-4 bg-white rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Hedge Monitor</h2>
            
            {/* 风险指标 */}
            {metrics && (
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className={`p-3 rounded ${
                        metrics.currentRisk === 'high' ? 'bg-red-100' :
                        metrics.currentRisk === 'medium' ? 'bg-yellow-100' :
                        'bg-green-100'
                    }`}>
                        <div className="text-sm text-gray-600">Current Risk</div>
                        <div className="text-lg font-semibold">
                            {metrics.currentRisk.toUpperCase()}
                        </div>
                    </div>
                    
                    <div className="p-3 bg-blue-100 rounded">
                        <div className="text-sm text-gray-600">Active Positions</div>
                        <div className="text-lg font-semibold">
                            {metrics.activePositions}
                        </div>
                    </div>
                    
                    <div className="p-3 bg-purple-100 rounded">
                        <div className="text-sm text-gray-600">Total PnL</div>
                        <div className="text-lg font-semibold">
                            ${metrics.totalPnL.toFixed(2)}
                        </div>
                    </div>
                </div>
            )}
            
            {/* 活跃对冲位置 */}
            <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Active Hedge Positions</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="px-4 py-2">Position ID</th>
                                <th className="px-4 py-2">Amount</th>
                                <th className="px-4 py-2">Open Price</th>
                                <th className="px-4 py-2">Credit Score</th>
                                <th className="px-4 py-2">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {hedgeService.getPositions()
                                .filter(p => p.status === 'open')
                                .map(position => (
                                    <tr key={position.id}>
                                        <td className="px-4 py-2">{position.id}</td>
                                        <td className="px-4 py-2">
                                            ${position.amount.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-2">
                                            ${position.openPrice.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-2">
                                            {position.creditScore}
                                        </td>
                                        <td className="px-4 py-2">
                                            <span className="px-2 py-1 rounded bg-green-100 text-green-800">
                                                {position.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* 警报列表 */}
            {alerts.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold mb-3">Recent Alerts</h3>
                    <div className="space-y-2">
                        {alerts.map((alert, index) => (
                            <div
                                key={index}
                                className={`p-3 rounded ${
                                    alert.type === 'danger' ? 'bg-red-100 text-red-800' :
                                    alert.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-blue-100 text-blue-800'
                                }`}
                            >
                                <div className="font-medium">{alert.message}</div>
                                <div className="text-sm">
                                    {new Date(alert.timestamp).toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
