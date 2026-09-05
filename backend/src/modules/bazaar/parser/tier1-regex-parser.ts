import { FuzzyNormalizer } from './fuzzy-normalizer';
import { IBazaarParser, ParsedBazaarItem, ParsedBazaarResult } from './parser.interface';

export class Tier1RegexParser implements IBazaarParser {
  /**
   * বাংলা সংখ্যাকে ইংরেজি সংখ্যায় রূপান্তর (১, ২, ৩ -> 1, 2, 3)
   */
  public static convertBengaliDigits(text: string): string {
    const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return text.replace(/[০-৯]/g, (char) => {
      const idx = bengaliDigits.indexOf(char);
      return idx !== -1 ? String(idx) : char;
    });
  }

  /**
   * '5k' বা '1.5k' কে সংখ্যায় রূপান্তর (5k -> 5000, 1.5k -> 1500)
   */
  public static parseNumberWithMultiplier(rawNumStr: string): number {
    const clean = (rawNumStr || "").replace(/,/g, "").trim().toLowerCase();
    if (clean.endsWith('k')) {
      const baseNum = parseFloat(clean.slice(0, -1));
      return isNaN(baseNum) ? 0 : Math.round(baseNum * 1000);
    }
    const val = parseFloat(clean);
    return isNaN(val) ? 0 : val;
  }

  /**
   * মূল পার্সিং মেথড
   */
  async parse(rawText: string): Promise<ParsedBazaarResult> {
    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

    let depositAmount = 0;
    const items: ParsedBazaarItem[] = [];
    const warnings: string[] = [];

    // ডিপোজিট ডিটেকশনের জন্য Regex (ইংরেজি, বাংলিশ ও বাংলা)
    // উদাহরণ: "ami taka disi 2000", "deposit 1.5k", "taka joma 5000", "টাকা দিছি ২০০০"
    const depositRegex = /(?:ami\s+)?(?:taka\s+disi|taka\s+joma|deposit|joma|দিছি|টাকা|জমা)\s*[:=-]?\s*(\d+(?:,\d+)*(?:\.\d+)?k?)\s*(?:tk|taka|টাকা|\/-)?/i;

    // আইটেম পার্সিং Regex:
    // প্যাটার্ন ১: <নাম> <পরিমাণ><ইউনিট> <দাম> -> যেমন: "alu 2kg 200", "murgi 1.5 kg 350", "dim 1 hali 48"
    const fullItemRegex = /^([a-zA-Z\u0980-\u09FF\s]+?)\s+(\d+(?:\.\d+)?)\s*(kg|gm|gram|ltr|liter|piece|pc|hali|haly|টি|কেজি|গ্রাম|লিটার|হালি)?\s+(\d+(?:,\d+)*(?:\.\d+)?k?)\s*(?:tk|taka|টাকা|\/-)?$/i;

    // প্যাটার্ন ২: <নাম> <দাম> -> যেমন: "dhonia pata 20", "masala 50k", "লবণ 40"
    const simpleItemRegex = /^([a-zA-Z\u0980-\u09FF\s]+?)\s+(\d+(?:,\d+)*(?:\.\d+)?k?)\s*(?:tk|taka|টাকা|\/-)?$/i;

    for (const rawLine of lines) {
      const normalizedLine = Tier1RegexParser.convertBengaliDigits(rawLine);

      // ১. চেক করুন এটি ডিপোজিট লাইন কি না
      const depositMatch = normalizedLine.match(depositRegex);
      if (depositMatch) {
        depositAmount += Tier1RegexParser.parseNumberWithMultiplier(depositMatch[1]);
        continue;
      }

      // ২. চেক করুন এটি প্যাটার্ন ১ (ফুল আইটেম) কি না
      const fullMatch = normalizedLine.match(fullItemRegex);
      if (fullMatch) {
        const rawItemName = fullMatch[1].trim();
        const quantity = parseFloat(fullMatch[2]);
        const parsedUnit = fullMatch[3] ? fullMatch[3].toLowerCase() : null;
        const cost = Tier1RegexParser.parseNumberWithMultiplier(fullMatch[4]);

        const normalized = FuzzyNormalizer.normalize(rawItemName);

        items.push({
          name: normalized.canonicalName,
          originalName: rawItemName,
          quantity: isNaN(quantity) ? 1 : quantity,
          unit: parsedUnit || normalized.defaultUnit,
          cost,
          confidence: normalized.confidence,
        });
        continue;
      }

      // ৩. চেক করুন এটি প্যাটার্ন ২ (শুধু নাম ও দাম) কি না
      const simpleMatch = normalizedLine.match(simpleItemRegex);
      if (simpleMatch) {
        const rawItemName = simpleMatch[1].trim();
        const cost = Tier1RegexParser.parseNumberWithMultiplier(simpleMatch[2]);

        const normalized = FuzzyNormalizer.normalize(rawItemName);

        items.push({
          name: normalized.canonicalName,
          originalName: rawItemName,
          quantity: 1,
          unit: normalized.defaultUnit,
          cost,
          confidence: normalized.confidence * 0.9, // যেহেতু পরিমাণ মেনশন ছিল না
        });
        continue;
      }

      // কোনো প্যাটার্নে না মিললে ওয়ার্নিং যোগ হবে (যাতে AI ইঞ্জিন এটি হ্যান্ডেল করতে পারে)
      warnings.push(`Could not parse line: "${rawLine}"`);
    }

    const totalCost = items.reduce((sum, item) => sum + item.cost, 0);

    // পার্সিং কনফিডেন্স স্কোর হিসাব করা
    const overallConfidence =
      items.length > 0 && warnings.length === 0
        ? 0.95
        : items.length > 0 && warnings.length <= 1
          ? 0.8
          : 0.5;

    return {
      depositAmount,
      items,
      totalCost,
      rawText,
      engineUsed: 'TIER1_REGEX',
      confidence: overallConfidence,
      warnings,
    };
  }
}
