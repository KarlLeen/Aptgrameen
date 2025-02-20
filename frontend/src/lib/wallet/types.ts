import { Types } from 'aptos';

export interface WalletAdapter {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): Promise<boolean>;
    getAccount(): Promise<string>;
    signAndSubmitTransaction(payload: Types.TransactionPayload): Promise<Types.HexEncodedBytes>;
    network: string;
    name: string;
}

export interface VotePayload {
    proposalId: number;
    support: boolean;
    votingPower: number;
}

export type WalletType = 'petra' | 'martian' | 'pontem';

export interface WalletInfo {
    name: string;
    type: WalletType;
    icon: string;
    installed: boolean;
}
