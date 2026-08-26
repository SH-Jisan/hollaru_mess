import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MessController } from './mess.controller';
import { MessService } from './mess.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    BullModule.registerQueue({name: 'notification-queue'}),
  ],
  controllers: [MessController],
  providers: [MessService]
})
export class MessModule { }
