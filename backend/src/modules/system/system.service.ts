import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as os from 'os';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MetricsInterceptor } from '../../common/interceptors/metrics.interceptors';

@Injectable()
export class SystemService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('notification-queue') private notificationQueue: Queue,
  ) {}

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

  private formatUptime(seconds: number): string {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    return `${d}d ${h}h ${m}m ${s}s`;
  }
}
