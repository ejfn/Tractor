import { Card, GameState, PlayerId, Suit } from "../../types";
import { sortCards } from "../../utils/cardSorting";
import { createGameContext } from "../aiGameContext";
import { selectAIKittySwapCards } from "../kittySwap/kittySwapStrategy";

export function buildKittySwapOptions(
  gameState: GameState,
  playerId: PlayerId,
  hand: Card[],
): string {
  const trumpInfo = gameState.trumpInfo;
  const primaryCards = selectAIKittySwapCards(gameState, playerId);
  const primaryPts = primaryCards.reduce((sum, c) => sum + c.points, 0);

  const nonTrumpInHand = hand.filter((c) => !c.isTrump(trumpInfo));
  const trumpsInHand = hand.filter((c) => c.isTrump(trumpInfo));

  const suitsVoided: Suit[] = [];
  [Suit.Spades, Suit.Hearts, Suit.Clubs, Suit.Diamonds]
    .filter((s) => s !== trumpInfo.trumpSuit)
    .forEach((suit) => {
      const suitHand = nonTrumpInHand.filter((c) => c.suit === suit);
      const suitDiscarded = primaryCards.filter((c) => c.suit === suit);
      if (suitHand.length > 0 && suitHand.length === suitDiscarded.length) {
        suitsVoided.push(suit);
      }
    });

  const voidNote =
    suitsVoided.length > 0 ? `; creates void in ${suitsVoided.join(", ")}` : "";
  const trumpNote = `preserves ${trumpsInHand.length} trump card(s)`;

  return [
    `Candidate kitty discards (8 cards to bury):`,
    `- Discard [${primaryCards.map((c) => c.toString()).join(", ")}] → buries ${primaryPts} pts in kitty${voidNote}; ${trumpNote}`,
  ].join("\n");
}

export function buildLLMKittySwapUserPrompt(
  gameState: GameState,
  playerId: PlayerId,
  handCards: Card[],
): { system: string; user: string } {
  const trumpInfo = gameState.trumpInfo;
  const sortedHand = sortCards(handCards, trumpInfo);
  const gameContext = createGameContext(gameState, playerId);

  const handStr = sortedHand.map((c) => c.toString()).join(", ");
  const optionsStr = buildKittySwapOptions(gameState, playerId, handCards);

  const system = `You are a Grandmaster AI playing Shengji. You are in the Kitty Swap Phase.
Your goal is to choose 8 cards from your 33-card hand to bury in the hidden kitty.
- Protect trump cards and boss cards.
- Bury 0-point or point cards in short off-suits to establish voids for future ruffing.
- Output JSON ONLY: {"reasoning": "<short explanation>", "play": ["card1", "card2", ..., "card8"]}`;

  const user = [
    `=== KITTY SWAP PHASE ===`,
    `Trump Suit: ${trumpInfo.trumpSuit || "None"} | Trump Rank: ${trumpInfo.trumpRank}`,
    `Role: ${gameContext.isAttackingTeam ? "Attackers" : "Defenders"}`,
    `\n=== YOUR 33-CARD HAND ===`,
    handStr,
    `\n=== CANDIDATE RECOMMENDATION ===`,
    optionsStr,
    `\n=== INSTRUCTION ===`,
    `Select EXACTLY 8 cards from your hand to bury in the kitty.`,
    `Output JSON ONLY: {"reasoning": "...", "play": ["<card1>", "<card2>", ..., "<card8>"]}`,
  ].join("\n");

  return { system, user };
}
