import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import {ContextValidatorService} from '../services/context-validator.service';

@Global()
@Module({
  providers: [PrismaService, ContextValidatorService],
  exports: [PrismaService, ContextValidatorService],
})
export class PrismaModule {}
