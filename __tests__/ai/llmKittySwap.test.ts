import { callLLMForKittySwap } from "../../src/ai/llm/llmAIStrategy";
import { getAIKittySwapAsync } from "../../src/ai/aiLogic";
import { createGameState, givePlayerCards } from "../helpers/gameStates";
import { Card, GamePhase, PlayerId, Rank, Suit } from "../../src/types";

const single = (suit: Suit, rank: Rank, deck: 0 | 1 = 0) =>
  Card.createCard(suit, rank, deck);

describe("LLM Kitty Swap Phase (#448)", () => {
  const TRUMP = {
    trumpRank: Rank.Two,
    trumpSuit: Suit.Spades,
    declarerId: PlayerId.Bot1,
  };

  function build33CardHand(): Card[] {
    const hand: Card[] = [];
    // 10 Trump cards
    for (let i = 0; i < 10; i++) {
      hand.push(single(Suit.Spades, (i + 3) as unknown as Rank));
    }
    // 8 Hearts
    for (let i = 0; i < 8; i++) {
      hand.push(single(Suit.Hearts, (i + 3) as unknown as Rank));
    }
    // 8 Clubs
    for (let i = 0; i < 8; i++) {
      hand.push(single(Suit.Clubs, (i + 3) as unknown as Rank));
    }
    // 7 Diamonds
    for (let i = 0; i < 7; i++) {
      hand.push(single(Suit.Diamonds, (i + 3) as unknown as Rank));
    }
    return hand;
  }

  test("callLLMForKittySwap returns rule AI fallback when LLM is disabled", async () => {
    const hand = build33CardHand();
    const state = createGameState({
      trumpInfo: TRUMP,
      gamePhase: GamePhase.KittySwap,
      currentPlayerIndex: 1,
    });
    const withHand = givePlayerCards(state, 1, hand);

    const fallback = [
      hand[10],
      hand[11],
      hand[12],
      hand[13],
      hand[14],
      hand[15],
      hand[16],
      hand[17],
    ];

    const result = await callLLMForKittySwap(
      withHand,
      PlayerId.Bot1,
      hand,
      fallback,
    );
    expect(result).toHaveLength(8);
    expect(result).toEqual(fallback);
  });

  test("getAIKittySwapAsync returns exactly 8 cards for kitty swap", async () => {
    const hand = build33CardHand();
    const state = createGameState({
      trumpInfo: TRUMP,
      gamePhase: GamePhase.KittySwap,
      currentPlayerIndex: 1,
    });
    const withHand = givePlayerCards(state, 1, hand);

    const selected = await getAIKittySwapAsync(withHand, PlayerId.Bot1);
    expect(selected).toHaveLength(8);
  });
});
