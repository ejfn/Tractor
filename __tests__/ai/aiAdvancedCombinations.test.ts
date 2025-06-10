import {
  analyzeHandCombinations,
  createCombinationStrategy,
  performAdvancedCombinationAnalysis,
  selectOptimalCombination,
} from '../../src/ai/analysis/advancedCombinations';
import {
  Card,
  CombinationContext,
  CombinationPotential,
  ComboType,
  GameContext,
  GamePhase,
  GameState,
  PlayStyle,
  PlayerId,
  PlayerName,
  PointPressure,
  Rank,
  Suit,
  TeamId,
  TrickPosition,
  TrumpInfo
} from "../../src/types";


// Test utilities - using Card class directly

const createTestTrumpInfo = (trumpRank: Rank = Rank.Two, trumpSuit?: Suit): TrumpInfo => ({
  trumpRank,
  trumpSuit,
});

const createTestGameContext = (overrides: Partial<GameContext> = {}): GameContext => ({
  isAttackingTeam: true,
  currentPoints: 40,
  pointsNeeded: 80,
  cardsRemaining: 12,
  trickPosition: TrickPosition.First,
  pointPressure: PointPressure.MEDIUM,
  playStyle: PlayStyle.Balanced,
  ...overrides,
});

const createTestGameState = (overrides: Partial<GameState> = {}): GameState => ({
  players: [
    {
      id: PlayerId.Human,
      name: PlayerName.Human,
      isHuman: true,
      hand: [],
      team: TeamId.A,
    },
    {
      id: PlayerId.Bot1,
      name: PlayerName.Bot1,
      isHuman: false,
      hand: [],
      team: TeamId.B,
    },
    {
      id: PlayerId.Bot2,
      name: PlayerName.Bot2,
      isHuman: false,
      hand: [],
      team: TeamId.A,
    },
    {
      id: PlayerId.Bot3,
      name: PlayerName.Bot3,
      isHuman: false,
      hand: [],
      team: TeamId.B,
    },
  ],
  teams: [
    { id: TeamId.A, currentRank: Rank.Two, points: 0, isDefending: false },
    { id: TeamId.B, currentRank: Rank.Two, points: 0, isDefending: true },
  ],
  deck: [],
  kittyCards: [],
  currentTrick: null,
  trumpInfo: createTestTrumpInfo(),
  tricks: [],
  roundNumber: 1,
  currentPlayerIndex: 0,
  roundStartingPlayerIndex: 0,
  gamePhase: GamePhase.Playing,
  ...overrides,
});

