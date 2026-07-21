import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ContextValidatorService } from '../../common/services/context-validator.service';
import { MonthAlreadyActiveException } from '../../common/exceptions/domain.exception';
import { StartMonthDto } from './dto/start-month.dto';

@Injectable()
export class BillingService {
  constructor(
    private prisma: PrismaService,
    private validator: ContextValidatorService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // ১. নতুন মাসের সেশন শুরু করা (Only Manager)
  async startNewMonth(dto: StartMonthDto, managerId: string) {
    const { manager, mess } = await this.validator.validateManager(managerId);

    if (mess.isMonthActive) {
      throw new MonthAlreadyActiveException();
    }

    const month = await this.prisma.$transaction(async (tx) => {
      const createdMonth = await tx.monthlyData.create({
        data: {
          monthName: dto.monthName,
          messId: manager.messId!,
        },
      });

      await tx.mess.update({
        where: { id: manager.messId! },
        data: {
          isMonthActive: true,
          currentMonthId: createdMonth.id,
        },
      });

      return createdMonth;
    });

    // 🔴 Invalidation: নতুন মাস শুরু হওয়ায় সামারির ক্যাশ ক্লিয়ার করা
    const cacheKey = `billing:${mess.id}:${month.id}:summary`;
    await this.cacheManager.del(cacheKey);

    return month;
  }

  // ২. রিয়েল-টাইম মিল রেট এবং ফাইনাল সামারি হিসাব করা (Cache-Aside Pattern)
  async getMonthSummary(userId: string) {
    const { user, mess } = await this.validator.validateUserAndMess(userId);
    if (!mess.currentMonthId) throw new NotFoundException('No active or previous month record found');

    const monthId = mess.currentMonthId;
    const cacheKey = `billing:${mess.id}:${monthId}:summary`;

    // ⚡ ১. ক্যাশে চেক করা
    const cachedSummary = await this.cacheManager.get(cacheKey);
    if (cachedSummary) {
      return cachedSummary; // 0ms রেসপন্স!
    }

    // 🗄️ ২. ক্যাশে না থাকলে ডাটাবেজে ভারী Aggregation কুয়েরি চালানো
    const bazaarAggregate = await this.prisma.bazaarItem.aggregate({
      where: { monthId, status: 'COMPLETED' },
      _sum: { cost: true },
    });
    const totalBazaarCost = bazaarAggregate._sum.cost || 0;

    const dailyLogs = await this.prisma.dailyLog.findMany({
      where: { monthId },
      select: { lunchCount: true, dinnerCount: true },
    });

    const totalMeals = dailyLogs.reduce((sum, log) => sum + log.lunchCount + log.dinnerCount, 0);
    const mealRate = totalMeals > 0 ? totalBazaarCost / totalMeals : 0;

    const depositsGrouped = await this.prisma.deposit.groupBy({
      by: ['userId'],
      where: { monthId },
      _sum: { amount: true },
    });

    const depositMap = new Map<string, number>();
    depositsGrouped.forEach((dep) => depositMap.set(dep.userId, dep._sum.amount || 0));

    const members = await this.prisma.user.findMany({
      where: { messId: user.messId! },
      select: { id: true, name: true, email: true },
    });

    const memberSummaries = members.map((member) => {
      const totalDeposit = depositMap.get(member.id) || 0;
      return {
        memberId: member.id,
        name: member.name,
        email: member.email,
        totalDeposit,
      };
    });

    const summaryResult = {
      monthId,
      totalBazaarCost,
      totalMeals,
      mealRate: Number(mealRate.toFixed(2)),
      members: memberSummaries,
    };

    // 💾 ৩. ডাটাবেজ থেকে বের করা সামারি ডাটা পরবর্তী আপডেট না হওয়া পর্যন্ত (TTL = 0) ক্যাশে সেভ করে রাখা
    await this.cacheManager.set(cacheKey, summaryResult, 0);

    return summaryResult;
  }

  // ৩. মাসের সেশন বন্ধ/ক্লোজ করা (Only Manager)
  async closeMonthSession(managerId: string) {
    const { mess } = await this.validator.validateManager(managerId);

    if (!mess.isMonthActive || !mess.currentMonthId) {
      throw new BadRequestException('No active month session to close');
    }

    const monthId = mess.currentMonthId;

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.monthlyData.update({
        where: { id: monthId },
        data: { isClosed: true },
      });

      await tx.mess.update({
        where: { id: mess.id },
        data: {
          isMonthActive: false,
          currentMonthId: null,
        },
      });

      return { message: 'Month session closed and archived successfully' };
    });

    // 🔴 Invalidation: মাস বন্ধ হয়ে যাওয়ায় সামারির ক্যাশ ক্লিয়ার করা
    const cacheKey = `billing:${mess.id}:${monthId}:summary`;
    await this.cacheManager.del(cacheKey);

    return result;
  }
}
