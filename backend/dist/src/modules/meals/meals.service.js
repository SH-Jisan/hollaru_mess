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
exports.MealsService = void 0;
const common_1 = require("@nestjs/common");
const cache_manager_1 = require("@nestjs/cache-manager");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const context_validator_service_1 = require("../../common/services/context-validator.service");
let MealsService = class MealsService {
    prisma;
    validator;
    cacheManager;
    constructor(prisma, validator, cacheManager) {
        this.prisma = prisma;
        this.validator = validator;
        this.cacheManager = cacheManager;
    }
    async requestMealUpdate(dto, userId) {
        const { mess, activeMonthId } = await this.validator.validateUserMessAndActiveMonth(userId);
        const todayStr = new Date().toISOString().split('T')[0];
        const log = await this.getOrCreateDailyLog(activeMonthId, todayStr, mess.id);
        this.checkDeadline(mess, dto.type);
        return this.prisma.mealRequest.create({
            data: {
                logId: log.id,
                userId,
                type: dto.type,
                category: dto.category,
                count: dto.count,
                status: client_1.RequestStatus.PENDING,
            },
        });
    }
    async approveRequest(requestId, managerId) {
        const { manager } = await this.validator.validateManager(managerId);
        const result = await this.prisma.$transaction(async (tx) => {
            const request = await tx.mealRequest.findUniqueOrThrow({
                where: { id: requestId },
                include: { log: true, user: true },
            });
            if (request.status !== client_1.RequestStatus.PENDING) {
                throw new common_1.BadRequestException('This request has already been processed');
            }
            if (request.user.messId !== manager.messId) {
                throw new common_1.BadRequestException('Access denied. Member belongs to another mess.');
            }
            await tx.mealRequest.update({
                where: { id: requestId },
                data: { status: client_1.RequestStatus.APPROVED },
            });
            const countField = request.type === 'LUNCH' ? 'lunchCount' : 'dinnerCount';
            const incrementValue = request.category === 'OFF' ? -request.count : request.count;
            await tx.dailyLog.update({
                where: { id: request.logId },
                data: {
                    [countField]: {
                        increment: incrementValue,
                    },
                },
            });
            return { message: 'Request approved successfully' };
        });
        const todayStr = new Date().toISOString().split('T')[0];
        const cacheKey = `meals:${manager.messId}:${todayStr}:live`;
        await this.cacheManager.del(cacheKey);
        return result;
    }
    async getDailyLiveCount(userId) {
        const { user } = await this.validator.validateUserAndMess(userId);
        const todayStr = new Date().toISOString().split('T')[0];
        const cacheKey = `meals:${user.messId}:${todayStr}:live`;
        const cachedData = await this.cacheManager.get(cacheKey);
        if (cachedData) {
            return cachedData;
        }
        const log = await this.prisma.dailyLog.findFirst({
            where: {
                id: todayStr,
                month: { messId: user.messId },
            },
            include: {
                requests: {
                    include: {
                        user: { select: { name: true, role: true } },
                    },
                },
            },
        });
        const responseData = log || { message: 'No meal records initialized for today yet.' };
        await this.cacheManager.set(cacheKey, responseData, 43200000);
        return responseData;
    }
    async getOrCreateDailyLog(monthId, dateStr, messId) {
        let log = await this.prisma.dailyLog.findUnique({ where: { id: dateStr } });
        if (!log) {
            const memberCount = await this.prisma.user.count({ where: { messId } });
            log = await this.prisma.dailyLog.create({
                data: {
                    id: dateStr,
                    monthId,
                    lunchCount: memberCount,
                    dinnerCount: memberCount,
                },
            });
        }
        return log;
    }
    checkDeadline(mess, type) {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const deadlineString = type === 'LUNCH' ? mess.lunchEndTime : mess.dinnerEndTime;
        const [deadHour, deadMin] = deadlineString.split(':').map(Number);
        if (currentHour > deadHour || (currentHour === deadHour && currentMinute >= deadMin)) {
            throw new common_1.BadRequestException(`${type} deadline has passed. Modifications are locked.`);
        }
    }
};
exports.MealsService = MealsService;
exports.MealsService = MealsService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        context_validator_service_1.ContextValidatorService, Object])
], MealsService);
//# sourceMappingURL=meals.service.js.map