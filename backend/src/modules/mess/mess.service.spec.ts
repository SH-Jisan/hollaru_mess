import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ContextValidatorService } from '../../common/services/context-validator.service';
import { MessService } from './mess.service';

describe('MessService (Unit Tests)', () => {
  let service: MessService;

  const mockPrismaService: any = {
    mess: {
      create: jest.fn().mockResolvedValue({ id: 'mess_123', name: 'Dream Mess', code: '4921' }),
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({ id: 'user_1', messId: null, email: 'test@test.com' }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'user_1', messId: null, email: 'test@test.com' }),
      update: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
    },

    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockContextValidator = {
    validateUserHasNoMess: jest.fn().mockResolvedValue(true),
    validateUserAndMess: jest.fn().mockResolvedValue({
      user: { id: 'user_1', messId: 'mess_123' },
      mess: { id: 'mess_123' },
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
        MessService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ContextValidatorService, useValue: mockContextValidator },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<MessService>(MessService);
  });

  it('should create a mess and assign 4-digit code', async () => {
    const result = await service.createMess(
      { name: 'Dream Mess' },
      'user_123',
    );

    expect(result).toHaveProperty('code');
    expect(result.name).toBe('Dream Mess');
  });
});

