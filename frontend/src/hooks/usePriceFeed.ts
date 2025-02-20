import { useState, useEffect, useCallback } from 'react';

export interface PriceData {
    pair: string;
    price: number;
    timestamp: number;
    change24h: number;
    volume24h: number;
}

const MERKLE_WS_URL = 'wss://api.merkle.io/v1/ws';

export const usePriceFeed = (pair: string) => {
    const [priceData, setPriceData] = useState<PriceData | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const subscribePriceFeed = useCallback(() => {
        try {
            const ws = new WebSocket(MERKLE_WS_URL);

            ws.onopen = () => {
                setIsConnected(true);
                setError(null);
                ws.send(JSON.stringify({
                    type: 'subscribe',
                    channel: 'price',
                    pair: pair
                }));
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'price') {
                        setPriceData({
                            pair: data.pair,
                            price: parseFloat(data.price),
                            timestamp: data.timestamp,
                            change24h: parseFloat(data.change_24h),
                            volume24h: parseFloat(data.volume_24h)
                        });
                    }
                } catch (err) {
                    console.error('Failed to parse price data:', err);
                }
            };

            ws.onerror = (event) => {
                setError('WebSocket connection error');
                setIsConnected(false);
                console.error('WebSocket error:', event);
            };

            ws.onclose = () => {
                setIsConnected(false);
                // 尝试重新连接
                setTimeout(subscribePriceFeed, 5000);
            };

            return () => {
                ws.close();
            };
        } catch (err) {
            setError('Failed to establish WebSocket connection');
            console.error('Connection setup error:', err);
        }
    }, [pair]);

    useEffect(() => {
        const cleanup = subscribePriceFeed();
        return () => {
            if (cleanup) cleanup();
        };
    }, [subscribePriceFeed]);

    return { priceData, isConnected, error };
};
