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
exports.BillingService = void 0;
const common_1 = require("@nestjs/common");
const cache_manager_1 = require("@nestjs/cache-manager");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const context_validator_service_1 = require("../../common/services/context-validator.service");
const domain_exception_1 = require("../../common/exceptions/domain.exception");
let BillingService = class BillingService {
    prisma;
    validator;
    cacheManager;
    constructor(prisma, validator, cacheManager) {
        this.prisma = prisma;
        this.validator = validator;
        this.cacheManager = cacheManager;
    }
    async startNewMonth(dto, managerId) {
        const { manager, mess } = await this.validator.validateManager(managerId);
        if (mess.isMonthActive) {
            throw new domain_exception_1.MonthAlreadyActiveException();
        }
        const month = await this.prisma.$transaction(async (tx) => {
            const createdMonth = await tx.monthlyData.create({
                data: {
                    monthName: dto.monthName,
                    messId: manager.messId,
                },
            });
            await tx.mess.update({
                where: { id: manager.messId },
                data: {
                    isMonthActive: true,
                    currentMonthId: createdMonth.id,
                },
            });
            return createdMonth;
        });
        const cacheKey = `billing:${mess.id}:${month.id}:summary`;
        await this.cacheManager.del(cacheKey);
        return month;
    }
    async getMonthSummary(userId) {
        const { user, mess } = await this.validator.validateUserAndMess(userId);
        if (!mess.currentMonthId)
            throw new common_1.NotFoundException('No active or previous month record found');
        const monthId = mess.currentMonthId;
        const cacheKey = `billing:${mess.id}:${monthId}:summary`;
        const cachedSummary = await this.cacheManager.get(cacheKey);
        if (cachedSummary) {
            return cachedSummary;
        }
        const bazaarAggregate = await this.prisma.bazaarItem.aggregate({
            where: { monthId, status: 'COMPLETED' },
            _sum: { cost: true },
        });
        const totalBazaarCost = bazaarAggregate._sum.cost || 0;
        const dailyLogs = await this.prisma.dailyLog.findMany({
            where: { monthId },
            select: { lunchCount: true, dinnerCount: true },
        });
        const totalMeals = dailyLogs.reduce((sum, log) => sum + log.lunchCount + log.dinnerCount, 0);
        const mealRate = totalMeals > 0 ? totalBazaarCost / totalMeals : 0;
        const depositsGrouped = await this.prisma.deposit.groupBy({
            by: ['userId'],
            where: { monthId },
            _sum: { amount: true },
        });
        const depositMap = new Map();
        depositsGrouped.forEach((dep) => depositMap.set(dep.userId, dep._sum.amount || 0));
        const members = await this.prisma.user.findMany({
            where: { messId: user.messId },
            select: { id: true, name: true, email: true },
        });
        const memberSummaries = members.map((member) => {
            const totalDeposit = depositMap.get(member.id) || 0;
            return {
                memberId: member.id,
                name: member.name,
                email: member.email,
                totalDeposit,
            };
        });
        const summaryResult = {
            monthId,
            totalBazaarCost,
            totalMeals,
            mealRate: Number(mealRate.toFixed(2)),
            members: memberSummaries,
        };
        await this.cacheManager.set(cacheKey, summaryResult, 0);
        return summaryResult;
    }
    async closeMonthSession(managerId) {
        const { mess } = await this.validator.validateManager(managerId);
        if (!mess.isMonthActive || !mess.currentMonthId) {
            throw new common_1.BadRequestException('No active month session to close');
        }
        const monthId = mess.currentMonthId;
        const result = await this.prisma.$transaction(async (tx) => {
            await tx.monthlyData.update({
                where: { id: monthId },
                data: { isClosed: true },
            });
            await tx.mess.update({
                where: { id: mess.id },
                data: {
                    isMonthActive: false,
                    currentMonthId: null,
                },
            });
            return { message: 'Month session closed and archived successfully' };
        });
        const cacheKey = `billing:${mess.id}:${monthId}:summary`;
        await this.cacheManager.del(cacheKey);
        return result;
    }
};
exports.BillingService = BillingService;
exports.BillingService = BillingService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        context_validator_service_1.ContextValidatorService, Object])
], BillingService);
//# sourceMappingURL=billing.service.js.map