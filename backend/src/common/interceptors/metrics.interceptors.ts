import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

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

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  private static metricsMap = new Map<string, RouteMetric>();

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, route } = request;

    const path = route ? route.path : request.url;
    const metricKey = `${method}:${path}`;
    const startTime = Date.now();
    const startMem = process.memoryUsage().heapUsed;
    const startCpu = process.cpuUsage();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const endMem = process.memoryUsage().heapUsed;
        const endCpu = process.cpuUsage(startCpu);

        const ramDelta = Math.max(0.01, Number(((endMem - startMem) / 1024 / 1024).toFixed(2)));
        const cpuMs = Number(((endCpu.user + endCpu.system) / 1000).toFixed(2));
        const statusCode = response.statusCode;
        const isSuccess = statusCode >= 200 && statusCode < 400;

        const existing = MetricsInterceptor.metricsMap.get(metricKey) || {
          path,
          method,
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          totalLatencyMs: 0,
          averageLatencyMs: 0,
          totalRamMb: 0,
          averageRamMb: 0,
          totalCpuMs: 0,
          averageCpuMs: 0,
          lastRequestedAt: new Date().toISOString(),
        };

        existing.totalRequests += 1;
        if (isSuccess) {
          existing.successfulRequests += 1;
        } else {
          existing.failedRequests += 1;
        }

        existing.totalLatencyMs += duration;
        existing.averageLatencyMs = Number(
          (existing.totalLatencyMs / existing.totalRequests).toFixed(2),
        );

        existing.totalRamMb = Number((existing.totalRamMb + ramDelta).toFixed(2));
        existing.averageRamMb = Number((existing.totalRamMb / existing.totalRequests).toFixed(2));

        existing.totalCpuMs = Number((existing.totalCpuMs + cpuMs).toFixed(2));
        existing.averageCpuMs = Number((existing.totalCpuMs / existing.totalRequests).toFixed(2));

        existing.lastRequestedAt = new Date().toISOString();

        MetricsInterceptor.metricsMap.set(metricKey, existing);
      }),
    );
  }

  static getMetricsList(): RouteMetric[] {
    return Array.from(MetricsInterceptor.metricsMap.values());
  }
}

