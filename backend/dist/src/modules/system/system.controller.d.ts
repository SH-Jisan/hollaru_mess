import { MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { SystemService } from './system.service';
export declare class SystemController {
    private readonly systemService;
    constructor(systemService: SystemService);
    getSystemStatus(): Promise<{
        status: string;
        timestamp: string;
        engine: {
            nodeVersion: string;
            pid: number;
            platform: NodeJS.Platform;
            env: string;
        };
        healthScore: number;
        uptime: {
            seconds: number;
            formatted: string;
        };
        memory: {
            processRssMb: string;
            heapTotalMb: string;
            heapUsedMb: string;
            heapPercent: number;
            systemTotalRamGb: string;
            systemFreeRamGb: string;
        };
        cpu: {
            cores: number;
            model: string;
            loadAverage: number[];
        };
        database: {
            status: string;
            latencyMs: string;
            latencyValue: number;
        };
        queue: {
            waiting: number;
            active: number;
            completed: number;
            failed: number;
        };
        trafficSummary: {
            totalRequests: number;
            successfulRequests: number;
            failedRequests: number;
            successRatePercent: number;
        };
        logs: import("./system.service").LogEntry[];
        apiMetrics: import("../../common/interceptors/metrics.interceptors").RouteMetric[];
    }>;
    clearCache(): Promise<{
        success: boolean;
        message: any;
    }>;
    retryQueue(): Promise<{
        success: boolean;
        count: number;
        message: string;
    } | {
        success: boolean;
        message: any;
        count?: undefined;
    }>;
    getDashboardUi(): string;
    streamMetrics(): Observable<MessageEvent>;
    getDashboardCss(): string;
    getDashboardJs(): string;
    private readFile;
}
