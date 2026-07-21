import type { Cache } from 'cache-manager';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ContextValidatorService } from '../../common/services/context-validator.service';
import { StartMonthDto } from './dto/start-month.dto';
export declare class BillingService {
    private prisma;
    private validator;
    private cacheManager;
    constructor(prisma: PrismaService, validator: ContextValidatorService, cacheManager: Cache);
    startNewMonth(dto: StartMonthDto, managerId: string): Promise<{
        id: string;
        monthName: string;
        isClosed: boolean;
        totalBazaarCost: number;
        createdAt: Date;
        messId: string;
    }>;
    getMonthSummary(userId: string): Promise<{}>;
    closeMonthSession(managerId: string): Promise<{
        message: string;
    }>;
}
