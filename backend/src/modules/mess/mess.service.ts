import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { InjectQueue } from '@nestjs/bullmq';
import type { Cache } from 'cache-manager';
import { Queue } from 'bullmq';
import { Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ContextValidatorService } from '../../common/services/context-validator.service';
import { MessCodeNotFoundException } from '../../common/exceptions/domain.exception';
import { CreateMessDto } from './dto/create-mess.dto';
import { JoinMessDto } from './dto/join-mess.dto';
import { TransferManagerDto } from './dto/transfer-manager.dto';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class MessService {
  constructor(
    private prisma: PrismaService,
    private validator: ContextValidatorService,
    private authService: AuthService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectQueue('notification-queue') private notificationQueue: Queue,
  ) { }

  // ১. নতুন মেস তৈরি করা
  async createMess(dto: CreateMessDto, userId: string) {
    await this.validator.validateUserHasNoMess(userId);

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const emailPart = user.email.split('@')[0].substring(0, 2).toUpperCase().padEnd(2, 'X');
    const timePart = Date.now().toString(36).toUpperCase().slice(-4);
    const code = `MESS-${emailPart}${timePart}`;

    const mess = await this.prisma.$transaction(async (tx) => {
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
          joinedAt: new Date(),
        },
      });
      return mess;
    });
    // 🔴 INVALIDATION: ইউজারের পুরনো MEMBER ক্যাশ মুছে দেওয়া যাতে সাথে সাথে MANAGER রোল কার্যকর হয়
    try {
      await this.cacheManager.del(`auth:user:${user.email}`);
    } catch (err) {
      // Catch error cleanly if Redis is down
    }

    const tokens = await this.authService.generateTokens(userId, user.email, Role.MANAGER);
        // ⚡ ৩. ডাটাবেজে নতুন রিফ্রেশ টোকেনটির হ্যাশ সেভ করা (বিশাল গুরুত্বপূর্ণ 🔴)
    await this.authService.updateRefreshToken(userId, tokens.refreshToken);

    return { mess, ...tokens };
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

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        messId: mess.id,
        role: Role.MEMBER,
        joinedAt: new Date(),
      },
    });

    // 🔴 Invalidation: মেম্বার লিস্টের ক্যাশ এবং ইউজারের প্রোফাইল ক্যাশ মুছে দেওয়া
    const memberCacheKey = `mess:${mess.id}:members`;
    const manager = await this.prisma.user.findUnique({where: {id: mess.managerId}});
    try {
      const keysToDel = [
        memberCacheKey,
        `auth:user:${updatedUser.email}`,
      ];
      if(manager) keysToDel.push(`auth:user:${manager.email}`);
      await Promise.all(keysToDel.map(k => this.cacheManager.del(k)));
    } catch (err) {
      // Catch error cleanly if Redis is down
    }

    const tokens = await this.authService.generateTokens(userId, updatedUser.email, Role.MEMBER);
    
    // ⚡ ডাটাবেজে নতুন রিফ্রেশ টোকেনটির হ্যাশ সেভ করা (বিশাল গুরুত্বপূর্ণ 🔴)
    await this.authService.updateRefreshToken(userId, tokens.refreshToken);

    return { message: 'Successfully joined the mess', messName: mess.name, ...tokens };
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
      where: { messId: user.messId!, leftAt: null, },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        joinedAt: true,
      },
      orderBy:{
        joinedAt: 'asc',
      },
    });

    // 💾 ৩. কেও জয়েন/রিমুভ না হওয়ার পর্জন্ত মেম্বার ডাটা সেইভ থাকবে।
    await this.cacheManager.set(cacheKey, members, 0);

    return members;
  }

    // ৪. মেস থেকে লিভ নেওয়া (Leave Mess)
  async leaveMess(userId: string) {
    const { user, mess } = await this.validator.validateUserAndMess(userId);

    // 🛡️ যদি ইউজার ম্যানেজার হয় এবং মেসে অন্য মেম্বার থাকে, তবে লিভ নেওয়া যাবে না
    if (user.role === Role.MANAGER) {
      const otherMemberCount = await this.prisma.user.count({
        where: { messId: mess.id, id: { not: userId } },
      });

      if (otherMemberCount > 0) {
        throw new BadRequestException(
          'Managers cannot leave the mess while other members are still in the mess. Please transfer manager ownership first.',
        );
      }
    }

    // ⚡ ১. ডাটাবেজে ইউজারের messId এবং joinedAt ক্লিয়ার করা
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        messId: null,
        role: Role.MEMBER,
        joinedAt: null,
        leftAt: new Date(),
      },
    });

    // ⚡ ২. মেম্বার লিস্টের ক্যাশ এবং ইউজারের ক্যাশ মুছে দেওয়া
    const memberCacheKey = `mess:${mess.id}:members`;
    const billingCacheKey = mess.currentMonthId ? `billing:${mess.id}:${mess.currentMonthId}:summary` : null;
    try {
      await Promise.all([
        this.cacheManager.del(memberCacheKey),
        this.cacheManager.del(`auth:user:${user.email}`),
        billingCacheKey ? this.cacheManager.del(billingCacheKey) : Promise.resolve(),
      ]);
    } catch (err) {}

    // ⚡ ৩. মেস ছাড়া অবস্থায় নতুন টোকেন ইস্যু করা (messId: null)
    const tokens = await this.authService.generateTokens(userId, user.email, Role.MEMBER);
    await this.authService.updateRefreshToken(userId, tokens.refreshToken);
    

    return { message: 'Successfully left the mess', ...tokens };
  }

  // ৫. মেস ম্যানেজার পরিবর্তন ও প্রমোট করা (Transfer Manager Ownership)
  async transferManager(dto: TransferManagerDto, currentManagerId: string) {
    const { manager, mess } = await this.validator.validateManager(currentManagerId);
    if (dto.newManagerId === currentManagerId) {
      throw new BadRequestException('You are already the manager of this mess.');
    }
    const newManager = await this.prisma.user.findUnique({
      where: { id: dto.newManagerId },
    });
    if (!newManager || newManager.messId !== mess.id) {
      throw new BadRequestException('The selected member does not belong to this mess.');
    }
    // ⚛️ ট্রানজেকশনে ম্যানেজার রোল সোয়াইপ করা
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: currentManagerId },
        data: { role: Role.MEMBER },
      });
      await tx.user.update({
        where: { id: dto.newManagerId },
        data: { role: Role.MANAGER },
      });
      await tx.mess.update({
        where: { id: mess.id },
        data: { managerId: dto.newManagerId },
      });
    });
    // ⚡ ক্যাশ মুছে দেওয়া
    const memberCacheKey = `mess:${mess.id}:members`;
    try {
      await Promise.all([
        this.cacheManager.del(memberCacheKey),
        this.cacheManager.del(`auth:user:${manager.email}`),
        this.cacheManager.del(`auth:user:${newManager.email}`),
      ]);
    } catch (err) {}
    // 🔔 ব্যাকগ্রাউন্ড কিউতে মেসের সব মেম্বারদের ফোনে পুশ নোটিফিকেশন পাঠানো
    const messMembers = await this.prisma.user.findMany({
      where: { messId: mess.id },
      select: { id: true },
    });
    for (const member of messMembers) {
      await this.notificationQueue.add('send-user-notification', {
        userId: member.id,
        title: '👑 Manager Updated!',
        body: `${newManager.name} is now the manager of ${mess.name}.`,
      });
    }
    return { message: `Manager ownership successfully transferred to ${newManager.name}` };
  }
  
}
