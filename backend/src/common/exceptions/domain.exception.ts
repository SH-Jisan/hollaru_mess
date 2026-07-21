import { BadRequestException, NotFoundException } from '@nestjs/common';

// ইউজার কোনো মেসে যুক্ত না থাকলে
export class UserNotInMessException extends BadRequestException {
  constructor() {
    super('You do not belong to any mess');
  }
}

// ইউজার অলরেডি কোনো মেসে যুক্ত থাকলে
export class UserAlreadyInMessException extends BadRequestException {
  constructor() {
    super('You are already a member of a mess');
  }
}

// মেসের কোনো একটিভ মান্থ সেশন চালু না থাকলে
export class NoActiveMonthException extends BadRequestException {
  constructor() {
    super('Active month summary session is not started by manager');
  }
}

// মেসের একটিভ মান্থ সেশন অলরেডি চালু থাকলে
export class MonthAlreadyActiveException extends BadRequestException {
  constructor() {
    super('A month session is already active. Close it first.');
  }
}

// শুধুমাত্র ম্যানেজার এক্সেস পাওয়ার জন্য
export class ManagerOnlyException extends BadRequestException {
  constructor() {
    super('Only mess managers can perform this operation');
  }
}

// মেসের ইনভাইট কোড না পাওয়া গেলে
export class MessCodeNotFoundException extends NotFoundException {
  constructor() {
    super('Mess code not found');
  }
}
