import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationService } from './notification.service';

@Processor('notification-queue')
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly notificationService: NotificationService) {
    super();
  }

  // ব্যাকগ্রাউন্ডে যে জবগুলো প্রসেস হবে
  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing background job '${job.name}' (Job ID: ${job.id})`);

    switch (job.name) {
      case 'send-user-notification': {
        const { userId, title, body } = job.data;
        return await this.notificationService.sendNotificationToUser(userId, title, body);
      }

      case 'send-mess-notification': {
        const { messId, title, body } = job.data;
        return await this.notificationService.sendNotificationToMess(messId, title, body);
      }

      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }
}
