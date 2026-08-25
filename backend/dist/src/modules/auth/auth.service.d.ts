import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
export declare class AuthService {
    private prisma;
    private jwtService;
    private configService;
    private cacheManager;
    private readonly logger;
    constructor(prisma: PrismaService, jwtService: JwtService, configService: ConfigService, cacheManager: Cache);
    register(dto: RegisterDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            name: string;
            id: string;
            email: string;
            role: import("@prisma/client").$Enums.Role;
        };
    }>;
    private verifyTurnstileToken;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: any;
    }>;
    clearUserAuthCache(email: string): Promise<void>;
    refresh(dto: RefreshDto): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    generateTokens(userId: string, email: string, role: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    private hashToken;
    updateRefreshToken(userId: string, refreshToken: string): Promise<void>;
    logout(userId: string, email: string, accessToken?: string): Promise<{
        message: string;
    }>;
    logoutAllDevices(userId: string, email: string, accessToken?: string): Promise<{
        message: string;
    }>;
}
