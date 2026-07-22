import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ContextValidatorService } from '../../common/services/context-validator.service';
import { BazaarService } from './bazaar.service';

describe('BazaarService (Unit Tests)', () => {
  let service: BazaarService;

  const mockPrismaService = {
    bazaarItem: {
      create: jest.fn().mockResolvedValue({ id: 'item_1', items: 'Rice, Chicken', status: 'PENDING' }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    deposit: { create: jest.fn() },
    user: { findUnique: jest.fn() },
  };

  const mockContextValidator = {
    validateUserMessAndActiveMonth: jest.fn().mockResolvedValue({
      user: { id: 'user_1', name: 'Jisan' },
      mess: { id: 'mess_1' },
      activeMonthId: 'month_1',
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
        BazaarService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ContextValidatorService, useValue: mockContextValidator },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: getQueueToken('notification-queue'), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<BazaarService>(BazaarService);

  });

  it('should create a bazaar item and add notification job to queue', async () => {
    const result = await service.createBazaarItem(
      { items: 'Rice, Chicken' },
      'user_1',
    );

    expect(result).toHaveProperty('id', 'item_1');
    expect(mockQueue.add).toHaveBeenCalledWith('send-mess-notification', expect.any(Object));
  });
});
