interface PerformanceMetric {
    name: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    metadata?: Record<string, any>;
}

interface PerformanceAlert {
    metric: string;
    threshold: number;
    currentValue: number;
    timestamp: number;
}

export class PerformanceMonitor {
    private static instance: PerformanceMonitor;
    private metrics: Map<string, PerformanceMetric[]>;
    private alerts: PerformanceAlert[];
    private thresholds: Map<string, number>;

    private constructor() {
        this.metrics = new Map();
        this.alerts = [];
        this.thresholds = new Map();
        this.initializeDefaultThresholds();
    }

    public static getInstance(): PerformanceMonitor {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor();
        }
        return PerformanceMonitor.instance;
    }

    private initializeDefaultThresholds(): void {
        this.thresholds.set('transaction_processing', 5000); // 5 seconds
        this.thresholds.set('price_update', 1000);          // 1 second
        this.thresholds.set('api_response', 2000);          // 2 seconds
    }

    public startMetric(name: string, metadata?: Record<string, any>): string {
        const id = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const metric: PerformanceMetric = {
            name,
            startTime: performance.now(),
            metadata
        };

        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }
        this.metrics.get(name)!.push(metric);

        return id;
    }

    public endMetric(name: string, id: string): void {
        const metrics = this.metrics.get(name);
        if (!metrics) return;

        const metric = metrics.find(m => m.startTime.toString() === id.split('_')[1]);
        if (!metric) return;

        metric.endTime = performance.now();
        metric.duration = metric.endTime - metric.startTime;

        // 检查是否超过阈值
        this.checkThreshold(name, metric.duration);
    }

    public setThreshold(metric: string, threshold: number): void {
        this.thresholds.set(metric, threshold);
    }

    private checkThreshold(metric: string, value: number): void {
        const threshold = this.thresholds.get(metric);
        if (threshold && value > threshold) {
            this.alerts.push({
                metric,
                threshold,
                currentValue: value,
                timestamp: Date.now()
            });
            this.notifyAlert(metric, value, threshold);
        }
    }

    private notifyAlert(metric: string, value: number, threshold: number): void {
        console.warn(
            `Performance alert: ${metric} took ${value}ms, ` +
            `exceeding threshold of ${threshold}ms`
        );
        
        // 可以在这里添加更多的通知逻辑，比如发送到监控系统
    }

    public getMetrics(name?: string): PerformanceMetric[] {
        if (name) {
            return this.metrics.get(name) || [];
        }

        const allMetrics: PerformanceMetric[] = [];
        this.metrics.forEach(metrics => allMetrics.push(...metrics));
        return allMetrics;
    }

    public getAlerts(timeRange?: { start: number; end: number }): PerformanceAlert[] {
        if (!timeRange) {
            return this.alerts;
        }

        return this.alerts.filter(
            alert => alert.timestamp >= timeRange.start && 
                    alert.timestamp <= timeRange.end
        );
    }

    public getAverageMetric(name: string): number {
        const metrics = this.metrics.get(name);
        if (!metrics || metrics.length === 0) return 0;

        const totalDuration = metrics.reduce((sum, metric) => {
            return sum + (metric.duration || 0);
        }, 0);

        return totalDuration / metrics.length;
    }

    public clearMetrics(olderThan?: number): void {
        if (!olderThan) {
            this.metrics.clear();
            return;
        }

        const now = Date.now();
        this.metrics.forEach((metrics, name) => {
            const filteredMetrics = metrics.filter(
                metric => now - metric.startTime < olderThan
            );
            this.metrics.set(name, filteredMetrics);
        });
    }

    public clearAlerts(olderThan?: number): void {
        if (!olderThan) {
            this.alerts = [];
            return;
        }

        const now = Date.now();
        this.alerts = this.alerts.filter(
            alert => now - alert.timestamp < olderThan
        );
    }

    public generateReport(): {
        metrics: Record<string, { average: number; count: number }>;
        alerts: PerformanceAlert[];
    } {
        const report: Record<string, { average: number; count: number }> = {};
        
        this.metrics.forEach((metrics, name) => {
            const validMetrics = metrics.filter(m => m.duration !== undefined);
            if (validMetrics.length > 0) {
                const total = validMetrics.reduce((sum, m) => sum + (m.duration || 0), 0);
                report[name] = {
                    average: total / validMetrics.length,
                    count: validMetrics.length
                };
            }
        });

        return {
            metrics: report,
            alerts: this.alerts
        };
    }
}
