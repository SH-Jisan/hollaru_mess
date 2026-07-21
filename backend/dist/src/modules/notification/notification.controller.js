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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const user_decorator_1 = require("../../common/decorators/user.decorator");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const save_fcm_token_dto_1 = require("./dto/save-fcm-token.dto");
const notification_service_1 = require("./notification.service");
let NotificationController = class NotificationController {
    notificationService;
    constructor(notificationService) {
        this.notificationService = notificationService;
    }
    saveFcmToken(user, dto) {
        return this.notificationService.saveFcmToken(user.id, dto);
    }
    getUserNotifications(user) {
        return this.notificationService.getUserNotifications(user.id);
    }
    markAsRead(id, user) {
        return this.notificationService.markAsRead(id, user.id);
    }
};
exports.NotificationController = NotificationController;
__decorate([
    (0, common_1.Post)('fcm-token'),
    (0, swagger_1.ApiOperation)({ summary: 'Save or update mobile device FCM Token for push notifications' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'FCM Token saved.' }),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, save_fcm_token_dto_1.SaveFcmTokenDto]),
    __metadata("design:returntype", void 0)
], NotificationController.prototype, "saveFcmToken", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get in-app notifications history for logged in user' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Notifications returned.' }),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], NotificationController.prototype, "getUserNotifications", null);
__decorate([
    (0, common_1.Patch)('read/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Mark specific in-app notification as read' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Marked as read.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], NotificationController.prototype, "markAsRead", null);
exports.NotificationController = NotificationController = __decorate([
    (0, swagger_1.ApiTags)('Notifications'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('notifications'),
    __metadata("design:paramtypes", [notification_service_1.NotificationService])
], NotificationController);
//# sourceMappingURL=notification.controller.js.map