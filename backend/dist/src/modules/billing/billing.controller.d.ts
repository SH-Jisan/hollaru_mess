import { BillingService } from './billing.service';
import { StartMonthDto } from './dto/start-month.dto';
export declare class BillingController {
    private readonly billingService;
    constructor(billingService: BillingService);
    startNewMonth(dto: StartMonthDto, user: {
        id: string;
    }): Promise<{
        id: string;
        monthName: string;
        isClosed: boolean;
        totalBazaarCost: number;
        createdAt: Date;
        messId: string;
    }>;
    getMonthSummary(user: {
        id: string;
    }): Promise<{
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
    closeMonthSession(user: {
        id: string;
    }): Promise<{
        message: string;
    }>;
}
