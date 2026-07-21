import { PrismaService } from '../prisma/prisma.service';
export declare class ContextValidatorService {
    private prisma;
    constructor(prisma: PrismaService);
    validateUserAndMess(userId: string): Promise<{
        user: {
            name: string;
            id: string;
            email: string;
            phone: string | null;
            role: import("@prisma/client").$Enums.Role;
            hashedPassword: string;
            hashedRefreshToken: string | null;
            messId: string | null;
            createdAt: Date;
        };
        mess: {
            name: string;
            id: string;
            createdAt: Date;
            code: string;
            managerId: string;
            isMonthActive: boolean;
            currentMonthId: string | null;
            requestStartTime: string;
            lunchEndTime: string;
            dinnerEndTime: string;
        };
    }>;
    validateUserMessAndActiveMonth(userId: string): Promise<{
        user: {
            name: string;
            id: string;
            email: string;
            phone: string | null;
            role: import("@prisma/client").$Enums.Role;
            hashedPassword: string;
            hashedRefreshToken: string | null;
            messId: string | null;
            createdAt: Date;
        };
        mess: {
            name: string;
            id: string;
            createdAt: Date;
            code: string;
            managerId: string;
            isMonthActive: boolean;
            currentMonthId: string | null;
            requestStartTime: string;
            lunchEndTime: string;
            dinnerEndTime: string;
        };
        activeMonthId: string;
    }>;
    validateManager(userId: string): Promise<{
        manager: {
            name: string;
            id: string;
            email: string;
            phone: string | null;
            role: import("@prisma/client").$Enums.Role;
            hashedPassword: string;
            hashedRefreshToken: string | null;
            messId: string | null;
            createdAt: Date;
        };
        mess: {
            name: string;
            id: string;
            createdAt: Date;
            code: string;
            managerId: string;
            isMonthActive: boolean;
            currentMonthId: string | null;
            requestStartTime: string;
            lunchEndTime: string;
            dinnerEndTime: string;
        };
    }>;
    validateUserHasNoMess(userId: string): Promise<{
        name: string;
        id: string;
        email: string;
        phone: string | null;
        role: import("@prisma/client").$Enums.Role;
        hashedPassword: string;
        hashedRefreshToken: string | null;
        messId: string | null;
        createdAt: Date;
    }>;
}
