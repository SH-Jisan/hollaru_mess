import type { Cache } from 'cache-manager';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ContextValidatorService } from '../../common/services/context-validator.service';
import { CreateMessDto } from './dto/create-mess.dto';
import { JoinMessDto } from './dto/join-mess.dto';
import { AuthService } from '../auth/auth.service';
export declare class MessService {
    private prisma;
    private validator;
    private authService;
    private cacheManager;
    constructor(prisma: PrismaService, validator: ContextValidatorService, authService: AuthService, cacheManager: Cache);
    createMess(dto: CreateMessDto, userId: string): Promise<{
        accessToken: string;
        refreshToken: string;
        mess: {
            id: string;
            name: string;
            code: string;
            managerId: string;
            isMonthActive: boolean;
            currentMonthId: string | null;
            requestStartTime: string;
            lunchEndTime: string;
            dinnerEndTime: string;
            createdAt: Date;
        };
    }>;
    joinMess(dto: JoinMessDto, userId: string): Promise<any>;
    getMembers(userId: string): Promise<{}>;
}
