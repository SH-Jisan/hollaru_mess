import { SystemService } from './system.service';
export declare class SystemController {
    private readonly systemService;
    constructor(systemService: SystemService);
    getSystemStatus(): Promise<{
        status: string;
        timestamp: string;
        uptime: {
            seconds: number;
            formatted: string;
        };
        memory: {
            processRssMb: string;
            heapTotalMb: string;
            heapUsedMb: string;
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
        };
        apiMetrics: import("../../common/interceptors/metrics.interceptors").RouteMetric[];
    }>;
    getDashboardUi(): string;
}
