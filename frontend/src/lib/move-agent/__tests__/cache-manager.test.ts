import { CacheManager } from '../cache-manager';
import { TestUtils } from './test-utils';

describe('CacheManager Unit Tests', () => {
    let cacheManager: CacheManager;

    beforeEach(() => {
        cacheManager = new CacheManager();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('Credit SBT Cache', () => {
        it('should store and retrieve credit SBT data', () => {
            const address = '0x123';
            const sbt = {
                score: 750,
                assessmentHistory: [],
                lastUpdate: Date.now()
            };

            cacheManager.setCreditSBT(address, sbt);
            const cached = cacheManager.getCreditSBT(address);
            
            expect(cached).toEqual(sbt);
        });

        it('should return null for expired credit SBT data', () => {
            const address = '0x123';
            const sbt = {
                score: 750,
                assessmentHistory: [],
                lastUpdate: Date.now()
            };

            cacheManager.setCreditSBT(address, sbt);
            
            // 前进时间 6 分钟（超过缓存时间）
            jest.advanceTimersByTime(6 * 60 * 1000);
            
            const cached = cacheManager.getCreditSBT(address);
            expect(cached).toBeNull();
        });

        it('should handle cache invalidation for credit SBT', () => {
            const address = '0x123';
            const sbt = {
                score: 750,
                assessmentHistory: [],
                lastUpdate: Date.now()
            };

            cacheManager.setCreditSBT(address, sbt);
            cacheManager.invalidateCredit(address);
            
            const cached = cacheManager.getCreditSBT(address);
            expect(cached).toBeNull();
        });
    });

    describe('Group SBT Cache', () => {
        it('should store and retrieve group SBT data', () => {
            const groupId = 'group_123';
            const sbt = {
                groupId,
                members: ['0x1', '0x2'],
                collectiveScore: 780,
                memberContributions: new Map([
                    ['0x1', 0.6],
                    ['0x2', 0.4]
                ]),
                interestRate: 0.05,
                lastUpdate: Date.now()
            };

            cacheManager.setGroupSBT(groupId, sbt);
            const cached = cacheManager.getGroupSBT(groupId);
            
            expect(cached).toEqual(sbt);
        });

        it('should return null for expired group SBT data', () => {
            const groupId = 'group_123';
            const sbt = {
                groupId,
                members: ['0x1', '0x2'],
                collectiveScore: 780,
                memberContributions: new Map(),
                interestRate: 0.05,
                lastUpdate: Date.now()
            };

            cacheManager.setGroupSBT(groupId, sbt);
            
            // 前进时间 6 分钟
            jest.advanceTimersByTime(6 * 60 * 1000);
            
            const cached = cacheManager.getGroupSBT(groupId);
            expect(cached).toBeNull();
        });

        it('should handle cache invalidation for group SBT', () => {
            const groupId = 'group_123';
            const sbt = {
                groupId,
                members: ['0x1', '0x2'],
                collectiveScore: 780,
                memberContributions: new Map(),
                interestRate: 0.05,
                lastUpdate: Date.now()
            };

            cacheManager.setGroupSBT(groupId, sbt);
            cacheManager.invalidateGroup(groupId);
            
            const cached = cacheManager.getGroupSBT(groupId);
            expect(cached).toBeNull();
        });
    });

    describe('Cache Clear', () => {
        it('should clear all cached data', () => {
            const address = '0x123';
            const groupId = 'group_123';
            
            cacheManager.setCreditSBT(address, {
                score: 750,
                assessmentHistory: [],
                lastUpdate: Date.now()
            });
            
            cacheManager.setGroupSBT(groupId, {
                groupId,
                members: ['0x1', '0x2'],
                collectiveScore: 780,
                memberContributions: new Map(),
                interestRate: 0.05,
                lastUpdate: Date.now()
            });

            cacheManager.clear();
            
            expect(cacheManager.getCreditSBT(address)).toBeNull();
            expect(cacheManager.getGroupSBT(groupId)).toBeNull();
        });
    });
});
