import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { BazaarService } from './bazaar.service';
import { CompletePurchaseDto } from './dto/complete-purchase.dto';
import { CreateBazaarItemDto } from './dto/create-bazaar-item.dto';
import { CreateDepositDto } from './dto/create-deposit.dto';
import { SmartParseDto } from './dto/smart-parse.dto';
import { SmartSubmitDto } from './dto/smart-submit.dto';
import { RejectBazaarDto } from './dto/reject-bazaar.dto';

@ApiTags('Bazaar & Deposits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bazaar')
export class BazaarController {
  constructor(private readonly bazaarService: BazaarService) {}

  // -------------------------------------------------------------
  // ১. SMART NOTEPAD PREVIEW
  // -------------------------------------------------------------
  @Post('smart-parse')
  @ApiOperation({ summary: 'Preview notepad parsing (Dual Engine: Regex + AI)' })
  @ApiResponse({ status: 200, description: 'Parsed structure returned.' })
  smartParse(@Body() dto: SmartParseDto) {
    return this.bazaarService.smartParse(dto);
  }

  // -------------------------------------------------------------
  // ২. SMART NOTEPAD SUBMIT
  // -------------------------------------------------------------
  @Post('smart-submit')
  @ApiOperation({ summary: 'Submit parsed notepad items and deposit (Member: Pending Approval, Manager: Auto-Approved)' })
  @ApiResponse({ status: 201, description: 'Bazaar submitted successfully.' })
  smartSubmit(
    @Body() dto: SmartSubmitDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.bazaarService.smartSubmit(dto, user.id);
  }

  // -------------------------------------------------------------
  // ৩. APPROVE BAZAAR (MANAGER ONLY)
  // -------------------------------------------------------------
  @Patch('approve/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: 'Approve pending bazaar item & deposit (Manager only)' })
  @ApiResponse({ status: 200, description: 'Bazaar item approved and added to billing.' })
  approveBazaar(
    @Param('id') itemId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.bazaarService.approveBazaar(itemId, user.id);
  }

  // -------------------------------------------------------------
  // ৪. REJECT BAZAAR (MANAGER ONLY)
  // -------------------------------------------------------------
  @Patch('reject/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: 'Reject pending bazaar item & deposit (Manager only)' })
  @ApiResponse({ status: 200, description: 'Bazaar item rejected.' })
  rejectBazaar(
    @Param('id') itemId: string,
    @Body() dto: RejectBazaarDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.bazaarService.rejectBazaar(itemId, dto, user.id);
  }

  // -------------------------------------------------------------
  // ৫. BAZAAR LIST & LEGACY ENDPOINTS
  // -------------------------------------------------------------
  @Get('list')
  @ApiOperation({ summary: 'Get current month bazaar list' })
  @ApiResponse({ status: 200, description: 'Bazaar list returned.' })
  getBazaarList(@CurrentUser() user: { id: string }) {
    return this.bazaarService.getBazaarList(user.id);
  }

  @Post('item')
  @ApiOperation({ summary: 'Add a new item to the bazaar list' })
  @ApiResponse({ status: 201, description: 'Item added successfully.' })
  createBazaarItem(
    @Body() dto: CreateBazaarItemDto,
    @CurrentUser() user: { id: string },
  ) {
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

  @Post('deposit')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: 'Log member deposit (Manager only)' })
  @ApiResponse({ status: 201, description: 'Deposit logged successfully.' })
  addDeposit(
    @Body() dto: CreateDepositDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.bazaarService.addDeposit(dto, user.id);
  }
}
