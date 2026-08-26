"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var SystemService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemService = void 0;
const common_1 = require("@nestjs/common");
const cache_manager_1 = require("@nestjs/cache-manager");
const bullmq_1 = require("@nestjs/bullmq");
const schedule_1 = require("@nestjs/schedule");
const core_1 = require("@nestjs/core");
const bullmq_2 = require("bullmq");
const os = __importStar(require("os"));
const prisma_service_1 = require("../../common/prisma/prisma.service");
const metrics_interceptors_1 = require("../../common/interceptors/metrics.interceptors");
let SystemService = class SystemService {
    static { SystemService_1 = this; }
    prisma;
    adapterHost;
    cacheManager;
    notificationQueue;
    logger = new common_1.Logger(SystemService_1.name);
    static recentLogs = [];
    constructor(prisma, adapterHost, cacheManager, notificationQueue) {
        this.prisma = prisma;
        this.adapterHost = adapterHost;
        this.cacheManager = cacheManager;
        this.notificationQueue = notificationQueue;
        SystemService_1.addLog('LOG', 'System Observability Engine Initialized');
    }
    static addLog(level, message) {
        const entry = {
            time: new Date().toLocaleTimeString(),
            level,
            message,
        };
        this.recentLogs.unshift(entry);
        if (this.recentLogs.length > 50)
            this.recentLogs.pop();
    }
    static getRecentLogs() {
        return this.recentLogs;
    }
    async clearSystemCache(type) {
        try {
            SystemService_1.addLog('WARN', `Manual Cache Clear Triggered [${type || 'ALL'}]`);
            return { success: true, message: `System Cache [${type || 'ALL'}] successfully invalidated` };
        }
        catch (err) {
            SystemService_1.addLog('ERROR', `Cache Clear Failed: ${err.message}`);
            return { success: false, message: err.message };
        }
    }
    async retryFailedQueueJobs() {
        try {
            const failedJobs = await this.notificationQueue.getFailed();
            for (const job of failedJobs) {
                await job.retry();
            }
            SystemService_1.addLog('LOG', `Retried ${failedJobs.length} failed BullMQ background jobs`);
            return { success: true, count: failedJobs.length, message: `Retried ${failedJobs.length} failed jobs` };
        }
        catch (err) {
            SystemService_1.addLog('ERROR', `Queue Retry Failed: ${err.message}`);
            return { success: false, message: err.message };
        }
    }
    async handleMonthlyMetricsCycle() {
        this.logger.log('🔄 Executing Monthly System Metrics Rollup & Archival to Supabase...');
        try {
            const metricsList = metrics_interceptors_1.MetricsInterceptor.getMetricsList();
            if (!metricsList || metricsList.length === 0)
                return;
            const now = new Date();
            const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const monthKey = lastMonthDate.toISOString().slice(0, 7);
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
            const summaryRedisKey = `metrics:summary:monthly:${monthKey}`;
            await this.cacheManager.set(summaryRedisKey, metricsList, 0);
            SystemService_1.addLog('LOG', `Saved 1-Month Metric Rollup for [${monthKey}]`);
        }
        catch (err) {
            SystemService_1.addLog('ERROR', `Monthly Rollup Failed: ${err.message}`);
        }
    }
    async handleHalfYearlyMetricsCycle() {
        try {
            const now = new Date();
            const halfKey = now.getMonth() < 6 ? `${now.getFullYear()}-H1` : `${now.getFullYear()}-H2`;
            const metricsList = metrics_interceptors_1.MetricsInterceptor.getMetricsList();
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
            SystemService_1.addLog('LOG', `Saved 6-Month Macro Metric Rollup for [${halfKey}]`);
        }
        catch (err) {
            SystemService_1.addLog('ERROR', `6-Month Rollup Failed: ${err.message}`);
        }
    }
    async handleAnnualMetricsCycle() {
        try {
            const lastYear = `${new Date().getFullYear() - 1}`;
            const metricsList = metrics_interceptors_1.MetricsInterceptor.getMetricsList();
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
            SystemService_1.addLog('LOG', `Saved Annual Metric Rollup for [${lastYear}]`);
        }
        catch (err) {
            SystemService_1.addLog('ERROR', `Annual Rollup Failed: ${err.message}`);
        }
    }
    async getSystemMetrics() {
        this.scanAndRegisterRoutes();
        const memoryUsage = process.memoryUsage();
        const systemTotalMemory = os.totalmem();
        const systemFreeMemory = os.freemem();
        const heapPercent = Number(((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100).toFixed(1));
        const dbStartTime = Date.now();
        let dbStatus = 'HEALTHY';
        let dbLatencyMs = 0;
        try {
            await this.prisma.$queryRaw `SELECT 1`;
            dbLatencyMs = Date.now() - dbStartTime;
        }
        catch (error) {
            dbStatus = 'UNHEALTHY';
        }
        let queueMetrics = { waiting: 0, active: 0, completed: 0, failed: 0 };
        try {
            const counts = await this.notificationQueue.getJobCounts('waiting', 'active', 'completed', 'failed');
            queueMetrics = {
                waiting: counts.waiting || 0,
                active: counts.active || 0,
                completed: counts.completed || 0,
                failed: counts.failed || 0,
            };
        }
        catch (err) { }
        let healthScore = 100;
        if (dbStatus !== 'HEALTHY')
            healthScore -= 40;
        if (dbLatencyMs > 200)
            healthScore -= 15;
        if (heapPercent > 85)
            healthScore -= 20;
        const apiMetrics = metrics_interceptors_1.MetricsInterceptor.getMetricsList();
        const totalSystemRequests = apiMetrics.reduce((sum, item) => sum + item.totalRequests, 0);
        const totalSuccessfulRequests = apiMetrics.reduce((sum, item) => sum + item.successfulRequests, 0);
        const totalFailedRequests = apiMetrics.reduce((sum, item) => sum + item.failedRequests, 0);
        const successRate = totalSystemRequests > 0 ? Number(((totalSuccessfulRequests / totalSystemRequests) * 100).toFixed(1)) : 100;
        return {
            status: 'OK',
            timestamp: new Date().toISOString(),
            engine: {
                nodeVersion: process.version,
                pid: process.pid,
                platform: os.platform(),
                env: process.env.NODE_ENV || 'development',
            },
            healthScore: Math.max(0, healthScore),
            uptime: {
                seconds: Math.floor(process.uptime()),
                formatted: this.formatUptime(process.uptime()),
            },
            memory: {
                processRssMb: (memoryUsage.rss / 1024 / 1024).toFixed(2),
                heapTotalMb: (memoryUsage.heapTotal / 1024 / 1024).toFixed(2),
                heapUsedMb: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2),
                heapPercent,
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
                latencyValue: dbLatencyMs,
            },
            queue: queueMetrics,
            trafficSummary: {
                totalRequests: totalSystemRequests,
                successfulRequests: totalSuccessfulRequests,
                failedRequests: totalFailedRequests,
                successRatePercent: successRate,
            },
            logs: SystemService_1.getRecentLogs(),
            apiMetrics,
        };
    }
    scanAndRegisterRoutes() {
        try {
            const instance = this.adapterHost?.httpAdapter?.getInstance();
            const router = instance?._router || instance?.router;
            if (router && router.stack) {
                const routes = [];
                router.stack.forEach((layer) => {
                    if (layer.route) {
                        const path = layer.route.path;
                        const methods = Object.keys(layer.route.methods);
                        methods.forEach((m) => {
                            routes.push({ method: m.toUpperCase(), path });
                        });
                    }
                });
                metrics_interceptors_1.MetricsInterceptor.initializeRegisteredRoutes(routes);
            }
        }
        catch (err) { }
    }
    formatUptime(seconds) {
        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor((seconds % (3600 * 24)) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${d}d ${h}h ${m}m ${s}s`;
    }
};
exports.SystemService = SystemService;
__decorate([
    (0, schedule_1.Cron)('0 0 1 * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SystemService.prototype, "handleMonthlyMetricsCycle", null);
__decorate([
    (0, schedule_1.Cron)('0 0 1 1,7 *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SystemService.prototype, "handleHalfYearlyMetricsCycle", null);
__decorate([
    (0, schedule_1.Cron)('0 0 1 1 *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SystemService.prototype, "handleAnnualMetricsCycle", null);
exports.SystemService = SystemService = SystemService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __param(3, (0, bullmq_1.InjectQueue)('notification-queue')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        core_1.HttpAdapterHost, Object, bullmq_2.Queue])
], SystemService);
//# sourceMappingURL=system.service.js.map