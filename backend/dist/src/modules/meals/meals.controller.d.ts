import { UpdateMealDto } from './dto/update-meal.dto';
import { MealsService } from './meals.service';
export declare class MealsController {
    private readonly mealsService;
    constructor(mealsService: MealsService);
    requestMealUpdate(dto: UpdateMealDto, user: {
        id: string;
    }): Promise<{
        id: string;
        type: string;
        category: string;
        count: number;
        status: import("@prisma/client").$Enums.RequestStatus;
        createdAt: Date;
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
    }): Promise<{}>;
}
