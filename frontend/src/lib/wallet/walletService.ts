import { WalletAdapter, WalletType, WalletInfo } from './types';
import { PetraWalletAdapter, MartianWalletAdapter, PontemWalletAdapter } from './adapters';

export class WalletService {
    private static instance: WalletService;
    private currentAdapter: WalletAdapter | null = null;
    private moduleAddress: string;

    private constructor(moduleAddress: string) {
        this.moduleAddress = moduleAddress;
    }

    public static getInstance(moduleAddress: string): WalletService {
        if (!WalletService.instance) {
            WalletService.instance = new WalletService(moduleAddress);
        }
        return WalletService.instance;
    }

    public async connectWallet(type: WalletType): Promise<void> {
        const adapter = this.getWalletAdapter(type);
        await adapter.connect();
        this.currentAdapter = adapter;
    }

    public async disconnectWallet(): Promise<void> {
        if (this.currentAdapter) {
            await this.currentAdapter.disconnect();
            this.currentAdapter = null;
        }
    }

    public async getConnectedAccount(): Promise<string | null> {
        if (!this.currentAdapter) return null;
        try {
            return await this.currentAdapter.getAccount();
        } catch (error) {
            console.error('Failed to get account:', error);
            return null;
        }
    }

    public async submitDaoVote(
        proposalId: number,
        support: boolean,
        votingPower: number
    ): Promise<string> {
        if (!this.currentAdapter) {
            throw new Error('No wallet connected');
        }

        const payload = {
            type: 'entry_function_payload',
            function: `${this.moduleAddress}::integrated_dao::vote`,
            type_arguments: [],
            arguments: [proposalId, support, votingPower]
        };

        try {
            const hash = await this.currentAdapter.signAndSubmitTransaction(payload);
            return hash;
        } catch (error) {
            console.error('Failed to submit vote:', error);
            throw error;
        }
    }

    public getAvailableWallets(): WalletInfo[] {
        return [
            {
                name: 'Petra',
                type: 'petra',
                icon: '/images/petra-wallet.png',
                installed: Boolean((window as any).petra)
            },
            {
                name: 'Martian',
                type: 'martian',
                icon: '/images/martian-wallet.png',
                installed: Boolean((window as any).martian)
            },
            {
                name: 'Pontem',
                type: 'pontem',
                icon: '/images/pontem-wallet.png',
                installed: Boolean((window as any).pontem)
            }
        ];
    }

    private getWalletAdapter(type: WalletType): WalletAdapter {
        switch (type) {
            case 'petra':
                return new PetraWalletAdapter();
            case 'martian':
                return new MartianWalletAdapter();
            case 'pontem':
                return new PontemWalletAdapter();
            default:
                throw new Error(`Unsupported wallet type: ${type}`);
        }
    }
}
