import { CreditSBT, GroupCreditSBT } from './types';

export class CacheManager {
    private creditCache: Map<string, { data: CreditSBT; timestamp: number }>;
    private groupCache: Map<string, { data: GroupCreditSBT; timestamp: number }>;
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    constructor() {
        this.creditCache = new Map();
        this.groupCache = new Map();
    }

    setCreditSBT(address: string, sbt: CreditSBT): void {
        this.creditCache.set(address, {
            data: sbt,
            timestamp: Date.now()
        });
    }

    getCreditSBT(address: string): CreditSBT | null {
        const cached = this.creditCache.get(address);
        if (!cached) return null;

        if (Date.now() - cached.timestamp > this.CACHE_DURATION) {
            this.creditCache.delete(address);
            return null;
        }

        return cached.data;
    }

    setGroupSBT(groupId: string, sbt: GroupCreditSBT): void {
        this.groupCache.set(groupId, {
            data: sbt,
            timestamp: Date.now()
        });
    }

    getGroupSBT(groupId: string): GroupCreditSBT | null {
        const cached = this.groupCache.get(groupId);
        if (!cached) return null;

        if (Date.now() - cached.timestamp > this.CACHE_DURATION) {
            this.groupCache.delete(groupId);
            return null;
        }

        return cached.data;
    }

    invalidateCredit(address: string): void {
        this.creditCache.delete(address);
    }

    invalidateGroup(groupId: string): void {
        this.groupCache.delete(groupId);
    }

    clear(): void {
        this.creditCache.clear();
        this.groupCache.clear();
    }
}
