import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
  ) {}

  // ১. মেম্বারদের জন্য বাজার লিস্টে আইটেম এড করা
  async createBazaarItem(dto: CreateBazaarItemDto, userId: string) {
    const { activeMonthId } = await this.validator.validateUserMessAndActiveMonth(userId);

    return this.prisma.bazaarItem.create({
      data: {
        monthId: activeMonthId,
        items: dto.items,
        status: 'PENDING',
      },
    });
  }

  // ২. বাজার করার পর খরচ সাবমিট ও কমপ্লিট করা
  async completePurchase(itemId: string, dto: CompletePurchaseDto, userId: string) {
    const { user } = await this.validator.validateUserAndMess(userId);
    const item = await this.prisma.bazaarItem.findUnique({ where: { id: itemId } });

    if (!item) throw new NotFoundException('Bazaar item not found');
    if (item.status === 'COMPLETED') throw new BadRequestException('Purchase already completed');

    return this.prisma.bazaarItem.update({
      where: { id: itemId },
      data: {
        cost: dto.cost,
        status: 'COMPLETED',
        shopperId: userId,
        shopperName: user.name,
      },
    });
  }

  // ৩. মেসের রানিং মাসের বাজার খরচের তালিকা দেখা
  async getBazaarList(userId: string) {
    const { mess } = await this.validator.validateUserAndMess(userId);
    if (!mess.currentMonthId) return [];

    return this.prisma.bazaarItem.findMany({
      where: { monthId: mess.currentMonthId },
      orderBy: { createdAt: 'desc' },
    });
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

    return this.prisma.deposit.create({
      data: {
        monthId: mess.currentMonthId,
        userId: dto.userId,
        amount: dto.amount,
      },
    });
  }
}
