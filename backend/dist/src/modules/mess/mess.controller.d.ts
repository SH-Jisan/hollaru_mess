import { CreateMessDto } from './dto/create-mess.dto';
import { JoinMessDto } from './dto/join-mess.dto';
import { MessService } from './mess.service';
export declare class MessController {
    private readonly messService;
    constructor(messService: MessService);
    createMess(createMessDto: CreateMessDto, user: {
        id: string;
    }): Promise<{
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
