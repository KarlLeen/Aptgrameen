import { Types } from 'aptos';

interface WorkerMessage {
    type: string;
    data: any;
}

class BatchProcessorWorker {
    private processing: boolean = false;

    constructor() {
        self.onmessage = this.handleMessage.bind(this);
    }

    private async handleMessage(event: MessageEvent<WorkerMessage>): Promise<void> {
        const { type, data } = event.data;

        switch (type) {
            case 'PROCESS_BATCH':
                await this.processBatch(data);
                break;
            case 'STOP':
                this.stop();
                break;
            default:
                console.error('Unknown message type:', type);
        }
    }

    private async processBatch(
        transactions: { id: string; payload: Types.TransactionPayload }[]
    ): Promise<void> {
        if (this.processing) return;

        this.processing = true;
        const results: { [key: string]: string | Error } = {};

        try {
            await Promise.all(
                transactions.map(async (tx) => {
                    try {
                        // 在 Worker 中处理交易
                        const result = await this.processTransaction(tx.payload);
                        results[tx.id] = result;
                    } catch (error) {
                        results[tx.id] = error as Error;
                    }
                })
            );

            // 发送处理结果
            self.postMessage({
                type: 'BATCH_PROCESSED',
                data: results
            });
        } catch (error) {
            self.postMessage({
                type: 'ERROR',
                data: error
            });
        } finally {
            this.processing = false;
        }
    }

    private async processTransaction(
        payload: Types.TransactionPayload
    ): Promise<string> {
        // 这里实现具体的交易处理逻辑
        // 注意：在 Worker 中，我们可能需要重新初始化某些服务
        return new Promise((resolve) => {
            // 模拟交易处理
            setTimeout(() => {
                resolve(`tx_${Date.now()}`);
            }, 1000);
        });
    }

    private stop(): void {
        this.processing = false;
        self.close();
    }
}

// 初始化 Worker
new BatchProcessorWorker();
