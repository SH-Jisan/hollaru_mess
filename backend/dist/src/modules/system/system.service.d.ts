import { HttpAdapterHost } from '@nestjs/core';
import type { Cache } from 'cache-manager';
import { Queue } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
export interface LogEntry {
    time: string;
    level: 'LOG' | 'WARN' | 'ERROR';
    message: string;
}
export declare class SystemService {
    private prisma;
    private adapterHost;
    private cacheManager;
    private notificationQueue;
    private readonly logger;
    private static recentLogs;
    constructor(prisma: PrismaService, adapterHost: HttpAdapterHost, cacheManager: Cache, notificationQueue: Queue);
    static addLog(level: 'LOG' | 'WARN' | 'ERROR', message: string): void;
    static getRecentLogs(): LogEntry[];
    clearSystemCache(type?: string): Promise<{
        success: boolean;
        message: any;
    }>;
    retryFailedQueueJobs(): Promise<{
        success: boolean;
        count: number;
        message: string;
    } | {
        success: boolean;
        message: any;
        count?: undefined;
    }>;
    handleMonthlyMetricsCycle(): Promise<void>;
    handleHalfYearlyMetricsCycle(): Promise<void>;
    handleAnnualMetricsCycle(): Promise<void>;
    getSystemMetrics(): Promise<{
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
        logs: LogEntry[];
        apiMetrics: import("../../common/interceptors/metrics.interceptors").RouteMetric[];
    }>;
    private scanAndRegisterRoutes;
    private formatUptime;
}
