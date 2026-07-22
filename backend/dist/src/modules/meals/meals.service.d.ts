import type { Cache } from 'cache-manager';
import { Queue } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ContextValidatorService } from '../../common/services/context-validator.service';
import { UpdateMealDto } from './dto/update-meal.dto';
export declare class MealsService {
    private prisma;
    private validator;
    private cacheManager;
    private notificationQueue;
    constructor(prisma: PrismaService, validator: ContextValidatorService, cacheManager: Cache, notificationQueue: Queue);
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
    getDailyLiveCount(userId: string): Promise<{}>;
    private getOrCreateDailyLog;
    private checkDeadline;
}
