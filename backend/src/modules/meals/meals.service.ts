import { BadRequestException, Injectable } from '@nestjs/common';
import { RequestStatus, Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ContextValidatorService } from '../../common/services/context-validator.service';
import { UpdateMealDto } from './dto/update-meal.dto';

@Injectable()
export class MealsService {
  constructor(
    private prisma: PrismaService,
    private validator: ContextValidatorService,
  ) {}

  // ১. মিল বন্ধ (OFF) বা গেস্ট যোগ করার রিকোয়েস্ট তৈরি করা
  async requestMealUpdate(dto: UpdateMealDto, userId: string) {
    // ইউজার, মেস এবং একটিভ মান্থ ভ্যালিডেট করা (১ লাইনে!)
    const { mess, activeMonthId } = await this.validator.validateUserMessAndActiveMonth(userId);

    // বর্তমান তারিখ YYYY-MM-DD ফরম্যাটে তৈরি করা
    const todayStr = new Date().toISOString().split('T')[0];

    // চেক করা আজকের জন্য DailyLog তৈরি করা আছে কিনা, না থাকলে তৈরি করা
    const log = await this.getOrCreateDailyLog(activeMonthId, todayStr, mess.id);

    // ডেডলাইন/টাইমিং উইন্ডো চেক করা
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

  // ২. ম্যানেজার কর্তৃক মেম্বারের রিকোয়েস্ট অ্যাপ্রুভ করা (Transaction-safe)
  async approveRequest(requestId: string, managerId: string) {
    const { manager } = await this.validator.validateManager(managerId);

    return this.prisma.$transaction(async (tx) => {
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
  }

  // ৩. রেন্ডার করার জন্য আজকের মিলের লাইভ কাউন্ট দেখা
  async getDailyLiveCount(userId: string) {
    const { user } = await this.validator.validateUserAndMess(userId);

    const todayStr = new Date().toISOString().split('T')[0];
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

    if (!log) return { message: 'No meal records initialized for today yet.' };
    return log;
  }

  // --- প্রাইভেট হেল্পার মেথডসমূহ ---

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
