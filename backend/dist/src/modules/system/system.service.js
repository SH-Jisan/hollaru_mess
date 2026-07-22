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
let SystemService = SystemService_1 = class SystemService {
    prisma;
    adapterHost;
    cacheManager;
    notificationQueue;
    logger = new common_1.Logger(SystemService_1.name);
    constructor(prisma, adapterHost, cacheManager, notificationQueue) {
        this.prisma = prisma;
        this.adapterHost = adapterHost;
        this.cacheManager = cacheManager;
        this.notificationQueue = notificationQueue;
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
            this.logger.log(`✅ Successfully saved 1-Month Summary for [${monthKey}] in Supabase & Redis!`);
        }
        catch (err) {
            this.logger.error('Failed to run monthly metrics rollup', err);
        }
    }
    async handleHalfYearlyMetricsCycle() {
        this.logger.log('🔄 Executing 6-Month Macro Metrics Rollup to Supabase...');
        try {
            const now = new Date();
            const year = now.getFullYear();
            const halfKey = now.getMonth() < 6 ? `${year}-H1` : `${year}-H2`;
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
            this.logger.log(`✅ Successfully saved 6-Month Macro Summary for [${halfKey}] in Supabase!`);
        }
        catch (err) {
            this.logger.error('Failed to run 6-month metrics rollup', err);
        }
    }
    async handleAnnualMetricsCycle() {
        this.logger.log('🎆 Executing Annual 1-Year System Metrics Archival to Supabase...');
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
            this.logger.log(`🏆 Successfully saved Annual Lifetime Summary for Year [${lastYear}] in Supabase!`);
        }
        catch (err) {
            this.logger.error('Failed to run annual metrics archival', err);
        }
    }
    async getSystemMetrics() {
        this.scanAndRegisterRoutes();
        const memoryUsage = process.memoryUsage();
        const systemTotalMemory = os.totalmem();
        const systemFreeMemory = os.freemem();
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
            const [waiting, active, completed, failed] = await Promise.all([
                this.notificationQueue.getWaitingCount(),
                this.notificationQueue.getActiveCount(),
                this.notificationQueue.getCompletedCount(),
                this.notificationQueue.getFailedCount(),
            ]);
            queueMetrics = { waiting, active, completed, failed };
        }
        catch (err) {
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
            apiMetrics: metrics_interceptors_1.MetricsInterceptor.getMetricsList(),
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
        catch (err) {
        }
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