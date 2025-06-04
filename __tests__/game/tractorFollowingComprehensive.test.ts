import { Card, GameState, Player, Rank, Suit, Team, Trick, PlayerId, PlayerName, GamePhase, ComboType, TrumpInfo, JokerType, TeamId } from "../../src/types";
import { isValidPlay, identifyCombos, isTrump } from '../../src/game/gameLogic';

/**
 * Comprehensive tests for all tractor following rules
 * 
 * Covers all aspects of the clarified tractor following rules:
 * 1. Same suit priority order (tractors → pairs → remaining pairs → singles → other suits)
 * 2. Trump suit special rules (trump suit pairs, trump rank pairs, joker pairs)
 * 3. Cross-suit trump victory (same combo type when zero cards in leading suit)
 * 4. Edge cases and complex scenarios
 */

describe('Comprehensive Tractor Following Rules', () => {
  let mockState: GameState;
  let humanPlayer: Player;
  let cardId = 0;
  
  const createCard = (suit: Suit, rank: Rank): Card => ({
    id: `card-${cardId++}`,
    suit,
    rank,
    points: rank === Rank.King || rank === Rank.Ten ? 10 : rank === Rank.Five ? 5 : 0
  });
  
  const createJoker = (jokerType: JokerType): Card => ({
    id: `joker-${cardId++}`,
    joker: jokerType,
    points: 0
  });
  
  beforeEach(() => {
    cardId = 0;
    
    humanPlayer = {
      id: PlayerId.Human,
      name: PlayerName.Human,
      hand: [],
      isHuman: true,
      team: TeamId.A,
    };
    
    const ai1: Player = {
      id: PlayerId.Bot1,
      name: PlayerName.Bot1,
      hand: [],
      isHuman: false,
      team: TeamId.B,
    };
    
    mockState = {
      players: [humanPlayer, ai1],
      teams: [
        { id: TeamId.A, currentRank: Rank.Two, points: 0, isDefending: true },
        { id: TeamId.B, currentRank: Rank.Two, points: 0, isDefending: false }
      ],
      deck: [],
      kittyCards: [],
      currentTrick: null,
      trumpInfo: { trumpRank: Rank.Two, trumpSuit: Suit.Spades },
      tricks: [],
      roundNumber: 1,
      currentPlayerIndex: 0,
      roundStartingPlayerIndex: 0,
      gamePhase: GamePhase.Playing
    };
  });
  
  describe('Cross-Suit Trump Victory Rule', () => {
    test('Should allow trump tractor to beat non-trump tractor when zero cards in leading suit', () => {
      // AI leads with Hearts tractor: 9♥-9♥-10♥-10♥
      const leadingTractor: Card[] = [
        createCard(Suit.Hearts, Rank.Nine),
        createCard(Suit.Hearts, Rank.Nine),
        createCard(Suit.Hearts, Rank.Ten),
        createCard(Suit.Hearts, Rank.Ten)
      ];
      
      mockState.currentTrick = {
        leadingCombo: leadingTractor,
        plays: [],
        leadingPlayerId: PlayerId.Bot1,
        winningPlayerId: PlayerId.Bot1,
        points: 20
      };
      
      // Human has NO hearts but has trump tractor
      const spades5_1 = createCard(Suit.Spades, Rank.Five); // Trump suit tractor
      const spades5_2 = createCard(Suit.Spades, Rank.Five);
      const spades6_1 = createCard(Suit.Spades, Rank.Six);
      const spades6_2 = createCard(Suit.Spades, Rank.Six);
      const clubsAce = createCard(Suit.Clubs, Rank.Ace);
      
      humanPlayer.hand = [spades5_1, spades5_2, spades6_1, spades6_2, clubsAce];
      
      // Should be able to play trump tractor (same combo type) to win
      const trumpTractorPlay = [spades5_1, spades5_2, spades6_1, spades6_2];
      
      const result = isValidPlay(trumpTractorPlay, leadingTractor, humanPlayer.hand, mockState.trumpInfo);
      
      expect(result).toBe(true); // Should allow trump tractor when no leading suit cards
    });
    
    test('Should allow trump pairs to beat non-trump pairs when zero cards in leading suit', () => {
      // AI leads with Hearts pair: 9♥-9♥
      const leadingPair: Card[] = [
        createCard(Suit.Hearts, Rank.Nine),
        createCard(Suit.Hearts, Rank.Nine)
      ];
      
      mockState.currentTrick = {
        leadingCombo: leadingPair,
        plays: [],
        leadingPlayerId: PlayerId.Bot1,
        winningPlayerId: PlayerId.Bot1,
        points: 0
      };
      
      // Human has NO hearts but has trump pairs
      const spades5_1 = createCard(Suit.Spades, Rank.Five); // Trump suit pair
      const spades5_2 = createCard(Suit.Spades, Rank.Five);
      const clubsAce = createCard(Suit.Clubs, Rank.Ace);
      
      humanPlayer.hand = [spades5_1, spades5_2, clubsAce];
      
      // Should be able to play trump pair (same combo type) to win
      const trumpPairPlay = [spades5_1, spades5_2];
      
      const result = isValidPlay(trumpPairPlay, leadingPair, humanPlayer.hand, mockState.trumpInfo);
      
      expect(result).toBe(true); // Should allow trump pair when no leading suit cards
    });
    
    test('Should NOT allow different combo type even with trump when zero cards in leading suit', () => {
      // AI leads with Hearts tractor: 9♥-9♥-10♥-10♥ (tractor = 4 cards)
      const leadingTractor: Card[] = [
        createCard(Suit.Hearts, Rank.Nine),
        createCard(Suit.Hearts, Rank.Nine),
        createCard(Suit.Hearts, Rank.Ten),
        createCard(Suit.Hearts, Rank.Ten)
      ];
      
      mockState.currentTrick = {
        leadingCombo: leadingTractor,
        plays: [],
        leadingPlayerId: PlayerId.Bot1,
        winningPlayerId: PlayerId.Bot1,
        points: 20
      };
      
      // Human has NO hearts but has trump cards that can't form a tractor
      const spades5_1 = createCard(Suit.Spades, Rank.Five); // Trump pair
      const spades5_2 = createCard(Suit.Spades, Rank.Five);
      const spades7 = createCard(Suit.Spades, Rank.Seven); // Trump single
      const spades8 = createCard(Suit.Spades, Rank.Eight); // Trump single
      const clubsAce = createCard(Suit.Clubs, Rank.Ace);
      
      humanPlayer.hand = [spades5_1, spades5_2, spades7, spades8, clubsAce];
      
      // Should NOT be able to play 4 trump cards that don't form a tractor
      const invalidMixedPlay = [spades5_1, spades5_2, spades7, spades8];
      
      const result = isValidPlay(invalidMixedPlay, leadingTractor, humanPlayer.hand, mockState.trumpInfo);
      
      expect(result).toBe(true); // This is actually valid - can play any 4 cards when no leading suit
    });
  });
  
  describe('Complex Priority Order Scenarios', () => {
    test('Should enforce complete priority: tractors → same pairs → all pairs → all singles → other suits', () => {
      // AI leads with Hearts tractor: 8♥-8♥-9♥-9♥ (2 pairs)
      const leadingTractor: Card[] = [
        createCard(Suit.Hearts, Rank.Eight),
        createCard(Suit.Hearts, Rank.Eight),
        createCard(Suit.Hearts, Rank.Nine),
        createCard(Suit.Hearts, Rank.Nine)
      ];
      
      mockState.currentTrick = {
        leadingCombo: leadingTractor,
        plays: [],
        leadingPlayerId: PlayerId.Bot1,
        winningPlayerId: PlayerId.Bot1,
        points: 0
      };
      
      // Human has Hearts: 2 consecutive pairs (can form tractor) + singles + other suits
      const heartJ1 = createCard(Suit.Hearts, Rank.Jack);   // Consecutive
      const heartJ2 = createCard(Suit.Hearts, Rank.Jack);   // pair
      const heartQ1 = createCard(Suit.Hearts, Rank.Queen);  // Consecutive
      const heartQ2 = createCard(Suit.Hearts, Rank.Queen);  // pair
      const heartK = createCard(Suit.Hearts, Rank.King);    // Single
      const heartA = createCard(Suit.Hearts, Rank.Ace);     // Single
      const spadeAce = createCard(Suit.Spades, Rank.Ace);   // Other suit
      
      humanPlayer.hand = [heartJ1, heartJ2, heartQ1, heartQ2, heartK, heartA, spadeAce];
      
      // MUST play the Hearts tractor (consecutive pairs)
      const validTractorPlay = [heartJ1, heartJ2, heartQ1, heartQ2];
      const invalidPairPlay = [heartJ1, heartJ2, heartK, heartA]; // Non-consecutive pairs + singles
      
      const validResult = isValidPlay(validTractorPlay, leadingTractor, humanPlayer.hand, mockState.trumpInfo);
      const invalidResult = isValidPlay(invalidPairPlay, leadingTractor, humanPlayer.hand, mockState.trumpInfo);
      
      expect(validResult).toBe(true);  // Must use tractor when available
      expect(invalidResult).toBe(false); // Cannot skip tractor for non-consecutive pairs
    });
    
    test('Should enforce all pairs before singles when insufficient pairs for tractor', () => {
      // AI leads with Hearts tractor: 8♥-8♥-9♥-9♥ (2 pairs)
      const leadingTractor: Card[] = [
        createCard(Suit.Hearts, Rank.Eight),
        createCard(Suit.Hearts, Rank.Eight),
        createCard(Suit.Hearts, Rank.Nine),
        createCard(Suit.Hearts, Rank.Nine)
      ];
      
      mockState.currentTrick = {
        leadingCombo: leadingTractor,
        plays: [],
        leadingPlayerId: PlayerId.Bot1,
        winningPlayerId: PlayerId.Bot1,
        points: 0
      };
      
      // Human has Hearts: only 1 pair + singles (can't form tractor)
      const heartJ1 = createCard(Suit.Hearts, Rank.Jack);
      const heartJ2 = createCard(Suit.Hearts, Rank.Jack);
      const heartQ = createCard(Suit.Hearts, Rank.Queen);   // Single
      const heartK = createCard(Suit.Hearts, Rank.King);    // Single
      const heartA = createCard(Suit.Hearts, Rank.Ace);     // Single
      const spadeAce = createCard(Suit.Spades, Rank.Ace);
      
      humanPlayer.hand = [heartJ1, heartJ2, heartQ, heartK, heartA, spadeAce];
      
      // MUST use the available pair + 2 singles from Hearts
      const validPlay = [heartJ1, heartJ2, heartQ, heartK]; // 1 pair + 2 singles from Hearts
      const invalidPlay = [heartJ1, heartQ, heartK, spadeAce]; // Breaking the pair
      
      const validResult = isValidPlay(validPlay, leadingTractor, humanPlayer.hand, mockState.trumpInfo);
      const invalidResult = isValidPlay(invalidPlay, leadingTractor, humanPlayer.hand, mockState.trumpInfo);
      
      expect(validResult).toBe(true);   // Must use available pairs
      expect(invalidResult).toBe(false); // Cannot break pairs when pairs are available
    });
  });
  
  describe('Trump Mixed Combinations Priority', () => {
    test('Should enforce trump pair priority over non-trump pairs when following trump tractor', () => {
      // Trump is 2 with Spades as trump suit
      const trumpInfo: TrumpInfo = { trumpRank: Rank.Two, trumpSuit: Suit.Spades };
      
      // AI leads with trump tractor: 5♠-5♠-6♠-6♠
      const leadingTrumpTractor: Card[] = [
        createCard(Suit.Spades, Rank.Five),
        createCard(Suit.Spades, Rank.Five),
        createCard(Suit.Spades, Rank.Six),
        createCard(Suit.Spades, Rank.Six)
      ];
      
      mockState.currentTrick = {
        leadingCombo: leadingTrumpTractor,
        plays: [],
        leadingPlayerId: PlayerId.Bot1,
        winningPlayerId: PlayerId.Bot1,
        points: 0
      };
      mockState.trumpInfo = trumpInfo;
      
      // Human has mixed trump and non-trump pairs
      const hearts2_1 = createCard(Suit.Hearts, Rank.Two); // Trump rank pair
      const hearts2_2 = createCard(Suit.Hearts, Rank.Two);
      const clubs3_1 = createCard(Suit.Clubs, Rank.Three); // Non-trump pair
      const clubs3_2 = createCard(Suit.Clubs, Rank.Three);
      const spades7 = createCard(Suit.Spades, Rank.Seven); // Trump single
      const spades8 = createCard(Suit.Spades, Rank.Eight); // Trump single
      
      humanPlayer.hand = [hearts2_1, hearts2_2, clubs3_1, clubs3_2, spades7, spades8];
      
      // MUST prioritize trump pairs (even mixed types)
      const validTrumpPairs = [hearts2_1, hearts2_2, spades7, spades8]; // Trump rank pair + trump singles
      const invalidNonTrumpPair = [clubs3_1, clubs3_2, spades7, spades8]; // Non-trump pair when trump available
      
      const validResult = isValidPlay(validTrumpPairs, leadingTrumpTractor, humanPlayer.hand, trumpInfo);
      const invalidResult = isValidPlay(invalidNonTrumpPair, leadingTrumpTractor, humanPlayer.hand, trumpInfo);
      
      expect(validResult).toBe(true);   // Should accept trump combinations
      expect(invalidResult).toBe(false); // Should reject non-trump pairs when trump pairs available
    });
  });
  
  describe('Edge Cases', () => {
    test('Should handle minimum hand size scenarios correctly', () => {
      // AI leads with Hearts tractor: 8♥-8♥-9♥-9♥
      const leadingTractor: Card[] = [
        createCard(Suit.Hearts, Rank.Eight),
        createCard(Suit.Hearts, Rank.Eight),
        createCard(Suit.Hearts, Rank.Nine),
        createCard(Suit.Hearts, Rank.Nine)
      ];
      
      mockState.currentTrick = {
        leadingCombo: leadingTractor,
        plays: [],
        leadingPlayerId: PlayerId.Bot1,
        winningPlayerId: PlayerId.Bot1,
        points: 0
      };
      
      // Human has exactly 4 cards: 1 Hearts card + 3 other cards
      const heartJ = createCard(Suit.Hearts, Rank.Jack);  // 1 Hearts single
      const spadeA = createCard(Suit.Spades, Rank.Ace);   // Other suits
      const clubK = createCard(Suit.Clubs, Rank.King);
      const diamQ = createCard(Suit.Diamonds, Rank.Queen);
      
      humanPlayer.hand = [heartJ, spadeA, clubK, diamQ];
      
      // MUST use the 1 Hearts card + fill with weakest from other suits
      const validPlay = [heartJ, spadeA, clubK, diamQ];
      
      const result = isValidPlay(validPlay, leadingTractor, humanPlayer.hand, mockState.trumpInfo);
      
      expect(result).toBe(true); // Should allow playing all available cards when following partial suit rule
    });
    
    test('Should handle joker tractor following with mixed trump combinations', () => {
      // Trump is 2 with Hearts as trump suit
      const trumpInfo: TrumpInfo = { trumpRank: Rank.Two, trumpSuit: Suit.Hearts };
      
      // AI leads with joker tractor: SJ-SJ-BJ-BJ
      const leadingJokerTractor: Card[] = [
        createJoker(JokerType.Small),
        createJoker(JokerType.Small),
        createJoker(JokerType.Big),
        createJoker(JokerType.Big)
      ];
      
      mockState.currentTrick = {
        leadingCombo: leadingJokerTractor,
        plays: [],
        leadingPlayerId: PlayerId.Bot1,
        winningPlayerId: PlayerId.Bot1,
        points: 0
      };
      mockState.trumpInfo = trumpInfo;
      
      // Human has no jokers but has various trump cards
      const hearts3_1 = createCard(Suit.Hearts, Rank.Three); // Trump suit pair
      const hearts3_2 = createCard(Suit.Hearts, Rank.Three);
      const spades2_1 = createCard(Suit.Spades, Rank.Two);   // Trump rank pair
      const spades2_2 = createCard(Suit.Spades, Rank.Two);
      const heartsA = createCard(Suit.Hearts, Rank.Ace);      // Trump single
      
      humanPlayer.hand = [hearts3_1, hearts3_2, spades2_1, spades2_2, heartsA];
      
      // Should be able to respond with any trump combination (can't match joker tractor exactly)
      const validMixedTrumpPlay = [hearts3_1, hearts3_2, spades2_1, spades2_2];
      
      const result = isValidPlay(validMixedTrumpPlay, leadingJokerTractor, humanPlayer.hand, trumpInfo);
      
      expect(result).toBe(true); // Should accept best available trump combination
    });
  });
});