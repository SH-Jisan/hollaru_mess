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
exports.BillingService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let BillingService = class BillingService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async startNewMonth(dto, managerId) {
        const manager = await this.prisma.user.findUniqueOrThrow({ where: { id: managerId } });
        if (manager.role !== client_1.Role.MANAGER || !manager.messId) {
            throw new common_1.BadRequestException('Only mess managers can start a new month session');
        }
        const mess = await this.prisma.mess.findUniqueOrThrow({ where: { id: manager.messId } });
        if (mess.isMonthActive) {
            throw new common_1.BadRequestException('A month session is already active. Close it first.');
        }
        return this.prisma.$transaction(async (tx) => {
            const month = await tx.monthlyData.create({
                data: {
                    monthName: dto.monthName,
                    messId: manager.messId,
                },
            });
            await tx.mess.update({
                where: { id: manager.messId },
                data: {
                    isMonthActive: true,
                    currentMonthId: month.id,
                },
            });
            return month;
        });
    }
    async getMonthSummary(userId) {
        const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
        if (!user.messId)
            throw new common_1.BadRequestException('You do not belong to any mess');
        const mess = await this.prisma.mess.findUniqueOrThrow({ where: { id: user.messId } });
        if (!mess.currentMonthId)
            throw new common_1.NotFoundException('No active or previous month record found');
        const monthId = mess.currentMonthId;
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
            const estimatedCost = 0;
            return {
                memberId: member.id,
                name: member.name,
                email: member.email,
                totalDeposit,
            };
        });
        return {
            monthId,
            totalBazaarCost,
            totalMeals,
            mealRate: Number(mealRate.toFixed(2)),
            members: memberSummaries,
        };
    }
    async closeMonthSession(managerId) {
        const manager = await this.prisma.user.findUniqueOrThrow({ where: { id: managerId } });
        if (manager.role !== client_1.Role.MANAGER || !manager.messId) {
            throw new common_1.BadRequestException('Only managers can close a month session');
        }
        const mess = await this.prisma.mess.findUniqueOrThrow({ where: { id: manager.messId } });
        if (!mess.isMonthActive || !mess.currentMonthId) {
            throw new common_1.BadRequestException('No active month session to close');
        }
        return this.prisma.$transaction(async (tx) => {
            await tx.monthlyData.update({
                where: { id: mess.currentMonthId },
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
    }
};
exports.BillingService = BillingService;
exports.BillingService = BillingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BillingService);
//# sourceMappingURL=billing.service.js.map