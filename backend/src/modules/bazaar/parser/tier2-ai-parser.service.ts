import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FuzzyNormalizer } from './fuzzy-normalizer';
import { IBazaarParser, ParsedBazaarItem, ParsedBazaarResult } from './parser.interface';

@Injectable()
export class Tier2AiParserService implements IBazaarParser {
  private readonly logger = new Logger(Tier2AiParserService.name);

  constructor(private configService: ConfigService) {}

  async parse(rawText: string): Promise<ParsedBazaarResult> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');

    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY not configured. Skipping Tier 2 AI parse.');
      return {
        depositAmount: 0,
        items: [],
        totalCost: 0,
        rawText,
        engineUsed: 'TIER2_AI',
        confidence: 0,
        warnings: ['GEMINI_API_KEY is not configured'],
      };
    }

    const systemPrompt = `You are an expert Bengali and Banglish dining/mess bazaar notepad parser.
Analyze the user's raw bazaar and deposit notes and output ONLY a valid JSON object matching this schema:
{
  "depositAmount": number, // any money deposited/handed over, or 0 if none
  "items": [
    {
      "name": string, // item name in English or standard Bengali (e.g. "Alu", "Murgi")
      "quantity": number, // numerical quantity (e.g. 2, 1.5, default 1)
      "unit": string, // unit such as "kg", "gm", "ltr", "piece", "hali", "item"
      "cost": number // total cost for this item in Taka (convert 'k' like 5k to 5000)
    }
  ],
  "warnings": string[] // any ambiguous or unparsed notes
}
Do not include markdown codeblocks (\`\`\`json). Output pure JSON only.`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemPrompt}\n\nUser Notes:\n${rawText}` }],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1,
            },
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Gemini API responded with status ${response.status}`);
      }

      const data = await response.json();
      const contentText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!contentText) throw new Error('Empty response from Gemini');

      const parsedJson = JSON.parse(contentText);

      const items: ParsedBazaarItem[] = (parsedJson.items || []).map((item: any) => {
        const normalized = FuzzyNormalizer.normalize(item.name || 'Unknown');
        return {
          name: normalized.canonicalName,
          originalName: item.name || 'Unknown',
          quantity: typeof item.quantity === 'number' ? item.quantity : 1,
          unit: item.unit || normalized.defaultUnit,
          cost: typeof item.cost === 'number' ? item.cost : 0,
          confidence: 0.9,
        };
      });

      const totalCost = items.reduce((sum, item) => sum + item.cost, 0);

      return {
        depositAmount: parsedJson.depositAmount || 0,
        items,
        totalCost,
        rawText,
        engineUsed: 'TIER2_AI',
        confidence: 0.92,
        warnings: parsedJson.warnings || [],
      };
    } catch (err: any) {
      this.logger.error(`Tier 2 AI Parser Error: ${err.message}`);
      return {
        depositAmount: 0,
        items: [],
        totalCost: 0,
        rawText,
        engineUsed: 'TIER2_AI',
        confidence: 0,
        warnings: [`AI Parsing failed: ${err.message}`],
      };
    }
  }
}
