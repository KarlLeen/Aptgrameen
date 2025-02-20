import { Types } from 'aptos';
import { WalletService } from '../wallet/walletService';

interface BatchTransaction {
    id: string;
    payload: Types.TransactionPayload;
    priority: number;
    timestamp: number;
    retries: number;
}

interface BatchConfig {
    maxBatchSize: number;
    maxRetries: number;
    retryDelay: number;
    processingInterval: number;
}

export class BatchProcessor {
    private static instance: BatchProcessor;
    private queue: BatchTransaction[];
    private processing: boolean;
    private config: BatchConfig;
    private walletService: WalletService;
    private processTimer: NodeJS.Timeout | null;

    private constructor(
        moduleAddress: string,
        config: BatchConfig
    ) {
        this.queue = [];
        this.processing = false;
        this.config = config;
        this.walletService = WalletService.getInstance(moduleAddress);
        this.processTimer = null;
        this.startProcessing();
    }

    public static getInstance(
        moduleAddress: string,
        config: BatchConfig = {
            maxBatchSize: 10,
            maxRetries: 3,
            retryDelay: 1000,
            processingInterval: 5000
        }
    ): BatchProcessor {
        if (!BatchProcessor.instance) {
            BatchProcessor.instance = new BatchProcessor(moduleAddress, config);
        }
        return BatchProcessor.instance;
    }

    public async addTransaction(
        payload: Types.TransactionPayload,
        priority: number = 0
    ): Promise<string> {
        const id = this.generateTransactionId();
        
        this.queue.push({
            id,
            payload,
            priority,
            timestamp: Date.now(),
            retries: 0
        });

        // 按优先级排序
        this.sortQueue();

        return id;
    }

    private sortQueue(): void {
        this.queue.sort((a, b) => {
            // 首先按优先级排序
            if (a.priority !== b.priority) {
                return b.priority - a.priority;
            }
            // 其次按时间戳排序
            return a.timestamp - b.timestamp;
        });
    }

    private async processBatch(): Promise<void> {
        if (this.processing || this.queue.length === 0) return;

        this.processing = true;
        const batch = this.queue.slice(0, this.config.maxBatchSize);
        const results: { [key: string]: string | Error } = {};

        try {
            await Promise.all(
                batch.map(async (tx) => {
                    try {
                        const response = await this.walletService.submitTransaction(tx.payload);
                        results[tx.id] = response.hash;
                        this.removeTransaction(tx.id);
                    } catch (error) {
                        if (tx.retries < this.config.maxRetries) {
                            tx.retries++;
                            // 延迟重试
                            setTimeout(() => {
                                this.queue.push(tx);
                                this.sortQueue();
                            }, this.config.retryDelay * tx.retries);
                        } else {
                            results[tx.id] = error as Error;
                            this.removeTransaction(tx.id);
                        }
                    }
                })
            );
        } finally {
            this.processing = false;
        }

        return;
    }

    private removeTransaction(id: string): void {
        this.queue = this.queue.filter(tx => tx.id !== id);
    }

    private generateTransactionId(): string {
        return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    public getQueueStatus(): {
        queueLength: number;
        processing: boolean;
        nextBatch: BatchTransaction[]
    } {
        return {
            queueLength: this.queue.length,
            processing: this.processing,
            nextBatch: this.queue.slice(0, this.config.maxBatchSize)
        };
    }

    private startProcessing(): void {
        if (this.processTimer) {
            clearInterval(this.processTimer);
        }
        this.processTimer = setInterval(
            () => this.processBatch(),
            this.config.processingInterval
        );
    }

    public destroy(): void {
        if (this.processTimer) {
            clearInterval(this.processTimer);
            this.processTimer = null;
        }
        this.queue = [];
        this.processing = false;
    }

    // Web Worker 支持
    public async initializeWorker(): Promise<void> {
        if (typeof Worker !== 'undefined') {
            const worker = new Worker(
                new URL('../workers/batch-processor.worker.ts', import.meta.url)
            );

            worker.onmessage = (event) => {
                const { type, data } = event.data;
                switch (type) {
                    case 'BATCH_PROCESSED':
                        this.handleBatchProcessed(data);
                        break;
                    case 'ERROR':
                        console.error('Worker error:', data);
                        break;
                }
            };
        }
    }

    private handleBatchProcessed(results: { [key: string]: string | Error }): void {
        Object.entries(results).forEach(([id, result]) => {
            if (result instanceof Error) {
                console.error(`Transaction ${id} failed:`, result);
            } else {
                console.log(`Transaction ${id} succeeded:`, result);
            }
            this.removeTransaction(id);
        });
    }
}
