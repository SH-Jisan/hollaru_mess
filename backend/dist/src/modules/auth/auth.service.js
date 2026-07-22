"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const cache_manager_1 = require("@nestjs/cache-manager");
const bcrypt = __importStar(require("bcrypt"));
const crypto = __importStar(require("crypto"));
const prisma_service_1 = require("../../common/prisma/prisma.service");
let AuthService = class AuthService {
    prisma;
    jwtService;
    configService;
    cacheManager;
    constructor(prisma, jwtService, configService, cacheManager) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.configService = configService;
        this.cacheManager = cacheManager;
    }
    async register(dto) {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (existingUser) {
            throw new common_1.ConflictException('Email already registered');
        }
        const userId = crypto.randomUUID();
        const tokens = await this.generateTokens(userId, dto.email, 'MEMBER');
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const hashedRefreshToken = this.hashToken(tokens.refreshToken);
        const user = await this.prisma.user.create({
            data: {
                id: userId,
                name: dto.name,
                email: dto.email,
                phone: dto.phone,
                hashedPassword,
                hashedRefreshToken,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
            },
        });
        return { user, ...tokens };
    }
    async login(dto) {
        const cacheKey = `auth:user:${dto.email}`;
        let user = await this.cacheManager.get(cacheKey);
        if (!user) {
            user = await this.prisma.user.findUnique({
                where: { email: dto.email },
            });
            if (user) {
                const { hashedRefreshToken, ...safeCachePayload } = user;
                await this.cacheManager.set(cacheKey, safeCachePayload, 900000);
            }
        }
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const isPasswordValid = await bcrypt.compare(dto.password, user.hashedPassword);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const tokens = await this.generateTokens(user.id, user.email, user.role);
        this.updateRefreshToken(user.id, tokens.refreshToken).catch(() => { });
        const { hashedPassword, hashedRefreshToken, ...userWithoutSecrets } = user;
        return { user: userWithoutSecrets, ...tokens };
    }
    async clearUserAuthCache(email) {
        await this.cacheManager.del(`auth:user:${email}`);
    }
    async refresh(dto) {
        try {
            const payload = this.jwtService.verify(dto.refreshToken, {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
            });
            const user = await this.prisma.user.findUnique({
                where: { id: payload.sub },
            });
            if (!user || !user.hashedRefreshToken) {
                throw new common_1.UnauthorizedException('Access denied');
            }
            const hashedInput = this.hashToken(dto.refreshToken);
            if (hashedInput !== user.hashedRefreshToken) {
                throw new common_1.UnauthorizedException('Access denied');
            }
            const tokens = await this.generateTokens(user.id, user.email, user.role);
            this.updateRefreshToken(user.id, tokens.refreshToken).catch(() => { });
            return tokens;
        }
        catch (error) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
    }
    async generateTokens(userId, email, role) {
        const payload = { sub: userId, email, role };
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret: this.configService.get('JWT_ACCESS_SECRET'),
                expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION'),
            }),
            this.jwtService.signAsync(payload, {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
                expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION'),
            }),
        ]);
        return { accessToken, refreshToken };
    }
    hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }
    async updateRefreshToken(userId, refreshToken) {
        const hashedRefreshToken = this.hashToken(refreshToken);
        await this.prisma.user.update({
            where: { id: userId },
            data: { hashedRefreshToken },
        });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService, Object])
], AuthService);
//# sourceMappingURL=auth.service.js.map