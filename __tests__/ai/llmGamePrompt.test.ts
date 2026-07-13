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

  test("following a led Ace with your own Ace: the Ace is kept apart from the trash, not collapsed", () => {
    // Human leads A♠ (boss). Bot1 holds the other A♠ plus low spades — its A♠
    // ties and cannot win, but it is the suit's future boss, so it must NOT be
    // lumped into the low-card collapse (which is how an Ace gets dumped).
    const trick = createTrick(
      PlayerId.Human,
      [single(Suit.Spades, Rank.Ace, 0)],
      [],
      0,
      PlayerId.Human,
    );
    let state = createGameState({
      trumpInfo: TRUMP,
      currentTrick: trick,
      currentPlayerIndex: 1,
    });
    const hand = [
      single(Suit.Spades, Rank.Ace, 1),
      single(Suit.Spades, Rank.Four),
      single(Suit.Spades, Rank.Seven),
      single(Suit.Hearts, Rank.Six),
    ];
    state = givePlayerCards(state, 1, hand);

    const { user } = buildLLMUserPrompt(state, PlayerId.Bot1, hand);

    // The Ace's future value is stated; the trash collapses separately.
    expect(user).toContain(
      "A♠ → loses here; it is the highest live Spades (would win a later Spades lead)",
    );
    expect(user).toContain("4♠ · 7♠ → loses; concedes nothing of yours");
    // The Ace is not folded into the low-card class.
    expect(user).not.toMatch(/low cards \([^)]*A♠/);
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
      "[A♠ A♠] (pair) → unbeatable in-suit → wins unless ruffed; keeps the lead; spends this combo",
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

    // No tactical "force them to lead trump early" nudge.
    expect(user).not.toMatch(/bleeds|forces opponents/);
    // Dominance context so the LLM can judge whether draining is viable.
    expect(user).toMatch(
      /Trump leads — you hold \d+ trump pair\(s\); ~\d+ trump still out/,
    );
    // Low trump pair: drain framing + cost (no "wins the lead" reward-word).
    expect(user).toContain(
      "[7♥ 7♥] (trump pair) → opponents must follow with a trump pair if they hold it, and a higher trump pair beats this play; spends a trump pair",
    );
    // Trump-rank pair: flagged as scarce.
    expect(user).toContain(
      "[2♠ 2♠] (trump pair) → opponents must follow with a trump pair if they hold it, and a higher trump pair beats this play; spends scarce high trump (jokers/trump-rank)",
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
      "Led group: Diamonds — play exactly 2 card(s) from this group only. Copy cards verbatim from YOUR HAND (×2 means you hold a pair). Plays below are the full legal set.",
    );
    // Active Trick also names the led group so models do not follow printed color.
    expect(user).toContain("- Led group: Diamonds");
  });

  test("trump-rank pair lead is labeled Trump Group, not the printed suit", () => {
    // Trump rank 2 / suit Hearts: leading 2♠2♠ is a Trump Group lead (not Spades).
    const trick = createTrick(
      PlayerId.Human,
      Card.createPair(Suit.Spades, Rank.Two),
      [],
      0,
      PlayerId.Human,
    );
    let state = createGameState({
      trumpInfo: TRUMP,
      currentTrick: trick,
      currentPlayerIndex: 1,
    });
    const hand = [
      single(Suit.Hearts, Rank.Three),
      single(Suit.Hearts, Rank.Nine),
      single(Suit.Spades, Rank.Three),
      single(Suit.Spades, Rank.Four),
    ];
    state = givePlayerCards(state, 1, hand);

    const { user, system } = buildLLMUserPrompt(state, PlayerId.Bot1, hand);

    expect(user).toContain("- Led group: Trump Group");
    expect(user).toMatch(/trump-rank 2 — printed suit is NOT the led suit/);
    expect(user).toContain("Led group: trump — play exactly 2 card(s)");
    // Must not imply the lead is plain Spades.
    expect(user).not.toContain("- Led group: Spades");
    expect(system).toMatch(
      /printed suit is NOT the led suit|Trump Group lead/i,
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
      "BJ (trump) → no higher trump is still out (unbeatable single trump); wins the trick; spends this trump",
    );
    expect(user).toContain(
      "trump singles (A♥) → at least one higher trump is still out (beatable single trump); passes the lead if a higher trump is played; spends this trump",
    );
  });

  test("leading a beatable point card warns it feeds points (a non-point high card does not)", () => {
    const state = createGameState({
      trumpInfo: TRUMP,
      currentTrick: null,
      currentPlayerIndex: 1,
    });
    const hand = [
      single(Suit.Spades, Rank.King), // 10 pts, beatable — an Ace is still out
      single(Suit.Clubs, Rank.Queen), // high, no points
      single(Suit.Diamonds, Rank.Four),
    ];
    const withHand = givePlayerCards(state, 1, hand);

    const { user } = buildLLMUserPrompt(withHand, PlayerId.Bot1, hand);

    expect(user).toContain(
      "K♠ (Spades, 10 pts) → a higher Spades is still out; passes the lead if a higher card is played; spends this card",
    );
  });

  test("3rd/last seat over a SAFE teammate win: overtaking is framed as no gain", () => {
    // Bot1 (Team B) wins with K♠; Bot3 (teammate) is last, so the win is locked.
    // Bot3's A♠ beats it, but overtaking your own safe win gains nothing.
    const trick = createTrick(
      PlayerId.Human,
      [single(Suit.Spades, Rank.Three)],
      [
        { playerId: PlayerId.Bot1, cards: [single(Suit.Spades, Rank.King)] },
        { playerId: PlayerId.Bot2, cards: [single(Suit.Spades, Rank.Five)] },
      ],
      15,
      PlayerId.Bot1,
    );
    let state = createGameState({
      trumpInfo: TRUMP,
      currentTrick: trick,
      currentPlayerIndex: 3,
    });
    const hand = [
      single(Suit.Spades, Rank.Ace),
      single(Suit.Spades, Rank.Six),
      single(Suit.Hearts, Rank.Seven),
    ];
    state = givePlayerCards(state, 3, hand);

    const { user } = buildLLMUserPrompt(state, PlayerId.Bot3, hand);

    expect(user).toContain(
      "A♠ → overtakes your teammate's already-safe win; spends A♠",
    );
  });

  test("3rd seat over an UNSAFE teammate win: overtaking is framed as shielding points", () => {
    // Human (Team A) leads K♠ and is winning; Bot1 (opp) follows low; Bot2 (3rd,
    // Human's teammate) holds A♠ and Bot3 (opp, 4th) can still beat K♠ — not safe.
    const trick = createTrick(
      PlayerId.Human,
      [single(Suit.Spades, Rank.King)],
      [{ playerId: PlayerId.Bot1, cards: [single(Suit.Spades, Rank.Four)] }],
      10,
      PlayerId.Human,
    );
    let state = createGameState({
      trumpInfo: TRUMP,
      currentTrick: trick,
      currentPlayerIndex: 2,
    });
    const hand = [
      single(Suit.Spades, Rank.Ace, 1),
      single(Suit.Spades, Rank.Seven),
      single(Suit.Hearts, Rank.Six),
    ];
    state = givePlayerCards(state, 2, hand);

    const { user } = buildLLMUserPrompt(state, PlayerId.Bot2, hand);

    expect(user).toContain(
      "A♠ → overtakes your teammate's win (not yet safe from bot3); costs A♠",
    );
  });

  test("a 5 is a point card when disposing — split from higher non-point cards", () => {
    // Bot1 (attacker) wins with K♦; Bot2 (defender) must follow with a diamond it
    // can't win. 5♦ (5 pts) must be flagged separately from 7♦/8♦/9♦, even though
    // those are higher rank — dumping the 5 feeds points, the others don't.
    const trick = createTrick(
      PlayerId.Bot1,
      [single(Suit.Diamonds, Rank.King)],
      [],
      10,
      PlayerId.Bot1,
    );
    let state = createGameState({
      trumpInfo: TRUMP,
      currentTrick: trick,
      currentPlayerIndex: 2,
    });
    const hand = [
      single(Suit.Diamonds, Rank.Five),
      single(Suit.Diamonds, Rank.Seven),
      single(Suit.Diamonds, Rank.Eight),
      single(Suit.Diamonds, Rank.Nine),
      single(Suit.Spades, Rank.Six),
    ];
    state = givePlayerCards(state, 2, hand);

    const { user } = buildLLMUserPrompt(state, PlayerId.Bot2, hand);

    expect(user).toContain(
      "7♦ · 8♦ · 9♦ → loses; concedes nothing of yours",
    );
    expect(user).toContain(
      "5♦ → loses; adds 5 pts to the attackers' total (toward their 80)",
    );
  });
});
