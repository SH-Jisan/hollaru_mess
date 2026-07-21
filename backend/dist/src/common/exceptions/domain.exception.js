"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessCodeNotFoundException = exports.ManagerOnlyException = exports.MonthAlreadyActiveException = exports.NoActiveMonthException = exports.UserAlreadyInMessException = exports.UserNotInMessException = void 0;
const common_1 = require("@nestjs/common");
class UserNotInMessException extends common_1.BadRequestException {
    constructor() {
        super('You do not belong to any mess');
    }
}
exports.UserNotInMessException = UserNotInMessException;
class UserAlreadyInMessException extends common_1.BadRequestException {
    constructor() {
        super('You are already a member of a mess');
    }
}
exports.UserAlreadyInMessException = UserAlreadyInMessException;
class NoActiveMonthException extends common_1.BadRequestException {
    constructor() {
        super('Active month summary session is not started by manager');
    }
}
exports.NoActiveMonthException = NoActiveMonthException;
class MonthAlreadyActiveException extends common_1.BadRequestException {
    constructor() {
        super('A month session is already active. Close it first.');
    }
}
exports.MonthAlreadyActiveException = MonthAlreadyActiveException;
class ManagerOnlyException extends common_1.BadRequestException {
    constructor() {
        super('Only mess managers can perform this operation');
    }
}
exports.ManagerOnlyException = ManagerOnlyException;
class MessCodeNotFoundException extends common_1.NotFoundException {
    constructor() {
        super('Mess code not found');
    }
}
exports.MessCodeNotFoundException = MessCodeNotFoundException;
//# sourceMappingURL=domain.exception.js.map