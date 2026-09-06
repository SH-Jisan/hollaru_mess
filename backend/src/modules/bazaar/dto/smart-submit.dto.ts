import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class SmartItemDto {
  @ApiProperty({ example: 'Alu (আলু)' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'alu' })
  @IsString()
  @IsOptional()
  originalName?: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  quantity: number;

  @ApiProperty({ example: 'kg' })
  @IsString()
  unit: string;

  @ApiProperty({ example: 200 })
  @IsNumber()
  cost: number;
}

export class MemberDepositDto {
  @ApiProperty({ example: 'Korim' })
  @IsString()
  @IsNotEmpty()
  memberName: string;

  @ApiProperty({ example: 500 })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 'user-uuid-123', required: false })
  @IsString()
  @IsOptional()
  userId?: string;
}

export class SmartSubmitDto {
  @ApiProperty({ example: 'ami taka disi 2000\nalu 2kg 200\ndal 1kg 100\nchaul 10kg 5k' })
  @IsString()
  @IsNotEmpty()
  rawText: string;

  @ApiProperty({ example: 2000 })
  @IsNumber()
  @IsOptional()
  depositAmount?: number;

  @ApiProperty({ type: [SmartItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SmartItemDto)
  items: SmartItemDto[];

  @ApiProperty({ type: [MemberDepositDto], required: false })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MemberDepositDto)
  memberDeposits?: MemberDepositDto[];
}
