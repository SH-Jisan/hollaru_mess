import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UpdateMealDto } from './dto/update-meal.dto';
import { MealsService } from './meals.service';

@ApiTags('Daily Meals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('meals')
export class MealsController {
  constructor(private readonly mealsService: MealsService) {}

  @Post('request')
  @ApiOperation({ summary: 'Submit a request to turn meal OFF or add GUEST meals' })
  @ApiResponse({ status: 201, description: 'Request successfully submitted.' })
  @ApiResponse({ status: 400, description: 'Deadline passed or month summary not active.' })
  requestMealUpdate(@Body() dto: UpdateMealDto, @CurrentUser() user: { id: string }) {
    return this.mealsService.requestMealUpdate(dto, user.id);
  }

  @Patch('approve/:id')
  @ApiOperation({ summary: 'Manager approves a pending meal modification request' })
  @ApiResponse({ status: 200, description: 'Request approved and count updated.' })
  @ApiResponse({ status: 400, description: 'Only managers can approve requests or request already processed.' })
  approveRequest(@Param('id') requestId: string, @CurrentUser() user: { id: string }) {
    return this.mealsService.approveRequest(requestId, user.id);
  }

  @Get('live')
  @ApiOperation({ summary: 'Get live meal counts and requests list for today' })
  @ApiResponse({ status: 200, description: 'Live count returned.' })
  getDailyLiveCount(@CurrentUser() user: { id: string }) {
    return this.mealsService.getDailyLiveCount(user.id);
  }
}
