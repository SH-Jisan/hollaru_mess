export interface ParsedBazaarItem {
  name: string;             // স্ট্যান্ডার্ড নাম, যেমন: 'Alu (আলু)'
  originalName: string;     // ইউজার নোটপ্যাডে যা লিখেছিল, যেমন: 'allu'
  quantity: number;         // পরিমাণ, যেমন: 2
  unit: string;             // একক, যেমন: 'kg', 'gm', 'ltr', 'piece', 'hali'
  cost: number;             // খরচ, যেমন: 200
  confidence: number;       // পার্সিং আত্মবিশ্বাস (0.0 থেকে 1.0)
}

export interface ParsedBazaarResult {
  depositAmount: number;            // যদি নোটপ্যাডে জমার কথা থাকে (যেমন: ami taka disi 2000)
  items: ParsedBazaarItem[];        // পার্স করা সব বাজার আইটেমের লিস্ট
  totalCost: number;                // সব আইটেমের মোট বাজার খরচ
  rawText: string;                  // ইউজারের মূল নোটপ্যাড টেক্সট
  engineUsed: 'TIER1_REGEX' | 'TIER2_AI' | 'HYBRID';
  confidence: number;               // সামগ্রিক স্কোর
  warnings: string[];               // কোনো সন্দেহজনক লাইন থাকলে তার সতর্কতা
}

export interface IBazaarParser {
  parse(rawText: string): Promise<ParsedBazaarResult>;
}
