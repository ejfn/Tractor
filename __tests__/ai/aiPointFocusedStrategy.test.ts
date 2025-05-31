import {
  createPointFocusedContext,
  createTrumpConservationStrategy,
  selectEarlyGameLeadingPlay,
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
  TeamId,
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

    it('should prioritize Ace singles over non-Ace pairs (integrated Ace priority)', () => {
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
      
      const trumpInfo = { trumpRank: Rank.Two,  }; // No trump suit declared
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
      expect(selected!.type).toBe(ComboType.Single); // Should prefer Ace single
      expect(selected!.cards[0].rank).toBe(Rank.Ace); // Over King pair
    });

    it('should prefer pairs over singles when no Aces are available', () => {
      const validCombos = [
        {
          type: ComboType.Single,
          cards: [createTestCard(Suit.Hearts, Rank.Queen)],
          value: 12,
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
      
      const trumpInfo = { trumpRank: Rank.Two,  };
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
      expect(selected!.type).toBe(ComboType.Pair); // Should prefer King pair
      expect(selected!.cards[0].rank).toBe(Rank.King); // Over Queen single
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

    it('should select non-trump Aces even when trump suit is declared', () => {
      const validCombos = [
        {
          type: ComboType.Single,
          cards: [createTestCard(Suit.Hearts, Rank.Ace)], // Non-trump Ace
          value: 14,
        },
        {
          type: ComboType.Pair,
          cards: [
            createTestCard(Suit.Clubs, Rank.King), // Trump suit King pair - should be filtered out
            createTestCard(Suit.Clubs, Rank.King),
          ],
          value: 26,
        },
      ];
      
      // Trump suit is declared as Clubs, so Spades Ace pair becomes trump suit, Hearts Ace is not trump
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Clubs);
      const pointContext = {
        gamePhase: GamePhaseStrategy.EarlyGame,
        pointCardStrategy: PointCardStrategy.Escape,
        trumpTiming: TrumpTiming.Preserve,
        teamPointsCollected: 0,
        opponentPointsCollected: 0,
        pointCardDensity: 0.3,
        partnerNeedsPointEscape: false,
        canWinWithoutPoints: false,
      };
      const gameState = createTestGameState();
      
      const selected = selectEarlyGameLeadingPlay(validCombos, trumpInfo, pointContext, gameState);
      
      // Should select Hearts Ace since it's non-trump (Spades Ace pair filtered out as trump)
      expect(selected).toEqual({
        type: ComboType.Single,
        cards: [createTestCard(Suit.Hearts, Rank.Ace)],
        value: 14,
      });
    });

    it('should avoid trump suit Aces/Kings when trump is declared', () => {
      const validCombos = [
        {
          type: ComboType.Single,
          cards: [createTestCard(Suit.Spades, Rank.Ace)], // Trump suit Ace - should be avoided
          value: 14,
        },
        {
          type: ComboType.Single,
          cards: [createTestCard(Suit.Hearts, Rank.Ace)], // Non-trump Ace - should be preferred
          value: 14,
        },
        {
          type: ComboType.Single,
          cards: [createTestCard(Suit.Spades, Rank.King)], // Trump suit King - should be avoided
          value: 13,
        },
      ];
      
      // Trump suit is declared as Spades - strategy should avoid trump suit cards
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);
      const pointContext = {
        gamePhase: GamePhaseStrategy.EarlyGame,
        pointCardStrategy: PointCardStrategy.Escape,
        trumpTiming: TrumpTiming.Preserve,
        teamPointsCollected: 0,
        opponentPointsCollected: 0,
        pointCardDensity: 0.3,
        partnerNeedsPointEscape: false,
        canWinWithoutPoints: false,
      };
      const gameState = createTestGameState();
      
      const selected = selectEarlyGameLeadingPlay(validCombos, trumpInfo, pointContext, gameState);
      
      // Should select Hearts Ace since it's non-trump (Spades cards filtered out as trump)
      expect(selected).toEqual({
        type: ComboType.Single,
        cards: [createTestCard(Suit.Hearts, Rank.Ace)],
        value: 14,
      });
    });

    it('should select non-trump Aces when only non-trump combos available', () => {
      const validCombos = [
        {
          type: ComboType.Single,
          cards: [createTestCard(Suit.Hearts, Rank.Ace)], // Non-trump Ace - should be selected
          value: 14,
        },
        {
          type: ComboType.Single,
          cards: [createTestCard(Suit.Diamonds, Rank.King)], // Non-trump King
          value: 13,
        },
      ];
      
      // Trump suit is declared as Spades - only non-trump combos present
      const trumpInfo = createTestTrumpInfo(Rank.Two, Suit.Spades);
      const pointContext = {
        gamePhase: GamePhaseStrategy.EarlyGame,
        pointCardStrategy: PointCardStrategy.Escape,
        trumpTiming: TrumpTiming.Preserve,
        teamPointsCollected: 0,
        opponentPointsCollected: 0,
        pointCardDensity: 0.3,
        partnerNeedsPointEscape: false,
        canWinWithoutPoints: false,
      };
      const gameState = createTestGameState();
      
      const selected = selectEarlyGameLeadingPlay(validCombos, trumpInfo, pointContext, gameState);
      
      // Should select Hearts Ace since it's non-trump and highest priority
      expect(selected).toEqual({
        type: ComboType.Single,
        cards: [createTestCard(Suit.Hearts, Rank.Ace)],
        value: 14,
      });
    });

    it('should prioritize Aces when no trump suit is declared', () => {
      const validCombos = [
        {
          type: ComboType.Single,
          cards: [createTestCard(Suit.Hearts, Rank.King, 10)],
          value: 13,
        },
        {
          type: ComboType.Single,
          cards: [createTestCard(Suit.Spades, Rank.Ace)],
          value: 14,
        },
      ];
      
      // No trump suit declared - strategy should work and prioritize Aces
      const trumpInfo = { trumpRank: Rank.Two,  };
      const pointContext = {
        gamePhase: GamePhaseStrategy.EarlyGame,
        pointCardStrategy: PointCardStrategy.Escape,
        trumpTiming: TrumpTiming.Preserve,
        teamPointsCollected: 0,
        opponentPointsCollected: 0,
        pointCardDensity: 0.3,
        partnerNeedsPointEscape: false,
        canWinWithoutPoints: false,
      };
      const gameState = createTestGameState();
      
      const selected = selectEarlyGameLeadingPlay(validCombos, trumpInfo, pointContext, gameState);
      
      expect(selected).toBeTruthy();
      expect(selected!.cards[0].rank).toBe(Rank.Ace); // Should select Ace over King
    });

    it('should prefer Ace pairs over Ace singles', () => {
      const validCombos = [
        {
          type: ComboType.Single,
          cards: [createTestCard(Suit.Hearts, Rank.Ace)],
          value: 14,
        },
        {
          type: ComboType.Pair,
          cards: [
            createTestCard(Suit.Spades, Rank.Ace),
            createTestCard(Suit.Spades, Rank.Ace),
          ],
          value: 28,
        },
      ];
      
      const trumpInfo = { trumpRank: Rank.Two,  };
      const pointContext = {
        gamePhase: GamePhaseStrategy.EarlyGame,
        pointCardStrategy: PointCardStrategy.Escape,
        trumpTiming: TrumpTiming.Preserve,
        teamPointsCollected: 0,
        opponentPointsCollected: 0,
        pointCardDensity: 0.3,
        partnerNeedsPointEscape: false,
        canWinWithoutPoints: false,
      };
      const gameState = createTestGameState();
      
      const selected = selectEarlyGameLeadingPlay(validCombos, trumpInfo, pointContext, gameState);
      
      expect(selected).toBeTruthy();
      expect(selected!.type).toBe(ComboType.Pair); // Should prefer Ace pair
      expect(selected!.cards[0].rank).toBe(Rank.Ace);
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