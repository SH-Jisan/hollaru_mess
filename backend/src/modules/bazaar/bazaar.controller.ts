import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { BazaarService } from './bazaar.service';
import { CompletePurchaseDto } from './dto/complete-purchase.dto';
import { CreateBazaarItemDto } from './dto/create-bazaar-item.dto';
import { CreateDepositDto } from './dto/create-deposit.dto';

@ApiTags('Bazaar & Deposits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bazaar')
export class BazaarController {
  constructor(private readonly bazaarService: BazaarService) {}

  @Post('item')
  @ApiOperation({ summary: 'Add a new item to the bazaar list' })
  @ApiResponse({ status: 201, description: 'Item added successfully.' })
  createBazaarItem(@Body() dto: CreateBazaarItemDto, @CurrentUser() user: { id: string }) {
    return this.bazaarService.createBazaarItem(dto, user.id);
  }

  @Patch('complete/:id')
  @ApiOperation({ summary: 'Submit purchase cost and mark item as completed' })
  @ApiResponse({ status: 200, description: 'Purchase completed.' })
  completePurchase(
    @Param('id') itemId: string,
    @Body() dto: CompletePurchaseDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.bazaarService.completePurchase(itemId, dto, user.id);
  }

  @Get('list')
  @ApiOperation({ summary: 'Get current month bazaar list' })
  @ApiResponse({ status: 200, description: 'Bazaar list returned.' })
  getBazaarList(@CurrentUser() user: { id: string }) {
    return this.bazaarService.getBazaarList(user.id);
  }

  @Post('deposit')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER) // শুধুমাত্র ম্যানেজাররা ডিপোজিট যোগ করতে পারবেন
  @ApiOperation({ summary: 'Log member deposit (Manager only)' })
  @ApiResponse({ status: 201, description: 'Deposit logged successfully.' })
  addDeposit(@Body() dto: CreateDepositDto, @CurrentUser() user: { id: string }) {
    return this.bazaarService.addDeposit(dto, user.id);
  }
}
