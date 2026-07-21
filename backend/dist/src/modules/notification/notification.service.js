"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var NotificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const common_1 = require("@nestjs/common");
const app_1 = require("firebase-admin/app");
const messaging_1 = require("firebase-admin/messaging");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let NotificationService = NotificationService_1 = class NotificationService {
    prisma;
    logger = new common_1.Logger(NotificationService_1.name);
    firebaseInitialized = false;
    constructor(prisma) {
        this.prisma = prisma;
    }
    onModuleInit() {
        try {
            if (!(0, app_1.getApps)().length) {
                (0, app_1.initializeApp)();
                this.logger.log('Firebase Admin SDK initialized successfully');
            }
            this.firebaseInitialized = true;
        }
        catch (error) {
            this.logger.warn('Firebase credentials not configured yet. Push notifications will run in mock/log mode.');
        }
    }
    async saveFcmToken(userId, dto) {
        await this.prisma.user.update({
            where: { id: userId },
            data: { fcmToken: dto.fcmToken },
        });
        return { message: 'FCM Token saved successfully' };
    }
    async sendNotificationToUser(userId, title, body) {
        const notification = await this.prisma.notification.create({
            data: {
                userId,
                title,
                body,
            },
        });
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { fcmToken: true },
        });
        if (user?.fcmToken && this.firebaseInitialized) {
            try {
                await (0, messaging_1.getMessaging)().send({
                    token: user.fcmToken,
                    notification: { title, body },
                });
                this.logger.log(`Push notification sent to user: ${userId}`);
            }
            catch (error) {
                this.logger.error(`Failed to send FCM push to user: ${userId}`, error);
            }
        }
        return notification;
    }
    async sendNotificationToMess(messId, title, body) {
        const members = await this.prisma.user.findMany({
            where: { messId },
            select: { id: true, fcmToken: true },
        });
        const notificationEntries = members.map((member) => ({
            userId: member.id,
            title,
            body,
        }));
        await this.prisma.notification.createMany({
            data: notificationEntries,
        });
        const tokens = members.map((m) => m.fcmToken).filter((t) => Boolean(t));
        if (tokens.length > 0 && this.firebaseInitialized) {
            try {
                await (0, messaging_1.getMessaging)().sendEachForMulticast({
                    tokens,
                    notification: { title, body },
                });
                this.logger.log(`Multicast push sent to mess: ${messId} (${tokens.length} devices)`);
            }
            catch (error) {
                this.logger.error(`Failed multicast push to mess: ${messId}`, error);
            }
        }
    }
    async getUserNotifications(userId) {
        return this.prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
    }
    async markAsRead(notificationId, userId) {
        return this.prisma.notification.updateMany({
            where: { id: notificationId, userId },
            data: { isRead: true },
        });
    }
};
exports.NotificationService = NotificationService;
exports.NotificationService = NotificationService = NotificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationService);
//# sourceMappingURL=notification.service.js.map