import { AptosClient } from 'aptos';

export class TestUtils {
    static async createTestAccount(client: AptosClient): Promise<{
        address: string;
        privateKey: string;
    }> {
        // 生成测试账户
        const account = new AptosClient.AptosAccount();
        return {
            address: account.address().toString(),
            privateKey: account.privateKey.toString()
        };
    }

    static generateRandomScore(): number {
        return Math.floor(Math.random() * (850 - 300) + 300);
    }

    static generateRandomInterviewData(): {
        answers: string[];
        metadata: {
            timestamp: number;
            version: string;
            interviewId: string;
        };
    } {
        return {
            answers: [
                'Sample answer 1',
                'Sample answer 2',
                'Sample answer 3'
            ],
            metadata: {
                timestamp: Date.now(),
                version: '1.0',
                interviewId: `interview_${Date.now()}`
            }
        };
    }

    static async delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static generateMockAssessmentResult() {
        return {
            score: this.generateRandomScore(),
            reportHash: `hash_${Date.now()}`,
            confidence: 0.95,
            factors: [
                { factor: 'income_stability', weight: 0.3, score: 80 },
                { factor: 'business_plan', weight: 0.4, score: 75 },
                { factor: 'market_potential', weight: 0.3, score: 70 }
            ]
        };
    }
}
