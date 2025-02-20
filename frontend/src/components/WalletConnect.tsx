import React, { useState, useEffect } from 'react';
import { WalletService } from '../lib/wallet/walletService';
import { WalletInfo, WalletType } from '../lib/wallet/types';
import { motion, AnimatePresence } from 'framer-motion';

interface WalletConnectProps {
    moduleAddress: string;
    onConnect?: (account: string) => void;
    onDisconnect?: () => void;
}

export const WalletConnect: React.FC<WalletConnectProps> = ({
    moduleAddress,
    onConnect,
    onDisconnect
}) => {
    const [walletService] = useState(() => WalletService.getInstance(moduleAddress));
    const [wallets, setWallets] = useState<WalletInfo[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [connectedAccount, setConnectedAccount] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setWallets(walletService.getAvailableWallets());
    }, [walletService]);

    const handleConnect = async (type: WalletType) => {
        setIsLoading(true);
        setError(null);
        try {
            await walletService.connectWallet(type);
            const account = await walletService.getConnectedAccount();
            if (account) {
                setConnectedAccount(account);
                onConnect?.(account);
                setIsOpen(false);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to connect wallet');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisconnect = async () => {
        try {
            await walletService.disconnectWallet();
            setConnectedAccount(null);
            onDisconnect?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to disconnect wallet');
        }
    };

    const formatAddress = (address: string): string => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    return (
        <div className="relative">
            {/* 连接按钮 */}
            {!connectedAccount ? (
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg
                             transition-colors duration-200 flex items-center space-x-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>Connect Wallet</span>
                </button>
            ) : (
                <div className="flex items-center space-x-2">
                    <span className="text-gray-700 font-medium">
                        {formatAddress(connectedAccount)}
                    </span>
                    <button
                        onClick={handleDisconnect}
                        className="text-red-600 hover:text-red-700 font-medium"
                    >
                        Disconnect
                    </button>
                </div>
            )}

            {/* 钱包选择模态框 */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
                        onClick={() => setIsOpen(false)}
                    >
                        <motion.div
                            className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-gray-900">
                                    Connect Wallet
                                </h2>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="text-gray-400 hover:text-gray-500"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {error && (
                                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-3">
                                {wallets.map(wallet => (
                                    <button
                                        key={wallet.type}
                                        onClick={() => handleConnect(wallet.type)}
                                        disabled={!wallet.installed || isLoading}
                                        className={`w-full p-4 rounded-lg border transition-colors duration-200
                                                  flex items-center justify-between
                                                  ${wallet.installed
                                                    ? 'hover:border-blue-500 hover:bg-blue-50'
                                                    : 'opacity-50 cursor-not-allowed'}
                                                  ${isLoading ? 'animate-pulse' : ''}`}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <img
                                                src={wallet.icon}
                                                alt={wallet.name}
                                                className="w-8 h-8"
                                            />
                                            <span className="font-medium text-gray-900">
                                                {wallet.name}
                                            </span>
                                        </div>
                                        {!wallet.installed && (
                                            <span className="text-sm text-gray-500">
                                                Not installed
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
