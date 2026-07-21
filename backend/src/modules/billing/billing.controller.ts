import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '@prisma/client';
import { BillingService } from './billing.service';
import { StartMonthDto } from './dto/start-month.dto';

@ApiTags('Billing & Month Summary')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('start-month')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: 'Start a new monthly billing session (Manager only)' })
  @ApiResponse({ status: 201, description: 'Month session started.' })
  startNewMonth(@Body() dto: StartMonthDto, @CurrentUser() user: { id: string }) {
    return this.billingService.startNewMonth(dto, user.id);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get current month calculation, total costs, total meals, and meal rate' })
  @ApiResponse({ status: 200, description: 'Month summary and meal rate returned.' })
  getMonthSummary(@CurrentUser() user: { id: string }) {
    return this.billingService.getMonthSummary(user.id);
  }

  @Post('close-month')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: 'Close and archive current monthly session (Manager only)' })
  @ApiResponse({ status: 200, description: 'Month session closed.' })
  closeMonthSession(@CurrentUser() user: { id: string }) {
    return this.billingService.closeMonthSession(user.id);
  }
}
