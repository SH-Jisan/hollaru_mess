import { Module } from '@nestjs/common';
import { BazaarController } from './bazaar.controller';
import { BazaarService } from './bazaar.service';
import { Tier2AiParserService } from './parser/tier2-ai-parser.service';
import { SmartBazaarParserService } from './parser/smart-bazaar-parser.service';

@Module({
  controllers: [BazaarController],
  providers: [
    BazaarService,
    Tier2AiParserService,
    SmartBazaarParserService,
  ],

  exports: [BazaarService, SmartBazaarParserService],
})
export class BazaarModule {}
