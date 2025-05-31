import { Card, GameState, Player, Rank, Suit, Team, Trick, PlayerId, PlayerName, GamePhase, ComboType, TrumpInfo, JokerType, TeamId } from "../../src/types";
import { isValidPlay, identifyCombos, isTrump } from '../../src/game/gameLogic';

/**
 * Detailed tests for trump tractor following rules mentioned in Issue #71
 * 
 * Focus on the trump-specific rule: "When following tractor in trumps, same rule applies, 
 * besides all trump suit pairs, trump rank pairs, joke pairs are all counted as pairs."
 */

describe('Trump Tractor Following Detailed Rules (Issue #71)', () => {
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
      trumpInfo: { trumpRank: Rank.Two,  trumpSuit: Suit.Spades },
      tricks: [],
      roundNumber: 1,
      currentPlayerIndex: 0,
      gamePhase: GamePhase.Playing
    };
  });
  
  describe('Trump Suit Pairs Count as Valid Pairs', () => {
    test('Should accept trump suit pairs when following trump tractor', () => {
      // Trump is 2 with spades as trump suit
      const trumpInfo: TrumpInfo = { trumpRank: Rank.Two,  trumpSuit: Suit.Spades };
      
      // AI leads with spades trump tractor: 3-3-4-4
      const leadingTrumpTractor: Card[] = [
        createCard(Suit.Spades, Rank.Three),
        createCard(Suit.Spades, Rank.Three),
        createCard(Suit.Spades, Rank.Four),
        createCard(Suit.Spades, Rank.Four)
      ];
      
      mockState.currentTrick = {
        leadingCombo: leadingTrumpTractor,
        plays: [],
        leadingPlayerId: PlayerId.Bot1,
        winningPlayerId: PlayerId.Bot1,
        points: 0
      };
      mockState.trumpInfo = trumpInfo;
      
      // Human has trump suit pairs (non-consecutive - so not a tractor)
      const spades5_1 = createCard(Suit.Spades, Rank.Five);
      const spades5_2 = createCard(Suit.Spades, Rank.Five);
      const spades7_1 = createCard(Suit.Spades, Rank.Seven);
      const spades7_2 = createCard(Suit.Spades, Rank.Seven);
      const spadesAce = createCard(Suit.Spades, Rank.Ace);
      
      humanPlayer.hand = [spades5_1, spades5_2, spades7_1, spades7_2, spadesAce];
      
      // Should be able to use trump suit pairs to follow trump tractor
      const validTrumpPairsPlay = [spades5_1, spades5_2, spades7_1, spades7_2];
      
      const result = isValidPlay(validTrumpPairsPlay, leadingTrumpTractor, humanPlayer.hand, trumpInfo);
      
      expect(result).toBe(true); // Should accept trump suit pairs
    });
  });
  
  describe('Trump Rank Pairs Count as Valid Pairs', () => {
    test('Should accept trump rank pairs from different suits when following trump tractor', () => {
      // Trump is 2 with spades as trump suit
      const trumpInfo: TrumpInfo = { trumpRank: Rank.Two,  trumpSuit: Suit.Spades };
      
      // AI leads with spades trump tractor: 3-3-4-4 (trump suit tractor)
      const leadingTrumpTractor: Card[] = [
        createCard(Suit.Spades, Rank.Three),
        createCard(Suit.Spades, Rank.Three),
        createCard(Suit.Spades, Rank.Four),
        createCard(Suit.Spades, Rank.Four)
      ];
      
      mockState.currentTrick = {
        leadingCombo: leadingTrumpTractor,
        plays: [],
        leadingPlayerId: PlayerId.Bot1,
        winningPlayerId: PlayerId.Bot1,
        points: 0
      };
      mockState.trumpInfo = trumpInfo;
      
      // Human has trump rank pairs (2s) from different suits - these are trump cards
      const hearts2_1 = createCard(Suit.Hearts, Rank.Two);
      const hearts2_2 = createCard(Suit.Hearts, Rank.Two);
      const clubs2_1 = createCard(Suit.Clubs, Rank.Two);
      const clubs2_2 = createCard(Suit.Clubs, Rank.Two);
      const spadesAce = createCard(Suit.Spades, Rank.Ace);
      
      humanPlayer.hand = [hearts2_1, hearts2_2, clubs2_1, clubs2_2, spadesAce];
      
      // Verify these cards are considered trump
      expect(isTrump(hearts2_1, trumpInfo)).toBe(true);
      expect(isTrump(hearts2_2, trumpInfo)).toBe(true);
      expect(isTrump(clubs2_1, trumpInfo)).toBe(true);
      expect(isTrump(clubs2_2, trumpInfo)).toBe(true);
      
      // Should be able to use trump rank pairs (2s) to follow trump tractor
      const validTrumpRankPairsPlay = [hearts2_1, hearts2_2, clubs2_1, clubs2_2];
      
      const result = isValidPlay(validTrumpRankPairsPlay, leadingTrumpTractor, humanPlayer.hand, trumpInfo);
      
      expect(result).toBe(true); // Should accept trump rank pairs
    });
  });
  
  describe('Joker Pairs Count as Valid Pairs', () => {
    test('Should accept joker pairs when following trump tractor', () => {
      // Trump is 2 with spades as trump suit
      const trumpInfo: TrumpInfo = { trumpRank: Rank.Two,  trumpSuit: Suit.Spades };
      
      // AI leads with spades trump tractor: 3-3-4-4
      const leadingTrumpTractor: Card[] = [
        createCard(Suit.Spades, Rank.Three),
        createCard(Suit.Spades, Rank.Three),
        createCard(Suit.Spades, Rank.Four),
        createCard(Suit.Spades, Rank.Four)
      ];
      
      mockState.currentTrick = {
        leadingCombo: leadingTrumpTractor,
        plays: [],
        leadingPlayerId: PlayerId.Bot1,
        winningPlayerId: PlayerId.Bot1,
        points: 0
      };
      mockState.trumpInfo = trumpInfo;
      
      // Human has joker pairs
      const smallJoker1 = createJoker(JokerType.Small);
      const smallJoker2 = createJoker(JokerType.Small);
      const bigJoker1 = createJoker(JokerType.Big);
      const bigJoker2 = createJoker(JokerType.Big);
      const spadesAce = createCard(Suit.Spades, Rank.Ace);
      
      humanPlayer.hand = [smallJoker1, smallJoker2, bigJoker1, bigJoker2, spadesAce];
      
      // Verify jokers are considered trump
      expect(isTrump(smallJoker1, trumpInfo)).toBe(true);
      expect(isTrump(bigJoker1, trumpInfo)).toBe(true);
      
      // Should be able to use joker pairs to follow trump tractor
      const validJokerPairsPlay = [smallJoker1, smallJoker2, bigJoker1, bigJoker2];
      
      const result = isValidPlay(validJokerPairsPlay, leadingTrumpTractor, humanPlayer.hand, trumpInfo);
      
      expect(result).toBe(true); // Should accept joker pairs
    });
  });
  
  describe('Mixed Trump Pairs Should Work', () => {
    test('Should accept mix of trump suit pairs, trump rank pairs, and joker pairs', () => {
      // Trump is 2 with spades as trump suit
      const trumpInfo: TrumpInfo = { trumpRank: Rank.Two,  trumpSuit: Suit.Spades };
      
      // AI leads with big trump tractor: 6 cards (3 pairs)
      const leadingBigTrumpTractor: Card[] = [
        createCard(Suit.Spades, Rank.Three),
        createCard(Suit.Spades, Rank.Three),
        createCard(Suit.Spades, Rank.Four),
        createCard(Suit.Spades, Rank.Four),
        createCard(Suit.Spades, Rank.Five),
        createCard(Suit.Spades, Rank.Five)
      ];
      
      mockState.currentTrick = {
        leadingCombo: leadingBigTrumpTractor,
        plays: [],
        leadingPlayerId: PlayerId.Bot1,
        winningPlayerId: PlayerId.Bot1,
        points: 0
      };
      mockState.trumpInfo = trumpInfo;
      
      // Human has mixed trump pairs: 1 trump suit pair, 1 trump rank pair, 1 joker pair
      const spades6_1 = createCard(Suit.Spades, Rank.Six); // Trump suit pair
      const spades6_2 = createCard(Suit.Spades, Rank.Six);
      const hearts2_1 = createCard(Suit.Hearts, Rank.Two); // Trump rank pair
      const hearts2_2 = createCard(Suit.Hearts, Rank.Two);
      const smallJoker1 = createJoker(JokerType.Small); // Joker pair
      const smallJoker2 = createJoker(JokerType.Small);
      const clubsAce = createCard(Suit.Clubs, Rank.Ace);
      
      humanPlayer.hand = [spades6_1, spades6_2, hearts2_1, hearts2_2, smallJoker1, smallJoker2, clubsAce];
      
      // Should be able to use mixed trump pairs to follow trump tractor
      const validMixedTrumpPairsPlay = [spades6_1, spades6_2, hearts2_1, hearts2_2, smallJoker1, smallJoker2];
      
      const result = isValidPlay(validMixedTrumpPairsPlay, leadingBigTrumpTractor, humanPlayer.hand, trumpInfo);
      
      expect(result).toBe(true); // Should accept mixed trump pairs
    });
  });
  
  describe('Cannot Use Non-Trump Pairs for Trump Tractor', () => {
    test('Should reject non-trump pairs when player has trump pairs available', () => {
      // Trump is 2 with spades as trump suit
      const trumpInfo: TrumpInfo = { trumpRank: Rank.Two,  trumpSuit: Suit.Spades };
      
      // AI leads with spades trump tractor: 3-3-4-4
      const leadingTrumpTractor: Card[] = [
        createCard(Suit.Spades, Rank.Three),
        createCard(Suit.Spades, Rank.Three),
        createCard(Suit.Spades, Rank.Four),
        createCard(Suit.Spades, Rank.Four)
      ];
      
      mockState.currentTrick = {
        leadingCombo: leadingTrumpTractor,
        plays: [],
        leadingPlayerId: PlayerId.Bot1,
        winningPlayerId: PlayerId.Bot1,
        points: 0
      };
      mockState.trumpInfo = trumpInfo;
      
      // Human has both trump pairs and non-trump pairs
      const spades5_1 = createCard(Suit.Spades, Rank.Five); // Trump pair
      const spades5_2 = createCard(Suit.Spades, Rank.Five);
      const hearts3_1 = createCard(Suit.Hearts, Rank.Three); // Non-trump pair
      const hearts3_2 = createCard(Suit.Hearts, Rank.Three);
      const clubsAce = createCard(Suit.Clubs, Rank.Ace);
      
      humanPlayer.hand = [spades5_1, spades5_2, hearts3_1, hearts3_2, clubsAce];
      
      // Verify trump status
      expect(isTrump(spades5_1, trumpInfo)).toBe(true);
      expect(isTrump(hearts3_1, trumpInfo)).toBe(false);
      
      // Should NOT be able to use non-trump pairs when trump pairs are available
      const invalidNonTrumpPairsPlay = [hearts3_1, hearts3_2, clubsAce, spades5_1]; // Non-trump pair + singles
      const validTrumpPairsPlay = [spades5_1, spades5_2, hearts3_1, hearts3_2]; // Must use trump pairs
      
      const invalidResult = isValidPlay(invalidNonTrumpPairsPlay, leadingTrumpTractor, humanPlayer.hand, trumpInfo);
      const validResult = isValidPlay(validTrumpPairsPlay, leadingTrumpTractor, humanPlayer.hand, trumpInfo);
      
      expect(invalidResult).toBe(false); // Should reject non-trump pairs when trump available
      expect(validResult).toBe(true); // Should accept when following correctly
    });
  });
  
  describe('Complex Trump Hierarchy Test', () => {
    test('Should properly handle complex trump tractor following with all trump types', () => {
      // Trump is 2 with hearts as trump suit
      const trumpInfo: TrumpInfo = { trumpRank: Rank.Two,  trumpSuit: Suit.Hearts };
      
      // AI leads with big joker tractor (highest trump): SJ-SJ-BJ-BJ
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
      
      // Human has various trump cards but no jokers
      const hearts3_1 = createCard(Suit.Hearts, Rank.Three); // Trump suit pair
      const hearts3_2 = createCard(Suit.Hearts, Rank.Three);
      const spades2_1 = createCard(Suit.Spades, Rank.Two); // Trump rank pair  
      const spades2_2 = createCard(Suit.Spades, Rank.Two);
      const clubs2_1 = createCard(Suit.Clubs, Rank.Two); // Another trump rank pair
      const clubs2_2 = createCard(Suit.Clubs, Rank.Two);
      const heartsAce = createCard(Suit.Hearts, Rank.Ace);
      
      humanPlayer.hand = [hearts3_1, hearts3_2, spades2_1, spades2_2, clubs2_1, clubs2_2, heartsAce];
      
      // Should be able to use any combination of trump pairs
      const validTrumpCombination1 = [hearts3_1, hearts3_2, spades2_1, spades2_2]; // Trump suit + trump rank
      const validTrumpCombination2 = [spades2_1, spades2_2, clubs2_1, clubs2_2]; // Two trump rank pairs
      
      const result1 = isValidPlay(validTrumpCombination1, leadingJokerTractor, humanPlayer.hand, trumpInfo);
      const result2 = isValidPlay(validTrumpCombination2, leadingJokerTractor, humanPlayer.hand, trumpInfo);
      
      expect(result1).toBe(true); // Should accept trump suit + trump rank pairs
      expect(result2).toBe(true); // Should accept multiple trump rank pairs
    });
  });
});