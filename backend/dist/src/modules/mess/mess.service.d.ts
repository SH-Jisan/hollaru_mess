import type { Cache } from 'cache-manager';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ContextValidatorService } from '../../common/services/context-validator.service';
import { CreateMessDto } from './dto/create-mess.dto';
import { JoinMessDto } from './dto/join-mess.dto';
export declare class MessService {
    private prisma;
    private validator;
    private cacheManager;
    constructor(prisma: PrismaService, validator: ContextValidatorService, cacheManager: Cache);
    createMess(dto: CreateMessDto, userId: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        code: string;
        managerId: string;
        isMonthActive: boolean;
        currentMonthId: string | null;
        requestStartTime: string;
        lunchEndTime: string;
        dinnerEndTime: string;
    }>;
    joinMess(dto: JoinMessDto, userId: string): Promise<{
        message: string;
        messName: string;
    }>;
    getMembers(userId: string): Promise<{}>;
}
