import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshDto {
  @ApiProperty({ example: 'some-long-refresh-token-string' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
