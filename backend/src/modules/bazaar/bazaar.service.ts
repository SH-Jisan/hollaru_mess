import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
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
  ) {}

  // ১. মেম্বারদের জন্য বাজার লিস্টে আইটেম এড করা
  async createBazaarItem(dto: CreateBazaarItemDto, userId: string) {
    const { mess, activeMonthId } = await this.validator.validateUserMessAndActiveMonth(userId);

    const item = await this.prisma.bazaarItem.create({
      data: {
        monthId: activeMonthId,
        items: dto.items,
        status: 'PENDING',
      },
    });

    // 🔴 Invalidation: নতুন বাজার আইটেম এড হওয়ায় ক্যাশ মুছে দেওয়া
    const cacheKey = `bazaar:${mess.id}:${activeMonthId}:list`;
    await this.cacheManager.del(cacheKey);

    return item;
  }

  // ২. বাজার করার পর খরচ সাবমিট ও কমপ্লিট করা
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

    // 🔴 Invalidation: খরচ সাবমিট করায় বাজার খরচের ক্যাশ মুছে দেওয়া
    if (mess.currentMonthId) {
      const cacheKey = `bazaar:${mess.id}:${mess.currentMonthId}:list`;
      await this.cacheManager.del(cacheKey);

      // বাজার খরচ যুক্ত হওয়ায় রানিং মাসের বিলিং সামারির ক্যাশও ক্লিয়ার করে দেওয়া
      const billingCacheKey = `billing:${mess.id}:${mess.currentMonthId}:summary`;
      await this.cacheManager.del(billingCacheKey);
    }

    return updatedItem;
  }

  // ৩. মেসের রানিং মাসের বাজার খরচের তালিকা দেখা (Cache-Aside Pattern)
  async getBazaarList(userId: string) {
    const { mess } = await this.validator.validateUserAndMess(userId);
    if (!mess.currentMonthId) return [];

    const cacheKey = `bazaar:${mess.id}:${mess.currentMonthId}:list`;

    // ⚡ ১. ক্যাশে খুঁজবে
    const cachedList = await this.cacheManager.get(cacheKey);
    if (cachedList) {
      return cachedList;
    }

    // 🗄️ ২. ডাটাবেজ থেকে রিড করবে
    const bazaarList = await this.prisma.bazaarItem.findMany({
      where: { monthId: mess.currentMonthId },
      orderBy: { createdAt: 'desc' },
    });

// 💾 পরবর্তী কোনো আপডেট (Create/Complete) না করা পর্যন্ত ক্যাশে থাকবে (TTL = 0)
    await this.cacheManager.set(cacheKey, bazaarList, 0);

    return bazaarList;
  }

  // ৪. মেম্বারদের ডিপোজিট/জমা টাকা লগ করা (Only Manager)
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

    // 🔴 Invalidation: মেম্বারের ডিপোজিট জমা হওয়ায় বিলিং সামারির ক্যাশ মুছে দেওয়া
    const billingCacheKey = `billing:${mess.id}:${mess.currentMonthId}:summary`;
    await this.cacheManager.del(billingCacheKey);

    return deposit;
  }
}
