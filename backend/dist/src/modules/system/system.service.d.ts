import { HttpAdapterHost } from '@nestjs/core';
import type { Cache } from 'cache-manager';
import { Queue } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
export declare class SystemService {
    private prisma;
    private adapterHost;
    private cacheManager;
    private notificationQueue;
    private readonly logger;
    constructor(prisma: PrismaService, adapterHost: HttpAdapterHost, cacheManager: Cache, notificationQueue: Queue);
    handleMonthlyMetricsCycle(): Promise<void>;
    handleHalfYearlyMetricsCycle(): Promise<void>;
    handleAnnualMetricsCycle(): Promise<void>;
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
        queue: {
            waiting: number;
            active: number;
            completed: number;
            failed: number;
        };
        apiMetrics: import("../../common/interceptors/metrics.interceptors").RouteMetric[];
    }>;
    private scanAndRegisterRoutes;
    private formatUptime;
}
