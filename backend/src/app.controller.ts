import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role, User } from '@prisma/client';
import { AppService } from './app.service';
import { CurrentUser } from './common/decorators/user.decorator';
import { Roles } from './common/decorators/roles.decorator';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PrismaService } from './common/prisma/prisma.service';

@ApiTags('App Test')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiOperation({
    summary: 'Health Check API for Render, Uptime Kuma, and Load Balancers',
  })
  getHealth() {
    return {
      status: 'UP',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(process.uptime())}s`,
      service: 'Meal Book Backend Server',
    };
  }

  // ১. সাধারণ লগইন করা ইউজারদের জন্য সিকিউর রুট (MEMBER & MANAGER both)
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth() // Swagger-এ লক আইকন দেখানোর জন্য
  @ApiOperation({ summary: 'Get current logged in user details' })
  getProfile(
    @CurrentUser() user: Omit<User, 'hashedPassword' | 'hashedRefreshToken'>,
  ) {
    return user;
  }

  // ২. শুধুমাত্র ম্যানেজারদের জন্য সিকিউর রুট (MANAGER only)
  @Get('manager-dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard) // দুটি গার্ডই রান হবে
  @Roles(Role.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Access manager-only dashboard test' })
  async getManagerData(@CurrentUser() user: { messId: string }) {
    const mess = user.messId
      ? await this.prisma.mess.findUnique({ where: { id: user.messId } })
      : null;

    return {
      message: 'Welcome Manager! This is private mess management data.',
      messCode: mess?.code || null,
    };
  }
}
