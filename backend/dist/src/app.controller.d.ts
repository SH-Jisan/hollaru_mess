import { User } from '@prisma/client';
import { AppService } from './app.service';
import { PrismaService } from './common/prisma/prisma.service';
export declare class AppController {
    private readonly appService;
    private readonly prisma;
    constructor(appService: AppService, prisma: PrismaService);
    getHello(): string;
    getHealth(): {
        status: string;
        timestamp: string;
        uptime: string;
        service: string;
    };
    getProfile(user: Omit<User, 'hashedPassword' | 'hashedRefreshToken'>): Omit<{
        name: string;
        id: string;
        email: string;
        phone: string | null;
        role: import("@prisma/client").$Enums.Role;
        hashedPassword: string;
        hashedRefreshToken: string | null;
        messId: string | null;
        createdAt: Date;
        joinedAt: Date | null;
        fcmToken: string | null;
    }, "hashedPassword" | "hashedRefreshToken">;
    getManagerData(user: {
        messId: string;
    }): Promise<{
        message: string;
        messCode: string | null;
    }>;
}
