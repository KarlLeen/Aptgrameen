import { AptosClient, Types } from 'aptos';
import { SBTEvent } from './types';

export class EventListener {
    private client: AptosClient;
    private moduleAddress: string;
    private eventHandlers: Map<string, ((event: SBTEvent) => void)[]>;

    constructor(client: AptosClient, moduleAddress: string) {
        this.client = client;
        this.moduleAddress = moduleAddress;
        this.eventHandlers = new Map();
    }

    async startListening(): Promise<void> {
        // 开始监听所有相关事件
        this.listenToAssessmentEvents();
        this.listenToGroupEvents();
        this.listenToRateChangeEvents();
    }

    onEvent(eventType: string, handler: (event: SBTEvent) => void): void {
        const handlers = this.eventHandlers.get(eventType) || [];
        handlers.push(handler);
        this.eventHandlers.set(eventType, handlers);
    }

    private async listenToAssessmentEvents(): Promise<void> {
        const eventHandle = `${this.moduleAddress}::integrated_credit_sbt::AssessmentStore/assessment_events`;
        
        try {
            const events = await this.client.getEventsByEventHandle(
                this.moduleAddress,
                eventHandle,
                { start: 0, limit: 50 }
            );

            events.forEach(event => {
                this.processEvent('assessment', {
                    type: 'assessment',
                    data: event.data,
                    timestamp: Number(event.sequence_number)
                });
            });
        } catch (error) {
            console.error('Error listening to assessment events:', error);
        }
    }

    private async listenToGroupEvents(): Promise<void> {
        const eventHandle = `${this.moduleAddress}::integrated_credit_sbt::GroupCreditSBT/group_events`;
        
        try {
            const events = await this.client.getEventsByEventHandle(
                this.moduleAddress,
                eventHandle,
                { start: 0, limit: 50 }
            );

            events.forEach(event => {
                this.processEvent('group', {
                    type: 'group_update',
                    data: event.data,
                    timestamp: Number(event.sequence_number)
                });
            });
        } catch (error) {
            console.error('Error listening to group events:', error);
        }
    }

    private async listenToRateChangeEvents(): Promise<void> {
        const eventHandle = `${this.moduleAddress}::integrated_dao::DaoConfig/rate_change_events`;
        
        try {
            const events = await this.client.getEventsByEventHandle(
                this.moduleAddress,
                eventHandle,
                { start: 0, limit: 50 }
            );

            events.forEach(event => {
                this.processEvent('rate_change', {
                    type: 'rate_change',
                    data: event.data,
                    timestamp: Number(event.sequence_number)
                });
            });
        } catch (error) {
            console.error('Error listening to rate change events:', error);
        }
    }

    private processEvent(eventType: string, event: SBTEvent): void {
        const handlers = this.eventHandlers.get(eventType) || [];
        handlers.forEach(handler => handler(event));
    }
}
