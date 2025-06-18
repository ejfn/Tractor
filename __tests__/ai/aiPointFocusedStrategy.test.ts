import {
  createPointFocusedContext,
  createTrumpConservationStrategy,
  selectEarlyGameLeadingPlay,
} from '../../src/ai/leading/pointFocusedStrategy';
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
  GamePhase,
  TrickPosition,
  PointPressure,
  PlayStyle,
  TeamId,
} from "../../src/types";

// Using Card class static methods

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
      isHuman: true,
      hand: [],
      team: TeamId.A,
    },
    {
      id: PlayerId.Bot1,
      isHuman: false,
      hand: [],
      team: TeamId.B,
    },
    {
      id: PlayerId.Bot2,
      isHuman: false,
      hand: [],
      team: TeamId.A,
    },
    {
      id: PlayerId.Bot3,
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
          { ...createTestGameState().players[0], hand: Array(13).fill(Card.createCard(Suit.Hearts, Rank.Ace, 0)) },
          { ...createTestGameState().players[1], hand: Array(13).fill(Card.createCard(Suit.Spades, Rank.King, 0)) },
          { ...createTestGameState().players[2], hand: Array(13).fill(Card.createCard(Suit.Clubs, Rank.Queen, 0)) },
          { ...createTestGameState().players[3], hand: Array(13).fill(Card.createCard(Suit.Diamonds, Rank.Jack, 0)) },
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
            plays: [
              { playerId: PlayerId.Bot1, cards: [Card.createCard(Suit.Hearts, Rank.Five, 0)] }
            ],
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
            plays: [
              { playerId: PlayerId.Human, cards: [Card.createCard(Suit.Hearts, Rank.King, 0)] }
            ],
            winningPlayerId: PlayerId.Human,
            points: 25, // Team A got good points
          },
          {
            plays: [
              { playerId: PlayerId.Bot2, cards: [Card.createCard(Suit.Spades, Rank.Ten, 0)] }
            ],
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
            hand: [Card.createCard(Suit.Hearts, Rank.Ace, 0)], // Human with non-point card
          },
          {
            ...createTestGameState().players[1],
            hand: [Card.createCard(Suit.Spades, Rank.Seven, 0)],
          },
          {
            ...createTestGameState().players[2], // Partner with many point cards
            hand: [
              Card.createCard(Suit.Hearts, Rank.Five, 0),
              Card.createCard(Suit.Hearts, Rank.Ten, 0),
              Card.createCard(Suit.Hearts, Rank.King, 0),
              Card.createCard(Suit.Spades, Rank.Five, 0),
            ],
          },
          {
            ...createTestGameState().players[3],
            hand: [Card.createCard(Suit.Clubs, Rank.Eight, 0)],
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
          { ...createTestGameState().players[0], hand: Array(10).fill(Card.createCard(Suit.Hearts, Rank.Ace, 0)) },
          { ...createTestGameState().players[1], hand: Array(10).fill(Card.createCard(Suit.Spades, Rank.King, 0)) },
          { ...createTestGameState().players[2], hand: Array(10).fill(Card.createCard(Suit.Clubs, Rank.Queen, 0)) },
          { ...createTestGameState().players[3], hand: Array(10).fill(Card.createCard(Suit.Diamonds, Rank.Jack, 0)) },
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
          cards: [Card.createCard(Suit.Hearts, Rank.Ace, 0)],
          value: 14,
        },
        {
          type: ComboType.Single,
          cards: [Card.createCard(Suit.Spades, Rank.Seven, 0)],
          value: 7,
        },
        {
          type: ComboType.Single,
          cards: [Card.createJoker(JokerType.Big, 0)], // Trump
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
          cards: [Card.createCard(Suit.Hearts, Rank.Ace, 0)],
          value: 14,
        },
        {
          type: ComboType.Pair,
          cards: [
            Card.createCard(Suit.Spades, Rank.King, 0),
            Card.createCard(Suit.Spades, Rank.King, 0),
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
          cards: [Card.createCard(Suit.Hearts, Rank.Queen, 0)],
          value: 12,
        },
        {
          type: ComboType.Pair,
          cards: [
            Card.createCard(Suit.Spades, Rank.King, 0),
            Card.createCard(Suit.Spades, Rank.King, 0),
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
          cards: [Card.createCard(Suit.Hearts, Rank.Ace, 0)],
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
          cards: [Card.createCard(Suit.Hearts, Rank.Ace, 0)], // Non-trump Ace
          value: 14,
        },
        {
          type: ComboType.Pair,
          cards: [
            Card.createCard(Suit.Clubs, Rank.King, 0), // Trump suit King pair - should be filtered out
            Card.createCard(Suit.Clubs, Rank.King, 0),
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
        cards: [Card.createCard(Suit.Hearts, Rank.Ace, 0)],
        value: 14,
      });
    });

    it('should avoid trump suit Aces/Kings when trump is declared', () => {
      const validCombos = [
        {
          type: ComboType.Single,
          cards: [Card.createCard(Suit.Spades, Rank.Ace, 0)], // Trump suit Ace - should be avoided
          value: 14,
        },
        {
          type: ComboType.Single,
          cards: [Card.createCard(Suit.Hearts, Rank.Ace, 0)], // Non-trump Ace - should be preferred
          value: 14,
        },
        {
          type: ComboType.Single,
          cards: [Card.createCard(Suit.Spades, Rank.King, 0)], // Trump suit King - should be avoided
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
        cards: [Card.createCard(Suit.Hearts, Rank.Ace, 0)],
        value: 14,
      });
    });

    it('should select non-trump Aces when only non-trump combos available', () => {
      const validCombos = [
        {
          type: ComboType.Single,
          cards: [Card.createCard(Suit.Hearts, Rank.Ace, 0)], // Non-trump Ace - should be selected
          value: 14,
        },
        {
          type: ComboType.Single,
          cards: [Card.createCard(Suit.Diamonds, Rank.King, 0)], // Non-trump King
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
        cards: [Card.createCard(Suit.Hearts, Rank.Ace, 0)],
        value: 14,
      });
    });

    it('should prioritize Aces when no trump suit is declared', () => {
      const validCombos = [
        {
          type: ComboType.Single,
          cards: [Card.createCard(Suit.Hearts, Rank.King, 0)],
          value: 13,
        },
        {
          type: ComboType.Single,
          cards: [Card.createCard(Suit.Spades, Rank.Ace, 0)],
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
          cards: [Card.createCard(Suit.Hearts, Rank.Ace, 0)],
          value: 14,
        },
        {
          type: ComboType.Pair,
          cards: [
            Card.createCard(Suit.Spades, Rank.Ace, 0),
            Card.createCard(Suit.Spades, Rank.Ace, 0),
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

    // NEW: Test cases for trump rank Ace scenario
    it('should lead with Kings when trump rank is Ace (Kings become highest non-trump)', () => {
      const validCombos = [
        {
          type: ComboType.Single,
          cards: [Card.createCard(Suit.Hearts, Rank.King, 0)], // Now highest non-trump
          value: 13,
        },
        {
          type: ComboType.Single,
          cards: [Card.createCard(Suit.Spades, Rank.Queen, 0)], // Lower than King
          value: 12,
        },
        {
          type: ComboType.Single,
          cards: [Card.createCard(Suit.Clubs, Rank.Ace, 0)], // Trump rank - should be filtered out
          value: 14,
        },
      ];
      
      const trumpInfo = { trumpRank: Rank.Ace }; // Ace is trump rank
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
      expect(selected!.cards[0].rank).toBe(Rank.King); // Should select King when Ace is trump
      expect(selected!.cards[0].suit).toBe(Suit.Hearts);
    });

    it('should prefer King pairs over King singles when trump rank is Ace', () => {
      const validCombos = [
        {
          type: ComboType.Single,
          cards: [Card.createCard(Suit.Hearts, Rank.King, 0)],
          value: 13,
        },
        {
          type: ComboType.Pair,
          cards: [
            Card.createCard(Suit.Spades, Rank.King, 0),
            Card.createCard(Suit.Spades, Rank.King, 1),
          ],
          value: 26,
        },
        {
          type: ComboType.Single,
          cards: [Card.createCard(Suit.Clubs, Rank.Ace, 0)], // Trump rank - should be filtered out
          value: 14,
        },
      ];
      
      const trumpInfo = { trumpRank: Rank.Ace }; // Ace is trump rank
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
      expect(selected!.type).toBe(ComboType.Pair); // Should prefer King pair
      expect(selected!.cards[0].rank).toBe(Rank.King);
      expect(selected!.cards[1].rank).toBe(Rank.King);
    });

    it('should still lead with Aces when trump rank is not Ace (regression test)', () => {
      const validCombos = [
        {
          type: ComboType.Single,
          cards: [Card.createCard(Suit.Hearts, Rank.Ace, 0)], // Highest non-trump
          value: 14,
        },
        {
          type: ComboType.Single,
          cards: [Card.createCard(Suit.Spades, Rank.King, 0)], // Lower than Ace
          value: 13,
        },
        {
          type: ComboType.Single,
          cards: [Card.createCard(Suit.Clubs, Rank.Two, 0)], // Trump rank - should be filtered out
          value: 2,
        },
      ];
      
      const trumpInfo = { trumpRank: Rank.Two }; // Two is trump rank, Ace remains highest non-trump
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
      expect(selected!.cards[0].rank).toBe(Rank.Ace); // Should still select Ace when Two is trump
      expect(selected!.cards[0].suit).toBe(Suit.Hearts);
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
            hand: [Card.createCard(Suit.Hearts, Rank.Ace, 0)], // Human - good lead card
          },
          {
            ...createTestGameState().players[1],
            hand: [Card.createCard(Suit.Hearts, Rank.Seven, 0)], // Opponent
          },
          {
            ...createTestGameState().players[2], // Partner with point cards
            hand: [
              Card.createCard(Suit.Hearts, Rank.King, 0),
              Card.createCard(Suit.Hearts, Rank.Ten, 0),
              Card.createCard(Suit.Spades, Rank.Five, 0),
            ],
          },
          {
            ...createTestGameState().players[3],
            hand: [Card.createCard(Suit.Hearts, Rank.Eight, 0)], // Opponent
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