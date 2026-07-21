import { CreateMessDto } from './dto/create-mess.dto';
import { JoinMessDto } from './dto/join-mess.dto';
import { MessService } from './mess.service';
export declare class MessController {
    private readonly messService;
    constructor(messService: MessService);
    createMess(createMessDto: CreateMessDto, user: {
        id: string;
    }): Promise<{
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
    }>;
    joinMess(joinMessDto: JoinMessDto, user: {
        id: string;
    }): Promise<{
        message: string;
        messName: string;
    }>;
    getMembers(user: {
        id: string;
    }): Promise<{}>;
}
