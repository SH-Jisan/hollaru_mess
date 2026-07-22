import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
export interface RouteMetric {
    path: string;
    method: string;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    totalLatencyMs: number;
    averageLatencyMs: number;
    lastRequestedAt: string;
}
export declare class MetricsInterceptor implements NestInterceptor {
    private static metricsMap;
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
    static getMetricsList(): RouteMetric[];
}
