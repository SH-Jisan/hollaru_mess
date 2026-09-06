import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SmartParseDto {
  @ApiProperty({
    description:
      'Raw multi-line notepad text with bazaar items and deposit info',
    example: 'ami taka disi 2000\nalu 2kg 200\ndal 1kg 100\nchaul 10kg 5k',
  })
  @IsString()
  @IsNotEmpty()
  rawText: string;
}
