import { AptosClient } from 'aptos';
import { APLCreditSystem } from '../credit-system';
import { TestUtils } from './test-utils';

describe('APLCreditSystem Integration Tests', () => {
    let creditSystem: APLCreditSystem;
    let client: AptosClient;
    const moduleAddress = '0x1'; // 测试模块地址

    beforeAll(() => {
        client = new AptosClient('https://fullnode.devnet.aptoslabs.com/v1');
        creditSystem = new APLCreditSystem(
            'https://fullnode.devnet.aptoslabs.com/v1',
            moduleAddress
        );
    });

    describe('Credit Assessment', () => {
        it('should process credit assessment successfully', async () => {
            const { address } = await TestUtils.createTestAccount(client);
            const interviewData = TestUtils.generateRandomInterviewData();

            await expect(
                creditSystem.processCreditAssessment(address, interviewData)
            ).resolves.not.toThrow();

            const score = await creditSystem.getCreditScore(address);
            expect(score).toBeDefined();
            expect(typeof score).toBe('number');
            expect(score).toBeGreaterThanOrEqual(300);
            expect(score).toBeLessThanOrEqual(850);
        });

        it('should handle batch processing of assessments', async () => {
            const accounts = await Promise.all([
                TestUtils.createTestAccount(client),
                TestUtils.createTestAccount(client),
                TestUtils.createTestAccount(client)
            ]);

            const assessments = accounts.map(account => ({
                borrowerAddress: account.address,
                score: TestUtils.generateRandomScore(),
                reportHash: `hash_${Date.now()}`
            }));

            const results = await creditSystem.batchProcessAssessments(assessments);
            expect(results.length).toBeGreaterThan(0);
            expect(results.every(r => r.success)).toBe(true);
        });
    });

    describe('Group Management', () => {
        it('should create lending group successfully', async () => {
            const members = await Promise.all([
                TestUtils.createTestAccount(client),
                TestUtils.createTestAccount(client),
                TestUtils.createTestAccount(client)
            ]);

            const memberAddresses = members.map(m => m.address);
            
            await expect(
                creditSystem.createLendingGroup(memberAddresses, {
                    name: 'TestGroup',
                    purpose: 'Testing'
                })
            ).resolves.not.toThrow();

            // 等待事件处理
            await TestUtils.delay(2000);

            // 验证群组创建
            const groupDetails = await creditSystem.getGroupDetails(memberAddresses[0]);
            expect(groupDetails).toBeDefined();
            expect(groupDetails?.members).toEqual(expect.arrayContaining(memberAddresses));
        });

        it('should handle batch creation of groups', async () => {
            const groups = await Promise.all(
                Array(3).fill(null).map(async () => {
                    const members = await Promise.all([
                        TestUtils.createTestAccount(client),
                        TestUtils.createTestAccount(client)
                    ]);
                    return {
                        members: members.map(m => m.address),
                        groupId: `group_${Date.now()}_${Math.random()}`
                    };
                })
            );

            const results = await creditSystem.batchCreateGroups(groups);
            expect(results.length).toBeGreaterThan(0);
            expect(results.every(r => r.success)).toBe(true);
        });
    });

    describe('Cache Management', () => {
        it('should cache and retrieve credit SBT data', async () => {
            const { address } = await TestUtils.createTestAccount(client);
            
            // 首次获取（从链上）
            const firstFetch = await creditSystem.getCreditSBTWithCache(address);
            
            // 第二次获取（应该从缓存）
            const secondFetch = await creditSystem.getCreditSBTWithCache(address);
            
            expect(firstFetch).toEqual(secondFetch);
        });

        it('should invalidate cache on events', async () => {
            const { address } = await TestUtils.createTestAccount(client);
            
            // 获取初始数据
            await creditSystem.getCreditSBTWithCache(address);
            
            // 触发更新
            await creditSystem.processCreditAssessment(
                address,
                TestUtils.generateRandomInterviewData()
            );
            
            // 等待事件处理
            await TestUtils.delay(2000);
            
            // 再次获取（应该从链上获取新数据）
            const updatedData = await creditSystem.getCreditSBTWithCache(address);
            expect(updatedData?.lastUpdate).toBeGreaterThan(Date.now() - 5000);
        });
    });

    describe('Event Handling', () => {
        it('should receive assessment events', async () => {
            const { address } = await TestUtils.createTestAccount(client);
            
            const eventPromise = new Promise(resolve => {
                creditSystem.onAssessmentEvent((event) => {
                    if (event.data.borrower === address) {
                        resolve(event);
                    }
                });
            });

            await creditSystem.processCreditAssessment(
                address,
                TestUtils.generateRandomInterviewData()
            );

            const event = await eventPromise;
            expect(event).toBeDefined();
        });

        it('should receive group events', async () => {
            const members = await Promise.all([
                TestUtils.createTestAccount(client),
                TestUtils.createTestAccount(client)
            ]);
            
            const eventPromise = new Promise(resolve => {
                creditSystem.onGroupEvent((event) => {
                    if (event.data.members.includes(members[0].address)) {
                        resolve(event);
                    }
                });
            });

            await creditSystem.createLendingGroup(
                members.map(m => m.address),
                {
                    name: 'TestGroup',
                    purpose: 'Testing'
                }
            );

            const event = await eventPromise;
            expect(event).toBeDefined();
        });
    });
});
