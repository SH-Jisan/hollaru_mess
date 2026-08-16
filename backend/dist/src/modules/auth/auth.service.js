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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const cache_manager_1 = require("@nestjs/cache-manager");
const bcrypt = __importStar(require("bcrypt"));
const crypto = __importStar(require("crypto"));
const prisma_service_1 = require("../../common/prisma/prisma.service");
const client_1 = require("@prisma/client");
let AuthService = AuthService_1 = class AuthService {
    prisma;
    jwtService;
    configService;
    cacheManager;
    logger = new common_1.Logger(AuthService_1.name);
    constructor(prisma, jwtService, configService, cacheManager) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.configService = configService;
        this.cacheManager = cacheManager;
    }
    async register(dto) {
        if (dto.honeypot && dto.honeypot.trim().length > 0) {
            this.logger.warn(`🤖 BOT TRAPPED: Honeypot field filled by automated bot from email: ${dto.email}`);
            throw new common_1.BadRequestException('Bot activity detected.');
        }
        const turnstileSecret = this.configService.get('TURNSTILE_SECRET_KEY');
        if (turnstileSecret && dto.captchaToken) {
            const isHuman = await this.verifyTurnstileToken(dto.captchaToken, turnstileSecret);
            if (!isHuman) {
                throw new common_1.BadRequestException('Captcha verification failed. Automated bot activity suspected.');
            }
        }
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
        try {
            const user = await this.prisma.$transaction(async (tx) => {
                const newUser = await tx.user.create({
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
                await tx.notification.create({
                    data: {
                        userId: newUser.id,
                        title: 'Welcome to Mess Manager! 🎉',
                        body: `Hello ${newUser.name}, welcome to Hollaru Mess Manager. You can now join or manage your mess.`,
                    },
                });
                return newUser;
            });
            return { user, ...tokens };
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new common_1.ConflictException('Email address is already registered');
            }
            throw error;
        }
    }
    async verifyTurnstileToken(token, secretKey) {
        try {
            const formData = new URLSearchParams();
            formData.append('secret', secretKey);
            formData.append('response', token);
            const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
                method: 'POST',
                body: formData,
            });
            const outcome = await res.json();
            return outcome.success === true;
        }
        catch (err) {
            this.logger.error('Turnstile verification request failed:', err);
            return true;
        }
    }
    async login(dto) {
        const cacheKey = `auth:user:${dto.email}`;
        let user = null;
        try {
            user = await this.cacheManager.get(cacheKey);
        }
        catch (err) {
            user = null;
        }
        if (!user) {
            user = await this.prisma.user.findUnique({
                where: { email: dto.email },
            });
            if (user) {
                try {
                    const { hashedRefreshToken, ...safeCachePayload } = user;
                    await this.cacheManager.set(cacheKey, safeCachePayload, 900000);
                }
                catch (err) {
                }
            }
        }
        if (!user || !user.hashedPassword) {
            const dbUser = await this.prisma.user.findUnique({
                where: { email: dto.email },
            });
            if (!dbUser) {
                throw new common_1.UnauthorizedException('Invalid credentials');
            }
            user = dbUser;
        }
        if (!dto?.password || !user?.hashedPassword) {
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
        try {
            await this.cacheManager.del(`auth:user:${email}`);
        }
        catch (err) {
        }
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
    async logout(userId, email, accessToken) {
        await Promise.all([
            this.prisma.user.update({
                where: { id: userId },
                data: { hashedRefreshToken: null },
            }),
            this.clearUserAuthCache(email),
        ]);
        if (accessToken) {
            try {
                const cleanToken = accessToken.replace('Bearer ', '').trim();
                if (cleanToken) {
                    await this.cacheManager.set(`auth:blacklist:${cleanToken}`, 'REVOKED', 900000);
                }
            }
            catch (err) {
            }
        }
        this.logger.log(`🔒 SECURITY AUDIT: User [${userId}] (${email}) logged out.`);
        return { message: 'Successfully logged out' };
    }
    async logoutAllDevices(userId, email, accessToken) {
        const revocationTimestamp = Math.floor(Date.now() / 1000);
        await Promise.all([
            this.prisma.user.update({
                where: { id: userId },
                data: { hashedRefreshToken: null },
            }),
            this.cacheManager.set(`auth:logout_all:${userId}`, revocationTimestamp, 900000).catch(() => { }),
            this.clearUserAuthCache(email),
        ]);
        if (accessToken) {
            try {
                const cleanToken = accessToken.replace('Bearer ', '').trim();
                if (cleanToken) {
                    await this.cacheManager.set(`auth:blacklist:${cleanToken}`, 'REVOKED', 900000);
                }
            }
            catch (err) {
            }
        }
        this.logger.log(`🔒 SECURITY AUDIT: User [${userId}] (${email}) logged out from ALL devices.`);
        return { message: 'Successfully logged out from all devices' };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService, Object])
], AuthService);
//# sourceMappingURL=auth.service.js.map