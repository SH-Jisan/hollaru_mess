import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { InjectQueue } from '@nestjs/bullmq';
import type { Cache } from 'cache-manager';
import { Queue } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ContextValidatorService } from '../../common/services/context-validator.service';
import { CompletePurchaseDto } from './dto/complete-purchase.dto';
import { CreateBazaarItemDto } from './dto/create-bazaar-item.dto';
import { CreateDepositDto } from './dto/create-deposit.dto';

@Injectable()
export class BazaarService {
  constructor(
    private prisma: PrismaService,
    private validator: ContextValidatorService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectQueue('notification-queue') private notificationQueue: Queue, // 👈 BullMQ Queue ইনজেক্ট করা
  ) {}

  async createBazaarItem(dto: CreateBazaarItemDto, userId: string) {
    const { user, mess, activeMonthId } = await this.validator.validateUserMessAndActiveMonth(userId);

    const item = await this.prisma.bazaarItem.create({
      data: {
        monthId: activeMonthId,
        items: dto.items,
        status: 'PENDING',
      },
    });

    // 🔴 Invalidation: বাজার ক্যাশ ক্লিয়ার করা
    const cacheKey = `bazaar:${mess.id}:${activeMonthId}:list`;
    await this.cacheManager.del(cacheKey);

    // ⚡ BACKGROUND QUEUE: মেসের সব মেম্বারদের ফোনে ব্যাকগ্রাউন্ড পুশ নোটিফিকেশন জব পুশ করা
    await this.notificationQueue.add('send-mess-notification', {
      messId: mess.id,
      title: '🛒 New Bazaar Item Added!',
      body: `${user.name} added new items: "${dto.items}"`,
    });

    return item;
  }

  async completePurchase(itemId: string, dto: CompletePurchaseDto, userId: string) {
    const { user, mess } = await this.validator.validateUserAndMess(userId);
    const item = await this.prisma.bazaarItem.findUnique({ where: { id: itemId } });

    if (!item) throw new NotFoundException('Bazaar item not found');
    if (item.status === 'COMPLETED') throw new BadRequestException('Purchase already completed');

    const updatedItem = await this.prisma.bazaarItem.update({
      where: { id: itemId },
      data: {
        cost: dto.cost,
        status: 'COMPLETED',
        shopperId: userId,
        shopperName: user.name,
      },
    });

    if (mess.currentMonthId) {
      const cacheKey = `bazaar:${mess.id}:${mess.currentMonthId}:list`;
      await this.cacheManager.del(cacheKey);

      const billingCacheKey = `billing:${mess.id}:${mess.currentMonthId}:summary`;
      await this.cacheManager.del(billingCacheKey);
    }

    return updatedItem;
  }

  async getBazaarList(userId: string) {
    const { mess } = await this.validator.validateUserAndMess(userId);
    if (!mess.currentMonthId) return [];

    const cacheKey = `bazaar:${mess.id}:${mess.currentMonthId}:list`;

    const cachedList = await this.cacheManager.get(cacheKey);
    if (cachedList) {
      return cachedList;
    }

    const bazaarList = await this.prisma.bazaarItem.findMany({
      where: { monthId: mess.currentMonthId },
      orderBy: { createdAt: 'desc' },
    });

    await this.cacheManager.set(cacheKey, bazaarList, 0);
    return bazaarList;
  }

  async addDeposit(dto: CreateDepositDto, managerId: string) {
    const { manager, mess } = await this.validator.validateManager(managerId);

    if (!mess.isMonthActive || !mess.currentMonthId) {
      throw new BadRequestException('Active month summary session is not started');
    }

    const targetUser = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!targetUser || targetUser.messId !== manager.messId) {
      throw new BadRequestException('User not found in your mess');
    }

    const deposit = await this.prisma.deposit.create({
      data: {
        monthId: mess.currentMonthId,
        userId: dto.userId,
        amount: dto.amount,
      },
    });

    const billingCacheKey = `billing:${mess.id}:${mess.currentMonthId}:summary`;
    await this.cacheManager.del(billingCacheKey);

    // ⚡ BACKGROUND QUEUE: যে মেম্বারের ডিপোজিট জমা হলো তার ফোনে নোটিফিকেশন জব পুশ করা
    await this.notificationQueue.add('send-user-notification', {
      userId: dto.userId,
      title: '💰 Deposit Logged!',
      body: `Manager logged a deposit of BDT ${dto.amount} for you.`,
    });

    return deposit;
  }
}
