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
exports.MealsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const user_decorator_1 = require("../../common/decorators/user.decorator");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const update_meal_dto_1 = require("./dto/update-meal.dto");
const meals_service_1 = require("./meals.service");
let MealsController = class MealsController {
    mealsService;
    constructor(mealsService) {
        this.mealsService = mealsService;
    }
    requestMealUpdate(dto, user) {
        return this.mealsService.requestMealUpdate(dto, user.id);
    }
    approveRequest(requestId, user) {
        return this.mealsService.approveRequest(requestId, user.id);
    }
    getDailyLiveCount(user) {
        return this.mealsService.getDailyLiveCount(user.id);
    }
};
exports.MealsController = MealsController;
__decorate([
    (0, common_1.Post)('request'),
    (0, swagger_1.ApiOperation)({ summary: 'Submit a request to turn meal OFF or add GUEST meals' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Request successfully submitted.' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Deadline passed or month summary not active.' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_meal_dto_1.UpdateMealDto, Object]),
    __metadata("design:returntype", void 0)
], MealsController.prototype, "requestMealUpdate", null);
__decorate([
    (0, common_1.Patch)('approve/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Manager approves a pending meal modification request' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Request approved and count updated.' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Only managers can approve requests or request already processed.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MealsController.prototype, "approveRequest", null);
__decorate([
    (0, common_1.Get)('live'),
    (0, swagger_1.ApiOperation)({ summary: 'Get live meal counts and requests list for today' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Live count returned.' }),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MealsController.prototype, "getDailyLiveCount", null);
exports.MealsController = MealsController = __decorate([
    (0, swagger_1.ApiTags)('Daily Meals'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('meals'),
    __metadata("design:paramtypes", [meals_service_1.MealsService])
], MealsController);
//# sourceMappingURL=meals.controller.js.map