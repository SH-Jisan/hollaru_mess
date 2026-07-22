import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
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
  private static readonly MAX_MAP_SIZE = 500;

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, route } = request;

    const path = route ? route.path : request.url.split('?')[0];
    const metricKey = `${method}:${path}`;
    const startTime = Date.now();
    const startMem = process.memoryUsage().heapUsed;
    const startCpu = process.cpuUsage();

    return next.handle().pipe(
      tap(async () => {
        const duration = Date.now() - startTime;
        const endMem = process.memoryUsage().heapUsed;
        const endCpu = process.cpuUsage(startCpu);

        const ramDelta = Math.max(0.01, Number(((endMem - startMem) / 1024 / 1024).toFixed(2)));
        const cpuMs = Number(((endCpu.user + endCpu.system) / 1000).toFixed(2));
        const statusCode = response.statusCode;
        const isSuccess = statusCode >= 200 && statusCode < 400;

        // ১. ইন-মেমোরি ম্যাপ আপডেট
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
        if (isSuccess) existing.successfulRequests += 1;
        else existing.failedRequests += 1;

        existing.totalLatencyMs += duration;
        existing.averageLatencyMs = Number((existing.totalLatencyMs / existing.totalRequests).toFixed(2));

        existing.totalRamMb = Number((existing.totalRamMb + ramDelta).toFixed(2));
        existing.averageRamMb = Number((existing.totalRamMb / existing.totalRequests).toFixed(2));

        existing.totalCpuMs = Number((existing.totalCpuMs + cpuMs).toFixed(2));
        existing.averageCpuMs = Number((existing.totalCpuMs / existing.totalRequests).toFixed(2));
        existing.lastRequestedAt = new Date().toISOString();

        MetricsInterceptor.metricsMap.set(metricKey, existing);

        // ⚡ ২. Upstash Redis-এ ৩০ দিনের TTL (2592000 seconds) দিয়ে সেভ করা
        try {
          const currentMonth = new Date().toISOString().slice(0, 7); // e.g. "2026-07"
          const redisKey = `metrics:monthly:${currentMonth}:${metricKey}`;
          const ttlSeconds = 30 * 24 * 60 * 60; // 30 Days Auto Expiration
          await this.cacheManager.set(redisKey, existing, ttlSeconds);
        } catch (err) {
          // Redis Exception Handling
        }
      }),
    );
  }

  static initializeRegisteredRoutes(routes: Array<{ method: string; path: string }>) {
    routes.forEach(({ method, path }) => {
      const metricKey = `${method}:${path}`;
      if (!MetricsInterceptor.metricsMap.has(metricKey)) {
        MetricsInterceptor.metricsMap.set(metricKey, {
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
        });
      }
    });
  }

  static getMetricsList(): RouteMetric[] {
    return Array.from(MetricsInterceptor.metricsMap.values());
  }
}
