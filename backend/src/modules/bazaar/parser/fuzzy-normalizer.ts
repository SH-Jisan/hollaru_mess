export interface ItemDefinition {
  canonicalName: string; // যেমন: 'Alu (আলু)'
  defaultUnit: string; // যেমন: 'kg'
  aliases: string[]; // যেসব নামে ইউজার লিখতে পারে
}

export const COMMON_MESS_ITEMS: ItemDefinition[] = [
  {
    canonicalName: 'Alu (আলু)',
    defaultUnit: 'kg',
    aliases: ['alu', 'aloo', 'allu', 'আলু'],
  },
  {
    canonicalName: 'Dal (ডাল)',
    defaultUnit: 'kg',
    aliases: ['dal', 'daal', 'dhal', 'moshur', 'ডাল', 'মসুর'],
  },
  {
    canonicalName: 'Chaul (চাল)',
    defaultUnit: 'kg',
    aliases: ['chaul', 'chawl', 'chal', 'rice', 'চাল', 'চাউল'],
  },
  {
    canonicalName: 'Tel (সয়াবিন তেল)',
    defaultUnit: 'ltr',
    aliases: ['tel', 'tail', 'oil', 'soyabean', 'teyl', 'তেল'],
  },
  {
    canonicalName: 'Peyaj (পেঁয়াজ)',
    defaultUnit: 'kg',
    aliases: ['peyaj', 'piaj', 'payaj', 'onion', 'পেঁয়াজ', 'পিয়াজ'],
  },
  {
    canonicalName: 'Roshun (রসুন)',
    defaultUnit: 'kg',
    aliases: ['roshun', 'roshon', 'roson', 'garlic', 'রসুন'],
  },
  {
    canonicalName: 'Ada (আদা)',
    defaultUnit: 'gm',
    aliases: ['ada', 'ginger', 'আদা'],
  },
  {
    canonicalName: 'Morich (মরিচ)',
    defaultUnit: 'gm',
    aliases: ['morich', 'moris', 'chilli', 'কাঁচামরিচ', 'মরিচ'],
  },
  {
    canonicalName: 'Dim (ডিম)',
    defaultUnit: 'piece',
    aliases: ['dim', 'deem', 'egg', 'hali', 'ডিম'],
  },
  {
    canonicalName: 'Murgi (মুরগি)',
    defaultUnit: 'kg',
    aliases: ['murgi', 'chicken', 'murgir mangsho', 'মুরগি', 'ব্রয়লার'],
  },
  {
    canonicalName: 'Goru (গরুর মাংস)',
    defaultUnit: 'kg',
    aliases: ['goru', 'beef', 'gorur mangsho', 'গরু'],
  },
  {
    canonicalName: 'Mach (মাছ)',
    defaultUnit: 'kg',
    aliases: ['mach', 'maas', 'fish', 'মাছ', 'রুই', 'তেলাপিয়া', 'পাঙ্গাস'],
  },
  {
    canonicalName: 'Lobon (লবণ)',
    defaultUnit: 'kg',
    aliases: ['lobon', 'nobon', 'salt', 'লবণ', 'নুন'],
  },
  {
    canonicalName: 'Holud (হলুদ গুঁড়া)',
    defaultUnit: 'gm',
    aliases: ['holud', 'haldi', 'turmeric', 'হলুদ'],
  },
  {
    canonicalName: 'Jira (জিরা)',
    defaultUnit: 'gm',
    aliases: ['jira', 'jeera', 'cumin', 'জিরা'],
  },
  {
    canonicalName: 'Sobji (সবজি)',
    defaultUnit: 'kg',
    aliases: ['sobji', 'shobji', 'torkari', 'vegetable', 'সবজি'],
  },
];

export class FuzzyNormalizer {
  /**
   * Levenshtein Distance Algorithm:
   * দুটি শব্দের মধ্যে এডিটিং দূরত্বের গাণিতিক পরিমাপ
   */
  public static levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];
    const aLen = a.length;
    const bLen = b.length;

    for (let i = 0; i <= bLen; i++) matrix[i] = [i];
    for (let j = 0; j <= aLen; j++) matrix[0][j] = j;

    for (let i = 1; i <= bLen; i++) {
      for (let j = 1; j <= aLen; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1, // deletion
          );
        }
      }
    }
    return matrix[bLen][aLen];
  }

  /**
   * টাইপো সংশোধন ও স্ট্যান্ডার্ড নাম বের করা:
   * ১. প্রথমে dynamicItems (শেখা প্যাটার্ন) চেক করে
   * ২. তারপর COMMON_MESS_ITEMS চেক করে
   */
  public static normalize(
    rawWord: string,
    dynamicItems: ItemDefinition[] = [],
  ): { canonicalName: string; defaultUnit: string; confidence: number } {
    const cleanWord = (rawWord || '').trim().toLowerCase();
    if (!cleanWord) {
      return { canonicalName: 'Unknown', defaultUnit: 'item', confidence: 0 };
    }

    // ডায়নামিক শেখা প্যাটার্নকে অগ্রাধিকার দেওয়া হয়
    const allItems = [...dynamicItems, ...COMMON_MESS_ITEMS];

    let bestMatch: ItemDefinition | null = null;
    let minDistance = Infinity;

    for (const item of allItems) {
      for (const alias of item.aliases) {
        // ১. হুবহু মিলে গেলে (Exact Match) -> 100% Confidence
        if (cleanWord === alias.toLowerCase()) {
          return {
            canonicalName: item.canonicalName,
            defaultUnit: item.defaultUnit,
            confidence: 1.0,
          };
        }

        // ২. Levenshtein Distance পরিমাপ
        const distance = this.levenshteinDistance(
          cleanWord,
          alias.toLowerCase(),
        );
        if (distance < minDistance) {
          minDistance = distance;
          bestMatch = item;
        }
      }
    }

    // ৩. যদি পার্থক্য সর্বোচ্চ ১ বা ২ হয় (শব্দের দৈর্ঘ্যের উপর নির্ভর করে)
    const threshold = cleanWord.length <= 4 ? 1 : 2;
    if (bestMatch && minDistance <= threshold) {
      const confidence = Math.max(0.7, 1 - minDistance * 0.15);
      return {
        canonicalName: bestMatch.canonicalName,
        defaultUnit: bestMatch.defaultUnit,
        confidence,
      };
    }

    // ৪. ডিকশনারিতে না পাওয়া নতুন কোনো আইটেম হলে মূল নামটি ক্যাপিটালাইজ করবে
    const capitalized = cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1);
    return {
      canonicalName: capitalized,
      defaultUnit: 'item',
      confidence: 0.6,
    };
  }
}
