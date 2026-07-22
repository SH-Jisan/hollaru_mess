import { User } from '@prisma/client';
import { AppService } from './app.service';
export declare class AppController {
    private readonly appService;
    constructor(appService: AppService);
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
        fcmToken: string | null;
    }, "hashedPassword" | "hashedRefreshToken">;
    getManagerData(): {
        message: string;
    };
}
