import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class TransferManagerDto {
  @ApiProperty({ example: 'user_id_of_new_manager', description: 'User ID of the member to be promoted to Manager' })
  @IsNotEmpty()
  @IsString()
  newManagerId: string;
}
