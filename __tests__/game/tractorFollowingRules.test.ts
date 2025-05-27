import { Card, GameState, Player, Rank, Suit, Team, Trick, PlayerId, PlayerName, GamePhase, ComboType, TrumpInfo } from "../../src/types";
import { isValidPlay, identifyCombos } from '../../src/game/gameLogic';

/**
 * Tests for tractor following rules (Issue #71)
 * 
 * When a tractor is led, players must follow this sequence:
 * 1. Must play tractor in the same suit if available  
 * 2. Must play same number of pairs as leading tractor if available
 * 3. Must use all pairs in the same suit if available
 * 4. Use singles in the same suit, when no enough pairs
 * 5. Other small cards from other suits when run out same suit
 * 
 * Trump tractor following: same rules apply, but all trump suit pairs,
 * trump rank pairs, and joker pairs count as pairs.
 */

describe('Tractor Following Rules (Issue #71)', () => {
  let mockState: GameState;
  let humanPlayer: Player;
  let cardId = 0;
  
  const createCard = (suit: Suit, rank: Rank): Card => ({
    id: `card-${cardId++}`,
    suit,
    rank,
    points: rank === Rank.King || rank === Rank.Ten ? 10 : rank === Rank.Five ? 5 : 0
  });
  
  beforeEach(() => {
    cardId = 0;
    
    humanPlayer = {
      id: PlayerId.Human,
      name: PlayerName.Human,
      hand: [],
      isHuman: true,
      team: 'A',
    };
    
    const ai1: Player = {
      id: PlayerId.Bot1,
      name: PlayerName.Bot1,
      hand: [],
      isHuman: false,
      team: 'B',
    };
    
    mockState = {
      players: [humanPlayer, ai1],
      teams: [
        { id: 'A', currentRank: Rank.Two, points: 0, isDefending: true },
        { id: 'B', currentRank: Rank.Two, points: 0, isDefending: false }
      ],
      deck: [],
      kittyCards: [],
      currentTrick: null,
      trumpInfo: { trumpRank: Rank.Two, declared: true, trumpSuit: Suit.Spades },
      tricks: [],
      roundNumber: 1,
      currentPlayerIndex: 0,
      gamePhase: GamePhase.Playing
    };
  });
  
  describe('Rule 1: Must play tractor in same suit if available', () => {
    test('Should enforce tractor following when player has matching tractor', () => {
      // AI leads with hearts tractor: 9-9-10-10  
      const leadingTractor: Card[] = [
        createCard(Suit.Hearts, Rank.Nine),
        createCard(Suit.Hearts, Rank.Nine),
        createCard(Suit.Hearts, Rank.Ten),
        createCard(Suit.Hearts, Rank.Ten)
      ];
      
      mockState.currentTrick = {
        leadingCombo: leadingTractor,
        plays: [],
        leadingPlayerId: 'ai1',
        winningPlayerId: 'ai1',
        points: 20
      };
      
      // Human has hearts tractor: J-J-Q-Q and other cards
      const heartJack1 = createCard(Suit.Hearts, Rank.Jack);
      const heartJack2 = createCard(Suit.Hearts, Rank.Jack);
      const heartQueen1 = createCard(Suit.Hearts, Rank.Queen);
      const heartQueen2 = createCard(Suit.Hearts, Rank.Queen);
      const heartKing = createCard(Suit.Hearts, Rank.King);
      const spadeAce = createCard(Suit.Spades, Rank.Ace);
      
      humanPlayer.hand = [heartJack1, heartJack2, heartQueen1, heartQueen2, heartKing, spadeAce];
      
      // Must play the hearts tractor
      const validTractorPlay = [heartJack1, heartJack2, heartQueen1, heartQueen2];
      const invalidSinglesPlay = [heartKing, heartJack1, heartQueen1, spadeAce]; // 4 singles instead of tractor
      
      const validResult = isValidPlay(validTractorPlay, leadingTractor, humanPlayer.hand, mockState.trumpInfo);
      const invalidResult = isValidPlay(invalidSinglesPlay, leadingTractor, humanPlayer.hand, mockState.trumpInfo);
      
      expect(validResult).toBe(true);
      expect(invalidResult).toBe(false); // Should fail - must use tractor when available
    });
  });
  
  describe('Rule 2: Must play same number of pairs when no tractor available', () => {
    test('Should enforce pair following when player has pairs but no tractor', () => {
      // AI leads with hearts tractor: 9-9-10-10 (2 pairs)
      const leadingTractor: Card[] = [
        createCard(Suit.Hearts, Rank.Nine),
        createCard(Suit.Hearts, Rank.Nine),
        createCard(Suit.Hearts, Rank.Ten),
        createCard(Suit.Hearts, Rank.Ten)
      ];
      
      mockState.currentTrick = {
        leadingCombo: leadingTractor,
        plays: [],
        leadingPlayerId: 'ai1',
        winningPlayerId: 'ai1',
        points: 20
      };
      
      // Human has 2 non-consecutive pairs in hearts (no tractor) + other cards
      const heartJack1 = createCard(Suit.Hearts, Rank.Jack);
      const heartJack2 = createCard(Suit.Hearts, Rank.Jack);
      const heartKing1 = createCard(Suit.Hearts, Rank.King);
      const heartKing2 = createCard(Suit.Hearts, Rank.King);
      const heartAce = createCard(Suit.Hearts, Rank.Ace);
      const spadeTwo = createCard(Suit.Spades, Rank.Two);
      
      humanPlayer.hand = [heartJack1, heartJack2, heartKing1, heartKing2, heartAce, spadeTwo];
      
      // Must play 2 pairs (same number as tractor), not singles
      const validPairsPlay = [heartJack1, heartJack2, heartKing1, heartKing2];
      const invalidSinglesPlay = [heartJack1, heartKing1, heartAce, spadeTwo]; // 4 singles instead of pairs
      
      const validResult = isValidPlay(validPairsPlay, leadingTractor, humanPlayer.hand, mockState.trumpInfo);
      const invalidResult = isValidPlay(invalidSinglesPlay, leadingTractor, humanPlayer.hand, mockState.trumpInfo);
      
      expect(validResult).toBe(true);
      expect(invalidResult).toBe(false); // Should fail - must use pairs when available
    });
  });
  
  describe('Rule 3: Must use all pairs in same suit if available', () => {
    test('Should enforce using all available pairs in suit', () => {
      // AI leads with hearts tractor: 9-9-10-10 (2 pairs)
      const leadingTractor: Card[] = [
        createCard(Suit.Hearts, Rank.Nine),
        createCard(Suit.Hearts, Rank.Nine),
        createCard(Suit.Hearts, Rank.Ten),
        createCard(Suit.Hearts, Rank.Ten)
      ];
      
      mockState.currentTrick = {
        leadingCombo: leadingTractor,
        plays: [],
        leadingPlayerId: 'ai1',
        winningPlayerId: 'ai1',
        points: 20
      };
      
      // Human has 3 pairs in hearts but tractor only needs 2 pairs
      const heartJack1 = createCard(Suit.Hearts, Rank.Jack);
      const heartJack2 = createCard(Suit.Hearts, Rank.Jack);
      const heartQueen1 = createCard(Suit.Hearts, Rank.Queen);
      const heartQueen2 = createCard(Suit.Hearts, Rank.Queen);
      const heartKing1 = createCard(Suit.Hearts, Rank.King);
      const heartKing2 = createCard(Suit.Hearts, Rank.King);
      const spadeAce = createCard(Suit.Spades, Rank.Ace);
      
      humanPlayer.hand = [heartJack1, heartJack2, heartQueen1, heartQueen2, heartKing1, heartKing2, spadeAce];
      
      // Should be able to choose any 2 pairs from the 3 available
      const validPlay1 = [heartJack1, heartJack2, heartQueen1, heartQueen2];
      const validPlay2 = [heartQueen1, heartQueen2, heartKing1, heartKing2];
      const invalidPlay = [heartJack1, heartQueen1, heartKing1, spadeAce]; // Singles instead of pairs
      
      const validResult1 = isValidPlay(validPlay1, leadingTractor, humanPlayer.hand, mockState.trumpInfo);
      const validResult2 = isValidPlay(validPlay2, leadingTractor, humanPlayer.hand, mockState.trumpInfo);
      const invalidResult = isValidPlay(invalidPlay, leadingTractor, humanPlayer.hand, mockState.trumpInfo);
      
      expect(validResult1).toBe(true);
      expect(validResult2).toBe(true);
      expect(invalidResult).toBe(false); // Should fail - must use pairs when available
    });
  });
  
  describe('Rule 4: Use singles when no enough pairs', () => {
    test('Should allow singles when player has insufficient pairs', () => {
      // AI leads with hearts tractor: 9-9-10-10 (2 pairs = 4 cards)
      const leadingTractor: Card[] = [
        createCard(Suit.Hearts, Rank.Nine),
        createCard(Suit.Hearts, Rank.Nine),
        createCard(Suit.Hearts, Rank.Ten),
        createCard(Suit.Hearts, Rank.Ten)
      ];
      
      mockState.currentTrick = {
        leadingCombo: leadingTractor,
        plays: [],
        leadingPlayerId: 'ai1',
        winningPlayerId: 'ai1',
        points: 20
      };
      
      // Human has only 1 pair in hearts + singles
      const heartJack1 = createCard(Suit.Hearts, Rank.Jack);
      const heartJack2 = createCard(Suit.Hearts, Rank.Jack);
      const heartQueen = createCard(Suit.Hearts, Rank.Queen);
      const heartKing = createCard(Suit.Hearts, Rank.King);
      const spadeAce = createCard(Suit.Spades, Rank.Ace);
      
      humanPlayer.hand = [heartJack1, heartJack2, heartQueen, heartKing, spadeAce];
      
      // Must use the available pair + singles from same suit, then other suits
      const validPlay = [heartJack1, heartJack2, heartQueen, heartKing]; // 1 pair + 2 singles from hearts
      const invalidPlay = [heartJack1, heartQueen, spadeAce, heartKing]; // Not using the pair
      
      const validResult = isValidPlay(validPlay, leadingTractor, humanPlayer.hand, mockState.trumpInfo);
      const invalidResult = isValidPlay(invalidPlay, leadingTractor, humanPlayer.hand, mockState.trumpInfo);
      
      expect(validResult).toBe(true);
      expect(invalidResult).toBe(false); // Should fail - must use available pairs
    });
  });
  
  describe('Rule 5: Other cards when run out of same suit', () => {
    test('Should allow any cards when no cards of leading suit', () => {
      // AI leads with hearts tractor: 9-9-10-10
      const leadingTractor: Card[] = [
        createCard(Suit.Hearts, Rank.Nine),
        createCard(Suit.Hearts, Rank.Nine),
        createCard(Suit.Hearts, Rank.Ten),
        createCard(Suit.Hearts, Rank.Ten)
      ];
      
      mockState.currentTrick = {
        leadingCombo: leadingTractor,
        plays: [],
        leadingPlayerId: 'ai1',
        winningPlayerId: 'ai1',
        points: 20
      };
      
      // Human has no hearts - only other suits
      const spadeAce = createCard(Suit.Spades, Rank.Ace);
      const clubKing = createCard(Suit.Clubs, Rank.King);
      const diamondQueen = createCard(Suit.Diamonds, Rank.Queen);
      const clubJack = createCard(Suit.Clubs, Rank.Jack);
      
      humanPlayer.hand = [spadeAce, clubKing, diamondQueen, clubJack];
      
      // Can play any 4 cards
      const anyCardsPlay = [spadeAce, clubKing, diamondQueen, clubJack];
      
      const result = isValidPlay(anyCardsPlay, leadingTractor, humanPlayer.hand, mockState.trumpInfo);
      
      expect(result).toBe(true); // Should be valid - no hearts available
    });
  });
  
  describe('Trump Tractor Following Rules', () => {
    test('Should treat trump rank pairs as valid pairs when following trump tractor', () => {
      // Create trump info where 2 is trump rank and spades is trump suit
      const trumpInfo: TrumpInfo = { trumpRank: Rank.Two, declared: true, trumpSuit: Suit.Spades };
      
      // AI leads with trump tractor (spades): 3-3-4-4
      const leadingTrumpTractor: Card[] = [
        createCard(Suit.Spades, Rank.Three),
        createCard(Suit.Spades, Rank.Three),
        createCard(Suit.Spades, Rank.Four),
        createCard(Suit.Spades, Rank.Four)
      ];
      
      mockState.currentTrick = {
        leadingCombo: leadingTrumpTractor,
        plays: [],
        leadingPlayerId: 'ai1',
        winningPlayerId: 'ai1',
        points: 0
      };
      mockState.trumpInfo = trumpInfo;
      
      // Human has trump rank pairs (2s) in different suits - these count as trump pairs
      const hearts2_1 = createCard(Suit.Hearts, Rank.Two);
      const hearts2_2 = createCard(Suit.Hearts, Rank.Two);
      const clubs2_1 = createCard(Suit.Clubs, Rank.Two);
      const clubs2_2 = createCard(Suit.Clubs, Rank.Two);
      const spadeAce = createCard(Suit.Spades, Rank.Ace);
      
      humanPlayer.hand = [hearts2_1, hearts2_2, clubs2_1, clubs2_2, spadeAce];
      
      // Should be able to use trump rank pairs as valid pairs
      const validTrumpPairsPlay = [hearts2_1, hearts2_2, clubs2_1, clubs2_2];
      
      const result = isValidPlay(validTrumpPairsPlay, leadingTrumpTractor, humanPlayer.hand, trumpInfo);
      
      expect(result).toBe(true); // Should be valid - trump rank pairs count as pairs
    });
  });
  
  describe('Current Implementation Status', () => {
    test('GOOD: Current implementation correctly rejects singles when pairs available', () => {
      // This test shows the current implementation is working correctly
      
      // AI leads with hearts tractor: 9-9-10-10
      const leadingTractor: Card[] = [
        createCard(Suit.Hearts, Rank.Nine),
        createCard(Suit.Hearts, Rank.Nine),
        createCard(Suit.Hearts, Rank.Ten),
        createCard(Suit.Hearts, Rank.Ten)
      ];
      
      mockState.currentTrick = {
        leadingCombo: leadingTractor,
        plays: [],
        leadingPlayerId: 'ai1',
        winningPlayerId: 'ai1',
        points: 20
      };
      
      // Human has pairs available
      const heartJack1 = createCard(Suit.Hearts, Rank.Jack);
      const heartJack2 = createCard(Suit.Hearts, Rank.Jack);
      const heartQueen1 = createCard(Suit.Hearts, Rank.Queen);
      const heartQueen2 = createCard(Suit.Hearts, Rank.Queen);
      const heartKing = createCard(Suit.Hearts, Rank.King);
      const heartAce = createCard(Suit.Hearts, Rank.Ace);
      
      humanPlayer.hand = [heartJack1, heartJack2, heartQueen1, heartQueen2, heartKing, heartAce];
      
      // This should be invalid and current implementation correctly rejects it
      const invalidSinglesPlay = [heartJack1, heartQueen1, heartKing, heartAce]; // 4 singles
      
      const result = isValidPlay(invalidSinglesPlay, leadingTractor, humanPlayer.hand, mockState.trumpInfo);
      
      // Current implementation correctly rejects this
      expect(result).toBe(false); // CORRECT - must use pairs when available
    });
  });
});