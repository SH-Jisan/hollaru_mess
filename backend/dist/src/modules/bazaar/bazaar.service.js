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
exports.BazaarService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let BazaarService = class BazaarService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createBazaarItem(dto, userId) {
        const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
        if (!user.messId)
            throw new common_1.BadRequestException('You do not belong to any mess');
        const mess = await this.prisma.mess.findUniqueOrThrow({ where: { id: user.messId } });
        if (!mess.isMonthActive || !mess.currentMonthId) {
            throw new common_1.BadRequestException('Active month summary session is not started');
        }
        return this.prisma.bazaarItem.create({
            data: {
                monthId: mess.currentMonthId,
                items: dto.items,
                status: 'PENDING',
            },
        });
    }
    async completePurchase(itemId, dto, userId) {
        const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
        const item = await this.prisma.bazaarItem.findUnique({ where: { id: itemId } });
        if (!item)
            throw new common_1.NotFoundException('Bazaar item not found');
        if (item.status === 'COMPLETED')
            throw new common_1.BadRequestException('Purchase already completed');
        return this.prisma.bazaarItem.update({
            where: { id: itemId },
            data: {
                cost: dto.cost,
                status: 'COMPLETED',
                shopperId: userId,
                shopperName: user.name,
            },
        });
    }
    async getBazaarList(userId) {
        const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
        if (!user.messId)
            throw new common_1.BadRequestException('You do not belong to any mess');
        const mess = await this.prisma.mess.findUniqueOrThrow({ where: { id: user.messId } });
        if (!mess.currentMonthId)
            return [];
        return this.prisma.bazaarItem.findMany({
            where: { monthId: mess.currentMonthId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async addDeposit(dto, managerId) {
        const manager = await this.prisma.user.findUniqueOrThrow({ where: { id: managerId } });
        if (manager.role !== client_1.Role.MANAGER) {
            throw new common_1.BadRequestException('Only managers can log member deposits');
        }
        if (!manager.messId) {
            throw new common_1.BadRequestException('You do not belong to any mess');
        }
        const targetUser = await this.prisma.user.findUnique({ where: { id: dto.userId } });
        if (!targetUser || targetUser.messId !== manager.messId) {
            throw new common_1.BadRequestException('User not found in your mess');
        }
        const mess = await this.prisma.mess.findUniqueOrThrow({ where: { id: manager.messId } });
        if (!mess.isMonthActive || !mess.currentMonthId) {
            throw new common_1.BadRequestException('Active month summary session is not started');
        }
        return this.prisma.deposit.create({
            data: {
                monthId: mess.currentMonthId,
                userId: dto.userId,
                amount: dto.amount,
            },
        });
    }
};
exports.BazaarService = BazaarService;
exports.BazaarService = BazaarService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BazaarService);
//# sourceMappingURL=bazaar.service.js.map