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
exports.BillingController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const user_decorator_1 = require("../../common/decorators/user.decorator");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const client_1 = require("@prisma/client");
const billing_service_1 = require("./billing.service");
const start_month_dto_1 = require("./dto/start-month.dto");
let BillingController = class BillingController {
    billingService;
    constructor(billingService) {
        this.billingService = billingService;
    }
    startNewMonth(dto, user) {
        return this.billingService.startNewMonth(dto, user.id);
    }
    getMonthSummary(user) {
        return this.billingService.getMonthSummary(user.id);
    }
    closeMonthSession(user) {
        return this.billingService.closeMonthSession(user.id);
    }
};
exports.BillingController = BillingController;
__decorate([
    (0, common_1.Post)('start-month'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Start a new monthly billing session (Manager only)' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Month session started.' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [start_month_dto_1.StartMonthDto, Object]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "startNewMonth", null);
__decorate([
    (0, common_1.Get)('summary'),
    (0, swagger_1.ApiOperation)({ summary: 'Get current month calculation, total costs, total meals, and meal rate' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Month summary and meal rate returned.' }),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "getMonthSummary", null);
__decorate([
    (0, common_1.Post)('close-month'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Close and archive current monthly session (Manager only)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Month session closed.' }),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "closeMonthSession", null);
exports.BillingController = BillingController = __decorate([
    (0, swagger_1.ApiTags)('Billing & Month Summary'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('billing'),
    __metadata("design:paramtypes", [billing_service_1.BillingService])
], BillingController);
//# sourceMappingURL=billing.controller.js.map