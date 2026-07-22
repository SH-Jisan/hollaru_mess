import type { Cache } from 'cache-manager';
import { Queue } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ContextValidatorService } from '../../common/services/context-validator.service';
import { CompletePurchaseDto } from './dto/complete-purchase.dto';
import { CreateBazaarItemDto } from './dto/create-bazaar-item.dto';
import { CreateDepositDto } from './dto/create-deposit.dto';
export declare class BazaarService {
    private prisma;
    private validator;
    private cacheManager;
    private notificationQueue;
    constructor(prisma: PrismaService, validator: ContextValidatorService, cacheManager: Cache, notificationQueue: Queue);
    createBazaarItem(dto: CreateBazaarItemDto, userId: string): Promise<{
        id: string;
        createdAt: Date;
        items: string;
        monthId: string;
        status: string;
        cost: number;
        shopperId: string | null;
        shopperName: string | null;
    }>;
    completePurchase(itemId: string, dto: CompletePurchaseDto, userId: string): Promise<{
        id: string;
        createdAt: Date;
        items: string;
        monthId: string;
        status: string;
        cost: number;
        shopperId: string | null;
        shopperName: string | null;
    }>;
    getBazaarList(userId: string): Promise<{}>;
    addDeposit(dto: CreateDepositDto, managerId: string): Promise<{
        id: string;
        createdAt: Date;
        monthId: string;
        userId: string;
        amount: number;
    }>;
}
