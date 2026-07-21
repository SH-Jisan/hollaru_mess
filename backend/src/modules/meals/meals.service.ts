import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { RequestStatus, Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ContextValidatorService } from '../../common/services/context-validator.service';
import { UpdateMealDto } from './dto/update-meal.dto';

@Injectable()
export class MealsService {
  constructor(
    private prisma: PrismaService,
    private validator: ContextValidatorService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // ১. মিল বন্ধ (OFF) বা গেস্ট যোগ করার রিকোয়েস্ট তৈরি করা
  async requestMealUpdate(dto: UpdateMealDto, userId: string) {
    const { mess, activeMonthId } = await this.validator.validateUserMessAndActiveMonth(userId);
    const todayStr = new Date().toISOString().split('T')[0];

    const log = await this.getOrCreateDailyLog(activeMonthId, todayStr, mess.id);
    this.checkDeadline(mess, dto.type);

    return this.prisma.mealRequest.create({
      data: {
        logId: log.id,
        userId,
        type: dto.type,
        category: dto.category,
        count: dto.count,
        status: RequestStatus.PENDING,
      },
    });
  }

  // ২. ম্যানেজার রিকোয়েস্ট অ্যাপ্রুভ করলে ক্যাশ ইনভ্যালিডেট/ডিলিট করা
  async approveRequest(requestId: string, managerId: string) {
    const { manager } = await this.validator.validateManager(managerId);

    const result = await this.prisma.$transaction(async (tx) => {
      const request = await tx.mealRequest.findUniqueOrThrow({
        where: { id: requestId },
        include: { log: true, user: true },
      });

      if (request.status !== RequestStatus.PENDING) {
        throw new BadRequestException('This request has already been processed');
      }

      if (request.user.messId !== manager.messId) {
        throw new BadRequestException('Access denied. Member belongs to another mess.');
      }

      await tx.mealRequest.update({
        where: { id: requestId },
        data: { status: RequestStatus.APPROVED },
      });

      const countField = request.type === 'LUNCH' ? 'lunchCount' : 'dinnerCount';
      const incrementValue = request.category === 'OFF' ? -request.count : request.count;

      await tx.dailyLog.update({
        where: { id: request.logId },
        data: {
          [countField]: {
            increment: incrementValue,
          },
        },
      });

      return { message: 'Request approved successfully' };
    });

    // 🔴 EVENT-DRIVEN INVALIDATION: ম্যানেজার অ্যাপ্রুভ করায় আজকের লাইভ মিলের ক্যাশ মুছে দেওয়া
    const todayStr = new Date().toISOString().split('T')[0];
    const cacheKey = `meals:${manager.messId!}:${todayStr}:live`;
    await this.cacheManager.del(cacheKey);

    return result;
  }

  // ৩. রিয়েল-টাইম মিলের লাইভ কাউন্ট দেখা (Cache-Aside Pattern)
  async getDailyLiveCount(userId: string) {
    const { user } = await this.validator.validateUserAndMess(userId);
    const todayStr = new Date().toISOString().split('T')[0];
    const cacheKey = `meals:${user.messId!}:${todayStr}:live`;

    // ⚡ ১. প্রথমে মেমোরি ক্যাশে চেক করা (Cache Lookup)
    const cachedData = await this.cacheManager.get(cacheKey);
    if (cachedData) {
      return cachedData; // ক্যাশ থেকে সরাসরি রেসপন্স (0ms latency!)
    }

    // 🗄️ ২. ক্যাশে না থাকলে ডাটাবেজ থেকে নিয়ে আসা
    const log = await this.prisma.dailyLog.findFirst({
      where: {
        id: todayStr,
        month: { messId: user.messId! },
      },
      include: {
        requests: {
          include: {
            user: { select: { name: true, role: true } },
          },
        },
      },
    });

    const responseData = log || { message: 'No meal records initialized for today yet.' };

    // 💾 ৩. ডাটাবেজ থেকে আনা ডাটা ১২ ঘন্টার জন্য মেমোরি ক্যাশে সেভ করে রাখা
    await this.cacheManager.set(cacheKey, responseData, 43200000);

    return responseData;
  }

  private async getOrCreateDailyLog(monthId: string, dateStr: string, messId: string) {
    let log = await this.prisma.dailyLog.findUnique({ where: { id: dateStr } });
    
    if (!log) {
      const memberCount = await this.prisma.user.count({ where: { messId } });
      log = await this.prisma.dailyLog.create({
        data: {
          id: dateStr,
          monthId,
          lunchCount: memberCount,
          dinnerCount: memberCount,
        },
      });
    }
    return log;
  }

  private checkDeadline(mess: any, type: string) {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const deadlineString = type === 'LUNCH' ? mess.lunchEndTime : mess.dinnerEndTime;
    const [deadHour, deadMin] = deadlineString.split(':').map(Number);

    if (currentHour > deadHour || (currentHour === deadHour && currentMinute >= deadMin)) {
      throw new BadRequestException(`${type} deadline has passed. Modifications are locked.`);
    }
  }
}
