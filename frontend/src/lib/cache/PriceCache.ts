import { PriceUpdate } from '../merkle/types';

interface CacheConfig {
    maxAge: number;        // 缓存最大年龄（毫秒）
    cleanupInterval: number; // 清理间隔（毫秒）
}

interface CacheEntry {
    data: PriceUpdate;
    timestamp: number;
}

export class PriceCache {
    private static instance: PriceCache;
    private cache: Map<string, CacheEntry>;
    private config: CacheConfig;
    private cleanupTimer: NodeJS.Timeout | null;

    private constructor(config: CacheConfig) {
        this.cache = new Map();
        this.config = config;
        this.cleanupTimer = null;
        this.startCleanup();
    }

    public static getInstance(config: CacheConfig = {
        maxAge: 5 * 60 * 1000,        // 5 minutes
        cleanupInterval: 60 * 1000     // 1 minute
    }): PriceCache {
        if (!PriceCache.instance) {
            PriceCache.instance = new PriceCache(config);
        }
        return PriceCache.instance;
    }

    public set(pair: string, data: PriceUpdate): void {
        this.cache.set(pair, {
            data,
            timestamp: Date.now()
        });
    }

    public get(pair: string): PriceUpdate | null {
        const entry = this.cache.get(pair);
        if (!entry) return null;

        // 检查是否过期
        if (Date.now() - entry.timestamp > this.config.maxAge) {
            this.cache.delete(pair);
            return null;
        }

        return entry.data;
    }

    public getAll(): Map<string, PriceUpdate> {
        const result = new Map<string, PriceUpdate>();
        const now = Date.now();

        this.cache.forEach((entry, pair) => {
            if (now - entry.timestamp <= this.config.maxAge) {
                result.set(pair, entry.data);
            }
        });

        return result;
    }

    public clear(): void {
        this.cache.clear();
    }

    private cleanup(): void {
        const now = Date.now();
        this.cache.forEach((entry, pair) => {
            if (now - entry.timestamp > this.config.maxAge) {
                this.cache.delete(pair);
            }
        });
    }

    private startCleanup(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        this.cleanupTimer = setInterval(
            () => this.cleanup(),
            this.config.cleanupInterval
        );
    }

    public destroy(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        this.cache.clear();
    }
}
