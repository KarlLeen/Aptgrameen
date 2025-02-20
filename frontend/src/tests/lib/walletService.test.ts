import { WalletService } from '../../lib/wallet/walletService';
import { mockWallets, mockAccount } from '../utils/mockData';

describe('WalletService', () => {
    const moduleAddress = '0x1';
    let walletService: WalletService;

    beforeEach(() => {
        // Reset singleton instance
        (WalletService as any).instance = null;
        walletService = WalletService.getInstance(moduleAddress);

        // Mock window object with wallet providers
        (window as any).petra = {
            connect: jest.fn(),
            disconnect: jest.fn(),
            isConnected: jest.fn(),
            account: jest.fn(),
            signAndSubmitTransaction: jest.fn()
        };

        (window as any).martian = {
            connect: jest.fn(),
            disconnect: jest.fn(),
            isConnected: jest.fn(),
            account: jest.fn(),
            signAndSubmitTransaction: jest.fn()
        };

        (window as any).pontem = {
            connect: jest.fn(),
            disconnect: jest.fn(),
            isConnected: jest.fn(),
            account: jest.fn(),
            signAndSubmitTransaction: jest.fn()
        };
    });

    it('creates singleton instance', () => {
        const instance1 = WalletService.getInstance(moduleAddress);
        const instance2 = WalletService.getInstance(moduleAddress);
        expect(instance1).toBe(instance2);
    });

    it('returns available wallets', () => {
        const wallets = walletService.getAvailableWallets();
        expect(wallets).toHaveLength(3);
        expect(wallets[0].name).toBe('Petra');
        expect(wallets[1].name).toBe('Martian');
        expect(wallets[2].name).toBe('Pontem');
    });

    describe('Petra Wallet', () => {
        beforeEach(() => {
            (window as any).petra.connect.mockResolvedValue(undefined);
            (window as any).petra.account.mockResolvedValue({ address: mockAccount.address });
            (window as any).petra.isConnected.mockResolvedValue(true);
        });

        it('connects successfully', async () => {
            await walletService.connectWallet('petra');
            expect((window as any).petra.connect).toHaveBeenCalled();
        });

        it('disconnects successfully', async () => {
            await walletService.connectWallet('petra');
            await walletService.disconnectWallet();
            expect((window as any).petra.disconnect).toHaveBeenCalled();
        });

        it('submits DAO vote', async () => {
            const mockTxHash = '0x123...abc';
            (window as any).petra.signAndSubmitTransaction.mockResolvedValue({ hash: mockTxHash });

            await walletService.connectWallet('petra');
            const hash = await walletService.submitDaoVote(1, true, 100);

            expect(hash).toBe(mockTxHash);
            expect((window as any).petra.signAndSubmitTransaction).toHaveBeenCalledWith({
                type: 'entry_function_payload',
                function: `${moduleAddress}::integrated_dao::vote`,
                type_arguments: [],
                arguments: [1, true, 100]
            });
        });
    });

    describe('Error Handling', () => {
        it('throws error when wallet is not installed', async () => {
            (window as any).petra = undefined;
            await expect(walletService.connectWallet('petra'))
                .rejects.toThrow('Petra wallet is not installed');
        });

        it('throws error when connection fails', async () => {
            (window as any).petra.connect.mockRejectedValue(new Error('Connection failed'));
            await expect(walletService.connectWallet('petra'))
                .rejects.toThrow('Connection failed');
        });

        it('throws error when submitting vote without connection', async () => {
            await expect(walletService.submitDaoVote(1, true, 100))
                .rejects.toThrow('No wallet connected');
        });
    });
});
