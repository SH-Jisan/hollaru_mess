import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ContextValidatorService } from '../../common/services/context-validator.service';
import { MealsService } from './meals.service';
import { MealType, RequestCategory } from './dto/update-meal.dto';

describe('MealsService (Unit Tests)', () => {
  let service: MealsService;

  const mockPrismaService = {
    dailyLog: {
      findUnique: jest.fn().mockResolvedValue({ id: '2026-07-23', monthId: 'month_1' }),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    mealRequest: {
      create: jest.fn().mockResolvedValue({ id: 'req_1', status: 'PENDING' }),
    },
  };

  const mockContextValidator = {
    validateUserMessAndActiveMonth: jest.fn().mockResolvedValue({
      user: { id: 'user_1' },
      mess: { id: 'mess_1', lunchEndTime: '23:59', dinnerEndTime: '23:59' },
      activeMonthId: 'month_1',
    }),
    validateUserAndMess: jest.fn().mockResolvedValue({
      user: { id: 'user_1', messId: 'mess_1' },
    }),
  };

  const mockCacheManager = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };

  const mockQueue = {
    add: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MealsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ContextValidatorService, useValue: mockContextValidator },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: getQueueToken('notification-queue'), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<MealsService>(MealsService);
  });

  it('should submit meal request successfully', async () => {
    const result = await service.requestMealUpdate(
      { type: MealType.LUNCH, category: RequestCategory.OFF, count: 1 },
      'user_1',
    );

    expect(result).toHaveProperty('id', 'req_1');
    expect(result).toHaveProperty('status', 'PENDING');
  });
});
