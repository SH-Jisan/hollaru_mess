import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ContextValidatorService } from '../../common/services/context-validator.service';
import { MonthAlreadyActiveException } from '../../common/exceptions/domain.exception';
import { StartMonthDto } from './dto/start-month.dto';

@Injectable()
export class BillingService {
  constructor(
    private prisma: PrismaService,
    private validator: ContextValidatorService,
  ) {}

  // ১. নতুন মাসের সেশন শুরু করা (Only Manager)
  async startNewMonth(dto: StartMonthDto, managerId: string) {
    const { manager, mess } = await this.validator.validateManager(managerId);

    if (mess.isMonthActive) {
      throw new MonthAlreadyActiveException();
    }

    return this.prisma.$transaction(async (tx) => {
      const month = await tx.monthlyData.create({
        data: {
          monthName: dto.monthName,
          messId: manager.messId!,
        },
      });

      await tx.mess.update({
        where: { id: manager.messId! },
        data: {
          isMonthActive: true,
          currentMonthId: month.id,
        },
      });

      return month;
    });
  }

  // ২. রিয়েল-টাইম মিল রেট এবং ফাইনাল সামারি হিসাব করা (High Performance DB Aggregation)
  async getMonthSummary(userId: string) {
    const { user, mess } = await this.validator.validateUserAndMess(userId);
    if (!mess.currentMonthId) throw new NotFoundException('No active or previous month record found');

    const monthId = mess.currentMonthId;

    // ১. ডাটাবেজ লেভেলে মোট বাজার খরচ বের করা
    const bazaarAggregate = await this.prisma.bazaarItem.aggregate({
      where: { monthId, status: 'COMPLETED' },
      _sum: { cost: true },
    });
    const totalBazaarCost = bazaarAggregate._sum.cost || 0;

    // ২. ডাটাবেজ লেভেলে সব মেম্বারদের মোট লাঞ্চ এবং ডিনার মিল সংখ্যা হিসাব করা
    const dailyLogs = await this.prisma.dailyLog.findMany({
      where: { monthId },
      select: { lunchCount: true, dinnerCount: true },
    });

    const totalMeals = dailyLogs.reduce((sum, log) => sum + log.lunchCount + log.dinnerCount, 0);

    // ৩. মিল রেট হিসাব করা (Total Cost / Total Meals)
    const mealRate = totalMeals > 0 ? totalBazaarCost / totalMeals : 0;

    // ৪. মেসের সব মেম্বারদের ডিপোজিট সংগ্রহ করা
    const depositsGrouped = await this.prisma.deposit.groupBy({
      by: ['userId'],
      where: { monthId },
      _sum: { amount: true },
    });

    const depositMap = new Map<string, number>();
    depositsGrouped.forEach((dep) => depositMap.set(dep.userId, dep._sum.amount || 0));

    // ৫. মেম্বারদের নাম ও তাদের ডিপোজিট/ব্যালেন্স তৈরি করা
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

    return {
      monthId,
      totalBazaarCost,
      totalMeals,
      mealRate: Number(mealRate.toFixed(2)),
      members: memberSummaries,
    };
  }

  // ৩. মাসের সেশন বন্ধ/ক্লোজ করা (Only Manager)
  async closeMonthSession(managerId: string) {
    const { mess } = await this.validator.validateManager(managerId);

    if (!mess.isMonthActive || !mess.currentMonthId) {
      throw new BadRequestException('No active month session to close');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.monthlyData.update({
        where: { id: mess.currentMonthId! },
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
  }
}
