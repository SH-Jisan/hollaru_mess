import { SaveFcmTokenDto } from './dto/save-fcm-token.dto';
import { NotificationService } from './notification.service';
export declare class NotificationController {
    private readonly notificationService;
    constructor(notificationService: NotificationService);
    saveFcmToken(user: {
        id: string;
    }, dto: SaveFcmTokenDto): Promise<{
        message: string;
    }>;
    getUserNotifications(user: {
        id: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        userId: string;
        body: string;
        isRead: boolean;
    }[]>;
    markAsRead(id: string, user: {
        id: string;
    }): Promise<import("@prisma/client").Prisma.BatchPayload>;
}
