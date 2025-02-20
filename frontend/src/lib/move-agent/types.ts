import { Types } from 'aptos';

export interface CreditSBT {
    score: number;
    assessmentHistory: AssessmentRecord[];
    lastUpdate: number;
}

export interface GroupCreditSBT {
    groupId: string;
    members: string[];
    collectiveScore: number;
    memberContributions: Map<string, number>;
    interestRate: number;
    lastUpdate: number;
}

export interface AssessmentRecord {
    timestamp: number;
    score: number;
    reportHash: string;
}

export interface InterviewData {
    answers: string[];
    metadata: {
        timestamp: number;
        version: string;
        interviewId: string;
    };
}

export interface AssessmentResult {
    score: number;
    reportHash: string;
    confidence: number;
    factors: {
        factor: string;
        weight: number;
        score: number;
    }[];
}

export interface SBTEvent {
    type: 'mint' | 'update' | 'group_create' | 'group_update';
    data: any;
    timestamp: number;
}

export type TransactionResult = Types.UserTransaction;
