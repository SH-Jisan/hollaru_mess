import { PrismaService } from '../../common/prisma/prisma.service';
export declare class SystemService {
    private prisma;
    constructor(prisma: PrismaService);
    getSystemMetrics(): Promise<{
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
    private formatUptime;
}
