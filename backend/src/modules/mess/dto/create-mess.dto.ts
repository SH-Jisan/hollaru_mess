import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMessDto{
    @ApiProperty({ example: 'Dream Heaven Mess'})
    @IsString()
    @IsNotEmpty()
    name: string;
}