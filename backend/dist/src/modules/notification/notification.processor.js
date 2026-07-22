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
var NotificationProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const notification_service_1 = require("./notification.service");
let NotificationProcessor = NotificationProcessor_1 = class NotificationProcessor extends bullmq_1.WorkerHost {
    notificationService;
    logger = new common_1.Logger(NotificationProcessor_1.name);
    constructor(notificationService) {
        super();
        this.notificationService = notificationService;
    }
    async process(job) {
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
};
exports.NotificationProcessor = NotificationProcessor;
exports.NotificationProcessor = NotificationProcessor = NotificationProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('notification-queue'),
    __metadata("design:paramtypes", [notification_service_1.NotificationService])
], NotificationProcessor);
//# sourceMappingURL=notification.processor.js.map