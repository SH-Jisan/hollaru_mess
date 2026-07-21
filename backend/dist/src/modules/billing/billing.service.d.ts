import { PrismaService } from '../../common/prisma/prisma.service';
import { StartMonthDto } from './dto/start-month.dto';
export declare class BillingService {
    private prisma;
    constructor(prisma: PrismaService);
    startNewMonth(dto: StartMonthDto, managerId: string): Promise<{
        id: string;
        monthName: string;
        isClosed: boolean;
        totalBazaarCost: number;
        createdAt: Date;
        messId: string;
    }>;
    getMonthSummary(userId: string): Promise<{
        monthId: string;
        totalBazaarCost: number;
        totalMeals: number;
        mealRate: number;
        members: {
            memberId: string;
            name: string;
            email: string;
            totalDeposit: number;
        }[];
    }>;
    closeMonthSession(managerId: string): Promise<{
        message: string;
    }>;
}
