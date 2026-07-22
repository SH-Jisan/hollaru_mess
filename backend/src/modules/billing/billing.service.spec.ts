import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ContextValidatorService } from '../../common/services/context-validator.service';
import { BillingService } from './billing.service';

describe('BillingService (Unit Tests)', () => {
  let service: BillingService;

  const mockPrismaService = {
    monthlyData: { create: jest.fn(), update: jest.fn() },
    mess: { update: jest.fn() },
    bazaarItem: { aggregate: jest.fn().mockResolvedValue({ _sum: { cost: 6000 } }) },
    dailyLog: { findMany: jest.fn().mockResolvedValue([{ lunchCount: 60, dinnerCount: 60 }]) },
    deposit: { groupBy: jest.fn().mockResolvedValue([{ userId: 'user_1', _sum: { amount: 2000 } }]) },
    user: { findMany: jest.fn().mockResolvedValue([{ id: 'user_1', name: 'Jisan', email: 'j@test.com' }]) },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockContextValidator = {
    validateUserAndMess: jest.fn().mockResolvedValue({
      user: { id: 'user_1', messId: 'mess_1' },
      mess: { id: 'mess_1', currentMonthId: 'month_1' },
    }),
    validateManager: jest.fn().mockResolvedValue({
      manager: { id: 'user_1', messId: 'mess_1' },
      mess: { id: 'mess_1', isMonthActive: false, currentMonthId: 'month_1' },
    }),
  };

  const mockCacheManager = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ContextValidatorService, useValue: mockContextValidator },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
    jest.clearAllMocks();
  });

  it('should calculate correct meal rate (6000 cost / 120 meals = 50 tk)', async () => {
    const result = await service.getMonthSummary('user_1');

    expect(result.totalBazaarCost).toBe(6000);
    expect(result.totalMeals).toBe(120);
    expect(result.mealRate).toBe(50);
  });
});
