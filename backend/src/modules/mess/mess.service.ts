import { ConflictException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ContextValidatorService } from '../../common/services/context-validator.service';
import { MessCodeNotFoundException } from '../../common/exceptions/domain.exception';
import { CreateMessDto } from './dto/create-mess.dto';
import { JoinMessDto } from './dto/join-mess.dto';

@Injectable()
export class MessService {
  constructor(
    private prisma: PrismaService,
    private validator: ContextValidatorService,
  ) {}

  // ১. নতুন মেস তৈরি করা
  async createMess(dto: CreateMessDto, userId: string) {
    // সেন্ট্রাল ভ্যালিডেটর দিয়ে চেক করা ইউজার অলরেডি কোনো মেসে যুক্ত আছে কিনা
    await this.validator.validateUserHasNoMess(userId);

    // ইমেইলের প্রথম ২ অক্ষর এবং বর্তমান টাইমের বেস-৩৬ কাস্টম কম্প্রেশন দিয়ে ৬ ডিজিটের ইউনিক কোড তৈরি করা
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const emailPart = user.email.split('@')[0].substring(0, 2).toUpperCase().padEnd(2, 'X');
    const timePart = Date.now().toString(36).toUpperCase().slice(-4);
    const code = `MESS-${emailPart}${timePart}`;

    // প্রিজমা ট্রানজেকশন ব্যবহার করে মেস তৈরি এবং মেম্বারের রোল ও মেস আইডি আপডেট করা
    return this.prisma.$transaction(async (tx) => {
      const mess = await tx.mess.create({
        data: {
          name: dto.name,
          code,
          managerId: userId,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          messId: mess.id,
          role: Role.MANAGER,
        },
      });

      return mess;
    });
  }

  // ২. ইনভাইট কোড দিয়ে মেসে জয়েন করা
  async joinMess(dto: JoinMessDto, userId: string) {
    await this.validator.validateUserHasNoMess(userId);

    const mess = await this.prisma.mess.findUnique({
      where: { code: dto.code.toUpperCase() },
    });

    if (!mess) {
      throw new MessCodeNotFoundException();
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        messId: mess.id,
        role: Role.MEMBER,
      },
    });

    return { message: 'Successfully joined the mess', messName: mess.name };
  }

  // ৩. মেসের সব মেম্বারদের তালিকা দেখা
  async getMembers(userId: string) {
    const { user } = await this.validator.validateUserAndMess(userId);

    return this.prisma.user.findMany({
      where: { messId: user.messId! },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });
  }
}
