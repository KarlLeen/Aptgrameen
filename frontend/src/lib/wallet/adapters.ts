import { Types } from 'aptos';
import { WalletAdapter } from './types';

export class PetraWalletAdapter implements WalletAdapter {
    private wallet: any;
    public network: string;
    public name: string = 'Petra';

    constructor(network: string = 'mainnet') {
        this.network = network;
        this.wallet = (window as any).petra;
    }

    async connect(): Promise<void> {
        if (!this.wallet) {
            throw new Error('Petra wallet is not installed');
        }
        await this.wallet.connect();
    }

    async disconnect(): Promise<void> {
        await this.wallet.disconnect();
    }

    async isConnected(): Promise<boolean> {
        return await this.wallet.isConnected();
    }

    async getAccount(): Promise<string> {
        const account = await this.wallet.account();
        return account.address;
    }

    async signAndSubmitTransaction(payload: Types.TransactionPayload): Promise<Types.HexEncodedBytes> {
        const response = await this.wallet.signAndSubmitTransaction(payload);
        return response.hash;
    }
}

export class MartianWalletAdapter implements WalletAdapter {
    private wallet: any;
    public network: string;
    public name: string = 'Martian';

    constructor(network: string = 'mainnet') {
        this.network = network;
        this.wallet = (window as any).martian;
    }

    async connect(): Promise<void> {
        if (!this.wallet) {
            throw new Error('Martian wallet is not installed');
        }
        await this.wallet.connect();
    }

    async disconnect(): Promise<void> {
        await this.wallet.disconnect();
    }

    async isConnected(): Promise<boolean> {
        return await this.wallet.isConnected();
    }

    async getAccount(): Promise<string> {
        const account = await this.wallet.account();
        return account.address;
    }

    async signAndSubmitTransaction(payload: Types.TransactionPayload): Promise<Types.HexEncodedBytes> {
        const response = await this.wallet.signAndSubmitTransaction(payload);
        return response.hash;
    }
}

export class PontemWalletAdapter implements WalletAdapter {
    private wallet: any;
    public network: string;
    public name: string = 'Pontem';

    constructor(network: string = 'mainnet') {
        this.network = network;
        this.wallet = (window as any).pontem;
    }

    async connect(): Promise<void> {
        if (!this.wallet) {
            throw new Error('Pontem wallet is not installed');
        }
        await this.wallet.connect();
    }

    async disconnect(): Promise<void> {
        await this.wallet.disconnect();
    }

    async isConnected(): Promise<boolean> {
        return await this.wallet.isConnected();
    }

    async getAccount(): Promise<string> {
        const account = await this.wallet.account();
        return account.address;
    }

    async signAndSubmitTransaction(payload: Types.TransactionPayload): Promise<Types.HexEncodedBytes> {
        const response = await this.wallet.signAndSubmitTransaction(payload);
        return response.hash;
    }
}
