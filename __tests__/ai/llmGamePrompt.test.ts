import { buildLLMUserPrompt } from "../../src/ai/llm/llmGamePrompt";
import {
  Card,
  JokerType,
  PlayerId,
  Rank,
  Suit,
  TrumpInfo,
} from "../../src/types";
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
      "A♠ → wins the trick → captures 20 pts for your team",
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

  test("teammate winning safely: contributing point cards is framed as banking toward 80", () => {
    // Bot1 (Bot3's teammate) is winning with A♣; Bot3 is last to act, so the win is
    // locked. Bot3 is on the attacking team, so banked points count toward 80.
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

    expect(user).toContain("K♣ → loses; banks 10 pts toward your team's 80");
    expect(user).toContain("5♣ → loses; banks 5 pts toward your team's 80");
  });

  test("defender conceding to an attacker: point card is framed as feeding the attackers' 80", () => {
    // Bot1 (attacker, Team B) leads the boss A♣ and is winning. Bot2 (defender,
    // Team A) must follow clubs with K♣ or 4♣ — neither wins. The point card must
    // read as feeding the attackers' total, so dumping it is an obvious loss.
    const trick = createTrick(
      PlayerId.Bot1,
      [single(Suit.Clubs, Rank.Ace)],
      [],
      0,
      PlayerId.Bot1,
    );
    let state = createGameState({
      trumpInfo: TRUMP,
      currentTrick: trick,
      currentPlayerIndex: 2,
    });
    const hand = [
      single(Suit.Clubs, Rank.King),
      single(Suit.Clubs, Rank.Four),
      single(Suit.Hearts, Rank.Six),
    ];
    state = givePlayerCards(state, 2, hand);

    const { user } = buildLLMUserPrompt(state, PlayerId.Bot2, hand);

    // Defender role stated so the goal cannot be read backwards.
    expect(user).toContain(
      "Defending — you win by keeping the attackers under 80",
    );
    // The King's cost is tied to the threshold; the low club concedes nothing.
    expect(user).toContain(
      "K♣ → loses; adds 10 pts to the attackers' total (toward their 80)",
    );
    expect(user).toContain("4♣ → loses; concedes nothing of yours");
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
      "[A♠ A♠] (pair) → unbeatable in-suit → wins unless an opponent ruffs; keeps the lead (spends a boss, not trump)",
    );
    expect(user).not.toMatch(/Rule Score/);
    // System prompt keeps objective mechanics, drops prescriptive strategy.
    expect(system).toContain("## 5. Reading the Options");
    expect(system).not.toMatch(/Leading Strategy|Seat Guidance/);
  });

  test("trump leads are stated as cost facts, not as a 'bleed trump' tactic", () => {
    const state = createGameState({
      trumpInfo: TRUMP,
      currentTrick: null,
      currentPlayerIndex: 1,
    });
    const hand = [
      ...Card.createPair(Suit.Hearts, Rank.Seven), // low trump pair (trump suit)
      ...Card.createPair(Suit.Spades, Rank.Two), // scarce trump-rank pair
      single(Suit.Diamonds, Rank.Five),
    ];
    const withHand = givePlayerCards(state, 1, hand);

    const { user } = buildLLMUserPrompt(withHand, PlayerId.Bot1, hand);

    // No tactical nudge to lead trump early.
    expect(user).not.toMatch(/bleeds|forces opponents/);
    // Low trump pair: stated as a cost.
    expect(user).toContain(
      "[7♥ 7♥] (trump pair) → takes the trick + the next lead unless a higher trump pair is out; cost: spends trump — your ruff/control resource",
    );
    // Trump-rank pair: flagged as scarce so it is not burned early.
    expect(user).toContain(
      "[2♠ 2♠] (trump pair) → takes the trick + the next lead unless a higher trump pair is out; cost: spends scarce high trump (jokers/trump-rank)",
    );
  });

  test("following options state the exact count and the two-copies rule for pairs", () => {
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
      single(Suit.Clubs, Rank.Six),
    ];
    state = givePlayerCards(state, 1, hand);

    const { user } = buildLLMUserPrompt(state, PlayerId.Bot1, hand);

    expect(user).toContain(
      "Play exactly 2 card(s). Copy cards verbatim from YOUR HAND — to repeat a card (a pair) you must hold two copies of it (shown ×2).",
    );
  });

  test("trump single leads: top live trump wins; a beatable high trump is flagged", () => {
    const state = createGameState({
      trumpInfo: TRUMP,
      currentTrick: null,
      currentPlayerIndex: 1,
    });
    const hand = [
      Card.createJoker(JokerType.Big, 0), // top trump → wins the lead
      single(Suit.Hearts, Rank.Ace), // high trump, but jokers/2s still out → beatable
      single(Suit.Diamonds, Rank.Five),
    ];
    const withHand = givePlayerCards(state, 1, hand);

    const { user } = buildLLMUserPrompt(withHand, PlayerId.Bot1, hand);

    expect(user).toContain(
      "BJ (trump) → no trump still out beats it: leading it takes the trick + the next lead",
    );
    expect(user).toContain(
      "trump singles (A♥) → a higher trump is still out, so these can be beaten",
    );
  });
});
