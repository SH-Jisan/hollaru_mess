import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { validate } from './config/env.validation';
import { AuthModule } from './modules/auth/auth.module';
import { MessModule } from './modules/mess/mess.module';
import { MealsModule } from './modules/meals/meals.module';
import { BazaarModule } from './modules/bazaar/bazaar.module';
import { BillingModule } from './modules/billing/billing.module';

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
    PrismaModule,
    AuthModule,
    MessModule,
    MealsModule,
    BazaarModule,
    BillingModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
