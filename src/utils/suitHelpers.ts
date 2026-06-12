import { sharedStyles } from "./sharedStyles";
import { JokerType, Suit } from "../types";

/**
 * Get the color style for a suit (red for hearts/diamonds, black for clubs/spades)
 */
export const getSuitColorStyle = (suit: Suit) => {
  return suit === Suit.Hearts || suit === Suit.Diamonds
    ? sharedStyles.redSuit
    : sharedStyles.blackSuit;
};

/**
 * Get the symbol for a suit or joker
 */
export const getSuitSymbol = (suit: Suit, joker?: JokerType): string => {
  if (joker) {
    // No distinct Unicode emoji exists for big vs small joker; both show the joker card symbol
    return "🃏";
  }

  switch (suit) {
    case Suit.Hearts:
      return "♥";
    case Suit.Diamonds:
      return "♦";
    case Suit.Clubs:
      return "♣";
    case Suit.Spades:
      return "♠";
    default:
      return "";
  }
};
