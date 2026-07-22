import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { InjectQueue } from '@nestjs/bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpAdapterHost } from '@nestjs/core';
import type { Cache } from 'cache-manager';
import { Queue } from 'bullmq';
import * as os from 'os';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MetricsInterceptor } from '../../common/interceptors/metrics.interceptors';

@Injectable()
export class SystemService {
  private readonly logger = new Logger(SystemService.name);
  constructor(
    private prisma: PrismaService,
    private adapterHost: HttpAdapterHost,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectQueue('notification-queue') private notificationQueue: Queue,
  ) {}

    // =========================================================================
  // 🔄 1. MONTHLY CRON JOB: ১ মাসের সামারি Supabase-এ সেভ করা
  // =========================================================================
  @Cron('0 0 1 * *')
  async handleMonthlyMetricsCycle() {
    this.logger.log('🔄 Executing Monthly System Metrics Rollup & Archival to Supabase...');

    try {
      const metricsList = MetricsInterceptor.getMetricsList();
      if (!metricsList || metricsList.length === 0) return;

      const now = new Date();
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const monthKey = lastMonthDate.toISOString().slice(0, 7); // e.g. "2026-06"

      // ⚡ ১. Supabase PostgreSQL ডাটাবেজে স্থায়ীভাবে ১ মাসের সামারি সেভ করা
      await this.prisma.systemMetricSummary.createMany({
        data: metricsList.map((item) => ({
          period: 'MONTHLY',
          periodKey: monthKey,
          routePath: item.path,
          httpMethod: item.method,
          totalRequests: item.totalRequests,
          averageLatencyMs: item.averageLatencyMs,
          averageRamMb: item.averageRamMb,
          averageCpuMs: item.averageCpuMs,
        })),
      });

      // 💾 ২. Upstash Redis-এও সামারি কপি সেভ করা
      const summaryRedisKey = `metrics:summary:monthly:${monthKey}`;
      await this.cacheManager.set(summaryRedisKey, metricsList, 0);

      this.logger.log(`✅ Successfully saved 1-Month Summary for [${monthKey}] in Supabase & Redis!`);
    } catch (err) {
      this.logger.error('Failed to run monthly metrics rollup', err);
    }
  }

  // =========================================================================
  // 🔄 2. 6-MONTH CRON JOB: ৬ মাসের সামারি Supabase-এ সেভ করা
  // =========================================================================
  @Cron('0 0 1 1,7 *')
  async handleHalfYearlyMetricsCycle() {
    this.logger.log('🔄 Executing 6-Month Macro Metrics Rollup to Supabase...');

    try {
      const now = new Date();
      const year = now.getFullYear();
      const halfKey = now.getMonth() < 6 ? `${year}-H1` : `${year}-H2`;
      const metricsList = MetricsInterceptor.getMetricsList();

      // Supabase PostgreSQL-এ সেভ করা
      await this.prisma.systemMetricSummary.createMany({
        data: metricsList.map((item) => ({
          period: 'HALFYEARLY',
          periodKey: halfKey,
          routePath: item.path,
          httpMethod: item.method,
          totalRequests: item.totalRequests,
          averageLatencyMs: item.averageLatencyMs,
          averageRamMb: item.averageRamMb,
          averageCpuMs: item.averageCpuMs,
        })),
      });

      this.logger.log(`✅ Successfully saved 6-Month Macro Summary for [${halfKey}] in Supabase!`);
    } catch (err) {
      this.logger.error('Failed to run 6-month metrics rollup', err);
    }
  }

  // =========================================================================
  // 🔄 3. 1-YEAR ANNUAL CRON JOB: ১ বছরের বাৎসরিক সামারি Supabase-এ সেভ করা
  // =========================================================================
  @Cron('0 0 1 1 *')
  async handleAnnualMetricsCycle() {
    this.logger.log('🎆 Executing Annual 1-Year System Metrics Archival to Supabase...');

    try {
      const lastYear = `${new Date().getFullYear() - 1}`;
      const metricsList = MetricsInterceptor.getMetricsList();

      // Supabase PostgreSQL-এ ১ বছরের সামারি সেভ করা
      await this.prisma.systemMetricSummary.createMany({
        data: metricsList.map((item) => ({
          period: 'ANNUAL',
          periodKey: lastYear,
          routePath: item.path,
          httpMethod: item.method,
          totalRequests: item.totalRequests,
          averageLatencyMs: item.averageLatencyMs,
          averageRamMb: item.averageRamMb,
          averageCpuMs: item.averageCpuMs,
        })),
      });

      this.logger.log(`🏆 Successfully saved Annual Lifetime Summary for Year [${lastYear}] in Supabase!`);
    } catch (err) {
      this.logger.error('Failed to run annual metrics archival', err);
    }
  }


    async getSystemMetrics() {
    this.scanAndRegisterRoutes();
    const memoryUsage = process.memoryUsage();
    const systemTotalMemory = os.totalmem();
    const systemFreeMemory = os.freemem();
    // 🕒 Database Response Latency (Ping)
    const dbStartTime = Date.now();
    let dbStatus = 'HEALTHY';
    let dbLatencyMs = 0;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - dbStartTime;
    } catch (error) {
      dbStatus = 'UNHEALTHY';
    }
    // 📬 BullMQ Queue Job Counters
    let queueMetrics = { waiting: 0, active: 0, completed: 0, failed: 0 };
    try {
      const [waiting, active, completed, failed] = await Promise.all([
        this.notificationQueue.getWaitingCount(),
        this.notificationQueue.getActiveCount(),
        this.notificationQueue.getCompletedCount(),
        this.notificationQueue.getFailedCount(),
      ]);
      queueMetrics = { waiting, active, completed, failed };
    } catch (err) {
      // Queue offline gracefully handled
    }
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: Math.floor(process.uptime()),
        formatted: this.formatUptime(process.uptime()),
      },
      memory: {
        processRssMb: (memoryUsage.rss / 1024 / 1024).toFixed(2),
        heapTotalMb: (memoryUsage.heapTotal / 1024 / 1024).toFixed(2),
        heapUsedMb: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2),
        systemTotalRamGb: (systemTotalMemory / 1024 / 1024 / 1024).toFixed(2) + ' GB',
        systemFreeRamGb: (systemFreeMemory / 1024 / 1024 / 1024).toFixed(2) + ' GB',
      },
      cpu: {
        cores: os.cpus().length,
        model: os.cpus()[0]?.model || 'Unknown',
        loadAverage: os.loadavg(),
      },
      database: {
        status: dbStatus,
        latencyMs: `${dbLatencyMs} ms`,
      },
      queue: queueMetrics,
      apiMetrics: MetricsInterceptor.getMetricsList(),
    };
  }

  private scanAndRegisterRoutes() {
    try {
      const instance = this.adapterHost?.httpAdapter?.getInstance();
      const router = instance?._router || instance?.router;
      if (router && router.stack) {
        const routes: Array<{ method: string; path: string }> = [];
        router.stack.forEach((layer: any) => {
          if (layer.route) {
            const path = layer.route.path;
            const methods = Object.keys(layer.route.methods);
            methods.forEach((m) => {
              routes.push({ method: m.toUpperCase(), path });
            });
          }
        });
        MetricsInterceptor.initializeRegisteredRoutes(routes);
      }
    } catch (err) {
      // Graceful fallback
    }
  }

  private formatUptime(seconds: number): string {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    return `${d}d ${h}h ${m}m ${s}s`;
  }
}

