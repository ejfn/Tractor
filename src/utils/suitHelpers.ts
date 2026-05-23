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
    return joker === JokerType.Big ? "🃏" : "🃏";
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
