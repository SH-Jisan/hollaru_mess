"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const cache_manager_1 = require("@nestjs/cache-manager");
const bullmq_1 = require("@nestjs/bullmq");
const nestjs_prometheus_1 = require("@willsoto/nestjs-prometheus");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const prisma_module_1 = require("./common/prisma/prisma.module");
const env_validation_1 = require("./config/env.validation");
const auth_module_1 = require("./modules/auth/auth.module");
const mess_module_1 = require("./modules/mess/mess.module");
const meals_module_1 = require("./modules/meals/meals.module");
const bazaar_module_1 = require("./modules/bazaar/bazaar.module");
const billing_module_1 = require("./modules/billing/billing.module");
const notification_module_1 = require("./modules/notification/notification.module");
const system_module_1 = require("./modules/system/system.module");
const core_1 = require("@nestjs/core");
const metrics_interceptors_1 = require("./common/interceptors/metrics.interceptors");
const throttler_1 = require("@nestjs/throttler");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                validate: env_validation_1.validate,
            }),
            cache_manager_1.CacheModule.register({
                isGlobal: true,
                ttl: 300000,
                max: 500,
            }),
            throttler_1.ThrottlerModule.forRoot([
                {
                    ttl: 60000,
                    limit: 100,
                },
            ]),
            nestjs_prometheus_1.PrometheusModule.register({
                defaultMetrics: {
                    enabled: true,
                },
                path: '/metrics',
            }),
            bullmq_1.BullModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: async (configService) => {
                    let host = configService.get('REDIS_HOST_1')
                        || configService.get('REDIS_HOST');
                    let password = configService.get('REDIS_PASSWORD_1')
                        || configService.get('REDIS_PASSWORD');
                    const secondaryHost = configService.get('REDIS_HOST_2');
                    const secondaryPassword = configService.get('REDIS_PASSWORD_2');
                    if (host && secondaryHost) {
                        try {
                            const Redis = (await import('ioredis')).default;
                            const pingClient = new Redis({
                                host,
                                port: configService.get('REDIS_PORT_1', 6379),
                                password,
                                tls: (configService.get('REDIS_TLS_1')
                                    || configService.get('REDIS_TLS')) === 'true' ? {} : undefined,
                                connectTimeout: 2000,
                                maxRetriesPerRequest: 1,
                            });
                            await pingClient.ping();
                            await pingClient.quit();
                        }
                        catch (err) {
                            console.warn(`⚠️ Primary Redis (${host}) limit reached or offline! Switched to Secondary Backup Redis (${secondaryHost}).`);
                            host = secondaryHost;
                            password = secondaryPassword;
                        }
                    }
                    return {
                        connection: {
                            host,
                            port: 6379,
                            password,
                            tls: {},
                            maxRetriesPerRequest: null,
                            enableOfflineQueue: false,
                        },
                        defaultJobOptions: {
                            removeOnComplete: true,
                            removeOnFail: 100,
                        },
                    };
                },
                inject: [config_1.ConfigService],
            }),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            mess_module_1.MessModule,
            meals_module_1.MealsModule,
            bazaar_module_1.BazaarModule,
            billing_module_1.BillingModule,
            notification_module_1.NotificationModule,
            system_module_1.SystemModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [
            app_service_1.AppService,
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: metrics_interceptors_1.MetricsInterceptor,
            },
            {
                provide: core_1.APP_GUARD,
                useClass: throttler_1.ThrottlerGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map