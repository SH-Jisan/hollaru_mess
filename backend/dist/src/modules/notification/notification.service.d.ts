import { OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SaveFcmTokenDto } from './dto/save-fcm-token.dto';
export declare class NotificationService implements OnModuleInit {
    private prisma;
    private readonly logger;
    private firebaseInitialized;
    constructor(prisma: PrismaService);
    onModuleInit(): void;
    saveFcmToken(userId: string, dto: SaveFcmTokenDto): Promise<{
        message: string;
    }>;
    sendNotificationToUser(userId: string, title: string, body: string): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        userId: string;
        body: string;
        isRead: boolean;
    }>;
    sendNotificationToMess(messId: string, title: string, body: string): Promise<void>;
    getUserNotifications(userId: string): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        userId: string;
        body: string;
        isRead: boolean;
    }[]>;
    markAsRead(notificationId: string, userId: string): Promise<import("@prisma/client").Prisma.BatchPayload>;
}
