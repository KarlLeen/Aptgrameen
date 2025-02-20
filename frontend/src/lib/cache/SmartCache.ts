interface CacheItem<T> {
    data: T;
    timestamp: number;
    accessCount: number;
    lastAccess: number;
    size: number;
}

interface CacheConfig {
    maxSize: number;          // 最大缓存大小（字节）
    maxAge: number;          // 最大缓存年龄（毫秒）
    cleanupInterval: number; // 清理间隔（毫秒）
}

interface CacheStats {
    hitCount: number;
    missCount: number;
    totalSize: number;
    itemCount: number;
    oldestItem: number;
    mostAccessed: {
        key: string;
        count: number;
    };
}

export class SmartCache {
    private static instance: SmartCache;
    private cache: Map<string, CacheItem<any>>;
    private config: CacheConfig;
    private stats: CacheStats;
    private cleanupTimer: NodeJS.Timeout | null;

    private constructor(config: CacheConfig) {
        this.cache = new Map();
        this.config = config;
        this.stats = {
            hitCount: 0,
            missCount: 0,
            totalSize: 0,
            itemCount: 0,
            oldestItem: Date.now(),
            mostAccessed: {
                key: '',
                count: 0
            }
        };
        this.cleanupTimer = null;
        this.startCleanup();
    }

    public static getInstance(config: CacheConfig = {
        maxSize: 50 * 1024 * 1024, // 50MB
        maxAge: 30 * 60 * 1000,    // 30 minutes
        cleanupInterval: 60 * 1000  // 1 minute
    }): SmartCache {
        if (!SmartCache.instance) {
            SmartCache.instance = new SmartCache(config);
        }
        return SmartCache.instance;
    }

    public set<T>(key: string, data: T): void {
        const size = this.calculateSize(data);

        // 如果单个项目大于最大缓存大小，不缓存
        if (size > this.config.maxSize) {
            console.warn(`Item ${key} is too large to cache (${size} bytes)`);
            return;
        }

        // 检查是否需要清理空间
        while (this.stats.totalSize + size > this.config.maxSize) {
            this.evictLeastValuable();
        }

        const item: CacheItem<T> = {
            data,
            timestamp: Date.now(),
            accessCount: 0,
            lastAccess: Date.now(),
            size
        };

        this.cache.set(key, item);
        this.stats.totalSize += size;
        this.stats.itemCount++;
        
        if (this.stats.oldestItem > item.timestamp) {
            this.stats.oldestItem = item.timestamp;
        }
    }

    public get<T>(key: string): T | null {
        const item = this.cache.get(key);
        
        if (!item) {
            this.stats.missCount++;
            return null;
        }

        // 检查是否过期
        if (Date.now() - item.timestamp > this.config.maxAge) {
            this.cache.delete(key);
            this.stats.totalSize -= item.size;
            this.stats.itemCount--;
            this.stats.missCount++;
            return null;
        }

        // 更新访问统计
        item.accessCount++;
        item.lastAccess = Date.now();
        this.stats.hitCount++;

        if (item.accessCount > this.stats.mostAccessed.count) {
            this.stats.mostAccessed = {
                key,
                count: item.accessCount
            };
        }

        return item.data;
    }

    private calculateSize(data: any): number {
        try {
            const str = JSON.stringify(data);
            return str.length * 2; // 假设每个字符占用 2 字节
        } catch (error) {
            return 1024; // 如果无法计算大小，假设为 1KB
        }
    }

    private evictLeastValuable(): void {
        let leastValuableKey: string | null = null;
        let leastValue = Infinity;

        this.cache.forEach((item, key) => {
            // 计算项目的价值
            // 考虑因素：访问频率、最后访问时间、年龄
            const age = Date.now() - item.timestamp;
            const timeSinceLastAccess = Date.now() - item.lastAccess;
            const value = (item.accessCount / age) * (1 / timeSinceLastAccess);

            if (value < leastValue) {
                leastValue = value;
                leastValuableKey = key;
            }
        });

        if (leastValuableKey) {
            const item = this.cache.get(leastValuableKey)!;
            this.cache.delete(leastValuableKey);
            this.stats.totalSize -= item.size;
            this.stats.itemCount--;
        }
    }

    private startCleanup(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }

        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, this.config.cleanupInterval);
    }

    private cleanup(): void {
        const now = Date.now();
        this.cache.forEach((item, key) => {
            if (now - item.timestamp > this.config.maxAge) {
                this.cache.delete(key);
                this.stats.totalSize -= item.size;
                this.stats.itemCount--;
            }
        });

        // 更新最老项目的时间戳
        let oldestTimestamp = now;
        this.cache.forEach(item => {
            if (item.timestamp < oldestTimestamp) {
                oldestTimestamp = item.timestamp;
            }
        });
        this.stats.oldestItem = oldestTimestamp;
    }

    public getStats(): CacheStats {
        return { ...this.stats };
    }

    public clear(): void {
        this.cache.clear();
        this.stats = {
            hitCount: 0,
            missCount: 0,
            totalSize: 0,
            itemCount: 0,
            oldestItem: Date.now(),
            mostAccessed: {
                key: '',
                count: 0
            }
        };
    }

    public has(key: string): boolean {
        return this.cache.has(key);
    }

    public delete(key: string): boolean {
        const item = this.cache.get(key);
        if (item) {
            this.cache.delete(key);
            this.stats.totalSize -= item.size;
            this.stats.itemCount--;
            return true;
        }
        return false;
    }

    public destroy(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        this.clear();
    }

    public setConfig(config: Partial<CacheConfig>): void {
        this.config = { ...this.config, ...config };
        this.startCleanup(); // 重启清理定时器以应用新的间隔
    }

    public getCacheState(): {
        config: CacheConfig;
        stats: CacheStats;
        items: Array<{ key: string; metadata: Omit<CacheItem<any>, 'data'> }>;
    } {
        const items = Array.from(this.cache.entries()).map(([key, item]) => ({
            key,
            metadata: {
                timestamp: item.timestamp,
                accessCount: item.accessCount,
                lastAccess: item.lastAccess,
                size: item.size
            }
        }));

        return {
            config: { ...this.config },
            stats: { ...this.stats },
            items
        };
    }
}
