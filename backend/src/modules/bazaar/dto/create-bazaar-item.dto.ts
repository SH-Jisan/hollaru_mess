import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBazaarItemDto {
  @ApiProperty({ example: 'Rice 20kg, Oil 5L, Potato 5kg' })
  @IsString()
  @IsNotEmpty()
  items: string;
}
