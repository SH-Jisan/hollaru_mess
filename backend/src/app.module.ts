import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { BullModule } from '@nestjs/bullmq';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { validate } from './config/env.validation';
import { AuthModule } from './modules/auth/auth.module';
import { MessModule } from './modules/mess/mess.module';
import { MealsModule } from './modules/meals/meals.module';
import { BazaarModule } from './modules/bazaar/bazaar.module';
import { BillingModule } from './modules/billing/billing.module';
import { NotificationModule } from './modules/notification/notification.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    CacheModule.register({
      isGlobal: true,
      ttl: 300000,
      max: 500,
    }),
    // 📊 Prometheus Metrics Endpoint (/metrics)
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true, // CPU, RAM, Memory Leak, Event loop metrics
      },
      path: '/metrics',
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
          tls: configService.get<string>('REDIS_TLS') === 'true' ? {} : undefined,
          maxRetriesPerRequest: null,
        },
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
    AuthModule,
    MessModule,
    MealsModule,
    BazaarModule,
    BillingModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
