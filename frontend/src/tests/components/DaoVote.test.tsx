import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DaoVote } from '../../components/DaoVote';
import { WalletService } from '../../lib/wallet/walletService';
import { mockProposals } from '../utils/mockData';

// Mock WalletService
jest.mock('../../lib/wallet/walletService', () => ({
    getInstance: jest.fn(() => ({
        submitDaoVote: jest.fn()
    }))
}));

describe('DaoVote Component', () => {
    const mockProposal = mockProposals[0];
    const mockOnVoteSubmitted = jest.fn();
    const mockTransactionHash = '0x123...abc';

    beforeEach(() => {
        jest.clearAllMocks();
        // Mock successful vote submission
        jest.spyOn(WalletService.getInstance('0x1'), 'submitDaoVote')
            .mockResolvedValue(mockTransactionHash);
    });

    it('renders proposal information correctly', () => {
        render(
            <DaoVote
                proposalId={mockProposal.id}
                proposalTitle={mockProposal.title}
                proposalDescription={mockProposal.description}
                votingPower={mockProposal.votingPower}
                moduleAddress="0x1"
                onVoteSubmitted={mockOnVoteSubmitted}
            />
        );

        expect(screen.getByText(mockProposal.title)).toBeInTheDocument();
        expect(screen.getByText(mockProposal.description)).toBeInTheDocument();
        expect(screen.getByText(`Proposal ID: ${mockProposal.id}`)).toBeInTheDocument();
        expect(screen.getByText(`Your Voting Power: ${mockProposal.votingPower}`)).toBeInTheDocument();
    });

    it('handles support vote submission', async () => {
        render(
            <DaoVote
                proposalId={mockProposal.id}
                proposalTitle={mockProposal.title}
                proposalDescription={mockProposal.description}
                votingPower={mockProposal.votingPower}
                moduleAddress="0x1"
                onVoteSubmitted={mockOnVoteSubmitted}
            />
        );

        fireEvent.click(screen.getByText('Support'));

        await waitFor(() => {
            expect(WalletService.getInstance('0x1').submitDaoVote)
                .toHaveBeenCalledWith(mockProposal.id, true, mockProposal.votingPower);
            expect(mockOnVoteSubmitted).toHaveBeenCalledWith(true);
        });

        expect(screen.getByText('Vote submitted successfully!')).toBeInTheDocument();
    });

    it('handles against vote submission', async () => {
        render(
            <DaoVote
                proposalId={mockProposal.id}
                proposalTitle={mockProposal.title}
                proposalDescription={mockProposal.description}
                votingPower={mockProposal.votingPower}
                moduleAddress="0x1"
                onVoteSubmitted={mockOnVoteSubmitted}
            />
        );

        fireEvent.click(screen.getByText('Against'));

        await waitFor(() => {
            expect(WalletService.getInstance('0x1').submitDaoVote)
                .toHaveBeenCalledWith(mockProposal.id, false, mockProposal.votingPower);
            expect(mockOnVoteSubmitted).toHaveBeenCalledWith(true);
        });

        expect(screen.getByText('Vote submitted successfully!')).toBeInTheDocument();
    });

    it('displays error message when vote submission fails', async () => {
        const errorMessage = 'Failed to submit vote';
        jest.spyOn(WalletService.getInstance('0x1'), 'submitDaoVote')
            .mockRejectedValueOnce(new Error(errorMessage));

        render(
            <DaoVote
                proposalId={mockProposal.id}
                proposalTitle={mockProposal.title}
                proposalDescription={mockProposal.description}
                votingPower={mockProposal.votingPower}
                moduleAddress="0x1"
                onVoteSubmitted={mockOnVoteSubmitted}
            />
        );

        fireEvent.click(screen.getByText('Support'));

        await waitFor(() => {
            expect(screen.getByText(errorMessage)).toBeInTheDocument();
            expect(mockOnVoteSubmitted).toHaveBeenCalledWith(false);
        });
    });

    it('disables vote buttons during submission', async () => {
        render(
            <DaoVote
                proposalId={mockProposal.id}
                proposalTitle={mockProposal.title}
                proposalDescription={mockProposal.description}
                votingPower={mockProposal.votingPower}
                moduleAddress="0x1"
                onVoteSubmitted={mockOnVoteSubmitted}
            />
        );

        const supportButton = screen.getByText('Support');
        fireEvent.click(supportButton);

        await waitFor(() => {
            expect(supportButton).toBeDisabled();
            expect(screen.getByText('Against')).toBeDisabled();
        });
    });

    it('displays transaction hash after successful vote', async () => {
        render(
            <DaoVote
                proposalId={mockProposal.id}
                proposalTitle={mockProposal.title}
                proposalDescription={mockProposal.description}
                votingPower={mockProposal.votingPower}
                moduleAddress="0x1"
                onVoteSubmitted={mockOnVoteSubmitted}
            />
        );

        fireEvent.click(screen.getByText('Support'));

        await waitFor(() => {
            expect(screen.getByText(new RegExp(mockTransactionHash.slice(0, 10)))).toBeInTheDocument();
        });
    });
});
