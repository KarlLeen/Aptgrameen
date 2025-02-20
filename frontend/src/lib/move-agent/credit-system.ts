import { AptosClient } from 'aptos';
import { AIAssessmentAgent } from './ai-assessment-agent';
import { SBTManager } from './sbt-manager';
import { EventListener } from './event-listener';
import { CacheManager } from './cache-manager';
import { BatchProcessor } from './batch-processor';
import { InterviewData, AssessmentResult, CreditSBT, GroupCreditSBT, SBTEvent } from './types';

export class APLCreditSystem {
    private aiAgent: AIAssessmentAgent;
    private sbtManager: SBTManager;
    private client: AptosClient;
    private eventListener: EventListener;
    private cacheManager: CacheManager;
    private batchProcessor: BatchProcessor;

    constructor(
        nodeUrl: string,
        moduleAddress: string
    ) {
        this.client = new AptosClient(nodeUrl);
        this.aiAgent = new AIAssessmentAgent(this.client, moduleAddress);
        this.sbtManager = new SBTManager(this.client, moduleAddress);
        this.eventListener = new EventListener(this.client, moduleAddress);
        this.cacheManager = new CacheManager();
        this.batchProcessor = new BatchProcessor(this.client, moduleAddress);
        
        // 初始化事件监听
        this.initializeEventListeners();
    }

    async processCreditAssessment(
        borrowerAddress: string,
        interviewData: InterviewData
    ): Promise<void> {
        try {
            // 提交面试数据
            await this.aiAgent.submitInterviewData(
                borrowerAddress,
                interviewData
            );

            // 模拟 AI 评估过程
            const assessmentResult = await this.performAIAssessment(interviewData);

            // 处理评估结果
            await this.aiAgent.processAssessment(
                borrowerAddress,
                assessmentResult
            );
        } catch (error) {
            console.error('Credit assessment failed:', error);
            throw error;
        }
    }

    async createLendingGroup(
        members: string[],
        groupMetadata: { name: string; purpose: string }
    ): Promise<void> {
        try {
            // 验证成员资格
            await this.validateMembers(members);

            // 生成群组 ID
            const groupId = this.generateGroupId(members, groupMetadata);

            // 创建群组 SBT
            await this.sbtManager.createGroupSBT(
                members,
                groupId
            );
        } catch (error) {
            console.error('Group creation failed:', error);
            throw error;
        }
    }

    async getCreditScore(address: string): Promise<number | null> {
        const sbt = await this.sbtManager.getCreditSBT(address);
        return sbt ? sbt.score : null;
    }

    async getGroupDetails(address: string): Promise<GroupCreditSBT | null> {
        return await this.sbtManager.getGroupSBT(address);
    }

    private async performAIAssessment(interviewData: InterviewData): Promise<AssessmentResult> {
        // 这里应该调用实际的 AI 服务
        // 示例实现
        return {
            score: 750,
            reportHash: 'hash_placeholder',
            confidence: 0.95,
            factors: [
                { factor: 'income_stability', weight: 0.3, score: 80 },
                { factor: 'business_plan', weight: 0.4, score: 75 },
                { factor: 'market_potential', weight: 0.3, score: 70 }
            ]
        };
    }

    private async validateMembers(members: string[]): Promise<void> {
        for (const member of members) {
            const score = await this.getCreditScore(member);
            if (!score) {
                throw new Error(`Member ${member} does not have a credit score`);
            }
        }
    }

    private generateGroupId(
        members: string[],
        metadata: { name: string; purpose: string }
    ): string {
        const timestamp = Date.now().toString();
        const memberString = members.sort().join('');
        return `${metadata.name}_${metadata.purpose}_${timestamp}_${memberString}`;
    }

    // 批量处理方法
    async batchProcessAssessments(
        assessments: Array<{
            borrowerAddress: string;
            score: number;
            reportHash: string;
        }>
    ) {
        return await this.batchProcessor.batchProcessAssessments(assessments);
    }

    async batchCreateGroups(
        groups: Array<{
            members: string[];
            groupId: string;
        }>
    ) {
        return await this.batchProcessor.batchCreateGroups(groups);
    }

    // 缓存管理方法
    async getCreditSBTWithCache(address: string): Promise<CreditSBT | null> {
        let sbt = this.cacheManager.getCreditSBT(address);
        if (!sbt) {
            sbt = await this.sbtManager.getCreditSBT(address);
            if (sbt) {
                this.cacheManager.setCreditSBT(address, sbt);
            }
        }
        return sbt;
    }

    async getGroupSBTWithCache(groupId: string): Promise<GroupCreditSBT | null> {
        let sbt = this.cacheManager.getGroupSBT(groupId);
        if (!sbt) {
            sbt = await this.sbtManager.getGroupSBT(groupId);
            if (sbt) {
                this.cacheManager.setGroupSBT(groupId, sbt);
            }
        }
        return sbt;
    }

    // 事件监听方法
    private initializeEventListeners(): void {
        this.eventListener.onEvent('assessment', (event: SBTEvent) => {
            if (event.type === 'assessment') {
                this.cacheManager.invalidateCredit(event.data.borrower);
            }
        });

        this.eventListener.onEvent('group', (event: SBTEvent) => {
            if (event.type === 'group_update') {
                this.cacheManager.invalidateGroup(event.data.groupId);
            }
        });

        this.eventListener.startListening();
    }

    // 订阅特定事件
    onAssessmentEvent(handler: (event: SBTEvent) => void): void {
        this.eventListener.onEvent('assessment', handler);
    }

    onGroupEvent(handler: (event: SBTEvent) => void): void {
        this.eventListener.onEvent('group', handler);
    }

    onRateChangeEvent(handler: (event: SBTEvent) => void): void {
        this.eventListener.onEvent('rate_change', handler);
    }

    // 清理方法
    clearCache(): void {
        this.cacheManager.clear();
    }
}
