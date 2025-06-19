import { isValidPlay } from "../../src/game/playValidation";
import { Card, Rank, Suit, TrumpInfo, PlayerId, GameState } from "../../src/types";
import { createGameState } from "../helpers";

describe('Tractor Edge Cases Tests', () => {
  describe('Edge Cases and Complex Scenarios', () => {
    test('should handle minimum hand scenarios', () => {
      const trumpInfo: TrumpInfo = { trumpSuit: Suit.Hearts, trumpRank: Rank.Two };
      
      // Leading tractor
      const leadingTractor = [
        ...Card.createPair(Suit.Spades, Rank.Seven),
        ...Card.createPair(Suit.Spades, Rank.Eight)
      ];
      
      // Player with exactly 4 cards, all Spades
      const minimalHand = [
        Card.createCard(Suit.Spades, Rank.Three, 0),
        Card.createCard(Suit.Spades, Rank.Four, 0),
        Card.createCard(Suit.Spades, Rank.Five, 0),
        Card.createCard(Suit.Spades, Rank.Six, 0)
      ];
      
      // Must play all Spades cards
      const validPlay = minimalHand;
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: leadingTractor }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        }
      });
      
      const isValid = isValidPlay(validPlay, minimalHand, PlayerId.Bot1, gameState);
      expect(isValid).toBe(true);
    });

    test('should handle three-pair tractor scenarios', () => {
      const trumpInfo: TrumpInfo = { trumpSuit: Suit.Hearts, trumpRank: Rank.Two };
      
      // Leading 3-pair tractor (6 cards)
      const threePairTractor = [
        ...Card.createPair(Suit.Spades, Rank.Seven),
        ...Card.createPair(Suit.Spades, Rank.Eight),
        ...Card.createPair(Suit.Spades, Rank.Nine)
      ];
      
      // Player with sufficient Spades pairs
      const playerHand = [
        ...Card.createPair(Suit.Spades, Rank.Ten),
        ...Card.createPair(Suit.Spades, Rank.Jack),
        ...Card.createPair(Suit.Spades, Rank.Queen),
        Card.createCard(Suit.Hearts, Rank.King, 0)
      ];
      
      // Player can form responding 3-pair tractor
      const validPlay = [
        ...Card.createPair(Suit.Spades, Rank.Ten),
        ...Card.createPair(Suit.Spades, Rank.Jack),
        ...Card.createPair(Suit.Spades, Rank.Queen)
      ];
      const gameState = createGameState({
        trumpInfo,
        currentTrick: {
          plays: [{ playerId: PlayerId.Human, cards: threePairTractor }],
          winningPlayerId: PlayerId.Human,
          points: 0,
        }
      });
      
      const isValid = isValidPlay(validPlay, playerHand, PlayerId.Bot1, gameState);
      expect(isValid).toBe(true);
    });
  });
});