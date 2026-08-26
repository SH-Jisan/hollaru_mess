import type { Cache } from 'cache-manager';
import { Queue } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ContextValidatorService } from '../../common/services/context-validator.service';
import { CreateMessDto } from './dto/create-mess.dto';
import { JoinMessDto } from './dto/join-mess.dto';
import { TransferManagerDto } from './dto/transfer-manager.dto';
import { AuthService } from '../auth/auth.service';
export declare class MessService {
    private prisma;
    private validator;
    private authService;
    private cacheManager;
    private notificationQueue;
    constructor(prisma: PrismaService, validator: ContextValidatorService, authService: AuthService, cacheManager: Cache, notificationQueue: Queue);
    createMess(dto: CreateMessDto, userId: string): Promise<{
        accessToken: string;
        refreshToken: string;
        mess: {
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
        };
    }>;
    joinMess(dto: JoinMessDto, userId: string): Promise<{
        accessToken: string;
        refreshToken: string;
        message: string;
        messName: string;
    }>;
    getMembers(userId: string): Promise<{}>;
    leaveMess(userId: string): Promise<{
        accessToken: string;
        refreshToken: string;
        message: string;
    }>;
    transferManager(dto: TransferManagerDto, currentManagerId: string): Promise<{
        message: string;
    }>;
}
