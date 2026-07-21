import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SaveFcmTokenDto } from './dto/save-fcm-token.dto';
import { NotificationService } from './notification.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('fcm-token')
  @ApiOperation({ summary: 'Save or update mobile device FCM Token for push notifications' })
  @ApiResponse({ status: 201, description: 'FCM Token saved.' })
  saveFcmToken(@CurrentUser() user: { id: string }, @Body() dto: SaveFcmTokenDto) {
    return this.notificationService.saveFcmToken(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get in-app notifications history for logged in user' })
  @ApiResponse({ status: 200, description: 'Notifications returned.' })
  getUserNotifications(@CurrentUser() user: { id: string }) {
    return this.notificationService.getUserNotifications(user.id);
  }

  @Patch('read/:id')
  @ApiOperation({ summary: 'Mark specific in-app notification as read' })
  @ApiResponse({ status: 200, description: 'Marked as read.' })
  markAsRead(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.notificationService.markAsRead(id, user.id);
  }
}
