import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class JoinMessDto{
    @ApiProperty({ example: 'MESS-A1B2'})
    @IsString()
    @IsNotEmpty()
    code: string;
}
