import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateMealDto } from './dto/update-meal.dto';
export declare class MealsService {
    private prisma;
    constructor(prisma: PrismaService);
    requestMealUpdate(dto: UpdateMealDto, userId: string): Promise<{
        id: string;
        createdAt: Date;
        type: string;
        category: string;
        count: number;
        status: import("@prisma/client").$Enums.RequestStatus;
        logId: string;
        userId: string;
    }>;
    approveRequest(requestId: string, managerId: string): Promise<{
        message: string;
    }>;
    getDailyLiveCount(userId: string): Promise<({
        requests: ({
            user: {
                name: string;
                role: import("@prisma/client").$Enums.Role;
            };
        } & {
            id: string;
            createdAt: Date;
            type: string;
            category: string;
            count: number;
            status: import("@prisma/client").$Enums.RequestStatus;
            logId: string;
            userId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        monthId: string;
        lunchCount: number;
        lunchStatus: import("@prisma/client").$Enums.MealStatus;
        lunchCancelledBy: string | null;
        dinnerCount: number;
        dinnerStatus: import("@prisma/client").$Enums.MealStatus;
        dinnerCancelledBy: string | null;
    }) | {
        message: string;
    }>;
    private getOrCreateDailyLog;
    private checkDeadline;
}
