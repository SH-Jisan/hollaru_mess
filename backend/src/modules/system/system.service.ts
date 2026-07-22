import { Injectable } from '@nestjs/common';
import * as os from 'os';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MetricsInterceptor } from '../../common/interceptors/metrics.interceptors'; // 👈 ১. ইমপোর্ট করা

@Injectable()
export class SystemService {
  constructor(private prisma: PrismaService) {}

  async getSystemMetrics() {
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

    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: Math.floor(process.uptime()),
        formatted: this.formatUptime(process.uptime()),
      },
      memory: {
        processRssMb: (memoryUsage.rss / 1024 / 1024).toFixed(2) + ' MB',
        heapTotalMb: (memoryUsage.heapTotal / 1024 / 1024).toFixed(2) + ' MB',
        heapUsedMb: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
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
      apiMetrics: MetricsInterceptor.getMetricsList(), // 👈 ২. প্রতি এপিআই-এর পারফরম্যান্স মেট্রিক্স যুক্ত করা
    };
  }

  private formatUptime(seconds: number): string {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    return `${d}d ${h}h ${m}m ${s}s`;
  }
}
