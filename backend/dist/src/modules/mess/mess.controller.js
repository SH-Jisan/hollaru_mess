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
exports.MessController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const user_decorator_1 = require("../../common/decorators/user.decorator");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const client_1 = require("@prisma/client");
const create_mess_dto_1 = require("./dto/create-mess.dto");
const join_mess_dto_1 = require("./dto/join-mess.dto");
const transfer_manager_dto_1 = require("./dto/transfer-manager.dto");
const mess_service_1 = require("./mess.service");
let MessController = class MessController {
    messService;
    constructor(messService) {
        this.messService = messService;
    }
    createMess(createMessDto, user) {
        return this.messService.createMess(createMessDto, user.id);
    }
    joinMess(joinMessDto, user) {
        return this.messService.joinMess(joinMessDto, user.id);
    }
    getMembers(user) {
        return this.messService.getMembers(user.id);
    }
    leaveMess(user) {
        return this.messService.leaveMess(user.id);
    }
    transferManager(dto, user) {
        return this.messService.transferManager(dto, user.id);
    }
};
exports.MessController = MessController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new mess (Creator becomes MANAGER)' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Mess created successfully.' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_mess_dto_1.CreateMessDto, Object]),
    __metadata("design:returntype", void 0)
], MessController.prototype, "createMess", null);
__decorate([
    (0, common_1.Post)('join'),
    (0, swagger_1.ApiOperation)({ summary: 'Join an existing mess using a unique 4-digit code' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Joined successfully.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Mess code not found.' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [join_mess_dto_1.JoinMessDto, Object]),
    __metadata("design:returntype", void 0)
], MessController.prototype, "joinMess", null);
__decorate([
    (0, common_1.Get)('members'),
    (0, swagger_1.ApiOperation)({ summary: 'List all members in the current user mess' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of members returned.' }),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MessController.prototype, "getMembers", null);
__decorate([
    (0, common_1.Post)('leave'),
    (0, swagger_1.ApiOperation)({ summary: 'Leave current mess' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Left mess successfully.' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'User not in mess or manager cannot leave.' }),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MessController.prototype, "leaveMess", null);
__decorate([
    (0, common_1.Post)('transfer-manager'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Transfer manager ownership to another member (Manager Only)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Manager transferred successfully & notification sent to all members.' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [transfer_manager_dto_1.TransferManagerDto, Object]),
    __metadata("design:returntype", void 0)
], MessController.prototype, "transferManager", null);
exports.MessController = MessController = __decorate([
    (0, swagger_1.ApiTags)('Mess Management'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('mess'),
    __metadata("design:paramtypes", [mess_service_1.MessService])
], MessController);
//# sourceMappingURL=mess.controller.js.map