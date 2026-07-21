import { BazaarService } from './bazaar.service';
import { CompletePurchaseDto } from './dto/complete-purchase.dto';
import { CreateBazaarItemDto } from './dto/create-bazaar-item.dto';
import { CreateDepositDto } from './dto/create-deposit.dto';
export declare class BazaarController {
    private readonly bazaarService;
    constructor(bazaarService: BazaarService);
    createBazaarItem(dto: CreateBazaarItemDto, user: {
        id: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        items: string;
        monthId: string;
        status: string;
        cost: number;
        shopperId: string | null;
        shopperName: string | null;
    }>;
    completePurchase(itemId: string, dto: CompletePurchaseDto, user: {
        id: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        items: string;
        monthId: string;
        status: string;
        cost: number;
        shopperId: string | null;
        shopperName: string | null;
    }>;
    getBazaarList(user: {
        id: string;
    }): Promise<{}>;
    addDeposit(dto: CreateDepositDto, user: {
        id: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        monthId: string;
        userId: string;
        amount: number;
    }>;
}
