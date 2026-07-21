import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ManagerOnlyException,
  NoActiveMonthException,
  UserAlreadyInMessException,
  UserNotInMessException,
} from '../exceptions/domain.exception';

@Injectable()
export class ContextValidatorService {
  constructor(private prisma: PrismaService) {}

  // ১. ইউজার এবং তার মেস আছে কিনা চেক করা
  async validateUserAndMess(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.messId) {
      throw new UserNotInMessException();
    }

    const mess = await this.prisma.mess.findUniqueOrThrow({ where: { id: user.messId } });
    return { user, mess };
  }

  // ২. ইউজার, মেস এবং মেসের একটিভ মান্থ সেশন আছে কিনা চেক করা
  async validateUserMessAndActiveMonth(userId: string) {
    const { user, mess } = await this.validateUserAndMess(userId);
    if (!mess.isMonthActive || !mess.currentMonthId) {
      throw new NoActiveMonthException();
    }
    return { user, mess, activeMonthId: mess.currentMonthId };
  }

  // ৩. ইউজার মেসের ম্যানেজার কিনা ভ্যালিডেট করা
  async validateManager(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.role !== Role.MANAGER || !user.messId) {
      throw new ManagerOnlyException();
    }
    const mess = await this.prisma.mess.findUniqueOrThrow({ where: { id: user.messId } });
    return { manager: user, mess };
  }

  // ৪. ইউজার কোনো মেসে অলরেডি যুক্ত আছে কিনা চেক করা (মেস ক্রিয়েট/জয়েন করার সময়)
  async validateUserHasNoMess(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.messId) {
      throw new UserAlreadyInMessException();
    }
    return user;
  }
}
