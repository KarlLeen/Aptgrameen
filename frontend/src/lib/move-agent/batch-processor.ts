import { AptosClient, Types } from 'aptos';
import { TransactionResult } from './types';

export class BatchProcessor {
    private client: AptosClient;
    private moduleAddress: string;
    private readonly MAX_BATCH_SIZE = 10;

    constructor(client: AptosClient, moduleAddress: string) {
        this.client = client;
        this.moduleAddress = moduleAddress;
    }

    async batchProcessAssessments(
        assessments: Array<{
            borrowerAddress: string;
            score: number;
            reportHash: string;
        }>
    ): Promise<TransactionResult[]> {
        const batches = this.splitIntoBatches(assessments);
        const results: TransactionResult[] = [];

        for (const batch of batches) {
            const payload = {
                type: 'entry_function_payload',
                function: `${this.moduleAddress}::integrated_credit_sbt::batch_process_assessments`,
                type_arguments: [],
                arguments: [
                    batch.map(a => a.borrowerAddress),
                    batch.map(a => a.score),
                    batch.map(a => this.stringToBytes(a.reportHash))
                ]
            };

            try {
                const txnHash = await this.client.submitTransaction(payload);
                const result = await this.client.waitForTransactionWithResult(txnHash);
                results.push(result);
            } catch (error) {
                console.error('Batch processing failed:', error);
                throw error;
            }
        }

        return results;
    }

    async batchCreateGroups(
        groups: Array<{
            members: string[];
            groupId: string;
        }>
    ): Promise<TransactionResult[]> {
        const batches = this.splitIntoBatches(groups);
        const results: TransactionResult[] = [];

        for (const batch of batches) {
            const payload = {
                type: 'entry_function_payload',
                function: `${this.moduleAddress}::integrated_credit_sbt::batch_create_groups`,
                type_arguments: [],
                arguments: [
                    batch.map(g => g.members),
                    batch.map(g => this.stringToBytes(g.groupId))
                ]
            };

            try {
                const txnHash = await this.client.submitTransaction(payload);
                const result = await this.client.waitForTransactionWithResult(txnHash);
                results.push(result);
            } catch (error) {
                console.error('Batch group creation failed:', error);
                throw error;
            }
        }

        return results;
    }

    private splitIntoBatches<T>(items: T[]): T[][] {
        const batches: T[][] = [];
        for (let i = 0; i < items.length; i += this.MAX_BATCH_SIZE) {
            batches.push(items.slice(i, i + this.MAX_BATCH_SIZE));
        }
        return batches;
    }

    private stringToBytes(str: string): number[] {
        return Array.from(new TextEncoder().encode(str));
    }
}
