import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { NotificationService } from './notification.service';
export declare class NotificationProcessor extends WorkerHost {
    private readonly notificationService;
    private readonly logger;
    constructor(notificationService: NotificationService);
    process(job: Job<any, any, string>): Promise<any>;
}
