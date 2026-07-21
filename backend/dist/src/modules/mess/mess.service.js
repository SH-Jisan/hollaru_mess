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
exports.MessService = void 0;
const common_1 = require("@nestjs/common");
const cache_manager_1 = require("@nestjs/cache-manager");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const context_validator_service_1 = require("../../common/services/context-validator.service");
const domain_exception_1 = require("../../common/exceptions/domain.exception");
let MessService = class MessService {
    prisma;
    validator;
    cacheManager;
    constructor(prisma, validator, cacheManager) {
        this.prisma = prisma;
        this.validator = validator;
        this.cacheManager = cacheManager;
    }
    async createMess(dto, userId) {
        await this.validator.validateUserHasNoMess(userId);
        const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
        const emailPart = user.email.split('@')[0].substring(0, 2).toUpperCase().padEnd(2, 'X');
        const timePart = Date.now().toString(36).toUpperCase().slice(-4);
        const code = `MESS-${emailPart}${timePart}`;
        return this.prisma.$transaction(async (tx) => {
            const mess = await tx.mess.create({
                data: {
                    name: dto.name,
                    code,
                    managerId: userId,
                },
            });
            await tx.user.update({
                where: { id: userId },
                data: {
                    messId: mess.id,
                    role: client_1.Role.MANAGER,
                },
            });
            return mess;
        });
    }
    async joinMess(dto, userId) {
        await this.validator.validateUserHasNoMess(userId);
        const mess = await this.prisma.mess.findUnique({
            where: { code: dto.code.toUpperCase() },
        });
        if (!mess) {
            throw new domain_exception_1.MessCodeNotFoundException();
        }
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                messId: mess.id,
                role: client_1.Role.MEMBER,
            },
        });
        const cacheKey = `mess:${mess.id}:members`;
        await this.cacheManager.del(cacheKey);
        return { message: 'Successfully joined the mess', messName: mess.name };
    }
    async getMembers(userId) {
        const { user } = await this.validator.validateUserAndMess(userId);
        const cacheKey = `mess:${user.messId}:members`;
        const cachedMembers = await this.cacheManager.get(cacheKey);
        if (cachedMembers) {
            return cachedMembers;
        }
        const members = await this.prisma.user.findMany({
            where: { messId: user.messId },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                createdAt: true,
            },
        });
        await this.cacheManager.set(cacheKey, members, 0);
        return members;
    }
};
exports.MessService = MessService;
exports.MessService = MessService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        context_validator_service_1.ContextValidatorService, Object])
], MessService);
//# sourceMappingURL=mess.service.js.map