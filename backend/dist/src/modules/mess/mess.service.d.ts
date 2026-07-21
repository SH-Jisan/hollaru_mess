import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateMessDto } from './dto/create-mess.dto';
import { JoinMessDto } from './dto/join-mess.dto';
export declare class MessService {
    private prisma;
    constructor(prisma: PrismaService);
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
    getMembers(userId: string): Promise<{
        name: string;
        id: string;
        email: string;
        phone: string | null;
        role: import("@prisma/client").$Enums.Role;
        createdAt: Date;
    }[]>;
}
