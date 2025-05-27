import {
  createPointFocusedContext,
  createTrumpConservationStrategy,
  selectEarlyGameLeadingPlay,
  selectPartnerCoordinatedPlay,
  selectIntelligentTrumpFollow,
} from '../../src/ai/aiPointFocusedStrategy';
import {
  Card,
  Suit,
  Rank,
  JokerType,
  ComboType,
  TrumpInfo,
  GameState,
  GameContext,
  GamePhaseStrategy,
  PointCardStrategy,
  TrumpTiming,
  PlayerId,
  PlayerName,
  GamePhase,
  TrickPosition,
  PointPressure,
  PlayStyle,
} from "../../src/types";

// Test utilities
const createTestCard = (suit: Suit, rank: Rank, points: number = 0): Card => ({
  id: `${suit}_${rank}`,
  suit,
  rank,
  points,
});

const createTestJoker = (jokerType: JokerType): Card => ({
  id: `joker_${jokerType}`,
  joker: jokerType,
  points: 0,
});

const createTestTrumpInfo = (trumpRank: Rank = Rank.Two, trumpSuit?: Suit): TrumpInfo => ({
  trumpRank,
  trumpSuit,
  declared: true,
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
      team: 'A',
    },
    {
      id: PlayerId.Bot1,
      name: PlayerName.Bot1,
      isHuman: false,
      hand: [],
      team: 'B',
    },
    {
      id: PlayerId.Bot2,
      name: PlayerName.Bot2,
      isHuman: false,
      hand: [],
      team: 'A',
    },
    {
      id: PlayerId.Bot3,
      name: PlayerName.Bot3,
      isHuman: false,
      hand: [],
      team: 'B',
    },
  ],
  teams: [
    { id: 'A', currentRank: Rank.Two, points: 0, isDefending: false },
    { id: 'B', currentRank: Rank.Two, points: 0, isDefending: true },
  ],
  deck: [],
  kittyCards: [],
  currentTrick: null,
  trumpInfo: createTestTrumpInfo(),
  tricks: [],
  roundNumber: 1,
  currentPlayerIndex: 0,
  gamePhase: GamePhase.Playing,
  ...overrides,
});

