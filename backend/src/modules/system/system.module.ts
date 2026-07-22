import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SystemController } from './system.controller';
import { SystemService } from './system.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'notification-queue',
    }),
  ],
  controllers: [SystemController],
  providers: [SystemService],
})
export class SystemModule {}
