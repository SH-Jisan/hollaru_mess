import { BillingService } from './billing.service';
import { StartMonthDto } from './dto/start-month.dto';
export declare class BillingController {
    private readonly billingService;
    constructor(billingService: BillingService);
    startNewMonth(dto: StartMonthDto, user: {
        id: string;
    }): Promise<{
        id: string;
        messId: string;
        createdAt: Date;
        monthName: string;
        isClosed: boolean;
        totalBazaarCost: number;
    }>;
    getMonthSummary(user: {
        id: string;
    }): Promise<any>;
    closeMonthSession(user: {
        id: string;
    }): Promise<{
        message: string;
    }>;
}
