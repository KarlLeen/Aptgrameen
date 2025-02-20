import React, { useState, useEffect } from 'react';
import { LoanManager, LoanRequest } from '../lib/loan/LoanManager';
import { MerkleService } from '../lib/merkle/MerkleService';
import { WalletConnect } from './WalletConnect';
import { motion } from 'framer-motion';

interface LoanFormProps {
    merkleConfig: {
        apiKey: string;
        apiSecret: string;
        wsUrl: string;
        restUrl: string;
    };
    moduleAddress: string;
}

export const LoanForm: React.FC<LoanFormProps> = ({
    merkleConfig,
    moduleAddress
}) => {
    const [connectedAccount, setConnectedAccount] = useState<string | null>(null);
    const [loanRequest, setLoanRequest] = useState<Partial<LoanRequest>>({});
    const [currentPrices, setCurrentPrices] = useState<{[key: string]: number}>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const merkleService = MerkleService.getInstance(merkleConfig);
    const loanManager = new LoanManager(merkleService, moduleAddress);

    useEffect(() => {
        if (loanRequest.collateralAsset) {
            const handlePriceUpdate = (price: number) => {
                setCurrentPrices(prev => ({
                    ...prev,
                    [loanRequest.collateralAsset!]: price
                }));
            };

            loanManager.subscribeToPriceUpdates(
                loanRequest.collateralAsset,
                handlePriceUpdate
            );

            return () => {
                loanManager.unsubscribeFromPriceUpdates(
                    loanRequest.collateralAsset,
                    handlePriceUpdate
                );
            };
        }
    }, [loanRequest.collateralAsset]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            if (!connectedAccount) {
                throw new Error('Please connect your wallet first');
            }

            const request: LoanRequest = {
                borrower: connectedAccount,
                groupId: loanRequest.groupId!,
                collateralAsset: loanRequest.collateralAsset!,
                loanAsset: loanRequest.loanAsset!,
                collateralAmount: Number(loanRequest.collateralAmount),
                loanAmount: Number(loanRequest.loanAmount),
                duration: Number(loanRequest.duration)
            };

            const txHash = await loanManager.createLoan(request);
            setSuccess(`Loan created successfully! Transaction hash: ${txHash}`);
            
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create loan');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg">
            <div className="mb-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">
                    Create New Loan
                </h2>
                <WalletConnect
                    moduleAddress={moduleAddress}
                    onConnect={setConnectedAccount}
                    onDisconnect={() => setConnectedAccount(null)}
                />
            </div>

            {!connectedAccount ? (
                <div className="text-center py-8">
                    <p className="text-gray-600">
                        Please connect your wallet to create a loan
                    </p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Group ID
                            </label>
                            <input
                                type="text"
                                value={loanRequest.groupId || ''}
                                onChange={(e) => setLoanRequest(prev => ({
                                    ...prev,
                                    groupId: e.target.value
                                }))}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Collateral Asset
                            </label>
                            <select
                                value={loanRequest.collateralAsset || ''}
                                onChange={(e) => setLoanRequest(prev => ({
                                    ...prev,
                                    collateralAsset: e.target.value
                                }))}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                required
                            >
                                <option value="">Select asset</option>
                                <option value="APT">APT</option>
                                <option value="BTC">BTC</option>
                                <option value="ETH">ETH</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Loan Asset
                            </label>
                            <select
                                value={loanRequest.loanAsset || ''}
                                onChange={(e) => setLoanRequest(prev => ({
                                    ...prev,
                                    loanAsset: e.target.value
                                }))}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                required
                            >
                                <option value="">Select asset</option>
                                <option value="USDC">USDC</option>
                                <option value="USDT">USDT</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Collateral Amount
                            </label>
                            <input
                                type="number"
                                value={loanRequest.collateralAmount || ''}
                                onChange={(e) => setLoanRequest(prev => ({
                                    ...prev,
                                    collateralAmount: e.target.valueAsNumber
                                }))}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                required
                                min="0"
                                step="0.000001"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Loan Amount
                            </label>
                            <input
                                type="number"
                                value={loanRequest.loanAmount || ''}
                                onChange={(e) => setLoanRequest(prev => ({
                                    ...prev,
                                    loanAmount: e.target.valueAsNumber
                                }))}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                required
                                min="0"
                                step="0.01"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Duration (days)
                            </label>
                            <input
                                type="number"
                                value={loanRequest.duration || ''}
                                onChange={(e) => setLoanRequest(prev => ({
                                    ...prev,
                                    duration: e.target.valueAsNumber
                                }))}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                required
                                min="1"
                                max="365"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 text-red-700 rounded-lg">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="p-4 bg-green-50 text-green-700 rounded-lg">
                            {success}
                        </div>
                    )}

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={isSubmitting}
                        className={`w-full py-3 px-4 rounded-lg font-medium text-white
                                  ${isSubmitting
                                    ? 'bg-gray-400'
                                    : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {isSubmitting ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                     xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10"
                                            stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor"
                                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Processing...
                            </span>
                        ) : (
                            'Create Loan'
                        )}
                    </motion.button>
                </form>
            )}

            {/* 市场数据显示 */}
            {loanRequest.collateralAsset && currentPrices[loanRequest.collateralAsset] && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Market Data
                    </h3>
                    <p className="text-gray-600">
                        Current {loanRequest.collateralAsset} Price: $
                        {currentPrices[loanRequest.collateralAsset].toFixed(2)}
                    </p>
                </div>
            )}
        </div>
    );
};
