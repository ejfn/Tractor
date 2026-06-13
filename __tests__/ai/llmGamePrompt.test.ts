import { buildLLMUserPrompt } from "../../src/ai/llm/llmGamePrompt";
import { Card, PlayerId, Rank, Suit, TrumpInfo } from "../../src/types";
import { createGameState, givePlayerCards } from "../helpers/gameStates";
import { createTrick } from "../helpers/tricks";

/**
 * The LLM prompt is built from FACTS and DIAGNOSIS, never recommendations.
 * These tests pin the contract: option-classes framed in point-flow, equivalent
 * cards collapsed, and no "Rule Score" / "recommend" / prescriptive-rule strings.
 */

const TRUMP: TrumpInfo = { trumpRank: Rank.Two, trumpSuit: Suit.Hearts };

const single = (suit: Suit, rank: Rank, deck: 0 | 1 = 0): Card =>
  Card.createCard(suit, rank, deck);

describe("LLM prompt — facts & diagnosis, not rules", () => {
  test("4th seat with a winning off-suit Ace: option is framed as capturing the points", () => {
    // Human leads K♠ and is winning; 20 pts on the table; Bot3 is last to act and
    // holds A♠ (beats K♠) plus low spades. The Ace play must read as a point capture.
    const trick = createTrick(
      PlayerId.Human,
      [single(Suit.Spades, Rank.King)],
      [
        { playerId: PlayerId.Bot1, cards: [single(Suit.Spades, Rank.Three)] },
        { playerId: PlayerId.Bot2, cards: [single(Suit.Spades, Rank.Ten)] },
      ],
      20,
      PlayerId.Human,
    );
    let state = createGameState({
      trumpInfo: TRUMP,
      currentTrick: trick,
      currentPlayerIndex: 3,
    });
    const hand = [
      single(Suit.Spades, Rank.Ace),
      single(Suit.Spades, Rank.Four),
      single(Suit.Spades, Rank.Nine),
      single(Suit.Hearts, Rank.Six),
      single(Suit.Clubs, Rank.Nine),
    ];
    state = givePlayerCards(state, 3, hand);

    const { user, system } = buildLLMUserPrompt(state, PlayerId.Bot3, hand);

    // The winning play is described by what it yields in POINTS, not "wins trick".
    expect(user).toContain(
      "A♠ → WINS the trick → captures 20 pts for your team",
    );
    // The two low spades are collapsed into one equivalent losing class.
    expect(user).toContain("4♠ · 9♠ → loses; concedes nothing of yours");
    // No recommendation, no rule-based score, no transcribed strategy heuristics.
    expect(user).not.toMatch(/Rule Score/);
    expect(user).not.toMatch(/recommend/i);
    expect(system).not.toMatch(
      /Seat Guidance|Position Cues|duck low|Conserve Control/,
    );
  });

  test("pair lead with several non-winning pairs: pairs grouped and collapsed as losers", () => {
    // Human leads K♦K♦ (20 pts). Bot1 (2nd) holds 3♦3♦ and 8♦8♦ — both legal,
    // neither wins. They must be listed as bracketed pairs, collapsed as losers.
    const trick = createTrick(
      PlayerId.Human,
      Card.createPair(Suit.Diamonds, Rank.King),
      [],
      20,
      PlayerId.Human,
    );
    let state = createGameState({
      trumpInfo: TRUMP,
      currentTrick: trick,
      currentPlayerIndex: 1,
    });
    const hand = [
      ...Card.createPair(Suit.Diamonds, Rank.Three),
      ...Card.createPair(Suit.Diamonds, Rank.Eight),
      single(Suit.Clubs, Rank.Six),
      single(Suit.Hearts, Rank.Seven),
    ];
    state = givePlayerCards(state, 1, hand);

    const { user } = buildLLMUserPrompt(state, PlayerId.Bot1, hand);

    expect(user).toContain("## Your Options");
    expect(user).toContain("[3♦ 3♦]");
    expect(user).toContain("[8♦ 8♦]");
    expect(user).toContain("loses; concedes nothing of yours");
    expect(user).not.toMatch(/recommend/i);
  });

  test("teammate winning safely: contributing point cards is framed as banking points", () => {
    // Bot1 (Bot3's teammate) is winning with A♣; Bot3 is last to act, so the win is
    // locked. Bot3's K♣/5♣ cannot win — they are framed as banking points.
    const trick = createTrick(
      PlayerId.Human,
      [single(Suit.Clubs, Rank.Three)],
      [
        { playerId: PlayerId.Bot1, cards: [single(Suit.Clubs, Rank.Ace)] },
        { playerId: PlayerId.Bot2, cards: [single(Suit.Clubs, Rank.Four)] },
      ],
      0,
      PlayerId.Bot1,
    );
    let state = createGameState({
      trumpInfo: TRUMP,
      currentTrick: trick,
      currentPlayerIndex: 3,
    });
    const hand = [
      single(Suit.Clubs, Rank.King),
      single(Suit.Clubs, Rank.Five),
      single(Suit.Hearts, Rank.Six),
      single(Suit.Diamonds, Rank.Nine),
    ];
    state = givePlayerCards(state, 3, hand);

    const { user } = buildLLMUserPrompt(state, PlayerId.Bot3, hand);

    expect(user).toContain(
      "K♣ → loses; banks 10 pts onto your team's secured trick",
    );
    expect(user).toContain(
      "5♣ → loses; banks 5 pts onto your team's secured trick",
    );
  });

  test("leading an unbeatable pair: framed as a guaranteed win, no score", () => {
    const state = createGameState({
      trumpInfo: TRUMP,
      currentTrick: null,
      currentPlayerIndex: 1,
    });
    const hand = [
      ...Card.createPair(Suit.Spades, Rank.Ace),
      single(Suit.Clubs, Rank.Three),
      single(Suit.Hearts, Rank.Six),
    ];
    const withHand = givePlayerCards(state, 1, hand);

    const { user, system } = buildLLMUserPrompt(withHand, PlayerId.Bot1, hand);

    expect(user).toContain("## Lead Options");
    expect(user).toContain(
      "[A♠ A♠] (pair) → unbeatable → guaranteed to win + keep the lead",
    );
    expect(user).not.toMatch(/Rule Score/);
    // System prompt keeps objective mechanics, drops prescriptive strategy.
    expect(system).toContain("## 5. Reading the Options");
    expect(system).not.toMatch(/Leading Strategy|Seat Guidance/);
  });
});
