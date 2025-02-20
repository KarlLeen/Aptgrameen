import { AptosClient, Types } from 'aptos';
import { CreditSBT, GroupCreditSBT, TransactionResult } from './types';

export class SBTManager {
    private client: AptosClient;
    private moduleAddress: string;

    constructor(client: AptosClient, moduleAddress: string) {
        this.client = client;
        this.moduleAddress = moduleAddress;
    }

    async createGroupSBT(
        memberAddresses: string[],
        groupId: string
    ): Promise<TransactionResult> {
        const payload = {
            type: 'entry_function_payload',
            function: `${this.moduleAddress}::integrated_credit_sbt::create_group`,
            type_arguments: [],
            arguments: [
                memberAddresses,
                this.stringToBytes(groupId)
            ]
        };

        const txnHash = await this.client.submitTransaction(payload);
        return await this.client.waitForTransactionWithResult(txnHash);
    }

    async updateCreditScore(
        borrowerAddress: string,
        newScore: number,
        reportHash: string
    ): Promise<TransactionResult> {
        const payload = {
            type: 'entry_function_payload',
            function: `${this.moduleAddress}::integrated_credit_sbt::update_credit_score`,
            type_arguments: [],
            arguments: [
                borrowerAddress,
                newScore,
                this.stringToBytes(reportHash)
            ]
        };

        const txnHash = await this.client.submitTransaction(payload);
        return await this.client.waitForTransactionWithResult(txnHash);
    }

    async getCreditSBT(address: string): Promise<CreditSBT | null> {
        try {
            const resource = await this.client.getAccountResource(
                address,
                `${this.moduleAddress}::integrated_credit_sbt::CreditSBT`
            );
            
            return this.parseCreditSBT(resource.data);
        } catch (e) {
            return null;
        }
    }

    async getGroupSBT(address: string): Promise<GroupCreditSBT | null> {
        try {
            const resource = await this.client.getAccountResource(
                address,
                `${this.moduleAddress}::integrated_credit_sbt::GroupCreditSBT`
            );
            
            return this.parseGroupSBT(resource.data);
        } catch (e) {
            return null;
        }
    }

    private stringToBytes(str: string): number[] {
        return Array.from(new TextEncoder().encode(str));
    }

    private parseCreditSBT(data: any): CreditSBT {
        return {
            score: Number(data.score),
            assessmentHistory: data.assessment_history.map((record: any) => ({
                timestamp: Number(record.timestamp),
                score: Number(record.score),
                reportHash: this.bytesToString(record.report_hash)
            })),
            lastUpdate: Number(data.last_update)
        };
    }

    private parseGroupSBT(data: any): GroupCreditSBT {
        const memberContributions = new Map<string, number>();
        for (const [addr, contribution] of Object.entries(data.member_contributions)) {
            memberContributions.set(addr, Number(contribution));
        }

        return {
            groupId: this.bytesToString(data.group_id),
            members: data.members,
            collectiveScore: Number(data.collective_score),
            memberContributions,
            interestRate: Number(data.interest_rate),
            lastUpdate: Number(data.last_update)
        };
    }

    private bytesToString(bytes: number[]): string {
        return new TextDecoder().decode(new Uint8Array(bytes));
    }
}
