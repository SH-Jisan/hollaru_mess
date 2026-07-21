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
        items: string;
        cost: number;
        status: string;
        shopperId: string | null;
        shopperName: string | null;
        createdAt: Date;
        monthId: string;
    }>;
    completePurchase(itemId: string, dto: CompletePurchaseDto, user: {
        id: string;
    }): Promise<{
        id: string;
        items: string;
        cost: number;
        status: string;
        shopperId: string | null;
        shopperName: string | null;
        createdAt: Date;
        monthId: string;
    }>;
    getBazaarList(user: {
        id: string;
    }): Promise<{
        id: string;
        items: string;
        cost: number;
        status: string;
        shopperId: string | null;
        shopperName: string | null;
        createdAt: Date;
        monthId: string;
    }[]>;
    addDeposit(dto: CreateDepositDto, user: {
        id: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        monthId: string;
        amount: number;
        userId: string;
    }>;
}
