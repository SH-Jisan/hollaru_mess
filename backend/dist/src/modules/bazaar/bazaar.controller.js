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
exports.BazaarController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const user_decorator_1 = require("../../common/decorators/user.decorator");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const client_1 = require("@prisma/client");
const bazaar_service_1 = require("./bazaar.service");
const complete_purchase_dto_1 = require("./dto/complete-purchase.dto");
const create_bazaar_item_dto_1 = require("./dto/create-bazaar-item.dto");
const create_deposit_dto_1 = require("./dto/create-deposit.dto");
let BazaarController = class BazaarController {
    bazaarService;
    constructor(bazaarService) {
        this.bazaarService = bazaarService;
    }
    createBazaarItem(dto, user) {
        return this.bazaarService.createBazaarItem(dto, user.id);
    }
    completePurchase(itemId, dto, user) {
        return this.bazaarService.completePurchase(itemId, dto, user.id);
    }
    getBazaarList(user) {
        return this.bazaarService.getBazaarList(user.id);
    }
    addDeposit(dto, user) {
        return this.bazaarService.addDeposit(dto, user.id);
    }
};
exports.BazaarController = BazaarController;
__decorate([
    (0, common_1.Post)('item'),
    (0, swagger_1.ApiOperation)({ summary: 'Add a new item to the bazaar list' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Item added successfully.' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_bazaar_item_dto_1.CreateBazaarItemDto, Object]),
    __metadata("design:returntype", void 0)
], BazaarController.prototype, "createBazaarItem", null);
__decorate([
    (0, common_1.Patch)('complete/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Submit purchase cost and mark item as completed' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Purchase completed.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, complete_purchase_dto_1.CompletePurchaseDto, Object]),
    __metadata("design:returntype", void 0)
], BazaarController.prototype, "completePurchase", null);
__decorate([
    (0, common_1.Get)('list'),
    (0, swagger_1.ApiOperation)({ summary: 'Get current month bazaar list' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Bazaar list returned.' }),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BazaarController.prototype, "getBazaarList", null);
__decorate([
    (0, common_1.Post)('deposit'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Log member deposit (Manager only)' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Deposit logged successfully.' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_deposit_dto_1.CreateDepositDto, Object]),
    __metadata("design:returntype", void 0)
], BazaarController.prototype, "addDeposit", null);
exports.BazaarController = BazaarController = __decorate([
    (0, swagger_1.ApiTags)('Bazaar & Deposits'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('bazaar'),
    __metadata("design:paramtypes", [bazaar_service_1.BazaarService])
], BazaarController);
//# sourceMappingURL=bazaar.controller.js.map