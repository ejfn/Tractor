import {
  determinePlayStyle,
  analyzeCombo,
  analyzeTrick,
  getPositionStrategy,
} from '../../src/utils/aiGameContext';
import {
  GameState,
  PlayStyle,
  PointPressure,
  TrickPosition,
  ComboStrength,
  ComboType,
  Combo,
  Card,
  TrumpInfo,
  Rank,
  Suit,
  PlayerId,
  GamePhase,
} from '../../src/types/game';
import { initializeGame } from '../../src/utils/gameLogic';

describe('AI Game Context - Phase 2 Enhancements', () => {
  let gameState: GameState;
  let trumpInfo: TrumpInfo;

  beforeEach(() => {
    gameState = initializeGame();
    trumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Hearts,
      declared: true,
      declarerPlayerId: PlayerId.Human,
    };
  });

  describe('determinePlayStyle', () => {
    it('should return desperate for attacking team with high pressure', () => {
      const result = determinePlayStyle(true, PointPressure.HIGH, 5);
      expect(result).toBe(PlayStyle.Desperate);
    });

    it('should return aggressive for attacking team with medium pressure', () => {
      const result = determinePlayStyle(true, PointPressure.MEDIUM, 8);
      expect(result).toBe(PlayStyle.Aggressive);
    });

    it('should return balanced for attacking team with low pressure', () => {
      const result = determinePlayStyle(true, PointPressure.LOW, 10);
      expect(result).toBe(PlayStyle.Balanced);
    });

    it('should return desperate for defending team with high pressure', () => {
      const result = determinePlayStyle(false, PointPressure.HIGH, 5);
      expect(result).toBe(PlayStyle.Desperate);
    });

    it('should return conservative for defending team with low pressure', () => {
      const result = determinePlayStyle(false, PointPressure.LOW, 10);
      expect(result).toBe(PlayStyle.Conservative);
    });

    it('should adjust for endgame urgency', () => {
      const result = determinePlayStyle(false, PointPressure.MEDIUM, 2);
      expect(result).toBe(PlayStyle.Aggressive);
    });

    it('should handle desperate endgame for high pressure', () => {
      const result = determinePlayStyle(true, PointPressure.HIGH, 1);
      expect(result).toBe(PlayStyle.Desperate);
    });
  });

  describe('analyzeCombo', () => {
    const createTestCombo = (
      cards: Card[],
      type: ComboType,
      value: number,
    ): Combo => ({
      type,
      cards,
      value,
    });

    const createTestCard = (
      rank: Rank,
      suit: Suit,
      points: number = 0,
    ): Card => ({
      rank,
      suit,
      id: `${rank}_${suit}`,
      points,
    });

    it('should identify critical trump combo strength', () => {
      const cards = [createTestCard(Rank.Ace, Suit.Hearts)];
      const combo = createTestCombo(cards, ComboType.Single, 90);
      const context = {
        isAttackingTeam: true,
        currentPoints: 20,
        pointsNeeded: 80,
        cardsRemaining: 8,
        trickPosition: TrickPosition.First,
        pointPressure: PointPressure.MEDIUM,
        playStyle: PlayStyle.Balanced,
      };

      const result = analyzeCombo(combo, trumpInfo, context);

      expect(result.strength).toBe(ComboStrength.Critical);
      expect(result.isTrump).toBe(true);
      expect(result.disruptionPotential).toBeGreaterThanOrEqual(30);
    });

    it('should identify weak non-trump combo', () => {
      const cards = [createTestCard(Rank.Three, Suit.Spades)];
      const combo = createTestCombo(cards, ComboType.Single, 15);
      const context = {
        isAttackingTeam: false,
        currentPoints: 10,
        pointsNeeded: 80,
        cardsRemaining: 12,
        trickPosition: TrickPosition.Second,
        pointPressure: PointPressure.LOW,
        playStyle: PlayStyle.Conservative,
      };

      const result = analyzeCombo(combo, trumpInfo, context);

      expect(result.strength).toBe(ComboStrength.Weak);
      expect(result.isTrump).toBe(false);
      expect(result.hasPoints).toBe(false);
      expect(result.disruptionPotential).toBeLessThan(20);
    });

    it('should calculate point value correctly', () => {
      const cards = [createTestCard(Rank.King, Suit.Diamonds, 10)];
      const combo = createTestCombo(cards, ComboType.Single, 40);
      const context = {
        isAttackingTeam: true,
        currentPoints: 30,
        pointsNeeded: 80,
        cardsRemaining: 6,
        trickPosition: TrickPosition.Third,
        pointPressure: PointPressure.MEDIUM,
        playStyle: PlayStyle.Aggressive,
      };

      const result = analyzeCombo(combo, trumpInfo, context);

      expect(result.hasPoints).toBe(true);
      expect(result.pointValue).toBe(10);
      expect(result.conservationValue).toBeGreaterThan(combo.value);
    });

    it('should adjust conservation value for endgame', () => {
      const cards = [createTestCard(Rank.Queen, Suit.Clubs)];
      const combo = createTestCombo(cards, ComboType.Single, 50);
      const endgameContext = {
        isAttackingTeam: true,
        currentPoints: 70,
        pointsNeeded: 80,
        cardsRemaining: 3,
        trickPosition: TrickPosition.Fourth,
        pointPressure: PointPressure.HIGH,
        playStyle: PlayStyle.Desperate,
      };

      const result = analyzeCombo(combo, trumpInfo, endgameContext);

      expect(result.conservationValue).toBeGreaterThan(combo.value * 1.4); // Should be amplified
    });

    it('should handle tractor disruption potential', () => {
      const cards = [
        createTestCard(Rank.Jack, Suit.Hearts),
        createTestCard(Rank.Queen, Suit.Hearts),
      ];
      const combo = createTestCombo(cards, ComboType.Tractor, 70);
      const context = {
        isAttackingTeam: false,
        currentPoints: 40,
        pointsNeeded: 80,
        cardsRemaining: 8,
        trickPosition: TrickPosition.First,
        pointPressure: PointPressure.MEDIUM,
        playStyle: PlayStyle.Aggressive,
      };

      const result = analyzeCombo(combo, trumpInfo, context);

      expect(result.disruptionPotential).toBeGreaterThanOrEqual(50); // Trump + Tractor bonuses
    });
  });

  describe('analyzeTrick', () => {
    it('should analyze empty trick correctly', () => {
      const result = analyzeTrick(gameState, PlayerId.Bot1, []);

      expect(result.currentWinner).toBeNull();
      expect(result.winningCombo).toBeNull();
      expect(result.totalPoints).toBe(0);
      expect(result.canWin).toBe(false);
      expect(result.partnerStatus).toBe('not_played');
    });

    it('should detect partner winning status', () => {
      // Set up trick with Bot3 winning (Bot1's partner)
      gameState.currentTrick = {
        leadingPlayerId: PlayerId.Bot3,
        leadingCombo: [{ rank: Rank.Ace, suit: Suit.Spades, id: 'ace_spades', points: 0 }],
        plays: [],
        points: 0,
      };

      const validCombos = [{
        type: ComboType.Single,
        cards: [{ rank: Rank.King, suit: Suit.Spades, id: 'king_spades', points: 10 }],
        value: 50,
      }];

      const result = analyzeTrick(gameState, PlayerId.Bot1, validCombos);

      expect(result.partnerStatus).toBe('winning');
      expect(result.currentWinner).toBe(PlayerId.Bot3);
    });

    it('should calculate total trick points', () => {
      gameState.currentTrick = {
        leadingPlayerId: PlayerId.Human,
        leadingCombo: [{ rank: Rank.Five, suit: Suit.Hearts, id: 'five_hearts', points: 5 }],
        plays: [
          {
            playerId: PlayerId.Bot1,
            cards: [{ rank: Rank.King, suit: Suit.Hearts, id: 'king_hearts', points: 10 }],
          },
        ],
        points: 0,
      };

      const result = analyzeTrick(gameState, PlayerId.Bot2, []);

      expect(result.totalPoints).toBe(15); // 5 + 10
    });

    it('should determine if AI can win', () => {
      gameState.currentTrick = {
        leadingPlayerId: PlayerId.Human,
        leadingCombo: [{ rank: Rank.Seven, suit: Suit.Diamonds, id: 'seven_diamonds', points: 0 }],
        plays: [],
        points: 0,
      };

      const strongCombo = [{
        type: ComboType.Single,
        cards: [{ rank: Rank.Ace, suit: Suit.Diamonds, id: 'ace_diamonds', points: 0 }],
        value: 80,
      }];

      const result = analyzeTrick(gameState, PlayerId.Bot1, strongCombo);

      expect(result.canWin).toBe(true);
    });
  });

  describe('getPositionStrategy', () => {
    it('should provide first position strategy', () => {
      const result = getPositionStrategy(TrickPosition.First, PlayStyle.Balanced);

      expect(result.informationGathering).toBe(0.8); // High for leading
      expect(result.partnerCoordination).toBe(0.2);  // Low - partner hasn't played
      expect(result.disruptionFocus).toBe(0.6);      // Good disruption opportunity
    });

    it('should provide fourth position strategy', () => {
      const result = getPositionStrategy(TrickPosition.Fourth, PlayStyle.Balanced);

      expect(result.informationGathering).toBe(0.2); // Low - perfect information
      expect(result.partnerCoordination).toBe(0.9);  // High - can see partner
      expect(result.riskTaking).toBe(0.8);           // High - optimal decisions possible
    });

    it('should adjust for aggressive play style', () => {
      const conservative = getPositionStrategy(TrickPosition.Second, PlayStyle.Conservative);
      const aggressive = getPositionStrategy(TrickPosition.Second, PlayStyle.Aggressive);

      expect(aggressive.riskTaking).toBeGreaterThan(conservative.riskTaking);
      expect(aggressive.disruptionFocus).toBeGreaterThan(conservative.disruptionFocus);
      expect(aggressive.partnerCoordination).toBeLessThan(conservative.partnerCoordination);
    });

    it('should adjust for desperate play style', () => {
      const balanced = getPositionStrategy(TrickPosition.Third, PlayStyle.Balanced);
      const desperate = getPositionStrategy(TrickPosition.Third, PlayStyle.Desperate);

      expect(desperate.riskTaking).toBeGreaterThan(balanced.riskTaking);
      expect(desperate.disruptionFocus).toBeGreaterThan(balanced.disruptionFocus);
      expect(desperate.partnerCoordination).toBeLessThan(balanced.partnerCoordination);
    });

    it('should keep values within bounds', () => {
      const result = getPositionStrategy(TrickPosition.First, PlayStyle.Desperate);

      expect(result.informationGathering).toBeLessThanOrEqual(1.0);
      expect(result.riskTaking).toBeLessThanOrEqual(1.0);
      expect(result.partnerCoordination).toBeLessThanOrEqual(1.0);
      expect(result.disruptionFocus).toBeLessThanOrEqual(1.0);

      expect(result.informationGathering).toBeGreaterThanOrEqual(0.0);
      expect(result.riskTaking).toBeGreaterThanOrEqual(0.0);
      expect(result.partnerCoordination).toBeGreaterThanOrEqual(0.0);
      expect(result.disruptionFocus).toBeGreaterThanOrEqual(0.0);
    });
  });

  describe('Edge Cases and Integration', () => {
    it('should handle missing trump suit gracefully', () => {
      const noSuitTrump: TrumpInfo = {
        trumpRank: Rank.Two,
        declared: false,
      };

      const cards = [{ rank: Rank.Two, suit: Suit.Hearts, id: 'two_hearts', points: 0 }];
      const combo = { type: ComboType.Single, cards, value: 30 };
      const context = {
        isAttackingTeam: true,
        currentPoints: 20,
        pointsNeeded: 80,
        cardsRemaining: 8,
        trickPosition: TrickPosition.First,
        pointPressure: PointPressure.MEDIUM,
        playStyle: PlayStyle.Balanced,
      };

      expect(() => analyzeCombo(combo, noSuitTrump, context)).not.toThrow();
    });

    it('should handle extreme endgame scenarios', () => {
      const result = determinePlayStyle(true, PointPressure.HIGH, 1);
      expect(result).toBe(PlayStyle.Desperate);
      
      const strategy = getPositionStrategy(TrickPosition.Fourth, result);
      expect(strategy.riskTaking).toBeGreaterThan(0.8);
    });

    it('should provide consistent strategy across position transitions', () => {
      const positions = [
        TrickPosition.First,
        TrickPosition.Second, 
        TrickPosition.Third,
        TrickPosition.Fourth
      ];

      const strategies = positions.map(pos => 
        getPositionStrategy(pos, PlayStyle.Balanced)
      );

      // Information gathering should decrease as position advances
      for (let i = 1; i < strategies.length; i++) {
        expect(strategies[i].informationGathering).toBeLessThanOrEqual(
          strategies[i-1].informationGathering
        );
      }

      // Partner coordination should increase as position advances
      for (let i = 1; i < strategies.length; i++) {
        expect(strategies[i].partnerCoordination).toBeGreaterThanOrEqual(
          strategies[i-1].partnerCoordination
        );
      }
    });
  });
});