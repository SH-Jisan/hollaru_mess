import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SaveFcmTokenDto {
  @ApiProperty({ example: 'fcm-token-from-firebase-mobile-sdk' })
  @IsString()
  @IsNotEmpty()
  fcmToken: string;
}
