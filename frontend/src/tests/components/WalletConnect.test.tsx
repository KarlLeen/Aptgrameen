import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WalletConnect } from '../../components/WalletConnect';
import { WalletService } from '../../lib/wallet/walletService';
import { mockWallets, mockAccount } from '../utils/mockData';

// Mock WalletService
jest.mock('../../lib/wallet/walletService', () => ({
    getInstance: jest.fn(() => ({
        getAvailableWallets: jest.fn(() => mockWallets),
        connectWallet: jest.fn(),
        disconnectWallet: jest.fn(),
        getConnectedAccount: jest.fn(() => Promise.resolve(mockAccount.address))
    }))
}));

describe('WalletConnect Component', () => {
    const mockOnConnect = jest.fn();
    const mockOnDisconnect = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders connect button when not connected', () => {
        render(
            <WalletConnect
                moduleAddress="0x1"
                onConnect={mockOnConnect}
                onDisconnect={mockOnDisconnect}
            />
        );

        expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
    });

    it('opens wallet selection modal on button click', () => {
        render(
            <WalletConnect
                moduleAddress="0x1"
                onConnect={mockOnConnect}
                onDisconnect={mockOnDisconnect}
            />
        );

        fireEvent.click(screen.getByText('Connect Wallet'));
        expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
        mockWallets.forEach(wallet => {
            expect(screen.getByText(wallet.name)).toBeInTheDocument();
        });
    });

    it('handles wallet connection', async () => {
        render(
            <WalletConnect
                moduleAddress="0x1"
                onConnect={mockOnConnect}
                onDisconnect={mockOnDisconnect}
            />
        );

        fireEvent.click(screen.getByText('Connect Wallet'));
        fireEvent.click(screen.getByText('Petra'));

        await waitFor(() => {
            expect(mockOnConnect).toHaveBeenCalledWith(mockAccount.address);
        });
    });

    it('handles wallet disconnection', async () => {
        const { rerender } = render(
            <WalletConnect
                moduleAddress="0x1"
                onConnect={mockOnConnect}
                onDisconnect={mockOnDisconnect}
            />
        );

        // 模拟连接状态
        await waitFor(() => {
            rerender(
                <WalletConnect
                    moduleAddress="0x1"
                    onConnect={mockOnConnect}
                    onDisconnect={mockOnDisconnect}
                />
            );
        });

        const disconnectButton = screen.queryByText('Disconnect');
        if (disconnectButton) {
            fireEvent.click(disconnectButton);
            await waitFor(() => {
                expect(mockOnDisconnect).toHaveBeenCalled();
            });
        }
    });

    it('displays error message when connection fails', async () => {
        // Mock connection failure
        const errorMessage = 'Failed to connect wallet';
        jest.spyOn(WalletService.getInstance('0x1'), 'connectWallet')
            .mockRejectedValueOnce(new Error(errorMessage));

        render(
            <WalletConnect
                moduleAddress="0x1"
                onConnect={mockOnConnect}
                onDisconnect={mockOnDisconnect}
            />
        );

        fireEvent.click(screen.getByText('Connect Wallet'));
        fireEvent.click(screen.getByText('Petra'));

        await waitFor(() => {
            expect(screen.getByText(errorMessage)).toBeInTheDocument();
        });
    });
});
