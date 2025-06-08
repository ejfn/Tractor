import {
  createGameContext,
  isPlayerOnAttackingTeam,
  calculatePointPressure,
  getTrickPosition,
  isTrickWorthFighting,
  determinePlayStyle,
  analyzeCombo,
  analyzeTrickWinner,
  getPositionStrategy,
} from "../../src/ai/aiGameContext";
import {
  PlayerId,
  TrickPosition,
  PointPressure,
  GamePhase,
  GameState,
  PlayStyle,
  ComboStrength,
  ComboType,
  Combo,
  Card,
  TrumpInfo,
  Rank,
  Suit,
} from "../../src/types";
import { createTestCardsGameState } from "../helpers/gameStates";
import { initializeGame } from '../../src/game/gameLogic';

describe("AI Game Context", () => {
  let gameState: any;
  let trumpInfo: TrumpInfo;

  beforeEach(() => {
    gameState = createTestCardsGameState();
    gameState.gamePhase = GamePhase.Playing;
    trumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Hearts,
    };
  });

  describe("isPlayerOnAttackingTeam", () => {
    it("should correctly identify Team A players (Human + Bot2) as attacking on odd rounds", () => {
      gameState.roundNumber = 1; // Odd round - Team A attacks
      
      expect(isPlayerOnAttackingTeam(gameState, PlayerId.Human)).toBe(true);
      expect(isPlayerOnAttackingTeam(gameState, PlayerId.Bot2)).toBe(true);
      expect(isPlayerOnAttackingTeam(gameState, PlayerId.Bot1)).toBe(false);
      expect(isPlayerOnAttackingTeam(gameState, PlayerId.Bot3)).toBe(false);
    });

    it("should correctly identify Team B players (Bot1 + Bot3) as attacking on even rounds", () => {
      gameState.roundNumber = 2; // Even round - Team B attacks
      
      expect(isPlayerOnAttackingTeam(gameState, PlayerId.Human)).toBe(false);
      expect(isPlayerOnAttackingTeam(gameState, PlayerId.Bot2)).toBe(false);
      expect(isPlayerOnAttackingTeam(gameState, PlayerId.Bot1)).toBe(true);
      expect(isPlayerOnAttackingTeam(gameState, PlayerId.Bot3)).toBe(true);
    });
  });

  describe("calculatePointPressure", () => {
    it("should return LOW pressure for less than 30% of points", () => {
      expect(calculatePointPressure(20, 80)).toBe(PointPressure.LOW);
      expect(calculatePointPressure(0, 80)).toBe(PointPressure.LOW);
      expect(calculatePointPressure(23, 80)).toBe(PointPressure.LOW);
    });

    it("should return MEDIUM pressure for 30-70% of points", () => {
      expect(calculatePointPressure(24, 80)).toBe(PointPressure.MEDIUM);
      expect(calculatePointPressure(40, 80)).toBe(PointPressure.MEDIUM);
      expect(calculatePointPressure(55, 80)).toBe(PointPressure.MEDIUM);
    });

    it("should return HIGH pressure for 70%+ of points", () => {
      expect(calculatePointPressure(56, 80)).toBe(PointPressure.HIGH);
      expect(calculatePointPressure(70, 80)).toBe(PointPressure.HIGH);
      expect(calculatePointPressure(79, 80)).toBe(PointPressure.HIGH);
    });
  });

  describe("getTrickPosition", () => {
    it("should return First when no trick exists", () => {
      gameState.currentTrick = null;
      expect(getTrickPosition(gameState, PlayerId.Human)).toBe(TrickPosition.First);
    });

    it("should return First when trick has no plays", () => {
      gameState.currentTrick = {
        plays: [],
      };
      expect(getTrickPosition(gameState, PlayerId.Human)).toBe(TrickPosition.First);
    });

    it("should return correct positions based on play count", () => {
      gameState.currentTrick = {
        plays: [
          { playerId: PlayerId.Human, cards: [{ id: 'lead-card', rank: Rank.Ace, suit: Suit.Spades, points: 0 }] }
        ],
      };
      
      // First player (leader) - Human is always First
      expect(getTrickPosition(gameState, PlayerId.Human)).toBe(TrickPosition.First);
      
      // Second player (first follower)
      expect(getTrickPosition(gameState, PlayerId.Bot1)).toBe(TrickPosition.Second);
      
      // After Bot1 plays - Bot2 is third player
      gameState.currentTrick.plays = [
        { playerId: PlayerId.Human, cards: [{ id: 'lead-card', rank: Rank.Ace, suit: Suit.Spades, points: 0 }] },
        { playerId: PlayerId.Bot1, cards: [] }
      ];
      expect(getTrickPosition(gameState, PlayerId.Bot2)).toBe(TrickPosition.Third);
      
      // After Bot1 and Bot2 play - Bot3 is fourth player
      gameState.currentTrick.plays = [
        { playerId: PlayerId.Human, cards: [{ id: 'lead-card', rank: Rank.Ace, suit: Suit.Spades, points: 0 }] },
        { playerId: PlayerId.Bot1, cards: [] },
        { playerId: PlayerId.Bot2, cards: [] },
      ];
      expect(getTrickPosition(gameState, PlayerId.Bot3)).toBe(TrickPosition.Fourth);
      
      // Leader is always First, regardless of how many have played
      expect(getTrickPosition(gameState, PlayerId.Human)).toBe(TrickPosition.First);
    });
  });

  describe("createGameContext", () => {
    it("should create complete game context for attacking team player", () => {
      gameState.roundNumber = 1; // Team A attacks
      gameState.currentTrick = null;
      
      const context = createGameContext(gameState, PlayerId.Human);
      
      expect(context.isAttackingTeam).toBe(true);
      expect(context.currentPoints).toBe(0); // Placeholder value
      expect(context.pointsNeeded).toBe(80);
      expect(context.cardsRemaining).toBeGreaterThan(0);
      expect(context.trickPosition).toBe(TrickPosition.First);
      expect(context.pointPressure).toBe(PointPressure.LOW);
    });

    it("should create complete game context for defending team player", () => {
      gameState.roundNumber = 1; // Team A attacks, so Bot1 defends
      gameState.currentTrick = null;
      
      const context = createGameContext(gameState, PlayerId.Bot1);
      
      expect(context.isAttackingTeam).toBe(false);
      expect(context.currentPoints).toBe(0); // Placeholder value
      expect(context.pointsNeeded).toBe(80);
      expect(context.cardsRemaining).toBeGreaterThan(0);
      expect(context.trickPosition).toBe(TrickPosition.First);
      expect(context.pointPressure).toBe(PointPressure.LOW);
    });
  });

  describe("isTrickWorthFighting", () => {
    beforeEach(() => {
      gameState.currentTrick = {
        plays: [
          { playerId: PlayerId.Human, cards: [{ points: 5 }] }, // 5 points from leading combo
          { playerId: PlayerId.Bot1, cards: [{ points: 10 }] }, // 10 points
        ],
      };
    });

    it("should consider trick worth fighting with LOW pressure and high points", () => {
      const context = createGameContext(gameState, PlayerId.Human);
      context.pointPressure = PointPressure.LOW;
      
      // Total points: 5 + 10 = 15, threshold for LOW is 15
      expect(isTrickWorthFighting(gameState, context)).toBe(true);
    });

    it("should not consider trick worth fighting with LOW pressure and low points", () => {
      gameState.currentTrick.plays = [
        { playerId: PlayerId.Human, cards: [{ points: 0 }] },
        { playerId: PlayerId.Bot1, cards: [{ points: 5 }] }
      ];
      
      const context = createGameContext(gameState, PlayerId.Human);
      context.pointPressure = PointPressure.LOW;
      
      // Total points: 0 + 5 = 5, threshold for LOW is 15
      expect(isTrickWorthFighting(gameState, context)).toBe(false);
    });

    it("should have lower threshold for MEDIUM pressure", () => {
      gameState.currentTrick.plays = [
        { playerId: PlayerId.Human, cards: [{ points: 0 }] },
        { playerId: PlayerId.Bot1, cards: [{ points: 10 }] }
      ];
      
      const context = createGameContext(gameState, PlayerId.Human);
      context.pointPressure = PointPressure.MEDIUM;
      
      // Total points: 0 + 10 = 10, threshold for MEDIUM is 10
      expect(isTrickWorthFighting(gameState, context)).toBe(true);
    });

    it("should have lowest threshold for HIGH pressure", () => {
      gameState.currentTrick.plays = [
        { playerId: PlayerId.Human, cards: [{ points: 0 }] },
        { playerId: PlayerId.Bot1, cards: [{ points: 5 }] }
      ];
      
      const context = createGameContext(gameState, PlayerId.Human);
      context.pointPressure = PointPressure.HIGH;
      
      // Total points: 0 + 5 = 5, threshold for HIGH is 5
      expect(isTrickWorthFighting(gameState, context)).toBe(true);
    });
  });

  // Phase 2 Enhanced Functionality Tests
  describe('determinePlayStyle - Phase 2', () => {
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

  describe('analyzeCombo - Phase 2', () => {
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

  describe('analyzeTrickWinner - Phase 2', () => {
    beforeEach(() => {
      gameState = initializeGame();
    });

    it('should detect teammate winning status', () => {
      // Set up trick with Bot3 winning (Bot1's partner)
      gameState.currentTrick = {
        plays: [
          { playerId: PlayerId.Bot3, cards: [{ rank: Rank.Ace, suit: Suit.Spades, id: 'ace_spades', points: 0 }] }
        ],
        winningPlayerId: PlayerId.Bot3,
        points: 0,
      };

      const result = analyzeTrickWinner(gameState, PlayerId.Bot1);

      expect(result.isTeammateWinning).toBe(true);
      expect(result.isOpponentWinning).toBe(false);
      expect(result.isSelfWinning).toBe(false);
      expect(result.currentWinner).toBe(PlayerId.Bot3);
    });

    it('should detect opponent winning status', () => {
      // Set up trick with Human winning (Bot1's opponent)
      gameState.currentTrick = {
        plays: [
          { playerId: PlayerId.Human, cards: [{ rank: Rank.King, suit: Suit.Hearts, id: 'king_hearts', points: 10 }] }
        ],
        winningPlayerId: PlayerId.Human,
        points: 10,
      };

      const result = analyzeTrickWinner(gameState, PlayerId.Bot1);

      expect(result.isTeammateWinning).toBe(false);
      expect(result.isOpponentWinning).toBe(true);
      expect(result.isSelfWinning).toBe(false);
      expect(result.currentWinner).toBe(PlayerId.Human);
    });

    it('should detect self winning status', () => {
      // Set up trick with Bot1 winning
      gameState.currentTrick = {
        plays: [
          { playerId: PlayerId.Bot1, cards: [{ rank: Rank.Ace, suit: Suit.Hearts, id: 'ace_hearts', points: 0 }] }
        ],
        winningPlayerId: PlayerId.Bot1,
        points: 0,
      };

      const result = analyzeTrickWinner(gameState, PlayerId.Bot1);

      expect(result.isTeammateWinning).toBe(false);
      expect(result.isOpponentWinning).toBe(false);
      expect(result.isSelfWinning).toBe(true);
      expect(result.currentWinner).toBe(PlayerId.Bot1);
    });

    it('should track trick points correctly', () => {
      gameState.currentTrick = {
        plays: [
          { playerId: PlayerId.Human, cards: [{ rank: Rank.Five, suit: Suit.Hearts, id: 'five_hearts', points: 5 }] },
          {
            playerId: PlayerId.Bot1,
            cards: [{ rank: Rank.King, suit: Suit.Hearts, id: 'king_hearts', points: 10 }],
          },
        ],
        winningPlayerId: PlayerId.Bot1,
        points: 15, // 5 + 10
      };

      const result = analyzeTrickWinner(gameState, PlayerId.Bot2);

      expect(result.trickPoints).toBe(15);
      expect(result.currentWinner).toBe(PlayerId.Bot1);
    });

    it('should determine strategic decisions', () => {
      gameState.currentTrick = {
        plays: [
          { playerId: PlayerId.Human, cards: [{ rank: Rank.Seven, suit: Suit.Diamonds, id: 'seven_diamonds', points: 0 }] }
        ],
        winningPlayerId: PlayerId.Human,
        points: 0,
      };

      const result = analyzeTrickWinner(gameState, PlayerId.Bot1);

      expect(result.canBeatCurrentWinner).toBeDefined();
      expect(result.shouldTryToBeat).toBeDefined();
      expect(result.shouldPlayConservatively).toBeDefined();
    });
  });

  describe('getPositionStrategy - Phase 2', () => {
    it('should provide first position strategy', () => {
      const result = getPositionStrategy(TrickPosition.First, PlayStyle.Balanced);

      expect(result.informationGathering).toBe(0.9); // Enhanced - sophisticated probe strategy
      expect(result.partnerCoordination).toBe(0.3);  // Enhanced - strategic setup for teammates
      expect(result.disruptionFocus).toBe(0.8);      // Enhanced - comprehensive opponent probing
    });

    it('should provide fourth position strategy', () => {
      const result = getPositionStrategy(TrickPosition.Fourth, PlayStyle.Balanced);

      expect(result.informationGathering).toBe(1.0); // High - perfect information available
      expect(result.partnerCoordination).toBe(1.0);  // High - can optimize teammate support
      expect(result.riskTaking).toBe(0.9);           // High - optimal decisions possible
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

      // Information gathering should decrease through positions 1-3, then spike at 4 (perfect info)
      expect(strategies[1].informationGathering).toBeLessThanOrEqual(strategies[0].informationGathering); // Second <= First
      expect(strategies[2].informationGathering).toBeLessThanOrEqual(strategies[1].informationGathering); // Third <= Second
      expect(strategies[3].informationGathering).toBe(1.0); // Fourth has perfect information

      // Partner coordination should increase as position advances
      for (let i = 1; i < strategies.length; i++) {
        expect(strategies[i].partnerCoordination).toBeGreaterThanOrEqual(
          strategies[i-1].partnerCoordination
        );
      }
    });
  });
});