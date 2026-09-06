import { Test, TestingModule } from '@nestjs/testing';
import { SmartBazaarParserService } from './smart-bazaar-parser.service';
import { Tier2AiParserService } from './tier2-ai-parser.service';
import { PatternMemoryService } from './pattern-memory.service';
import { ParsedBazaarResult } from './parser.interface';

describe('SmartBazaarParserService (Self-Learning Dual Engine)', () => {
  let service: SmartBazaarParserService;
  let mockAiParser: { parse: jest.Mock };
  let mockPatternMemory: {
    getLearnedItems: jest.Mock;
    learnPattern: jest.Mock;
  };

  beforeEach(async () => {
    mockAiParser = {
      parse: jest.fn().mockResolvedValue({
        depositAmount: 0,
        items: [
          {
            name: 'Kacha Kola (কাঁচকলা)',
            originalName: 'kacha kola',
            quantity: 4,
            unit: 'piece',
            cost: 60,
            confidence: 0.95,
          },
        ],
        totalCost: 60,
        rawText: 'kacha kola 4ta 60',
        engineUsed: 'TIER2_AI',
        confidence: 0.95,
        warnings: [],
      }),
    };

    mockPatternMemory = {
      getLearnedItems: jest.fn().mockResolvedValue([]),
      learnPattern: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmartBazaarParserService,
        { provide: Tier2AiParserService, useValue: mockAiParser },
        { provide: PatternMemoryService, useValue: mockPatternMemory },
      ],
    }).compile();

    service = module.get<SmartBazaarParserService>(SmartBazaarParserService);
    jest.clearAllMocks();
  });

  it('should return Tier 1 local results immediately when confidence >= 90% (Zero AI call)', async () => {
    mockPatternMemory.getLearnedItems.mockResolvedValue([]);

    const result = await service.parse('alu 2kg 70\npeyaj 1kg 90', 'mess_1');

    expect(result.engineUsed).toBe('TIER1_REGEX');
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    expect(mockAiParser.parse).not.toHaveBeenCalled();
    expect(mockPatternMemory.learnPattern).not.toHaveBeenCalled();
  });

  it('should automatically invoke Tier 2 AI when confidence < 90% or unparsed lines exist', async () => {
    mockPatternMemory.getLearnedItems.mockResolvedValue([]);

    const result = await service.parse('kacha kola 4ta 60', 'mess_1');

    expect(mockAiParser.parse).toHaveBeenCalled();
    expect(result.engineUsed).toBe('TIER2_AI');
    expect(mockPatternMemory.learnPattern).toHaveBeenCalledWith(
      'kacha kola',
      'Kacha Kola (কাঁচকলা)',
      'piece',
      'mess_1',
      'AI_GEMINI',
    );
  });

  it('should bypass Tier 2 AI on repeat input after pattern has been learned', async () => {
    // সিমুলেশন: পূর্বে শেখা প্যাটার্ন এখন মেমোরিতে আছে
    mockPatternMemory.getLearnedItems.mockResolvedValue([
      {
        canonicalName: 'Kacha Kola (কাঁচকলা)',
        defaultUnit: 'piece',
        aliases: ['kacha kola'],
      },
    ]);

    const result = await service.parse('kacha kola 4ta 60', 'mess_1');

    expect(result.engineUsed).toBe('TIER1_REGEX');
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    expect(mockAiParser.parse).not.toHaveBeenCalled();
  });
});
