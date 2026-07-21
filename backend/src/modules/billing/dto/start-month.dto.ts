import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StartMonthDto {
  @ApiProperty({ example: 'July 2026' })
  @IsString()
  @IsNotEmpty()
  monthName: string;
}
