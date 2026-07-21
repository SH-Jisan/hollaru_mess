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
exports.ContextValidatorService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const domain_exception_1 = require("../exceptions/domain.exception");
let ContextValidatorService = class ContextValidatorService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async validateUserAndMess(userId) {
        const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
        if (!user.messId) {
            throw new domain_exception_1.UserNotInMessException();
        }
        const mess = await this.prisma.mess.findUniqueOrThrow({ where: { id: user.messId } });
        return { user, mess };
    }
    async validateUserMessAndActiveMonth(userId) {
        const { user, mess } = await this.validateUserAndMess(userId);
        if (!mess.isMonthActive || !mess.currentMonthId) {
            throw new domain_exception_1.NoActiveMonthException();
        }
        return { user, mess, activeMonthId: mess.currentMonthId };
    }
    async validateManager(userId) {
        const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
        if (user.role !== client_1.Role.MANAGER || !user.messId) {
            throw new domain_exception_1.ManagerOnlyException();
        }
        const mess = await this.prisma.mess.findUniqueOrThrow({ where: { id: user.messId } });
        return { manager: user, mess };
    }
    async validateUserHasNoMess(userId) {
        const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
        if (user.messId) {
            throw new domain_exception_1.UserAlreadyInMessException();
        }
        return user;
    }
};
exports.ContextValidatorService = ContextValidatorService;
exports.ContextValidatorService = ContextValidatorService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ContextValidatorService);
//# sourceMappingURL=context-validator.service.js.map