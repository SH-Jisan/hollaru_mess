import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ContextValidatorService } from '../../common/services/context-validator.service';
import { CompletePurchaseDto } from './dto/complete-purchase.dto';
import { CreateBazaarItemDto } from './dto/create-bazaar-item.dto';
import { CreateDepositDto } from './dto/create-deposit.dto';
import { SmartParseDto } from './dto/smart-parse.dto';
import { SmartSubmitDto } from './dto/smart-submit.dto';
import { RejectBazaarDto } from './dto/reject-bazaar.dto';
import { SmartBazaarParserService } from './parser/smart-bazaar-parser.service';
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
    private smartParser: SmartBazaarParserService,
  ) {}

  // -------------------------------------------------------------
  // ১. SMART NOTEPAD PARSE (PREVIEW ONLY)
  // -------------------------------------------------------------
  async smartParse(dto: SmartParseDto) {
    return this.smartParser.parse(dto.rawText);
  }

  // -------------------------------------------------------------
  // ২. SMART NOTEPAD SUBMIT (ATOMIC TRANSACTION & APPROVAL WORKFLOW)
  // -------------------------------------------------------------
  async smartSubmit(dto: SmartSubmitDto, userId: string) {
    const { user, mess, activeMonthId } =
      await this.validator.validateUserMessAndActiveMonth(userId);

    const isManager = user.role === Role.MANAGER;
    const isAutoApproved = isManager;

    if ((!dto.items || dto.items.length === 0) && (!dto.depositAmount || dto.depositAmount <= 0)) {
      throw new BadRequestException("Please provide at least one bazaar item or deposit amount");
    }
    const totalCost = (dto.items || []).reduce((sum, item) => sum + item.cost, 0);
    const summaryString = dto.items
      .map((i) => `${i.name} (${i.quantity} ${i.unit}) - ${i.cost}tk`)
      .join(', ');

    // ⚛️ ATOMIC PRISMA TRANSACTION: বাজার ও ডিপোজিট একসাথে তৈরি করা
    const result = await this.prisma.$transaction(async (tx) => {
      // ১. BazaarItem তৈরি
      const item = await tx.bazaarItem.create({
        data: {
          monthId: activeMonthId,
          items: summaryString,
          cost: totalCost,
          status: isAutoApproved ? 'COMPLETED' : 'PENDING_APPROVAL',
          shopperId: userId,
          shopperName: user.name,
          rawText: dto.rawText,
          itemsDetail: dto.items as any,
          depositAmount: dto.depositAmount || 0,
        },
      });

      // ২. যদি ডিপোজিট ডিটেক্ট হয়ে থাকে (যেমন: ami taka disi 2000)
      let createdDeposit: any = null;
      if (dto.depositAmount && dto.depositAmount > 0) {
        createdDeposit = await tx.deposit.create({
          data: {
            monthId: activeMonthId,
            userId: userId,
            amount: dto.depositAmount,
            status: isAutoApproved ? 'APPROVED' : 'PENDING_APPROVAL',
            bazaarItemId: item.id,
          },
        });

        // BazaarItem এ ডিপোজিট রেফারেন্স লিংক করা
        await tx.bazaarItem.update({
          where: { id: item.id },
          data: { depositId: createdDeposit.id },
        });
      }

      return { item, deposit: createdDeposit };
    });

    if (isAutoApproved) {
      // ম্যানেজার সাবমিট করায় সাথে সাথে ক্যাশ ইনভ্যালিডেট হবে
      this.eventEmitter.emit(CacheEvents.BAZAAR_UPDATED, {
        messId: mess.id,
        monthId: activeMonthId,
      });
      this.eventEmitter.emit(CacheEvents.BILLING_UPDATED, {
        messId: mess.id,
        monthId: activeMonthId,
      });

      await this.notificationQueue.add('send-mess-notification', {
        messId: mess.id,
        title: '🛒 Bazaar Added by Manager',
        body: `Manager logged bazaar of BDT ${totalCost}${dto.depositAmount ? ` with BDT ${dto.depositAmount} deposit` : ''}.`,
      });
    } else {
      // মেম্বার সাবমিট করায় ম্যানেজারকে রিভিউ এর নোটিফিকেশন পাঠানো হবে
      const manager = await this.prisma.user.findUnique({
        where: { id: mess.managerId },
      });

      if (manager) {
        await this.notificationQueue.add('send-user-notification', {
          userId: manager.id,
          title: '🔔 Bazaar Approval Request',
          body: `${user.name} submitted a bazaar note (BDT ${totalCost}) awaiting your approval.`,
        });
      }
    }

    return {
      message: isAutoApproved
        ? 'Bazaar and deposit auto-approved successfully'
        : 'Bazaar submitted and pending manager approval',
      isAutoApproved,
      bazaarItem: result.item,
      deposit: result.deposit,
    };
  }

  // -------------------------------------------------------------
  // ৩. APPROVE BAZAAR & DEPOSIT (MANAGER ONLY)
  // -------------------------------------------------------------
  async approveBazaar(itemId: string, managerId: string) {
    const { manager, mess } = await this.validator.validateManager(managerId);

    const item = await this.prisma.bazaarItem.findUnique({
      where: { id: itemId },
    });

    if (!item) throw new NotFoundException('Bazaar item not found');
    if (item.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException(`Item is not pending approval (Current status: ${item.status})`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // ১. Bazaar Item status -> COMPLETED
      const approvedItem = await tx.bazaarItem.update({
        where: { id: itemId },
        data: { status: 'COMPLETED' },
      });

      // ২. সংশ্লিষ্ট ডিপোজিট থাকলে status -> APPROVED
      if (approvedItem.depositId) {
        await tx.deposit.update({
          where: { id: approvedItem.depositId },
          data: { status: 'APPROVED' },
        });
      }

      return approvedItem;
    });

    // ক্যাশ ইনভ্যালিডেশন
    if (mess.currentMonthId) {
      this.eventEmitter.emit(CacheEvents.BAZAAR_UPDATED, {
        messId: mess.id,
        monthId: mess.currentMonthId,
      });
      this.eventEmitter.emit(CacheEvents.BILLING_UPDATED, {
        messId: mess.id,
        monthId: mess.currentMonthId,
      });
    }

    // ক্রেতাকে কনফার্মেশন নোটিফিকেশন পাঠানো
    if (item.shopperId) {
      await this.notificationQueue.add('send-user-notification', {
        userId: item.shopperId,
        title: '✅ Bazaar Approved!',
        body: `Manager approved your bazaar purchase of BDT ${item.cost}.`,
      });
    }

    return updated;
  }

  // -------------------------------------------------------------
  // ৪. REJECT BAZAAR & DEPOSIT (MANAGER ONLY)
  // -------------------------------------------------------------
  async rejectBazaar(itemId: string, dto: RejectBazaarDto, managerId: string) {
    const { manager, mess } = await this.validator.validateManager(managerId);

    const item = await this.prisma.bazaarItem.findUnique({
      where: { id: itemId },
    });

    if (!item) throw new NotFoundException('Bazaar item not found');
    if (item.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException(`Item is not pending approval (Current status: ${item.status})`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const rejectedItem = await tx.bazaarItem.update({
        where: { id: itemId },
        data: {
          status: 'REJECTED',
          rejectionReason: dto.reason,
        },
      });

      if (rejectedItem.depositId) {
        await tx.deposit.update({
          where: { id: rejectedItem.depositId },
          data: { status: 'REJECTED' },
        });
      }

      return rejectedItem;
    });

    // ক্রেতাকে নোটিফিকেশন দিয়ে কারণ জানানো
    if (item.shopperId) {
      await this.notificationQueue.add('send-user-notification', {
        userId: item.shopperId,
        title: '❌ Bazaar Request Rejected',
        body: `Manager rejected your bazaar submission. Reason: "${dto.reason}"`,
      });
    }

    return updated;
  }

  // -------------------------------------------------------------
  // ৫. লিগ্যাসি মেথডস (কমপ্যাটিবিলিটি অক্ষুণ্ণ রাখা)
  // -------------------------------------------------------------
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

    this.eventEmitter.emit(CacheEvents.BAZAAR_UPDATED, {
      messId: mess.id,
      monthId: activeMonthId,
    });

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

    const monthId = mess.currentMonthId;
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
        status: 'APPROVED',
      },
    });

    this.eventEmitter.emit(CacheEvents.BILLING_UPDATED, {
      messId: mess.id,
      monthId: mess.currentMonthId,
    });

    await this.notificationQueue.add('send-user-notification', {
      userId: dto.userId,
      title: '💳 Deposit Logged!',
      body: `Manager logged a deposit of BDT ${dto.amount} for you.`,
    });

    return deposit;
  }
}
