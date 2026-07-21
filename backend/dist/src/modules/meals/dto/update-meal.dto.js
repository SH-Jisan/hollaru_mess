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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateMealDto = exports.RequestCategory = exports.MealType = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var MealType;
(function (MealType) {
    MealType["LUNCH"] = "LUNCH";
    MealType["DINNER"] = "DINNER";
})(MealType || (exports.MealType = MealType = {}));
var RequestCategory;
(function (RequestCategory) {
    RequestCategory["OFF"] = "OFF";
    RequestCategory["GUEST"] = "GUEST";
})(RequestCategory || (exports.RequestCategory = RequestCategory = {}));
class UpdateMealDto {
    type;
    category;
    count;
}
exports.UpdateMealDto = UpdateMealDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'LUNCH', enum: MealType }),
    (0, class_validator_1.IsEnum)(MealType),
    __metadata("design:type", String)
], UpdateMealDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'OFF', enum: RequestCategory }),
    (0, class_validator_1.IsEnum)(RequestCategory),
    __metadata("design:type", String)
], UpdateMealDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'Count to decrement (OFF) or increment (GUEST)' }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], UpdateMealDto.prototype, "count", void 0);
//# sourceMappingURL=update-meal.dto.js.map