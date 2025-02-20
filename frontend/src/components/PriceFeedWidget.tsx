import React, { useState } from 'react';
import { usePriceFeed, PriceData } from '../hooks/usePriceFeed';
import { motion, AnimatePresence } from 'framer-motion';

interface PriceFeedWidgetProps {
    defaultPair?: string;
    onPriceUpdate?: (price: number) => void;
}

const AVAILABLE_PAIRS = [
    'BTC_USD',
    'ETH_USD',
    'APT_USD',
    'BNB_USD'
];

export const PriceFeedWidget: React.FC<PriceFeedWidgetProps> = ({
    defaultPair = 'BTC_USD',
    onPriceUpdate
}) => {
    const [selectedPair, setSelectedPair] = useState(defaultPair);
    const { priceData, isConnected, error } = usePriceFeed(selectedPair);
    const [previousPrice, setPreviousPrice] = useState<number | null>(null);

    // 当价格更新时调用回调
    React.useEffect(() => {
        if (priceData?.price && onPriceUpdate) {
            onPriceUpdate(priceData.price);
        }
        if (priceData?.price) {
            setPreviousPrice(priceData.price);
        }
    }, [priceData?.price, onPriceUpdate]);

    // 判断价格变化方向
    const getPriceChangeDirection = (current: number, previous: number | null): string => {
        if (!previous) return '';
        return current > previous ? 'up' : current < previous ? 'down' : '';
    };

    const formatPrice = (price: number): string => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(price);
    };

    const formatChange = (change: number): string => {
        const sign = change >= 0 ? '+' : '';
        return `${sign}${change.toFixed(2)}%`;
    };

    return (
        <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-4">
                {/* 标题和连接状态 */}
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">
                        Price Feed
                    </h2>
                    <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${
                            isConnected ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <span className="text-sm text-gray-600">
                            {isConnected ? 'Connected' : 'Disconnected'}
                        </span>
                    </div>
                </div>

                {/* 交易对选择器 */}
                <div className="mb-4">
                    <select
                        value={selectedPair}
                        onChange={(e) => setSelectedPair(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {AVAILABLE_PAIRS.map(pair => (
                            <option key={pair} value={pair}>{pair}</option>
                        ))}
                    </select>
                </div>

                {/* 价格显示 */}
                <AnimatePresence mode="wait">
                    {error ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="p-4 bg-red-100 text-red-700 rounded-md"
                        >
                            {error}
                        </motion.div>
                    ) : priceData ? (
                        <motion.div
                            key={priceData.timestamp}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-4"
                        >
                            {/* 价格 */}
                            <div className="text-center">
                                <motion.div
                                    animate={{
                                        scale: [1, 1.02, 1],
                                        transition: { duration: 0.3 }
                                    }}
                                    className={`text-3xl font-bold ${
                                        getPriceChangeDirection(priceData.price, previousPrice) === 'up'
                                            ? 'text-green-600'
                                            : getPriceChangeDirection(priceData.price, previousPrice) === 'down'
                                            ? 'text-red-600'
                                            : 'text-gray-900'
                                    }`}
                                >
                                    {formatPrice(priceData.price)}
                                </motion.div>
                            </div>

                            {/* 24小时变化和交易量 */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <div className="text-sm text-gray-600">24h Change</div>
                                    <div className={`font-semibold ${
                                        priceData.change24h >= 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                        {formatChange(priceData.change24h)}
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <div className="text-sm text-gray-600">24h Volume</div>
                                    <div className="font-semibold text-gray-900">
                                        {formatPrice(priceData.volume24h)}
                                    </div>
                                </div>
                            </div>

                            {/* 最后更新时间 */}
                            <div className="text-center text-sm text-gray-500">
                                Last updated: {new Date(priceData.timestamp).toLocaleTimeString()}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-center text-gray-600 py-8"
                        >
                            Loading price data...
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
