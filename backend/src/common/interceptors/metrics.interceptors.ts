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
  lastRequestedAt: string;
}

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  private static metricsMap = new Map<string, RouteMetric>();

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, route } = request;

    // Route path extracted safely
    const path = route ? route.path : request.url;
    const metricKey = `${method}:${path}`;
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
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
        existing.lastRequestedAt = new Date().toISOString();

        MetricsInterceptor.metricsMap.set(metricKey, existing);
      }),
    );
  }

  static getMetricsList(): RouteMetric[] {
    return Array.from(MetricsInterceptor.metricsMap.values());
  }
}
