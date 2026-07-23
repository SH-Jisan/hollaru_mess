"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var MetricsInterceptor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsInterceptor = void 0;
const common_1 = require("@nestjs/common");
const cache_manager_1 = require("@nestjs/cache-manager");
const operators_1 = require("rxjs/operators");
let MetricsInterceptor = class MetricsInterceptor {
    static { MetricsInterceptor_1 = this; }
    cacheManager;
    static metricsMap = new Map();
    static MAX_MAP_SIZE = 500;
    constructor(cacheManager) {
        this.cacheManager = cacheManager;
    }
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        const { method, route } = request;
        const path = route ? route.path : request.url.split('?')[0];
        const metricKey = `${method}:${path}`;
        const startTime = Date.now();
        const startMem = process.memoryUsage().heapUsed;
        const startCpu = process.cpuUsage();
        return next.handle().pipe((0, operators_1.tap)(async () => {
            const duration = Date.now() - startTime;
            const endMem = process.memoryUsage().heapUsed;
            const endCpu = process.cpuUsage(startCpu);
            const ramDelta = Math.max(0.01, Number(((endMem - startMem) / 1024 / 1024).toFixed(2)));
            const cpuMs = Number(((endCpu.user + endCpu.system) / 1000).toFixed(2));
            const statusCode = response.statusCode;
            const isSuccess = statusCode >= 200 && statusCode < 400;
            const existing = MetricsInterceptor_1.metricsMap.get(metricKey) || {
                path,
                method,
                totalRequests: 0,
                successfulRequests: 0,
                failedRequests: 0,
                totalLatencyMs: 0,
                averageLatencyMs: 0,
                lastLatencyMs: 0,
                totalRamMb: 0,
                averageRamMb: 0,
                totalCpuMs: 0,
                averageCpuMs: 0,
                lastRequestedAt: new Date().toISOString(),
            };
            existing.totalRequests += 1;
            if (isSuccess)
                existing.successfulRequests += 1;
            else
                existing.failedRequests += 1;
            existing.lastLatencyMs = duration;
            existing.totalLatencyMs += duration;
            existing.averageLatencyMs = Number((existing.totalLatencyMs / existing.totalRequests).toFixed(2));
            existing.totalRamMb = Number((existing.totalRamMb + ramDelta).toFixed(2));
            existing.averageRamMb = Number((existing.totalRamMb / existing.totalRequests).toFixed(2));
            existing.totalCpuMs = Number((existing.totalCpuMs + cpuMs).toFixed(2));
            existing.averageCpuMs = Number((existing.totalCpuMs / existing.totalRequests).toFixed(2));
            existing.lastRequestedAt = new Date().toISOString();
            MetricsInterceptor_1.metricsMap.set(metricKey, existing);
            try {
                const currentMonth = new Date().toISOString().slice(0, 7);
                const redisKey = `metrics:monthly:${currentMonth}:${metricKey}`;
                const ttlSeconds = 30 * 24 * 60 * 60;
                await this.cacheManager.set(redisKey, existing, ttlSeconds);
            }
            catch (err) {
            }
        }));
    }
    static initializeRegisteredRoutes(routes) {
        routes.forEach(({ method, path }) => {
            const metricKey = `${method}:${path}`;
            if (!MetricsInterceptor_1.metricsMap.has(metricKey)) {
                MetricsInterceptor_1.metricsMap.set(metricKey, {
                    path,
                    method,
                    totalRequests: 0,
                    successfulRequests: 0,
                    failedRequests: 0,
                    totalLatencyMs: 0,
                    averageLatencyMs: 0,
                    lastLatencyMs: 0,
                    totalRamMb: 0,
                    averageRamMb: 0,
                    totalCpuMs: 0,
                    averageCpuMs: 0,
                    lastRequestedAt: new Date().toISOString(),
                });
            }
        });
    }
    static getMetricsList() {
        return Array.from(MetricsInterceptor_1.metricsMap.values());
    }
};
exports.MetricsInterceptor = MetricsInterceptor;
exports.MetricsInterceptor = MetricsInterceptor = MetricsInterceptor_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [Object])
], MetricsInterceptor);
//# sourceMappingURL=metrics.interceptors.js.map