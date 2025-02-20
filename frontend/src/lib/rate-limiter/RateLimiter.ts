interface TokenBucket {
    tokens: number;
    lastRefill: number;
}

interface RateLimiterConfig {
    maxTokens: number;      // 最大令牌数
    refillRate: number;     // 令牌填充速率（令牌/秒）
    refillInterval: number; // 填充间隔（毫秒）
}

interface RateLimiterStats {
    totalRequests: number;
    acceptedRequests: number;
    rejectedRequests: number;
    currentTokens: number;
    lastRefillTime: number;
}

export class RateLimiter {
    private static instance: RateLimiter;
    private buckets: Map<string, TokenBucket>;
    private config: RateLimiterConfig;
    private stats: Map<string, RateLimiterStats>;
    private refillTimer: NodeJS.Timeout | null;

    private constructor(config: RateLimiterConfig) {
        this.buckets = new Map();
        this.stats = new Map();
        this.config = config;
        this.refillTimer = null;
        this.startRefill();
    }

    public static getInstance(config: RateLimiterConfig = {
        maxTokens: 100,
        refillRate: 10,
        refillInterval: 1000
    }): RateLimiter {
        if (!RateLimiter.instance) {
            RateLimiter.instance = new RateLimiter(config);
        }
        return RateLimiter.instance;
    }

    public async acquire(
        key: string,
        tokens: number = 1,
        timeout: number = 0
    ): Promise<boolean> {
        let bucket = this.buckets.get(key);
        if (!bucket) {
            bucket = {
                tokens: this.config.maxTokens,
                lastRefill: Date.now()
            };
            this.buckets.set(key, bucket);
            this.initStats(key);
        }

        this.updateStats(key, 'totalRequests');

        // 尝试获取令牌
        const startTime = Date.now();
        while (true) {
            this.refillBucket(bucket);

            if (bucket.tokens >= tokens) {
                bucket.tokens -= tokens;
                this.updateStats(key, 'acceptedRequests');
                this.updateStats(key, 'currentTokens', bucket.tokens);
                return true;
            }

            // 如果没有超时设置，或者已经超时，则返回失败
            if (timeout === 0 || Date.now() - startTime >= timeout) {
                this.updateStats(key, 'rejectedRequests');
                return false;
            }

            // 等待一段时间后重试
            await new Promise(resolve => 
                setTimeout(resolve, Math.min(100, timeout))
            );
        }
    }

    private refillBucket(bucket: TokenBucket): void {
        const now = Date.now();
        const timePassed = now - bucket.lastRefill;
        const tokensToAdd = (timePassed / 1000) * this.config.refillRate;

        bucket.tokens = Math.min(
            this.config.maxTokens,
            bucket.tokens + tokensToAdd
        );
        bucket.lastRefill = now;
    }

    private startRefill(): void {
        if (this.refillTimer) {
            clearInterval(this.refillTimer);
        }

        this.refillTimer = setInterval(() => {
            this.buckets.forEach(bucket => {
                this.refillBucket(bucket);
            });
        }, this.config.refillInterval);
    }

    private initStats(key: string): void {
        this.stats.set(key, {
            totalRequests: 0,
            acceptedRequests: 0,
            rejectedRequests: 0,
            currentTokens: this.config.maxTokens,
            lastRefillTime: Date.now()
        });
    }

    private updateStats(
        key: string,
        field: keyof RateLimiterStats,
        value?: number
    ): void {
        const stats = this.stats.get(key);
        if (stats) {
            if (typeof value === 'number') {
                stats[field] = value;
            } else if (typeof stats[field] === 'number') {
                (stats[field] as number)++;
            }
        }
    }

    public getStats(key?: string): RateLimiterStats | Map<string, RateLimiterStats> {
        if (key) {
            return this.stats.get(key) || this.getEmptyStats();
        }
        return new Map(this.stats);
    }

    private getEmptyStats(): RateLimiterStats {
        return {
            totalRequests: 0,
            acceptedRequests: 0,
            rejectedRequests: 0,
            currentTokens: this.config.maxTokens,
            lastRefillTime: Date.now()
        };
    }

    public setConfig(config: Partial<RateLimiterConfig>): void {
        this.config = { ...this.config, ...config };
        this.startRefill();
    }

    public clear(key?: string): void {
        if (key) {
            this.buckets.delete(key);
            this.stats.delete(key);
        } else {
            this.buckets.clear();
            this.stats.clear();
        }
    }

    public destroy(): void {
        if (this.refillTimer) {
            clearInterval(this.refillTimer);
            this.refillTimer = null;
        }
        this.buckets.clear();
        this.stats.clear();
    }

    // 批量请求处理
    public async acquireBatch(
        requests: Array<{ key: string; tokens: number }>,
        timeout: number = 0
    ): Promise<Map<string, boolean>> {
        const results = new Map<string, boolean>();
        
        // 首先检查是否有足够的令牌
        const canAcquire = requests.every(({ key, tokens }) => {
            const bucket = this.buckets.get(key);
            if (!bucket) return true; // 新的 bucket 将有最大令牌数
            this.refillBucket(bucket);
            return bucket.tokens >= tokens;
        });

        if (canAcquire) {
            // 如果所有请求都可以获取令牌，则一次性处理
            for (const { key, tokens } of requests) {
                const success = await this.acquire(key, tokens, 0);
                results.set(key, success);
            }
        } else if (timeout > 0) {
            // 如果设置了超时，则等待并重试
            const startTime = Date.now();
            while (Date.now() - startTime < timeout) {
                const remainingRequests = requests.filter(
                    ({ key }) => !results.has(key)
                );

                for (const { key, tokens } of remainingRequests) {
                    const success = await this.acquire(key, tokens, 0);
                    if (success) {
                        results.set(key, true);
                    }
                }

                if (results.size === requests.length) break;
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // 处理剩余未成功的请求
            for (const { key } of requests) {
                if (!results.has(key)) {
                    results.set(key, false);
                }
            }
        } else {
            // 如果没有设置超时，则立即返回失败结果
            for (const { key } of requests) {
                results.set(key, false);
            }
        }

        return results;
    }
}