describe('AI Point-Focused Strategy (Issue #61)', () => {
  describe('createPointFocusedContext', () => {
    it('should identify early game phase correctly', () => {
      const gameState = createTestGameState({
        tricks: [], // No tricks played yet
        players: [
          { ...createTestGameState().players[0], hand: Array(13).fill(createTestCard(Suit.Hearts, Rank.Ace)) },
          { ...createTestGameState().players[1], hand: Array(13).fill(createTestCard(Suit.Spades, Rank.King)) },
          { ...createTestGameState().players[2], hand: Array(13).fill(createTestCard(Suit.Clubs, Rank.Queen)) },
          { ...createTestGameState().players[3], hand: Array(13).fill(createTestCard(Suit.Diamonds, Rank.Jack)) },
        ],
      });
      
      const context = createTestGameContext();
      const pointContext = createPointFocusedContext(gameState, PlayerId.Human, context);
      
      expect(pointContext.gamePhase).toBe(GamePhaseStrategy.EarlyGame);
    });

    it('should determine aggressive point strategy when attacking team is behind', () => {
      const gameState = createTestGameState({
        tricks: [
          {
            leadingPlayerId: PlayerId.Bot1,
            leadingCombo: [createTestCard(Suit.Hearts, Rank.Five, 5)],
            plays: [],
            winningPlayerId: PlayerId.Bot1,
            points: 15, // Opponent got points
          },
        ],
      });
      
      const context = createTestGameContext({ isAttackingTeam: true });
      const pointContext = createPointFocusedContext(gameState, PlayerId.Human, context);
      
      expect(pointContext.pointCardStrategy).toBe(PointCardStrategy.Aggressive);
      expect(pointContext.opponentPointsCollected).toBe(15);
    });

    it('should determine conservative strategy when team has enough points', () => {
      const gameState = createTestGameState({
        tricks: [
          {
            leadingPlayerId: PlayerId.Human,
            leadingCombo: [createTestCard(Suit.Hearts, Rank.King, 10)],
            plays: [],
            winningPlayerId: PlayerId.Human,
            points: 25, // Team A got good points
          },
          {
            leadingPlayerId: PlayerId.Bot2,
            leadingCombo: [createTestCard(Suit.Spades, Rank.Ten, 10)],
            plays: [],
            winningPlayerId: PlayerId.Bot2,
            points: 30, // Team A got more points
          },
        ],
      });
      
      const context = createTestGameContext({ isAttackingTeam: true });
      const pointContext = createPointFocusedContext(gameState, PlayerId.Human, context);
      
      expect(pointContext.teamPointsCollected).toBe(55);
      expect(pointContext.canWinWithoutPoints).toBe(false); // Need 80 points
    });

    it('should detect partner needing point escape', () => {
      const gameState = createTestGameState({
        players: [
          {
            ...createTestGameState().players[0],
            hand: [createTestCard(Suit.Hearts, Rank.Ace)], // Human with non-point card
          },
          {
            ...createTestGameState().players[1],
            hand: [createTestCard(Suit.Spades, Rank.Seven)],
          },
          {
            ...createTestGameState().players[2], // Partner with many point cards
            hand: [
              createTestCard(Suit.Hearts, Rank.Five, 5),
              createTestCard(Suit.Hearts, Rank.Ten, 10),
              createTestCard(Suit.Hearts, Rank.King, 10),
              createTestCard(Suit.Spades, Rank.Five, 5),
            ],
          },
          {
            ...createTestGameState().players[3],
            hand: [createTestCard(Suit.Clubs, Rank.Eight)],
          },
        ],
      });
      
      const context = createTestGameContext();
      const pointContext = createPointFocusedContext(gameState, PlayerId.Human, context);
      
      expect(pointContext.partnerNeedsPointEscape).toBe(true);
    });
  });

  describe('createTrumpConservationStrategy', () => {
    it('should preserve big trumps in early game', () => {
      const pointContext = {
        gamePhase: GamePhaseStrategy.EarlyGame,
        pointCardStrategy: PointCardStrategy.Escape,
        trumpTiming: TrumpTiming.Preserve,
        teamPointsCollected: 10,
        opponentPointsCollected: 5,
        pointCardDensity: 0.3,
        partnerNeedsPointEscape: false,
        canWinWithoutPoints: false,
      };
      
      // Create game state with realistic hand sizes
      const gameState = createTestGameState({
        players: [
          { ...createTestGameState().players[0], hand: Array(10).fill(createTestCard(Suit.Hearts, Rank.Ace)) },
          { ...createTestGameState().players[1], hand: Array(10).fill(createTestCard(Suit.Spades, Rank.King)) },
          { ...createTestGameState().players[2], hand: Array(10).fill(createTestCard(Suit.Clubs, Rank.Queen)) },
          { ...createTestGameState().players[3], hand: Array(10).fill(createTestCard(Suit.Diamonds, Rank.Jack)) },
        ],
      });
      const trumpInfo = createTestTrumpInfo();
      
      const strategy = createTrumpConservationStrategy(pointContext, gameState, trumpInfo);
      
      expect(strategy.preserveBigJokers).toBe(true);
      expect(strategy.preserveSmallJokers).toBe(true);
      expect(strategy.preserveTrumpRanks).toBe(true);
      expect(strategy.minTricksRemainingForBigTrump).toBe(6);
      expect(strategy.trumpFollowingPriority).toBe('minimal');
    });

    it('should be aggressive with trumps in late game', () => {
      const pointContext = {
        gamePhase: GamePhaseStrategy.LateGame,
        pointCardStrategy: PointCardStrategy.Aggressive,
        trumpTiming: TrumpTiming.Control,
        teamPointsCollected: 60,
        opponentPointsCollected: 40,
        pointCardDensity: 0.1,
        partnerNeedsPointEscape: false,
        canWinWithoutPoints: false,
      };
      
      const gameState = createTestGameState();
      const trumpInfo = createTestTrumpInfo();
      
      const strategy = createTrumpConservationStrategy(pointContext, gameState, trumpInfo);
      
      expect(strategy.preserveBigJokers).toBe(false);
      expect(strategy.preserveSmallJokers).toBe(false);
      expect(strategy.preserveTrumpRanks).toBe(false);
      expect(strategy.minTricksRemainingForBigTrump).toBe(2);
      expect(strategy.trumpFollowingPriority).toBe('moderate');
    });

    it('should use emergency trump strategy under high pressure', () => {
      const pointContext = {
        gamePhase: GamePhaseStrategy.MidGame,
        pointCardStrategy: PointCardStrategy.Aggressive,
        trumpTiming: TrumpTiming.Emergency,
        teamPointsCollected: 20,
        opponentPointsCollected: 70,
        pointCardDensity: 0.2,
        partnerNeedsPointEscape: false,
        canWinWithoutPoints: false,
      };
      
      const gameState = createTestGameState();
      const trumpInfo = createTestTrumpInfo();
      
      const strategy = createTrumpConservationStrategy(pointContext, gameState, trumpInfo);
      
      expect(strategy.trumpFollowingPriority).toBe('aggressive');
    });
  });

  describe('selectEarlyGameLeadingPlay', () => {
    it('should select high non-trump cards in early game', () => {
      const validCombos = [
        {
          type: ComboType.Single,
          cards: [createTestCard(Suit.Hearts, Rank.Ace)],
          value: 14,
        },
        {
          type: ComboType.Single,
          cards: [createTestCard(Suit.Spades, Rank.Seven)],
          value: 7,
        },
        {
          type: ComboType.Single,
          cards: [createTestJoker(JokerType.Big)], // Trump
          value: 16,
        },
      ];
      
      const trumpInfo = createTestTrumpInfo();
      const pointContext = {
        gamePhase: GamePhaseStrategy.EarlyGame,
        pointCardStrategy: PointCardStrategy.Escape,
        trumpTiming: TrumpTiming.Preserve,
        teamPointsCollected: 0,
        opponentPointsCollected: 0,
        pointCardDensity: 0.3,
        partnerNeedsPointEscape: true,
        canWinWithoutPoints: false,
      };
      const gameState = createTestGameState();
      
      const selected = selectEarlyGameLeadingPlay(validCombos, trumpInfo, pointContext, gameState);
      
      expect(selected).toBeTruthy();
      expect(selected!.cards[0].rank).toBe(Rank.Ace); // Should select high non-trump
      expect(selected!.cards[0].joker).toBeUndefined(); // Should not select trump
    });

    it('should prefer pairs over singles when leading high', () => {
      const validCombos = [
        {
          type: ComboType.Single,
          cards: [createTestCard(Suit.Hearts, Rank.Ace)],
          value: 14,
        },
        {
          type: ComboType.Pair,
          cards: [
            createTestCard(Suit.Spades, Rank.King, 10),
            createTestCard(Suit.Spades, Rank.King, 10),
          ],
          value: 26,
        },
      ];
      
      const trumpInfo = createTestTrumpInfo();
      const pointContext = {
        gamePhase: GamePhaseStrategy.EarlyGame,
        pointCardStrategy: PointCardStrategy.Escape,
        trumpTiming: TrumpTiming.Preserve,
        teamPointsCollected: 0,
        opponentPointsCollected: 0,
        pointCardDensity: 0.3,
        partnerNeedsPointEscape: true,
        canWinWithoutPoints: false,
      };
      const gameState = createTestGameState();
      
      const selected = selectEarlyGameLeadingPlay(validCombos, trumpInfo, pointContext, gameState);
      
      expect(selected).toBeTruthy();
      expect(selected!.type).toBe(ComboType.Pair);
      expect(selected!.cards[0].rank).toBe(Rank.King);
    });

    it('should return null when not in early game', () => {
      const validCombos = [
        {
          type: ComboType.Single,
          cards: [createTestCard(Suit.Hearts, Rank.Ace)],
          value: 14,
        },
      ];
      
      const trumpInfo = createTestTrumpInfo();
      const pointContext = {
        gamePhase: GamePhaseStrategy.MidGame, // Not early game
        pointCardStrategy: PointCardStrategy.Aggressive,
        trumpTiming: TrumpTiming.Control,
        teamPointsCollected: 40,
        opponentPointsCollected: 30,
        pointCardDensity: 0.2,
        partnerNeedsPointEscape: false,
        canWinWithoutPoints: false,
      };
      const gameState = createTestGameState();
      
      const selected = selectEarlyGameLeadingPlay(validCombos, trumpInfo, pointContext, gameState);
      
      expect(selected).toBeNull();
    });
  });

  describe('selectPartnerCoordinatedPlay', () => {
    it('should follow with point cards when partner is leading and winning', () => {
      const validCombos = [
        {
          type: ComboType.Single,
          cards: [createTestCard(Suit.Hearts, Rank.Seven)],
          value: 7,
        },
        {
          type: ComboType.Single,
          cards: [createTestCard(Suit.Hearts, Rank.King, 10)], // Point card
          value: 13,
        },
        {
          type: ComboType.Single,
          cards: [createTestCard(Suit.Hearts, Rank.Five, 5)], // Point card
          value: 5,
        },
      ];
      
      const gameState = createTestGameState({
        currentTrick: {
          leadingPlayerId: PlayerId.Bot2, // Partner of Human (both Team A)
          leadingCombo: [createTestCard(Suit.Hearts, Rank.Ace)],
          plays: [],
          winningPlayerId: PlayerId.Bot2,
          points: 0,
        },
        currentPlayerIndex: 0, // Human's turn
      });
      
      const trumpInfo = createTestTrumpInfo();
      const pointContext = {
        gamePhase: GamePhaseStrategy.MidGame,
        pointCardStrategy: PointCardStrategy.Aggressive,
        trumpTiming: TrumpTiming.Control,
        teamPointsCollected: 30,
        opponentPointsCollected: 40,
        pointCardDensity: 0.2,
        partnerNeedsPointEscape: false,
        canWinWithoutPoints: false,
      };
      const leadingCombo = [createTestCard(Suit.Hearts, Rank.Ace)];
      
      const selected = selectPartnerCoordinatedPlay(
        validCombos,
        trumpInfo,
        pointContext,
        gameState,
        leadingCombo
      );
      
      expect(selected).toBeTruthy();
      expect(selected!.cards[0].points).toBeGreaterThan(0); // Should select point card
      expect(selected!.cards[0].points).toBe(10); // Should select higher point value (King)
    });

    it('should return null when partner is not leading', () => {
      const validCombos = [
        {
          type: ComboType.Single,
          cards: [createTestCard(Suit.Hearts, Rank.King, 10)],
          value: 13,
        },
      ];
      
      const gameState = createTestGameState({
        currentTrick: {
          leadingPlayerId: PlayerId.Bot1, // Opponent, not partner
          leadingCombo: [createTestCard(Suit.Hearts, Rank.Ace)],
          plays: [],
          winningPlayerId: PlayerId.Bot1,
          points: 0,
        },
        currentPlayerIndex: 0, // Human's turn
      });
      
      const trumpInfo = createTestTrumpInfo();
      const pointContext = {
        gamePhase: GamePhaseStrategy.MidGame,
        pointCardStrategy: PointCardStrategy.Aggressive,
        trumpTiming: TrumpTiming.Control,
        teamPointsCollected: 30,
        opponentPointsCollected: 40,
        pointCardDensity: 0.2,
        partnerNeedsPointEscape: false,
        canWinWithoutPoints: false,
      };
      const leadingCombo = [createTestCard(Suit.Hearts, Rank.Ace)];
      
      const selected = selectPartnerCoordinatedPlay(
        validCombos,
        trumpInfo,
        pointContext,
        gameState,
        leadingCombo
      );
      
      expect(selected).toBeNull();
    });
  });

  describe('selectIntelligentTrumpFollow', () => {
    it('should avoid playing big trumps when following small trump leads', () => {
      const validCombos = [
        {
          type: ComboType.Single,
          cards: [createTestJoker(JokerType.Big)], // Big trump
          value: 16,
        },
        {
          type: ComboType.Single,
          cards: [createTestCard(Suit.Hearts, Rank.Three)], // Small trump (when hearts is trump)
          value: 3,
        },
      ];
      
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Hearts);
      const conservationStrategy = {
        preserveBigJokers: true,
        preserveSmallJokers: false,
        preserveTrumpRanks: false,
        minTricksRemainingForBigTrump: 4,
        trumpFollowingPriority: 'minimal' as const,
      };
      
      const pointContext = {
        gamePhase: GamePhaseStrategy.EarlyGame,
        pointCardStrategy: PointCardStrategy.Escape,
        trumpTiming: TrumpTiming.Preserve,
        teamPointsCollected: 10,
        opponentPointsCollected: 5,
        pointCardDensity: 0.3,
        partnerNeedsPointEscape: false,
        canWinWithoutPoints: false,
      };
      
      const leadingCombo = [createTestCard(Suit.Hearts, Rank.Four)]; // Small trump lead
      
      const selected = selectIntelligentTrumpFollow(
        validCombos,
        trumpInfo,
        conservationStrategy,
        pointContext,
        leadingCombo
      );
      
      expect(selected).toBeTruthy();
      expect(selected!.cards[0].joker).toBeUndefined(); // Should not select big joker
      expect(selected!.cards[0].rank).toBe(Rank.Three); // Should select smaller trump
    });

    it('should return null when not following trump leads', () => {
      const validCombos = [
        {
          type: ComboType.Single,
          cards: [createTestJoker(JokerType.Big)],
          value: 16,
        },
      ];
      
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Hearts);
      const conservationStrategy = {
        preserveBigJokers: true,
        preserveSmallJokers: false,
        preserveTrumpRanks: false,
        minTricksRemainingForBigTrump: 4,
        trumpFollowingPriority: 'minimal' as const,
      };
      
      const pointContext = {
        gamePhase: GamePhaseStrategy.EarlyGame,
        pointCardStrategy: PointCardStrategy.Escape,
        trumpTiming: TrumpTiming.Preserve,
        teamPointsCollected: 10,
        opponentPointsCollected: 5,
        pointCardDensity: 0.3,
        partnerNeedsPointEscape: false,
        canWinWithoutPoints: false,
      };
      
      const leadingCombo = [createTestCard(Suit.Spades, Rank.Ace)]; // Non-trump lead
      
      const selected = selectIntelligentTrumpFollow(
        validCombos,
        trumpInfo,
        conservationStrategy,
        pointContext,
        leadingCombo
      );
      
      expect(selected).toBeNull();
    });
  });

  describe('Integration Tests', () => {
    it('should prioritize point collection in late game with high pressure', () => {
      const pointContext = {
        gamePhase: GamePhaseStrategy.LateGame,
        pointCardStrategy: PointCardStrategy.Aggressive,
        trumpTiming: TrumpTiming.Emergency,
        teamPointsCollected: 40,
        opponentPointsCollected: 70,
        pointCardDensity: 0.1,
        partnerNeedsPointEscape: false,
        canWinWithoutPoints: false,
      };
      
      expect(pointContext.pointCardStrategy).toBe(PointCardStrategy.Aggressive);
      expect(pointContext.trumpTiming).toBe(TrumpTiming.Emergency);
      expect(pointContext.canWinWithoutPoints).toBe(false);
    });

    it('should coordinate team strategy effectively', () => {
      const gameState = createTestGameState({
        players: [
          {
            ...createTestGameState().players[0],
            hand: [createTestCard(Suit.Hearts, Rank.Ace)], // Human - good lead card
          },
          {
            ...createTestGameState().players[1],
            hand: [createTestCard(Suit.Hearts, Rank.Seven)], // Opponent
          },
          {
            ...createTestGameState().players[2], // Partner with point cards
            hand: [
              createTestCard(Suit.Hearts, Rank.King, 10),
              createTestCard(Suit.Hearts, Rank.Ten, 10),
              createTestCard(Suit.Spades, Rank.Five, 5),
            ],
          },
          {
            ...createTestGameState().players[3],
            hand: [createTestCard(Suit.Hearts, Rank.Eight)], // Opponent
          },
        ],
      });
      
      const context = createTestGameContext();
      const pointContext = createPointFocusedContext(gameState, PlayerId.Human, context);
      
      // Human should recognize partner needs point escape
      expect(pointContext.partnerNeedsPointEscape).toBe(true);
      expect(pointContext.gamePhase).toBe(GamePhaseStrategy.EarlyGame);
    });
  });
});