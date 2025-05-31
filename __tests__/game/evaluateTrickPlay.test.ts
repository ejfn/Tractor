import { evaluateTrickPlay, TrickPlayResult } from '../../src/game/gameLogic';
import { createCard } from '../helpers/cards';
import { Suit, Rank, ComboType, PlayerId } from '../../src/types';

describe('evaluateTrickPlay - Context-Aware Trick Evaluation', () => {
  const trumpInfo = { trumpSuit: Suit.Hearts, trumpRank: Rank.Two,  };

  describe('The Original Bug: A♣-A♣ vs 4♦-4♦', () => {
    test('A♣-A♣ should NOT beat 4♦-4♦ when 4♦-4♦ leads', () => {
      // Set up trick where 4♦-4♦ is leading
      const leadingCombo = [
        createCard(Suit.Diamonds, Rank.Four, '1'),
        createCard(Suit.Diamonds, Rank.Four, '2'),
      ];

      const currentTrick = {
        leadingPlayerId: PlayerId.Bot1,
        leadingCombo: leadingCombo,
        plays: [],
        winningPlayerId: PlayerId.Bot1, // Bot1 is currently winning
        points: 0,
      };

      // Try to follow with A♣-A♣
      const proposedPlay = [
        createCard(Suit.Clubs, Rank.Ace, '1'),
        createCard(Suit.Clubs, Rank.Ace, '2'),
      ];

      // Player hand that's void in diamonds (so play is legal)
      const playerHand = [
        ...proposedPlay,
        createCard(Suit.Spades, Rank.Seven, '1'),
        createCard(Suit.Hearts, Rank.Eight, '2'),
      ];

      const result = evaluateTrickPlay(proposedPlay, currentTrick, trumpInfo, playerHand);

      expect(result.canBeat).toBe(false); // ✅ A♣-A♣ cannot beat 4♦-4♦ 
      expect(result.isLegal).toBe(true);  // Legal because void in diamonds
      expect(result.reason).toContain('Cannot beat current winner');
    });

    test('4♦-4♦ should beat A♣-A♣ when A♣-A♣ leads', () => {
      // Set up trick where A♣-A♣ is leading
      const leadingCombo = [
        createCard(Suit.Clubs, Rank.Ace, '1'),
        createCard(Suit.Clubs, Rank.Ace, '2'),
      ];

      const currentTrick = {
        leadingPlayerId: PlayerId.Human,
        leadingCombo: leadingCombo,
        plays: [],
        winningPlayerId: PlayerId.Human, // Human is currently winning with A♣-A♣
        points: 0,
      };

      // Try to follow with 4♦-4♦
      const proposedPlay = [
        createCard(Suit.Diamonds, Rank.Four, '1'),
        createCard(Suit.Diamonds, Rank.Four, '2'),
      ];

      // Player hand that's void in clubs (so play is legal)
      const playerHand = [
        ...proposedPlay,
        createCard(Suit.Spades, Rank.Seven, '1'),
        createCard(Suit.Hearts, Rank.Eight, '2'),
      ];

      const result = evaluateTrickPlay(proposedPlay, currentTrick, trumpInfo, playerHand);

      expect(result.canBeat).toBe(false); // ✅ 4♦-4♦ cannot beat A♣-A♣ either
      expect(result.isLegal).toBe(true);  // Legal because void in clubs
      expect(result.reason).toContain('Cannot beat current winner');
    });
  });

  describe('Same Suit Comparisons (Should Work)', () => {
    test('A♠-A♠ should beat 4♠-4♠ when 4♠-4♠ leads', () => {
      const leadingCombo = [
        createCard(Suit.Spades, Rank.Four, '1'),
        createCard(Suit.Spades, Rank.Four, '2'),
      ];

      const currentTrick = {
        leadingPlayerId: PlayerId.Bot1,
        leadingCombo: leadingCombo,
        plays: [],
        winningPlayerId: PlayerId.Bot1,
        points: 0,
      };

      const proposedPlay = [
        createCard(Suit.Spades, Rank.Ace, '1'),
        createCard(Suit.Spades, Rank.Ace, '2'),
      ];

      const playerHand = [...proposedPlay, createCard(Suit.Hearts, Rank.Seven, '1')];

      const result = evaluateTrickPlay(proposedPlay, currentTrick, trumpInfo, playerHand);

      expect(result.canBeat).toBe(true);  // ✅ A♠-A♠ should beat 4♠-4♠ (same suit)
      expect(result.isLegal).toBe(true);
    });
  });

  describe('Trump Scenarios', () => {
    test('Trump pair should beat non-trump pair regardless of suits', () => {
      const leadingCombo = [
        createCard(Suit.Diamonds, Rank.Ace, '1'),
        createCard(Suit.Diamonds, Rank.Ace, '2'),
      ];

      const currentTrick = {
        leadingPlayerId: PlayerId.Bot1,
        leadingCombo: leadingCombo,
        plays: [],
        winningPlayerId: PlayerId.Bot1,
        points: 0,
      };

      // Trump pair (Hearts are trump)
      const proposedPlay = [
        createCard(Suit.Hearts, Rank.Three, '1'),
        createCard(Suit.Hearts, Rank.Three, '2'),
      ];

      const playerHand = [...proposedPlay, createCard(Suit.Spades, Rank.Seven, '1')];

      const result = evaluateTrickPlay(proposedPlay, currentTrick, trumpInfo, playerHand);

      expect(result.canBeat).toBe(true);  // ✅ Trump should beat non-trump
      expect(result.isLegal).toBe(true);
    });
  });

  describe('Follow Suit Rules', () => {
    test('Must follow suit when you have the led suit', () => {
      const leadingCombo = [
        createCard(Suit.Diamonds, Rank.Four, '1'),
        createCard(Suit.Diamonds, Rank.Four, '2'),
      ];

      const currentTrick = {
        leadingPlayerId: PlayerId.Bot1,
        leadingCombo: leadingCombo,
        plays: [],
        winningPlayerId: PlayerId.Bot1,
        points: 0,
      };

      const proposedPlay = [
        createCard(Suit.Clubs, Rank.Ace, '1'),
        createCard(Suit.Clubs, Rank.Ace, '2'),
      ];

      // Player has diamonds - must follow suit
      const playerHand = [
        ...proposedPlay,
        createCard(Suit.Diamonds, Rank.Seven, '1'),
        createCard(Suit.Diamonds, Rank.Seven, '2'),
      ];

      const result = evaluateTrickPlay(proposedPlay, currentTrick, trumpInfo, playerHand);

      expect(result.isLegal).toBe(false); // ✅ Illegal - must follow diamonds
      expect(result.reason).toContain('Must follow suit');
    });

    test('Can play different suit when void in led suit', () => {
      const leadingCombo = [
        createCard(Suit.Diamonds, Rank.Four, '1'),
        createCard(Suit.Diamonds, Rank.Four, '2'),
      ];

      const currentTrick = {
        leadingPlayerId: PlayerId.Bot1,
        leadingCombo: leadingCombo,
        plays: [],
        winningPlayerId: PlayerId.Bot1,
        points: 0,
      };

      const proposedPlay = [
        createCard(Suit.Clubs, Rank.Ace, '1'),
        createCard(Suit.Clubs, Rank.Ace, '2'),
      ];

      // Player void in diamonds
      const playerHand = [
        ...proposedPlay,
        createCard(Suit.Spades, Rank.Seven, '1'),
        createCard(Suit.Hearts, Rank.Eight, '2'),
      ];

      const result = evaluateTrickPlay(proposedPlay, currentTrick, trumpInfo, playerHand);

      expect(result.isLegal).toBe(true); // ✅ Legal when void
      expect(result.canBeat).toBe(false); // But still can't beat different suit
    });
  });

  describe('Combo Type Matching', () => {
    test('Must match combo type - pair vs single', () => {
      const leadingCombo = [createCard(Suit.Diamonds, Rank.Four, '1')]; // Single

      const currentTrick = {
        leadingPlayerId: PlayerId.Bot1,
        leadingCombo: leadingCombo,
        plays: [],
        winningPlayerId: PlayerId.Bot1,
        points: 0,
      };

      const proposedPlay = [
        createCard(Suit.Clubs, Rank.Ace, '1'),
        createCard(Suit.Clubs, Rank.Ace, '2'),
      ]; // Pair

      const playerHand = [...proposedPlay];

      const result = evaluateTrickPlay(proposedPlay, currentTrick, trumpInfo, playerHand);

      expect(result.isLegal).toBe(false); // ✅ Must match single with single
      expect(result.reason).toContain('Must match combo type');
    });
  });

  describe('Complex Trick Scenarios', () => {
    test('Later player beats earlier player who beat leader', () => {
      // Player 1 leads 4♦-4♦, Player 2 plays 7♦-7♦ (now winning)
      const leadingCombo = [
        createCard(Suit.Diamonds, Rank.Four, '1'),
        createCard(Suit.Diamonds, Rank.Four, '2'),
      ];

      const currentTrick = {
        leadingPlayerId: PlayerId.Bot1,
        leadingCombo: leadingCombo,
        plays: [
          {
            playerId: PlayerId.Bot2,
            cards: [
              createCard(Suit.Diamonds, Rank.Seven, '1'),
              createCard(Suit.Diamonds, Rank.Seven, '2'),
            ],
          },
        ],
        winningPlayerId: PlayerId.Bot2, // Bot2 is winning with 7♦-7♦
        points: 0,
      };

      // Player 3 tries A♦-A♦
      const proposedPlay = [
        createCard(Suit.Diamonds, Rank.Ace, '1'),
        createCard(Suit.Diamonds, Rank.Ace, '2'),
      ];

      const playerHand = [...proposedPlay];

      const result = evaluateTrickPlay(proposedPlay, currentTrick, trumpInfo, playerHand);

      expect(result.canBeat).toBe(true);  // ✅ A♦-A♦ beats 7♦-7♦ (current winner)
      expect(result.isLegal).toBe(true);
    });
  });
});