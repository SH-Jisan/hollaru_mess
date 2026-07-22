import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { InjectQueue } from '@nestjs/bullmq';
import type { Cache } from 'cache-manager';
import { Queue } from 'bullmq';
import { RequestStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ContextValidatorService } from '../../common/services/context-validator.service';
import { UpdateMealDto } from './dto/update-meal.dto';

@Injectable()
export class MealsService {
  constructor(
    private prisma: PrismaService,
    private validator: ContextValidatorService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectQueue('notification-queue') private notificationQueue: Queue, // 👈 BullMQ Queue ইনজেক্ট করা
  ) {}

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

  async approveRequest(requestId: string, managerId: string) {
    const { manager } = await this.validator.validateManager(managerId);

    const { result, targetUserId, mealType, mealCategory } = await this.prisma.$transaction(async (tx) => {
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

      return {
        result: { message: 'Request approved successfully' },
        targetUserId: request.userId,
        mealType: request.type,
        mealCategory: request.category,
      };
    });

    // 🔴 Invalidation: আজকের লাইভ মিলের ক্যাশ মুছে দেওয়া
    const todayStr = new Date().toISOString().split('T')[0];
    const cacheKey = `meals:${manager.messId!}:${todayStr}:live`;
    await this.cacheManager.del(cacheKey);

    // ⚡ BACKGROUND QUEUE: মেম্বারের ফোনে ব্যাকগ্রাউন্ড পুশ নোটিফিকেশন জব পুশ করা
    await this.notificationQueue.add('send-user-notification', {
      userId: targetUserId,
      title: '🍲 Meal Request Approved!',
      body: `Manager approved your ${mealCategory} request for ${mealType}.`,
    });

    return result;
  }

  async getDailyLiveCount(userId: string) {
    const { user } = await this.validator.validateUserAndMess(userId);
    const todayStr = new Date().toISOString().split('T')[0];
    const cacheKey = `meals:${user.messId!}:${todayStr}:live`;

    const cachedData = await this.cacheManager.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

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
