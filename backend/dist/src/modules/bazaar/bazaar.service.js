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
exports.BazaarService = void 0;
const common_1 = require("@nestjs/common");
const cache_manager_1 = require("@nestjs/cache-manager");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const context_validator_service_1 = require("../../common/services/context-validator.service");
let BazaarService = class BazaarService {
    prisma;
    validator;
    cacheManager;
    notificationQueue;
    constructor(prisma, validator, cacheManager, notificationQueue) {
        this.prisma = prisma;
        this.validator = validator;
        this.cacheManager = cacheManager;
        this.notificationQueue = notificationQueue;
    }
    async createBazaarItem(dto, userId) {
        const { user, mess, activeMonthId } = await this.validator.validateUserMessAndActiveMonth(userId);
        const item = await this.prisma.bazaarItem.create({
            data: {
                monthId: activeMonthId,
                items: dto.items,
                status: 'PENDING',
            },
        });
        const cacheKey = `bazaar:${mess.id}:${activeMonthId}:list`;
        await this.cacheManager.del(cacheKey);
        await this.notificationQueue.add('send-mess-notification', {
            messId: mess.id,
            title: '🛒 New Bazaar Item Added!',
            body: `${user.name} added new items: "${dto.items}"`,
        });
        return item;
    }
    async completePurchase(itemId, dto, userId) {
        const { user, mess } = await this.validator.validateUserAndMess(userId);
        const item = await this.prisma.bazaarItem.findUnique({ where: { id: itemId } });
        if (!item)
            throw new common_1.NotFoundException('Bazaar item not found');
        if (item.status === 'COMPLETED')
            throw new common_1.BadRequestException('Purchase already completed');
        const updatedItem = await this.prisma.bazaarItem.update({
            where: { id: itemId },
            data: {
                cost: dto.cost,
                status: 'COMPLETED',
                shopperId: userId,
                shopperName: user.name,
            },
        });
        if (mess.currentMonthId) {
            const cacheKey = `bazaar:${mess.id}:${mess.currentMonthId}:list`;
            await this.cacheManager.del(cacheKey);
            const billingCacheKey = `billing:${mess.id}:${mess.currentMonthId}:summary`;
            await this.cacheManager.del(billingCacheKey);
        }
        return updatedItem;
    }
    async getBazaarList(userId) {
        const { mess } = await this.validator.validateUserAndMess(userId);
        if (!mess.currentMonthId)
            return [];
        const cacheKey = `bazaar:${mess.id}:${mess.currentMonthId}:list`;
        const cachedList = await this.cacheManager.get(cacheKey);
        if (cachedList) {
            return cachedList;
        }
        const bazaarList = await this.prisma.bazaarItem.findMany({
            where: { monthId: mess.currentMonthId },
            orderBy: { createdAt: 'desc' },
        });
        await this.cacheManager.set(cacheKey, bazaarList, 0);
        return bazaarList;
    }
    async addDeposit(dto, managerId) {
        const { manager, mess } = await this.validator.validateManager(managerId);
        if (!mess.isMonthActive || !mess.currentMonthId) {
            throw new common_1.BadRequestException('Active month summary session is not started');
        }
        const targetUser = await this.prisma.user.findUnique({ where: { id: dto.userId } });
        if (!targetUser || targetUser.messId !== manager.messId) {
            throw new common_1.BadRequestException('User not found in your mess');
        }
        const deposit = await this.prisma.deposit.create({
            data: {
                monthId: mess.currentMonthId,
                userId: dto.userId,
                amount: dto.amount,
            },
        });
        const billingCacheKey = `billing:${mess.id}:${mess.currentMonthId}:summary`;
        await this.cacheManager.del(billingCacheKey);
        await this.notificationQueue.add('send-user-notification', {
            userId: dto.userId,
            title: '💰 Deposit Logged!',
            body: `Manager logged a deposit of BDT ${dto.amount} for you.`,
        });
        return deposit;
    }
};
exports.BazaarService = BazaarService;
exports.BazaarService = BazaarService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __param(3, (0, bullmq_1.InjectQueue)('notification-queue')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        context_validator_service_1.ContextValidatorService, Object, bullmq_2.Queue])
], BazaarService);
//# sourceMappingURL=bazaar.service.js.map