import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ContextValidatorService } from '../../common/services/context-validator.service';
import { BazaarService } from './bazaar.service';
import { AppCacheService } from '../../common/cache/app-cache.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SmartBazaarParserService } from './parser/smart-bazaar-parser.service';
import { Role } from '@prisma/client';

describe('BazaarService (Unit Tests)', () => {
  let service: BazaarService;

  const mockPrismaService: any = {
    bazaarItem: {
      create: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'item_1',
          cost: data.cost || 200,
          status: data.status,
          depositAmount: data.depositAmount || 0,
        }),
      ),
      findUnique: jest.fn(),
      update: jest.fn().mockImplementation(({ where, data }) =>
        Promise.resolve({
          id: where.id,
          ...data,
        }),
      ),
      findMany: jest.fn().mockResolvedValue([]),
    },
    deposit: {
      create: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'dep_' + Math.random().toString(36).substring(2, 6),
          ...data,
        }),
      ),
      update: jest.fn().mockResolvedValue({ id: 'dep_1', status: 'APPROVED' }),
      updateMany: jest.fn().mockResolvedValue({ count: 3 }),
    },
    monthlyData: {
      update: jest.fn().mockResolvedValue({}),
    },
    mess: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ id: 'mess_1', managerId: 'manager_1' }),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'manager_1',
        name: 'Manager',
        messId: 'mess_1',
      }),
      findMany: jest.fn().mockResolvedValue([
        { id: 'user_rohim', name: 'Rohim' },
        { id: 'user_korim', name: 'Korim' },
        { id: 'user_jisan', name: 'Jisan' },
        { id: 'user_alif', name: 'Alif' },
        { id: 'user_rafi', name: 'Rafi' },
      ]),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockContextValidator = {
    validateUserMessAndActiveMonth: jest.fn().mockResolvedValue({
      user: { id: 'user_rafi', name: 'Rafi', role: Role.MEMBER },
      mess: { id: 'mess_1', managerId: 'manager_1' },
      activeMonthId: 'month_1',
    }),
    validateUserAndMess: jest.fn().mockResolvedValue({
      user: { id: 'user_rafi', name: 'Rafi', role: Role.MEMBER },
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
      items: [
        {
          name: 'Alu (আলু)',
          originalName: 'alu',
          quantity: 2,
          unit: 'kg',
          cost: 200,
          confidence: 1,
        },
      ],
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
        {
          provide: AppCacheService,
          useValue: {
            remember: jest.fn((k, ttl, fn) => fn()),
            del: jest.fn(),
            delMany: jest.fn(),
          },
        },
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
      expect(mockSmartParser.parse).toHaveBeenCalledWith(
        'alu 2kg 200',
        undefined,
        undefined,
      );
    });

    it('should resolve member userIds when memberDeposits are parsed and userId is passed', async () => {
      mockSmartParser.parse.mockResolvedValueOnce({
        depositAmount: 2500,
        items: [{ name: 'Chaul', cost: 1000 }],
        memberDeposits: [
          { memberName: 'korim', amount: 500 },
          { memberName: 'jisun', amount: 1500 }, // typo for Jisan
        ],
        totalCost: 1000,
        rawText: 'korim 500 jisun 1.5k',
        engineUsed: 'TIER2_AI',
        confidence: 0.95,
        warnings: [],
      });

      const res = await service.smartParse(
        { rawText: 'korim 500 jisun 1.5k' },
        'user_rafi',
      );
      expect(res.memberDeposits).toBeDefined();
      expect(res.memberDeposits![0].userId).toBe('user_korim');
      expect(res.memberDeposits![1].userId).toBe('user_jisan'); // fuzzy matched!
    });
  });

  describe('smartSubmit (Single Deposit - Legacy)', () => {
    it('should submit bazaar with PENDING_APPROVAL when submitted by MEMBER', async () => {
      const res = await service.smartSubmit(
        {
          rawText: 'ami taka disi 2000\nalu 2kg 200',
          depositAmount: 2000,
          items: [{ name: 'Alu (আলু)', quantity: 2, unit: 'kg', cost: 200 }],
        },
        'user_rafi',
      );

      expect(res.isAutoApproved).toBe(false);
      expect(res.bazaarItem.status).toBe('PENDING_APPROVAL');
      expect(mockPrismaService.deposit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user_rafi',
          amount: 2000,
          status: 'PENDING_APPROVAL',
        }),
      });
      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-user-notification',
        expect.any(Object),
      );
    });
  });

  describe('smartSubmit (Multi-Member Deposit)', () => {
    it('should create individual deposits for each contributor and match members accurately', async () => {
      const res = await service.smartSubmit(
        {
          rawText:
            'korim dise 500\nrohim dse 500\njisun dis 1.5k\nchal 5kg 300',
          items: [{ name: 'Chal', quantity: 5, unit: 'kg', cost: 300 }],
          memberDeposits: [
            { memberName: 'korim', amount: 500 },
            { memberName: 'rohim', amount: 500 },
            { memberName: 'jisun', amount: 1500 },
          ],
        },
        'user_rafi',
      );

      expect(res.isAutoApproved).toBe(false);
      expect(mockPrismaService.deposit.create).toHaveBeenCalledTimes(3);

      // Verify Korim's deposit
      expect(mockPrismaService.deposit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user_korim',
          amount: 500,
          status: 'PENDING_APPROVAL',
          bazaarItemId: 'item_1',
        }),
      });

      // Verify Rohim's deposit
      expect(mockPrismaService.deposit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user_rohim',
          amount: 500,
          status: 'PENDING_APPROVAL',
          bazaarItemId: 'item_1',
        }),
      });

      // Verify Jisan's fuzzy matched deposit
      expect(mockPrismaService.deposit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user_jisan',
          amount: 1500,
          status: 'PENDING_APPROVAL',
          bazaarItemId: 'item_1',
        }),
      });

      expect(res.deposits).toHaveLength(3);
    });

    it('should fallback to shopper userId when member name is completely unrecognizable', async () => {
      const res = await service.smartSubmit(
        {
          rawText: 'unknownPerson 500',
          items: [{ name: 'Chal', quantity: 5, unit: 'kg', cost: 300 }],
          memberDeposits: [{ memberName: 'unknownPerson', amount: 500 }],
        },
        'user_rafi',
      );

      // Falls back safely to shopper 'user_rafi'
      expect(mockPrismaService.deposit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user_rafi',
          amount: 500,
        }),
      });
    });

    it('should support negative deposits for shopper when unreturned change is kept', async () => {
      const res = await service.smartSubmit(
        {
          rawText:
            'korim 500\nrohim 500\njisun 1.5k\nchal 300\nmurgi 1k\nmas 200\nrohim ke ferot 900',
          items: [
            { name: 'Chal', quantity: 5, unit: 'kg', cost: 300 },
            { name: 'Murgi', quantity: 5, unit: 'kg', cost: 1000 },
            { name: 'Mas', quantity: 5, unit: 'kg', cost: 200 },
          ],
          memberDeposits: [
            { memberName: 'korim', amount: 500 },
            { memberName: 'rohim', amount: 500 },
            { memberName: 'jisun', amount: 1500 },
            { memberName: 'Ami (Shopper)', amount: -100 },
          ],
        },
        'user_rafi',
      );

      expect(mockPrismaService.deposit.create).toHaveBeenCalledTimes(4);

      // Verify Rafi (shopper) gets negative deposit of -100
      expect(mockPrismaService.deposit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user_rafi',
          amount: -100,
          status: 'PENDING_APPROVAL',
          bazaarItemId: 'item_1',
        }),
      });

      expect(res.deposits).toHaveLength(4);
    });
  });

  describe('approveBazaar', () => {
    it('should approve pending bazaar item and all linked deposits (multi-member)', async () => {
      mockPrismaService.bazaarItem.findUnique.mockResolvedValue({
        id: 'item_1',
        cost: 200,
        status: 'PENDING_APPROVAL',
        depositId: 'dep_1',
        shopperId: 'user_rafi',
      });
      mockPrismaService.bazaarItem.update.mockResolvedValue({
        id: 'item_1',
        status: 'COMPLETED',
        depositId: 'dep_1',
      });

      const res = await service.approveBazaar('item_1', 'manager_1');

      expect(res.status).toBe('COMPLETED');
      expect(mockPrismaService.deposit.updateMany).toHaveBeenCalledWith({
        where: {
          OR: [{ bazaarItemId: 'item_1' }, { id: 'dep_1' }],
        },
        data: { status: 'APPROVED' },
      });
    });
  });

  describe('rejectBazaar', () => {
    it('should reject pending bazaar item and all linked deposits (multi-member)', async () => {
      mockPrismaService.bazaarItem.findUnique.mockResolvedValue({
        id: 'item_1',
        cost: 200,
        status: 'PENDING_APPROVAL',
        depositId: 'dep_1',
        shopperId: 'user_rafi',
      });
      mockPrismaService.bazaarItem.update.mockResolvedValue({
        id: 'item_1',
        status: 'REJECTED',
        depositId: 'dep_1',
      });

      const res = await service.rejectBazaar(
        'item_1',
        { reason: 'Incorrect items' },
        'manager_1',
      );

      expect(res.status).toBe('REJECTED');
      expect(mockPrismaService.deposit.updateMany).toHaveBeenCalledWith({
        where: {
          OR: [{ bazaarItemId: 'item_1' }, { id: 'dep_1' }],
        },
        data: { status: 'REJECTED' },
      });
    });
  });
});
