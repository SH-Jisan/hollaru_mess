import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ContextValidatorService } from '../../common/services/context-validator.service';
import { BazaarService } from './bazaar.service';
import { AppCacheService } from '../../common/cache/app-cache.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SmartBazaarParserService } from './parser/smart-bazaar-parser.service';

describe('BazaarService (Unit Tests)', () => {
  let service: BazaarService;

  const mockPrismaService: any = {
    bazaarItem: {
      create: jest.fn().mockResolvedValue({
        id: 'item_1',
        items: 'Alu (আলু) (2 kg) - 200tk',
        cost: 200,
        status: 'PENDING_APPROVAL',
      }),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    deposit: {
      create: jest.fn().mockResolvedValue({ id: 'dep_1', amount: 2000, status: 'PENDING_APPROVAL' }),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({ id: 'manager_1', name: 'Manager' }),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockContextValidator = {
    validateUserMessAndActiveMonth: jest.fn().mockResolvedValue({
      user: { id: 'user_1', name: 'Jisan', role: 'MEMBER' },
      mess: { id: 'mess_1', managerId: 'manager_1' },
      activeMonthId: 'month_1',
    }),
    validateUserAndMess: jest.fn().mockResolvedValue({
      user: { id: 'user_1', name: 'Jisan', role: 'MEMBER' },
      mess: { id: 'mess_1', currentMonthId: 'month_1' },
    }),
    validateManager: jest.fn().mockResolvedValue({
      manager: { id: 'manager_1', name: 'Manager', messId: 'mess_1' },
      mess: { id: 'mess_1', isMonthActive: true, currentMonthId: 'month_1' },
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

  const mockSmartParser = {
    parse: jest.fn().mockResolvedValue({
      depositAmount: 2000,
      items: [{ name: 'Alu (আলু)', originalName: 'alu', quantity: 2, unit: 'kg', cost: 200, confidence: 1 }],
      totalCost: 200,
      rawText: 'alu 2kg 200',
      engineUsed: 'TIER1_REGEX',
      confidence: 0.95,
      warnings: [],
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BazaarService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ContextValidatorService, useValue: mockContextValidator },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: getQueueToken('notification-queue'), useValue: mockQueue },
        { provide: AppCacheService, useValue: { remember: jest.fn((k, ttl, fn) => fn()), del: jest.fn(), delMany: jest.fn() } },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: SmartBazaarParserService, useValue: mockSmartParser },
      ],
    }).compile();

    service = module.get<BazaarService>(BazaarService);
    jest.clearAllMocks();
  });

  describe('smartParse', () => {
    it('should preview parse results from smartParser engine', async () => {
      const res = await service.smartParse({ rawText: 'alu 2kg 200' });
      expect(res.totalCost).toBe(200);
      expect(mockSmartParser.parse).toHaveBeenCalledWith('alu 2kg 200');
    });
  });

  describe('smartSubmit', () => {
    it('should submit bazaar with PENDING_APPROVAL when submitted by MEMBER', async () => {
      const res = await service.smartSubmit(
        {
          rawText: 'ami taka disi 2000\nalu 2kg 200',
          depositAmount: 2000,
          items: [{ name: 'Alu (আলু)', quantity: 2, unit: 'kg', cost: 200 }],
        },
        'user_1',
      );

      expect(res.isAutoApproved).toBe(false);
      expect(res.bazaarItem.status).toBe('PENDING_APPROVAL');
      expect(mockQueue.add).toHaveBeenCalledWith('send-user-notification', expect.any(Object));
    });
  });

  describe('approveBazaar', () => {
    it('should approve pending bazaar item and linked deposit', async () => {
      mockPrismaService.bazaarItem.findUnique.mockResolvedValue({
        id: 'item_1',
        cost: 200,
        status: 'PENDING_APPROVAL',
        depositId: 'dep_1',
        shopperId: 'user_1',
      });
      mockPrismaService.bazaarItem.update.mockResolvedValue({ id: 'item_1', status: 'COMPLETED', depositId: 'dep_1' });

      const res = await service.approveBazaar('item_1', 'manager_1');

      expect(res.status).toBe('COMPLETED');
      expect(mockPrismaService.deposit.update).toHaveBeenCalledWith({
        where: { id: 'dep_1' },
        data: { status: 'APPROVED' },
      });
    });
  });
});
