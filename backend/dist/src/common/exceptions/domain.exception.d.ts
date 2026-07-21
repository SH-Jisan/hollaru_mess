import { BadRequestException, NotFoundException } from '@nestjs/common';
export declare class UserNotInMessException extends BadRequestException {
    constructor();
}
export declare class UserAlreadyInMessException extends BadRequestException {
    constructor();
}
export declare class NoActiveMonthException extends BadRequestException {
    constructor();
}
export declare class MonthAlreadyActiveException extends BadRequestException {
    constructor();
}
export declare class ManagerOnlyException extends BadRequestException {
    constructor();
}
export declare class MessCodeNotFoundException extends NotFoundException {
    constructor();
}
