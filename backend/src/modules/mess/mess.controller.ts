import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateMessDto } from './dto/create-mess.dto';
import { JoinMessDto } from './dto/join-mess.dto';
import { MessService } from './mess.service';

@ApiTags('Mess Management')
@ApiBearerAuth() // এই মডিউলের সব এপিআই-র জন্য টোকেন লাগবে
@UseGuards(JwtAuthGuard)
@Controller('mess')
export class MessController {
  constructor(private readonly messService: MessService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new mess (Creator becomes MANAGER)' })
  @ApiResponse({ status: 201, description: 'Mess created successfully.' })
  createMess(@Body() createMessDto: CreateMessDto, @CurrentUser() user: { id: string }) {
    return this.messService.createMess(createMessDto, user.id);
  }

  @Post('join')
  @ApiOperation({ summary: 'Join an existing mess using a unique 4-digit code' })
  @ApiResponse({ status: 201, description: 'Joined successfully.' })
  @ApiResponse({ status: 404, description: 'Mess code not found.' })
  joinMess(@Body() joinMessDto: JoinMessDto, @CurrentUser() user: { id: string }) {
    return this.messService.joinMess(joinMessDto, user.id);
  }

  @Get('members')
  @ApiOperation({ summary: 'List all members in the current user mess' })
  @ApiResponse({ status: 200, description: 'List of members returned.' })
  getMembers(@CurrentUser() user: { id: string }) {
    return this.messService.getMembers(user.id);
  }
}
