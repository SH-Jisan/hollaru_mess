import { UpdateMealDto } from './dto/update-meal.dto';
import { MealsService } from './meals.service';
export declare class MealsController {
    private readonly mealsService;
    constructor(mealsService: MealsService);
    requestMealUpdate(dto: UpdateMealDto, user: {
        id: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        type: string;
        category: string;
        count: number;
        status: import("@prisma/client").$Enums.RequestStatus;
        logId: string;
        userId: string;
    }>;
    approveRequest(requestId: string, user: {
        id: string;
    }): Promise<{
        message: string;
    }>;
    getDailyLiveCount(user: {
        id: string;
    }): Promise<({
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
}
