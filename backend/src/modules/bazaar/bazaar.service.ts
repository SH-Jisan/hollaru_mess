import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ContextValidatorService } from '../../common/services/context-validator.service';
import { CompletePurchaseDto } from './dto/complete-purchase.dto';
import { CreateBazaarItemDto } from './dto/create-bazaar-item.dto';
import { CreateDepositDto } from './dto/create-deposit.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppCacheService } from '../../common/cache/app-cache.service';
import { CacheKeys } from '../../common/cache/cache-keys';
import { CacheEvents } from '../../common/cache/cache-events.enum';

@Injectable()
export class BazaarService {
  constructor(
    private prisma: PrismaService,
    private validator: ContextValidatorService,
    private appCache: AppCacheService,
    private eventEmitter: EventEmitter2,
    @InjectQueue('notification-queue') private notificationQueue: Queue,
  ) {}

  async createBazaarItem(dto: CreateBazaarItemDto, userId: string) {
    const { user, mess, activeMonthId } =
      await this.validator.validateUserMessAndActiveMonth(userId);

    const item = await this.prisma.bazaarItem.create({
      data: {
        monthId: activeMonthId,
        items: dto.items,
        status: 'PENDING',
      },
    });

    // 📡 Event-Driven Cache Invalidation (Bazaar & Billing Summary)
    this.eventEmitter.emit(CacheEvents.BAZAAR_UPDATED, {
      messId: mess.id,
      monthId: activeMonthId,
    });

    // ⚡ BACKGROUND QUEUE: মেসের সব মেম্বারদের ফোনে ব্যাকগ্রাউন্ড পুশ নোটিফিকেশন জব পুশ করা
    await this.notificationQueue.add('send-mess-notification', {
      messId: mess.id,
      title: '🛒 New Bazaar Item Added!',
      body: `${user.name} added new items: "${dto.items}"`,
    });

    return item;
  }

  async completePurchase(
    itemId: string,
    dto: CompletePurchaseDto,
    userId: string,
  ) {
    const { user, mess } = await this.validator.validateUserAndMess(userId);
    const item = await this.prisma.bazaarItem.findUnique({
      where: { id: itemId },
    });

    if (!item) throw new NotFoundException('Bazaar item not found');
    if (item.status === 'COMPLETED')
      throw new BadRequestException('Purchase already completed');

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
      // 📡 Event-Driven Cache Invalidation (Bazaar & Billing Summary)
      this.eventEmitter.emit(CacheEvents.BAZAAR_UPDATED, {
        messId: mess.id,
        monthId: mess.currentMonthId,
      });
    }

    return updatedItem;
  }

  async getBazaarList(userId: string) {
    const { mess } = await this.validator.validateUserAndMess(userId);
    if (!mess.currentMonthId) return [];

    const monthId = mess.currentMonthId; // 👈 Type narrowing for TypeScript closure
    const cacheKey = CacheKeys.bazaarList(mess.id, monthId);

    return this.appCache.remember(cacheKey, 300, () =>
      this.prisma.bazaarItem.findMany({
        where: { monthId },
        orderBy: { createdAt: 'desc' },
      }),
    );
  }

  async addDeposit(dto: CreateDepositDto, managerId: string) {
    const { manager, mess } = await this.validator.validateManager(managerId);

    if (!mess.isMonthActive || !mess.currentMonthId) {
      throw new BadRequestException(
        'Active month summary session is not started',
      );
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });
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

    // 📡 Event-Driven Cache Invalidation (Billing Summary Invalidated on New Deposit)
    this.eventEmitter.emit(CacheEvents.BILLING_UPDATED, {
      messId: mess.id,
      monthId: mess.currentMonthId,
    });

    // ⚡ BACKGROUND QUEUE: যে মেম্বারের ডিপোজিট জমা হলো তার ফোনে নোটিফিকেশন জব পুশ করা
    await this.notificationQueue.add('send-user-notification', {
      userId: dto.userId,
      title: '💰 Deposit Logged!',
      body: `Manager logged a deposit of BDT ${dto.amount} for you.`,
    });

    return deposit;
  }
}
