interface EventData {
    category: string;
    action: string;
    label?: string;
    value?: number;
    metadata?: Record<string, any>;
    timestamp: number;
}

interface EventFilter {
    category?: string;
    action?: string;
    timeRange?: {
        start: number;
        end: number;
    };
}

interface EventAnalytics {
    totalEvents: number;
    categoryBreakdown: Record<string, number>;
    actionBreakdown: Record<string, number>;
    timeSeriesData: Array<{
        timestamp: number;
        count: number;
    }>;
}

export class EventTracker {
    private static instance: EventTracker;
    private events: EventData[];
    private readonly maxEvents: number;
    private readonly flushThreshold: number;
    private onFlush?: (events: EventData[]) => Promise<void>;

    private constructor(
        maxEvents: number = 1000,
        flushThreshold: number = 100
    ) {
        this.events = [];
        this.maxEvents = maxEvents;
        this.flushThreshold = flushThreshold;
    }

    public static getInstance(): EventTracker {
        if (!EventTracker.instance) {
            EventTracker.instance = new EventTracker();
        }
        return EventTracker.instance;
    }

    public trackEvent(
        category: string,
        action: string,
        label?: string,
        value?: number,
        metadata?: Record<string, any>
    ): void {
        const event: EventData = {
            category,
            action,
            label,
            value,
            metadata,
            timestamp: Date.now()
        };

        this.events.push(event);

        // 检查是否需要刷新数据
        if (this.events.length >= this.flushThreshold) {
            this.flush();
        }

        // 如果超过最大事件数，删除最旧的事件
        if (this.events.length > this.maxEvents) {
            this.events = this.events.slice(-this.maxEvents);
        }
    }

    public setFlushCallback(callback: (events: EventData[]) => Promise<void>): void {
        this.onFlush = callback;
    }

    private async flush(): Promise<void> {
        if (this.onFlush && this.events.length > 0) {
            try {
                await this.onFlush([...this.events]);
                this.events = [];
            } catch (error) {
                console.error('Failed to flush events:', error);
            }
        }
    }

    public getEvents(filter?: EventFilter): EventData[] {
        let filteredEvents = [...this.events];

        if (filter) {
            if (filter.category) {
                filteredEvents = filteredEvents.filter(
                    event => event.category === filter.category
                );
            }

            if (filter.action) {
                filteredEvents = filteredEvents.filter(
                    event => event.action === filter.action
                );
            }

            if (filter.timeRange) {
                filteredEvents = filteredEvents.filter(
                    event => event.timestamp >= filter.timeRange!.start &&
                            event.timestamp <= filter.timeRange!.end
                );
            }
        }

        return filteredEvents;
    }

    public analyzeEvents(filter?: EventFilter): EventAnalytics {
        const events = this.getEvents(filter);
        const categoryBreakdown: Record<string, number> = {};
        const actionBreakdown: Record<string, number> = {};
        const timeSeriesMap = new Map<number, number>();

        events.forEach(event => {
            // 类别统计
            categoryBreakdown[event.category] = (categoryBreakdown[event.category] || 0) + 1;

            // 动作统计
            actionBreakdown[event.action] = (actionBreakdown[event.action] || 0) + 1;

            // 时间序列数据（按小时分组）
            const hourTimestamp = Math.floor(event.timestamp / (60 * 60 * 1000)) * (60 * 60 * 1000);
            timeSeriesMap.set(hourTimestamp, (timeSeriesMap.get(hourTimestamp) || 0) + 1);
        });

        // 转换时间序列数据为排序数组
        const timeSeriesData = Array.from(timeSeriesMap.entries())
            .map(([timestamp, count]) => ({ timestamp, count }))
            .sort((a, b) => a.timestamp - b.timestamp);

        return {
            totalEvents: events.length,
            categoryBreakdown,
            actionBreakdown,
            timeSeriesData
        };
    }

    public generateReport(timeRange?: { start: number; end: number }): {
        summary: EventAnalytics;
        topEvents: Array<{ category: string; action: string; count: number }>;
        userFlow: Array<{ from: string; to: string; count: number }>;
    } {
        const filter = timeRange ? { timeRange } : undefined;
        const events = this.getEvents(filter);
        const analytics = this.analyzeEvents(filter);

        // 计算最常见的事件组合
        const eventCombinations = new Map<string, number>();
        events.forEach(event => {
            const key = `${event.category}:${event.action}`;
            eventCombinations.set(key, (eventCombinations.get(key) || 0) + 1);
        });

        const topEvents = Array.from(eventCombinations.entries())
            .map(([key, count]) => {
                const [category, action] = key.split(':');
                return { category, action, count };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // 分析用户流程
        const userFlow: Array<{ from: string; to: string; count: number }> = [];
        for (let i = 0; i < events.length - 1; i++) {
            const current = events[i];
            const next = events[i + 1];
            const key = `${current.action}->${next.action}`;
            
            const existingFlow = userFlow.find(f => f.from === current.action && f.to === next.action);
            if (existingFlow) {
                existingFlow.count++;
            } else {
                userFlow.push({
                    from: current.action,
                    to: next.action,
                    count: 1
                });
            }
        }

        return {
            summary: analytics,
            topEvents,
            userFlow: userFlow.sort((a, b) => b.count - a.count)
        };
    }

    public async exportEvents(format: 'json' | 'csv' = 'json'): Promise<string> {
        if (format === 'json') {
            return JSON.stringify(this.events, null, 2);
        }

        // CSV 格式导出
        const headers = ['timestamp', 'category', 'action', 'label', 'value', 'metadata'];
        const rows = this.events.map(event => [
            event.timestamp,
            event.category,
            event.action,
            event.label || '',
            event.value || '',
            JSON.stringify(event.metadata || {})
        ]);

        return [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');
    }
}
