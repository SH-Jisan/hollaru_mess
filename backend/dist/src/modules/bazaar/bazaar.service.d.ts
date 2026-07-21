import type { Cache } from 'cache-manager';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ContextValidatorService } from '../../common/services/context-validator.service';
import { CompletePurchaseDto } from './dto/complete-purchase.dto';
import { CreateBazaarItemDto } from './dto/create-bazaar-item.dto';
import { CreateDepositDto } from './dto/create-deposit.dto';
export declare class BazaarService {
    private prisma;
    private validator;
    private cacheManager;
    constructor(prisma: PrismaService, validator: ContextValidatorService, cacheManager: Cache);
    createBazaarItem(dto: CreateBazaarItemDto, userId: string): Promise<{
        id: string;
        items: string;
        cost: number;
        status: string;
        shopperId: string | null;
        shopperName: string | null;
        createdAt: Date;
        monthId: string;
    }>;
    completePurchase(itemId: string, dto: CompletePurchaseDto, userId: string): Promise<{
        id: string;
        items: string;
        cost: number;
        status: string;
        shopperId: string | null;
        shopperName: string | null;
        createdAt: Date;
        monthId: string;
    }>;
    getBazaarList(userId: string): Promise<{}>;
    addDeposit(dto: CreateDepositDto, managerId: string): Promise<{
        id: string;
        createdAt: Date;
        monthId: string;
        amount: number;
        userId: string;
    }>;
}
