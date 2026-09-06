import { Injectable, Logger } from '@nestjs/common';
import { Tier1RegexParser } from './tier1-regex-parser';
import { Tier2AiParserService } from './tier2-ai-parser.service';
import { PatternMemoryService } from './pattern-memory.service';
import { IBazaarParser, ParsedBazaarResult } from './parser.interface';

@Injectable()
export class SmartBazaarParserService implements IBazaarParser {
  private readonly logger = new Logger(SmartBazaarParserService.name);
  private tier1Parser = new Tier1RegexParser();

  constructor(
    private readonly tier2AiParser: Tier2AiParserService,
    private readonly patternMemory: PatternMemoryService,
  ) {}

  /**
   * সেলফ-লার্নিং ডুয়াল ইঞ্জিন পার্সার:
   * ১. প্রথমে মেমোরি (Redis) থেকে মেসের শেখা ডিকশনারি এনে Tier 1 লোকাল ইঞ্জিন দিয়ে পার্স করবে (<1ms, ০ খরচ)।
   * ২. যদি কনফিডেন্স >= ৯০% হয় এবং কোনো আনপার্সড লাইন না থাকে, তবে এআই কল সম্পূর্ণ বাইপাস হবে।
   * ৩. কনফিডেন্স < ৯০% হলে Tier 2 AI চালিত হবে এবং প্রাপ্ত নতুন শব্দগুলো মেমোরিতে সেভ হবে।
   */
  async parse(rawText: string, messId?: string, managerName?: string): Promise<ParsedBazaarResult> {
    // ১. রেডিস / ডিবি থেকে ডায়নামিক শেখা শব্দগুলো আনা
    const dynamicItems = await this.patternMemory.getLearnedItems(messId);

    // ২. লোকাল Tier 1 ইঞ্জিন দিয়ে চেষ্টা করা
    const tier1Result = await this.tier1Parser.parse(rawText, dynamicItems);

    const unparsedWarnings = tier1Result.warnings.filter((w) =>
      w.startsWith('Could not parse line:'),
    );

    // ৩. কড়া ৯০% কনফিডেন্স রুল (Strict 90% Threshold):
    if (
      (tier1Result.items.length > 0 || tier1Result.depositAmount > 0) &&
      unparsedWarnings.length === 0 &&
      tier1Result.confidence >= 0.90
    ) {
      this.logger.log(
        `[SmartParser] Tier 1 Local Success (Confidence: ${Math.round(tier1Result.confidence * 100)}%, Items: ${tier1Result.items.length}) - 0 AI Cost`,
      );
      return tier1Result;
    }

    // ৪. কনফিডেন্স ৯০% এর কম হলে বা লাইন বুঝতে না পারলে Tier 2 AI (Gemini) কল করা
    this.logger.log(
      `[SmartParser] Tier 1 confidence (${Math.round(tier1Result.confidence * 100)}%) below 90% or unparsed lines. Invoking Tier 2 AI Engine...`,
    );
    const tier2Result = await this.tier2AiParser.parse(rawText, managerName);

    // ৫. সেলফ-লার্নিং লুপ: AI যা পার্স করেছে তা স্বয়ংক্রিয়ভাবে মেমোরিতে সংরক্ষণ করা
    if (tier2Result.confidence > 0.5 && tier2Result.items.length > 0) {
      for (const item of tier2Result.items) {
        if (item.originalName && item.name) {
          // ব্যাকগ্রাউন্ডে প্যাটার্ন সেভ হবে যাতে পরবর্তীতে এটি লোকাল ইঞ্জিনে ধরা পড়ে
          await this.patternMemory.learnPattern(
            item.originalName,
            item.name,
            item.unit,
            messId,
            'AI_GEMINI',
          );
        }
      }

      // লোকাল ইঞ্জিনের প্রাইস ওয়ার্নিংগুলো AI রেজাল্টেও জুড়ে দেওয়া
      const priceWarnings = tier1Result.warnings.filter((w) =>
        w.startsWith('⚠️ Price Warning:'),
      );
      if (priceWarnings.length > 0) {
        tier2Result.warnings = [...(tier2Result.warnings || []), ...priceWarnings];
      }

      return tier2Result;
    }

    return tier1Result;
  }
}