describe('Phase 4: Advanced Combination Logic', () => {
  describe('analyzeHandCombinations', () => {
    it('should analyze a hand with dominant tractor potential', () => {
      const cards = [
        ...Card.createPair(Suit.Hearts, Rank.Two),
        ...Card.createPair(Suit.Hearts, Rank.Three),
        ...Card.createPair(Suit.Hearts, Rank.Four),
      ];
      
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Hearts);
      const gameState = createTestGameState();
      const context = createTestGameContext();
      
      const profile = analyzeHandCombinations(cards, trumpInfo, gameState, context);
      
      expect(profile.totalCombinations).toBeGreaterThan(0);
      expect(profile.tractorPotential).toBe(CombinationPotential.Strong);
      expect(profile.trumpCombinations).toBeGreaterThan(0);
      expect(profile.flexibilityScore).toBeGreaterThan(0.5);
      expect(profile.dominanceLevel).toBeGreaterThan(0.7);
    });

    it('should analyze a hand with weak combination potential', () => {
      const cards = [
        Card.createCard(Suit.Spades, Rank.Five, 0),
        Card.createCard(Suit.Clubs, Rank.Seven, 0),
        Card.createCard(Suit.Diamonds, Rank.Nine, 0),
        Card.createCard(Suit.Hearts, Rank.Jack, 0),
      ];
      
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Hearts);
      const gameState = createTestGameState();
      const context = createTestGameContext();
      
      const profile = analyzeHandCombinations(cards, trumpInfo, gameState, context);
      
      expect(profile.tractorPotential).toBe(CombinationPotential.None);
      expect(profile.pairPotential).toBe(CombinationPotential.None);
      expect(profile.flexibilityScore).toBeLessThan(0.7);
      expect(profile.dominanceLevel).toBeLessThan(0.5);
    });

    it('should count point combinations correctly', () => {
      const cards = [
        ...Card.createPair(Suit.Hearts, Rank.Five),
        Card.createCard(Suit.Spades, Rank.Ten, 0),
        Card.createCard(Suit.Spades, Rank.King, 0),
      ];
      
      const trumpInfo = createTestTrumpInfo();
      const gameState = createTestGameState();
      const context = createTestGameContext();
      
      const profile = analyzeHandCombinations(cards, trumpInfo, gameState, context);
      
      expect(profile.pointCombinations).toBeGreaterThan(0);
    });
  });

  describe('performAdvancedCombinationAnalysis', () => {
    it('should analyze a trump tractor as high effectiveness', () => {
      const cards = [
        ...Card.createPair(Suit.Hearts, Rank.Two),
        ...Card.createPair(Suit.Hearts, Rank.Three),
      ];
      
      const combo = { type: ComboType.Tractor, cards, value: 100 };
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Hearts);
      const gameState = createTestGameState();
      const context = createTestGameContext();
      
      const analysis = performAdvancedCombinationAnalysis(combo, trumpInfo, gameState, context);
      
      expect(analysis.effectiveness).toBeGreaterThan(0.8);
      expect(analysis.pattern.type).toBe(ComboType.Tractor);
      expect(analysis.timing).toBe('delayed');
      expect(analysis.reward).toBeGreaterThan(0.7);
    });

    it('should analyze a weak single as low effectiveness', () => {
      const cards = [Card.createCard(Suit.Clubs, Rank.Seven, 0)];
      const combo = { type: ComboType.Single, cards, value: 10 };
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Hearts);
      const gameState = createTestGameState();
      const context = createTestGameContext();
      
      const analysis = performAdvancedCombinationAnalysis(combo, trumpInfo, gameState, context);
      
      expect(analysis.effectiveness).toBeLessThan(0.7);
      expect(analysis.pattern.type).toBe(ComboType.Single);
      expect(analysis.risk).toBeLessThan(0.8);
    });

    it('should adjust timing based on game context', () => {
      const cards = [Card.createCard(Suit.Hearts, Rank.Ace, 0)];
      const combo = { type: ComboType.Single, cards, value: 50 };
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Hearts);
      const gameState = createTestGameState();
      
      // Test endgame timing
      const endgameContext = createTestGameContext({ cardsRemaining: 3 });
      const endgameAnalysis = performAdvancedCombinationAnalysis(combo, trumpInfo, gameState, endgameContext);
      expect(endgameAnalysis.timing).toBe('delayed');
      
      // Test immediate timing under pressure
      const pressureContext = createTestGameContext({ pointPressure: PointPressure.HIGH });
      const pressureAnalysis = performAdvancedCombinationAnalysis(combo, trumpInfo, gameState, pressureContext);
      expect(pressureAnalysis.timing).toBe('immediate');
    });
  });

  describe('createCombinationStrategy', () => {
    it('should create leading strategy with dominant hand', () => {
      const context = createTestGameContext({ trickPosition: TrickPosition.First });
      const handProfile = {
        totalCombinations: 8,
        tractorPotential: CombinationPotential.Dominant,
        pairPotential: CombinationPotential.Strong,
        trumpCombinations: 3,
        pointCombinations: 2,
        flexibilityScore: 0.8,
        dominanceLevel: 0.9,
      };
      
      const strategy = createCombinationStrategy(context, handProfile);
      
      expect(strategy.context).toBe(CombinationContext.Leading);
      expect(strategy.preferredPatterns.length).toBeGreaterThan(0);
      expect(strategy.adaptiveThreshold).toBeLessThan(0.6);
    });

    it('should create defensive strategy for defending team', () => {
      const context = createTestGameContext({ 
        isAttackingTeam: false,
        trickPosition: TrickPosition.Third 
      });
      const handProfile = {
        totalCombinations: 4,
        tractorPotential: CombinationPotential.Weak,
        pairPotential: CombinationPotential.Weak,
        trumpCombinations: 1,
        pointCombinations: 1,
        flexibilityScore: 0.4,
        dominanceLevel: 0.3,
      };
      
      const strategy = createCombinationStrategy(context, handProfile);
      
      expect(strategy.context).toBe(CombinationContext.Defending);
      expect(strategy.preferredPatterns.some(p => p.partnerSupport > 0.5)).toBe(true);
    });

    it('should adjust for high pressure situations', () => {
      const context = createTestGameContext({ pointPressure: PointPressure.HIGH });
      const handProfile = {
        totalCombinations: 5,
        tractorPotential: CombinationPotential.Strong,
        pairPotential: CombinationPotential.Strong,
        trumpCombinations: 2,
        pointCombinations: 1,
        flexibilityScore: 0.6,
        dominanceLevel: 0.5,
      };
      
      const strategy = createCombinationStrategy(context, handProfile);
      
      expect(strategy.adaptiveThreshold).toBeLessThan(0.5);
    });
  });

  describe('selectOptimalCombination', () => {
    it('should select optimal combination from available options', () => {
      const cards1 = [Card.createCard(Suit.Hearts, Rank.Ace, 0)];
      const cards2 = Card.createPair(Suit.Hearts, Rank.Two);
      const cards3 = [Card.createCard(Suit.Clubs, Rank.Seven, 0)];
      
      const combos = [
        { type: ComboType.Single, cards: cards1, value: 50 },
        { type: ComboType.Pair, cards: cards2, value: 80 },
        { type: ComboType.Single, cards: cards3, value: 10 },
      ];
      
      const handProfile = {
        totalCombinations: 3,
        tractorPotential: CombinationPotential.Strong,
        pairPotential: CombinationPotential.Strong,
        trumpCombinations: 2,
        pointCombinations: 0,
        flexibilityScore: 0.7,
        dominanceLevel: 0.6,
      };
      
      const context = createTestGameContext();
      const strategy = createCombinationStrategy(context, handProfile);
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Hearts);
      const gameState = createTestGameState();
      
      const selected = selectOptimalCombination(combos, strategy, trumpInfo, gameState, context);
      
      expect(selected).toBeTruthy();
      expect(selected!.cards.length).toBeGreaterThan(0);
    });

    it('should return null for empty combo list', () => {
      const handProfile = {
        totalCombinations: 0,
        tractorPotential: CombinationPotential.None,
        pairPotential: CombinationPotential.None,
        trumpCombinations: 0,
        pointCombinations: 0,
        flexibilityScore: 0,
        dominanceLevel: 0,
      };
      
      const context = createTestGameContext();
      const strategy = createCombinationStrategy(context, handProfile);
      const trumpInfo = createTestTrumpInfo();
      const gameState = createTestGameState();
      
      const selected = selectOptimalCombination([], strategy, trumpInfo, gameState, context);
      
      expect(selected).toBeNull();
    });

    it('should prefer trump combinations in aggressive contexts', () => {
      const trumpCards = Card.createPair(Suit.Hearts, Rank.Two);
      const regularCards = Card.createPair(Suit.Spades, Rank.King);
      
      const combos = [
        { type: ComboType.Pair, cards: trumpCards, value: 80 },
        { type: ComboType.Pair, cards: regularCards, value: 70 },
      ];
      
      const handProfile = {
        totalCombinations: 2,
        tractorPotential: CombinationPotential.Strong,
        pairPotential: CombinationPotential.Strong,
        trumpCombinations: 1,
        pointCombinations: 1,
        flexibilityScore: 0.6,
        dominanceLevel: 0.7,
      };
      
      const context = createTestGameContext({ playStyle: PlayStyle.Aggressive });
      const strategy = createCombinationStrategy(context, handProfile);
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Hearts);
      const gameState = createTestGameState();
      
      const selected = selectOptimalCombination(combos, strategy, trumpInfo, gameState, context);
      
      expect(selected).toBeTruthy();
      // Should prefer trump pair due to aggressive context
      expect(selected!.cards).toEqual(trumpCards);
    });
  });

  describe('Integration with Memory System', () => {
    it('should integrate memory context in combination selection', () => {
      const cards = [Card.createCard(Suit.Hearts, Rank.Ace, 0)];
      const combo = { type: ComboType.Single, cards, value: 50 };
      
      const memoryContext = {
        cardsRemaining: 10,
        knownCards: 8,
        uncertaintyLevel: 0.2, // Low uncertainty
        trumpExhaustion: 0.6,
        opponentHandStrength: { 'bot1': 0.7, 'bot2': 0.4, 'bot3': 0.5 },
      };
      
      const memoryStrategy = {
        shouldPlayTrump: true,
        riskLevel: 0.3,
        expectedOpponentStrength: 0.6,
        suitExhaustionAdvantage: true,
        endgameOptimal: false,
      };
      
      const context = createTestGameContext({ 
        memoryContext,
        memoryStrategy,
      });
      
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Hearts);
      const gameState = createTestGameState();
      
      const analysis = performAdvancedCombinationAnalysis(combo, trumpInfo, gameState, context);
      
      // Memory context should influence the analysis
      expect(analysis.effectiveness).toBeGreaterThan(0.5);
      expect(analysis.timing).toBe('delayed'); // Default timing without high pressure
    });

    it('should handle high uncertainty memory contexts', () => {
      const cards = [Card.createCard(Suit.Hearts, Rank.King, 0)];
      const combo = { type: ComboType.Single, cards, value: 40 };
      
      const memoryContext = {
        cardsRemaining: 15,
        knownCards: 3,
        uncertaintyLevel: 0.8, // High uncertainty
        trumpExhaustion: 0.3,
        opponentHandStrength: { 'bot1': 0.5, 'bot2': 0.5, 'bot3': 0.5 },
      };
      
      const context = createTestGameContext({ 
        memoryContext,
        playStyle: PlayStyle.Conservative,
      });
      
      const trumpInfo = createTestTrumpInfo();
      const gameState = createTestGameState();
      
      const analysis = performAdvancedCombinationAnalysis(combo, trumpInfo, gameState, context);
      
      // High uncertainty should lead to more conservative analysis
      expect(analysis.risk).toBeLessThan(0.7);
      expect(analysis.timing).toBe('delayed');
    });
  });

  describe('Position-Specific Logic', () => {
    it('should adapt strategy for first position (leading)', () => {
      const context = createTestGameContext({ trickPosition: TrickPosition.First });
      const trumpInfo = createTestTrumpInfo();
      const gameState = createTestGameState();
      
      const cards = [Card.createCard(Suit.Hearts, Rank.Ace, 0)];
      const combo = { type: ComboType.Single, cards, value: 50 };
      
      const analysis = performAdvancedCombinationAnalysis(combo, trumpInfo, gameState, context);
      
      // Leading position should emphasize opponent disruption
      expect(analysis.pattern.opponentDisruption).toBeGreaterThanOrEqual(0.3);
    });

    it('should adapt strategy for fourth position (last)', () => {
      const context = createTestGameContext({ trickPosition: TrickPosition.Fourth });
      const trumpInfo = createTestTrumpInfo();
      const gameState = createTestGameState();
      
      const cards = [Card.createCard(Suit.Hearts, Rank.Ace, 0)];
      const combo = { type: ComboType.Single, cards, value: 50 };
      
      const analysis = performAdvancedCombinationAnalysis(combo, trumpInfo, gameState, context);
      
      // Last position allows for optimal play selection
      expect(analysis.effectiveness).toBeGreaterThan(0.4);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty hand gracefully', () => {
      const cards: Card[] = [];
      const trumpInfo = createTestTrumpInfo();
      const gameState = createTestGameState();
      const context = createTestGameContext();
      
      const profile = analyzeHandCombinations(cards, trumpInfo, gameState, context);
      
      expect(profile.totalCombinations).toBe(0);
      expect(profile.tractorPotential).toBe(CombinationPotential.None);
      expect(profile.flexibilityScore).toBe(0);
      expect(profile.dominanceLevel).toBe(0);
    });

    it('should handle missing memory context gracefully', () => {
      const cards = [Card.createCard(Suit.Hearts, Rank.Ace, 0)];
      const combo = { type: ComboType.Single, cards, value: 50 };
      
      const context = createTestGameContext(); // No memory context
      const trumpInfo = createTestTrumpInfo();
      const gameState = createTestGameState();
      
      const analysis = performAdvancedCombinationAnalysis(combo, trumpInfo, gameState, context);
      
      expect(analysis).toBeTruthy();
      expect(analysis.effectiveness).toBeGreaterThan(0);
    });

    it('should handle invalid combinations gracefully', () => {
      const cards = [Card.createCard(Suit.Hearts, Rank.Ace, 0)];
      const combo = { type: ComboType.Tractor, cards, value: 10 }; // Invalid: single card as tractor
      
      const trumpInfo = createTestTrumpInfo();
      const gameState = createTestGameState();
      const context = createTestGameContext();
      
      // Should not throw error, but provide meaningful analysis
      const analysis = performAdvancedCombinationAnalysis(combo, trumpInfo, gameState, context);
      expect(analysis).toBeTruthy();
    });
  });
});