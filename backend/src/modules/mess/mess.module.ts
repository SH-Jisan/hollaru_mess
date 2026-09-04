import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MessController } from './mess.controller';
import { MessService } from './mess.service';

@Module({
  imports: [
    BullModule.registerQueue({name: 'notification-queue'}),
  ],
  controllers: [MessController],
  providers: [MessService]
})
export class MessModule { }
