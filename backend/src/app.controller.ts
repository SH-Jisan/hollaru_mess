import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role, User } from '@prisma/client';
import { AppService } from './app.service';
import { CurrentUser } from './common/decorators/user.decorator';
import { Roles } from './common/decorators/roles.decorator';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@ApiTags('App Test')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // ১. সাধারণ লগইন করা ইউজারদের জন্য সিকিউর রুট (MEMBER & MANAGER both)
  @Get('secure-profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth() // Swagger-এ লক আইকন দেখানোর জন্য
  @ApiOperation({ summary: 'Get current logged in user details' })
  getProfile(@CurrentUser() user: Omit<User, 'hashedPassword' | 'hashedRefreshToken'>) {
    return user;
  }

  // ২. শুধুমাত্র ম্যানেজারদের জন্য সিকিউর রুট (MANAGER only)
  @Get('manager-dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard) // দুটি গার্ডই রান হবে
  @Roles(Role.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Access manager-only dashboard test' })
  getManagerData() {
    return { message: 'Welcome Manager! This is private mess management data.' };
  }
}
