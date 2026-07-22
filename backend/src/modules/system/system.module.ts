import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SystemController } from './system.controller';
import { SystemService } from './system.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'notification-queue',
      defaultJobOptions: {
        removeOnComplete: 100, // 🟢 শেষ ১০০টি সফল জব রেখে বাকিগুলো মেমোরি থেকে মুছে ফেলবে
        removeOnFail: 200,     // 🟢 শেষ ২০০টি ব্যর্থ জব রেখে বাকিগুলো মেমোরি থেকে ডিলিট করবে
      },
    }),
  ],
  controllers: [SystemController],
  providers: [SystemService],
})
export class SystemModule {}
