import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { Observable } from 'rxjs';
export interface RouteMetric {
    path: string;
    method: string;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    totalLatencyMs: number;
    averageLatencyMs: number;
    totalRamMb: number;
    averageRamMb: number;
    totalCpuMs: number;
    averageCpuMs: number;
    lastRequestedAt: string;
}
export declare class MetricsInterceptor implements NestInterceptor {
    private cacheManager;
    private static metricsMap;
    private static readonly MAX_MAP_SIZE;
    constructor(cacheManager: Cache);
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
    static initializeRegisteredRoutes(routes: Array<{
        method: string;
        path: string;
    }>): void;
    static getMetricsList(): RouteMetric[];
}
