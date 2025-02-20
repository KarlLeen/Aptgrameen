interface ErrorConfig {
    maxRetries: number;
    retryDelay: number;
    exponentialBackoff: boolean;
}

interface ErrorMetadata {
    code?: string;
    context?: Record<string, any>;
    timestamp: number;
}

export class ErrorHandler {
    private static instance: ErrorHandler;
    private config: ErrorConfig;
    private errors: Map<string, ErrorMetadata[]>;

    private constructor(config: ErrorConfig) {
        this.config = config;
        this.errors = new Map();
    }

    public static getInstance(config: ErrorConfig = {
        maxRetries: 3,
        retryDelay: 1000,
        exponentialBackoff: true
    }): ErrorHandler {
        if (!ErrorHandler.instance) {
            ErrorHandler.instance = new ErrorHandler(config);
        }
        return ErrorHandler.instance;
    }

    public async withRetry<T>(
        operation: () => Promise<T>,
        context: string,
        customConfig?: Partial<ErrorConfig>
    ): Promise<T> {
        const config = { ...this.config, ...customConfig };
        let lastError: Error | null = null;
        
        for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error as Error;
                this.logError(context, error as Error);

                if (attempt === config.maxRetries) {
                    break;
                }

                const delay = config.exponentialBackoff
                    ? config.retryDelay * Math.pow(2, attempt - 1)
                    : config.retryDelay;

                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        throw new Error(
            `Operation failed after ${config.maxRetries} attempts. ` +
            `Last error: ${lastError?.message}`
        );
    }

    public logError(context: string, error: Error, metadata?: Record<string, any>): void {
        if (!this.errors.has(context)) {
            this.errors.set(context, []);
        }

        this.errors.get(context)!.push({
            code: (error as any).code,
            context: {
                message: error.message,
                stack: error.stack,
                ...metadata
            },
            timestamp: Date.now()
        });

        // 可以在这里添加额外的错误报告逻辑
        console.error(`Error in ${context}:`, {
            message: error.message,
            metadata
        });
    }

    public getErrors(context?: string): ErrorMetadata[] {
        if (context) {
            return this.errors.get(context) || [];
        }

        const allErrors: ErrorMetadata[] = [];
        this.errors.forEach(errors => allErrors.push(...errors));
        return allErrors;
    }

    public clearErrors(context?: string, olderThan?: number): void {
        if (context) {
            if (olderThan) {
                const errors = this.errors.get(context) || [];
                const now = Date.now();
                this.errors.set(
                    context,
                    errors.filter(error => now - error.timestamp < olderThan)
                );
            } else {
                this.errors.delete(context);
            }
        } else {
            this.errors.clear();
        }
    }

    public async handleTransactionError(
        error: Error,
        context: string
    ): Promise<void> {
        // 特定的交易错误处理逻辑
        const isUserRejection = error.message.includes('User rejected');
        const isNetworkError = error.message.includes('Network');
        const isInsufficientFunds = error.message.includes('Insufficient funds');

        if (isUserRejection) {
            // 用户拒绝交易，不需要重试
            this.logError(context, error, { type: 'user_rejection' });
            throw error;
        }

        if (isNetworkError) {
            // 网络错误，可以重试
            return this.withRetry(
                async () => {
                    throw error; // 这里应该是实际的重试逻辑
                },
                context,
                { maxRetries: 5, retryDelay: 2000 }
            );
        }

        if (isInsufficientFunds) {
            // 余额不足，特殊处理
            this.logError(context, error, { type: 'insufficient_funds' });
            throw new Error('Insufficient funds to complete the transaction');
        }

        // 其他错误的默认处理
        this.logError(context, error);
        throw error;
    }

    public generateErrorReport(): {
        summary: Record<string, number>;
        details: Record<string, ErrorMetadata[]>;
    } {
        const summary: Record<string, number> = {};
        const details: Record<string, ErrorMetadata[]> = {};

        this.errors.forEach((errors, context) => {
            summary[context] = errors.length;
            details[context] = errors;
        });

        return { summary, details };
    }
}
