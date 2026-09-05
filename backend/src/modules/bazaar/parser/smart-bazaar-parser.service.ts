import { Injectable, Logger } from '@nestjs/common';
import { Tier1RegexParser } from './tier1-regex-parser';
import { Tier2AiParserService } from './tier2-ai-parser.service';
import { IBazaarParser, ParsedBazaarResult } from './parser.interface';

@Injectable()
export class SmartBazaarParserService implements IBazaarParser {
  private readonly logger = new Logger(SmartBazaarParserService.name);
  private tier1Parser = new Tier1RegexParser();

  constructor(private tier2AiParser: Tier2AiParserService) {}

  /**
   * Cascading Dual-Engine Parse:
   * ১. প্রথমে দ্রুত Tier 1 Regex দিয়ে চেষ্টা করবে (<1ms, ফ্রি)।
   * ২. যদি কনফিডেন্স স্কোর ৮০% এর কম হয় বা কোনো লাইন আনপার্সড থাকে, তবেই Tier 2 AI চালাবে।
   */
  async parse(rawText: string): Promise<ParsedBazaarResult> {
    const tier1Result = await this.tier1Parser.parse(rawText);

    // যদি কোনো আইটেম পাওয়া যায় এবং কোনো ওয়ার্নিং না থাকে, সরাসরি Tier 1 রেজাল্ট রিটার্ন হবে
    if (
      (tier1Result.items.length > 0 || tier1Result.depositAmount > 0) &&
      tier1Result.warnings.length === 0 &&
      tier1Result.confidence >= 0.8
    ) {
      this.logger.log(`Parsed successfully via Tier 1 Engine (Items: ${tier1Result.items.length})`);
      return tier1Result;
    }

    // যদি ওয়ার্নিং থাকে বা কনফিডেন্স কম থাকে, Tier 2 AI দিয়ে চেষ্টা করা হবে
    this.logger.log('Tier 1 parser encountered ambiguities. Falling back to Tier 2 AI Engine...');
    const tier2Result = await this.tier2AiParser.parse(rawText);

    // AI সফল হলে AI রেজাল্ট যাবে, অন্যথায় সেফটি হিসেবে Tier 1 রেজাল্টই ফেরত যাবে
    if (tier2Result.confidence > 0.5) {
      return tier2Result;
    }

    return tier1Result;
  }
}
