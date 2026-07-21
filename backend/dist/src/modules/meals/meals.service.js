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
exports.MealsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let MealsService = class MealsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async requestMealUpdate(dto, userId) {
        const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
        if (!user.messId)
            throw new common_1.BadRequestException('You do not belong to any mess');
        const mess = await this.prisma.mess.findUniqueOrThrow({ where: { id: user.messId } });
        if (!mess.isMonthActive || !mess.currentMonthId) {
            throw new common_1.BadRequestException('Active month summary session is not started by manager');
        }
        const todayStr = new Date().toISOString().split('T')[0];
        const log = await this.getOrCreateDailyLog(mess.currentMonthId, todayStr, user.messId);
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
        const manager = await this.prisma.user.findUniqueOrThrow({ where: { id: managerId } });
        if (manager.role !== client_1.Role.MANAGER)
            throw new common_1.BadRequestException('Only managers can approve requests');
        return this.prisma.$transaction(async (tx) => {
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
    }
    async getDailyLiveCount(userId) {
        const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
        if (!user.messId)
            throw new common_1.BadRequestException('You do not belong to any mess');
        const todayStr = new Date().toISOString().split('T')[0];
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
        if (!log)
            return { message: 'No meal records initialized for today yet.' };
        return log;
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
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MealsService);
//# sourceMappingURL=meals.service.js.map