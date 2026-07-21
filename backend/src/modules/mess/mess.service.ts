import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
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
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // ১. নতুন মেস তৈরি করা
  async createMess(dto: CreateMessDto, userId: string) {
    await this.validator.validateUserHasNoMess(userId);

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const emailPart = user.email.split('@')[0].substring(0, 2).toUpperCase().padEnd(2, 'X');
    const timePart = Date.now().toString(36).toUpperCase().slice(-4);
    const code = `MESS-${emailPart}${timePart}`;

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

    // 🔴 Invalidation: নতুন সদস্য জয়েন করায় মেসের মেম্বার লিস্টের ক্যাশ মুছে দেওয়া
    const cacheKey = `mess:${mess.id}:members`;
    await this.cacheManager.del(cacheKey);

    return { message: 'Successfully joined the mess', messName: mess.name };
  }

  // ৩. মেসের সব মেম্বারদের তালিকা দেখা (Cache-Aside Pattern)
  async getMembers(userId: string) {
    const { user } = await this.validator.validateUserAndMess(userId);
    const cacheKey = `mess:${user.messId!}:members`;

    // ⚡ ১. ক্যাশে চেক করা
    const cachedMembers = await this.cacheManager.get(cacheKey);
    if (cachedMembers) {
      return cachedMembers; // 0ms রেসপন্স!
    }

    // 🗄️ ২. ক্যাশে না থাকলে ডাটাবেজ থেকে রিড করা
    const members = await this.prisma.user.findMany({
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

    // 💾 ৩. কেও জয়েন/রিমুভ না হওয়ার পর্জন্ত মেম্বার ডাটা সেইভ থাকবে।
    await this.cacheManager.set(cacheKey, members, 0);

    return members;
  }
}
