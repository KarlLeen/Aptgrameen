import React, { useState } from 'react';
import { WalletService } from '../lib/wallet/walletService';
import { motion } from 'framer-motion';

interface DaoVoteProps {
    proposalId: number;
    proposalTitle: string;
    proposalDescription: string;
    votingPower: number;
    moduleAddress: string;
    onVoteSubmitted?: (success: boolean) => void;
}

export const DaoVote: React.FC<DaoVoteProps> = ({
    proposalId,
    proposalTitle,
    proposalDescription,
    votingPower,
    moduleAddress,
    onVoteSubmitted
}) => {
    const [isVoting, setIsVoting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [transactionHash, setTransactionHash] = useState<string | null>(null);
    const [selectedVote, setSelectedVote] = useState<boolean | null>(null);

    const handleVote = async (support: boolean) => {
        setIsVoting(true);
        setError(null);
        setTransactionHash(null);
        setSelectedVote(support);

        try {
            const walletService = WalletService.getInstance(moduleAddress);
            const hash = await walletService.submitDaoVote(
                proposalId,
                support,
                votingPower
            );
            
            setTransactionHash(hash);
            onVoteSubmitted?.(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to submit vote');
            onVoteSubmitted?.(false);
        } finally {
            setIsVoting(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg p-6">
            {/* 提案信息 */}
            <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {proposalTitle}
                </h3>
                <p className="text-gray-600">
                    {proposalDescription}
                </p>
                <div className="mt-2 text-sm text-gray-500">
                    Proposal ID: {proposalId}
                </div>
                <div className="mt-1 text-sm text-blue-600">
                    Your Voting Power: {votingPower}
                </div>
            </div>

            {/* 投票按钮 */}
            {!transactionHash && (
                <div className="flex space-x-4 mb-4">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleVote(true)}
                        disabled={isVoting}
                        className={`flex-1 py-3 px-4 rounded-lg font-medium
                                  ${isVoting
                                    ? 'bg-gray-100 text-gray-400'
                                    : 'bg-green-600 hover:bg-green-700 text-white'}`}
                    >
                        {isVoting && selectedVote === true ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                     xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor"
                                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                                    </path>
                                </svg>
                                Voting...
                            </span>
                        ) : (
                            'Support'
                        )}
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleVote(false)}
                        disabled={isVoting}
                        className={`flex-1 py-3 px-4 rounded-lg font-medium
                                  ${isVoting
                                    ? 'bg-gray-100 text-gray-400'
                                    : 'bg-red-600 hover:bg-red-700 text-white'}`}
                    >
                        {isVoting && selectedVote === false ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                     xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor"
                                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                                    </path>
                                </svg>
                                Voting...
                            </span>
                        ) : (
                            'Against'
                        )}
                    </motion.button>
                </div>
            )}

            {/* 错误提示 */}
            {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">
                    {error}
                </div>
            )}

            {/* 交易成功提示 */}
            {transactionHash && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-green-50 rounded-lg"
                >
                    <div className="flex items-center text-green-700 mb-2">
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">Vote submitted successfully!</span>
                    </div>
                    <div className="text-sm text-green-600">
                        Transaction Hash:{' '}
                        <a
                            href={`https://explorer.aptoslabs.com/txn/${transactionHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:text-green-700"
                        >
                            {`${transactionHash.slice(0, 10)}...${transactionHash.slice(-8)}`}
                        </a>
                    </div>
                </motion.div>
            )}
        </div>
    );
};
