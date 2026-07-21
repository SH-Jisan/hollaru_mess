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
exports.MessService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let MessService = class MessService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createMess(dto, userId) {
        const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
        if (user.messId) {
            throw new common_1.BadRequestException('You are already a member of a mess');
        }
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
        const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
        if (user.messId) {
            throw new common_1.BadRequestException('You are already a member of a mess');
        }
        const mess = await this.prisma.mess.findUnique({
            where: { code: dto.code.toUpperCase() },
        });
        if (!mess) {
            throw new common_1.NotFoundException('Mess code not found');
        }
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                messId: mess.id,
                role: client_1.Role.MEMBER,
            },
        });
        return { message: 'Successfully joined the mess', messName: mess.name };
    }
    async getMembers(userId) {
        const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
        if (!user.messId) {
            throw new common_1.BadRequestException('You do not belong to any mess');
        }
        return this.prisma.user.findMany({
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
    }
};
exports.MessService = MessService;
exports.MessService = MessService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MessService);
//# sourceMappingURL=mess.service.js.map