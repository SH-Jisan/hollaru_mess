import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationService } from './notification.service';

describe('NotificationService (Unit Tests)', () => {
  let service: NotificationService;

  const mockPrismaService = {
    user: {
      update: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn().mockResolvedValue({ id: 'user_1', fcmToken: 'token_1' }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    notification: {
      create: jest.fn().mockResolvedValue({
        id: 'notif_1',
        title: 'Meal Status',
        body: 'Meal turned OFF',
      }),
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  it('should save FCM token successfully', async () => {
    const response = await service.saveFcmToken('user_123', {
      fcmToken: 'sample_token',
    });

    expect(response).toEqual({ message: 'FCM Token saved successfully' });
  });

  it('should create notification entry for user', async () => {
    const notif = await service.sendNotificationToUser(
      'user_123',
      'Test Title',
      'Test Body',
    );

    expect(notif).toHaveProperty('id', 'notif_1');
  });
});
