import { IsNotEmpty, IsNumber, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDepositDto {
  @ApiProperty({ example: 'user-uuid-here' })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: 2000, description: 'Deposit amount in Taka' })
  @IsNumber()
  @Min(0)
  amount: number;
}
