import { User } from '@prisma/client';
import { AppService } from './app.service';
export declare class AppController {
    private readonly appService;
    constructor(appService: AppService);
    getHello(): string;
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
    }, "hashedPassword" | "hashedRefreshToken">;
    getManagerData(): {
        message: string;
    };
}
