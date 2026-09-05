import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectBazaarDto {
  @ApiProperty({ example: 'Receipt amount does not match notepad cost' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
