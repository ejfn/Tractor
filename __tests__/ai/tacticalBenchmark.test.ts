import {
  Card,
  GamePhase,
  JokerType,
  PlayerId,
  Rank,
  Suit,
  TrumpInfo,
} from "../../src/types";
import { createGameContext } from "../../src/ai/aiGameContext";
import {
  generateLeadingLines,
  generateFollowingLines,
} from "../../src/ai/llm/llmStrategicLines";
import { createGameState, givePlayerCards } from "../helpers/gameStates";
import { createTrick } from "../helpers/tricks";
import { createTrumpInfo } from "../helpers/trump";

describe("Shengji 10-Scenario Tactical Qualification Benchmark", () => {
  const trumpInfo: TrumpInfo = createTrumpInfo(Rank.Two, Suit.Spades);

  // Scenario 1: Point Snatch (Ruff)
  it("Scenario 1: Should offer ruff_win when opponent leads high points (20 pts)", () => {
    const leadTrick = createTrick(PlayerId.Bot1, [
      Card.createCard(Suit.Hearts, Rank.Ten, 0),
    ]);
    leadTrick.points = 20;

    const hand: Card[] = [
      Card.createCard(Suit.Spades, Rank.Five, 0), // Low Trump
      Card.createCard(Suit.Diamonds, Rank.Three, 0), // Trash
    ];

    const gameState = createGameState({
      trumpInfo,
      gamePhase: GamePhase.Playing,
      currentPlayerIndex: 2,
      currentTrick: leadTrick,
    });
    const stateWithCards = givePlayerCards(gameState, 2, hand);
    const gameContext = createGameContext(stateWithCards, PlayerId.Bot2);

    const lines = generateFollowingLines(
      stateWithCards,
      hand,
      PlayerId.Bot2,
      trumpInfo,
      gameContext,
    );

    const ruffLine = lines.find((l) => l.intent === "ruff_win");
    expect(ruffLine).toBeDefined();
    expect(ruffLine?.cards[0].suit).toBe(Suit.Spades);
  });

  // Scenario 2: Point Banking (Feed)
  it("Scenario 2: Should offer feed_points when partner leads Boss Ace in 4th seat", () => {
    const leadTrick = createTrick(PlayerId.Bot1, [
      Card.createCard(Suit.Hearts, Rank.Ace, 0),
    ]);
    leadTrick.plays.push({
      playerId: PlayerId.Bot2,
      cards: [Card.createCard(Suit.Hearts, Rank.Seven, 0)],
    });
    leadTrick.plays.push({
      playerId: PlayerId.Human,
      cards: [Card.createCard(Suit.Hearts, Rank.Eight, 0)],
    });
    leadTrick.winningPlayerId = PlayerId.Bot1; // Partner of Bot3 is winning

    const hand: Card[] = [
      Card.createCard(Suit.Hearts, Rank.Ten, 0), // 10 pts
      Card.createCard(Suit.Hearts, Rank.Three, 0), // 0 pts
    ];

    const gameState = createGameState({
      trumpInfo,
      gamePhase: GamePhase.Playing,
      currentPlayerIndex: 3, // Bot3 (Partner of Bot1 on Team B) in 4th seat
      currentTrick: leadTrick,
    });
    const stateWithCards = givePlayerCards(gameState, 3, hand);
    const gameContext = createGameContext(stateWithCards, PlayerId.Bot3);

    const lines = generateFollowingLines(
      stateWithCards,
      hand,
      PlayerId.Bot3,
      trumpInfo,
      gameContext,
    );

    const feedLine = lines.find((l) => l.intent === "feed_points");
    expect(feedLine).toBeDefined();
    expect(feedLine?.cards[0].rank).toBe(Rank.Ten);
  });

  // Scenario 3: Asset Protection (Trash Dump)
  it("Scenario 3: Should offer dump_trash to protect Boss Aces on unwinnable 0-pt trick", () => {
    const leadTrick = createTrick(PlayerId.Bot1, [
      Card.createCard(Suit.Clubs, Rank.Ace, 0),
    ]);
    leadTrick.points = 0;

    const hand: Card[] = [
      Card.createCard(Suit.Diamonds, Rank.Ace, 0), // Future Boss Ace
      Card.createCard(Suit.Diamonds, Rank.Three, 0), // Trash
    ];

    const gameState = createGameState({
      trumpInfo,
      gamePhase: GamePhase.Playing,
      currentPlayerIndex: 2,
      currentTrick: leadTrick,
    });
    const stateWithCards = givePlayerCards(gameState, 2, hand);
    const gameContext = createGameContext(stateWithCards, PlayerId.Bot2);

    const lines = generateFollowingLines(
      stateWithCards,
      hand,
      PlayerId.Bot2,
      trumpInfo,
      gameContext,
    );

    const trashLine = lines.find((l) => l.intent === "dump_trash");
    expect(trashLine).toBeDefined();
    expect(trashLine?.cards[0].rank).toBe(Rank.Three);
    expect(trashLine?.cards[0].rank).not.toBe(Rank.Ace);
  });

  // Scenario 4: Boss Cashing
  it("Scenario 4: Should prioritize cashing guaranteed Boss Ace when leading", () => {
    const hand: Card[] = [
      Card.createCard(Suit.Hearts, Rank.Ace, 0),
      Card.createCard(Suit.Clubs, Rank.Four, 0),
    ];

    const gameState = createGameState({
      trumpInfo,
      gamePhase: GamePhase.Playing,
      currentPlayerIndex: 1,
    });
    const stateWithCards = givePlayerCards(gameState, 1, hand);
    const gameContext = createGameContext(stateWithCards, PlayerId.Bot1);

    const lines = generateLeadingLines(
      stateWithCards,
      hand,
      PlayerId.Bot1,
      trumpInfo,
      gameContext,
    );

    const cashLine = lines.find((l) => l.intent === "cash_winner");
    expect(cashLine).toBeDefined();
    expect(cashLine?.cards[0].rank).toBe(Rank.Ace);
  });

  // Scenario 5: 3rd Player Protection / Raising
  it("Scenario 5: Should offer overtake_win in 3rd seat when partner leads low under threat", () => {
    const leadTrick = createTrick(PlayerId.Bot1, [
      Card.createCard(Suit.Hearts, Rank.Four, 0),
    ]);
    leadTrick.plays.push({
      playerId: PlayerId.Bot2,
      cards: [Card.createCard(Suit.Hearts, Rank.Seven, 0)],
    });
    leadTrick.winningPlayerId = PlayerId.Bot2;

    const hand: Card[] = [
      Card.createCard(Suit.Hearts, Rank.King, 0), // Raise/Overtake
      Card.createCard(Suit.Hearts, Rank.Three, 0),
    ];

    const gameState = createGameState({
      trumpInfo,
      gamePhase: GamePhase.Playing,
      currentPlayerIndex: 3,
      currentTrick: leadTrick,
    });
    const stateWithCards = givePlayerCards(gameState, 3, hand);
    const gameContext = createGameContext(stateWithCards, PlayerId.Bot3);

    const lines = generateFollowingLines(
      stateWithCards,
      hand,
      PlayerId.Bot3,
      trumpInfo,
      gameContext,
    );

    const winLine = lines.find((l) => l.intent === "overtake_win");
    expect(winLine).toBeDefined();
    expect(winLine?.cards[0].rank).toBe(Rank.King);
  });

  // Scenario 6: Endgame Kitty Defense
  it("Scenario 6: Should offer top trump overtake to seize lead in endgame", () => {
    const leadTrick = createTrick(PlayerId.Bot1, [
      Card.createCard(Suit.Spades, Rank.Nine, 0),
    ]);

    const hand: Card[] = [
      Card.createJoker(JokerType.Big, 0),
      Card.createCard(Suit.Diamonds, Rank.Three, 0),
    ];

    const gameState = createGameState({
      trumpInfo,
      gamePhase: GamePhase.Playing,
      currentPlayerIndex: 2,
      currentTrick: leadTrick,
    });
    const stateWithCards = givePlayerCards(gameState, 2, hand);
    const gameContext = createGameContext(stateWithCards, PlayerId.Bot2);

    const lines = generateFollowingLines(
      stateWithCards,
      hand,
      PlayerId.Bot2,
      trumpInfo,
      gameContext,
    );

    const winLine = lines.find((l) => l.intent === "overtake_win");
    expect(winLine).toBeDefined();
    expect(winLine?.cards[0].joker).toBeDefined();
  });

  // Scenario 7: Trump Bleeding
  it("Scenario 7: Should offer trump_control when holding strong trump pair", () => {
    const hand: Card[] = [
      ...Card.createPair(Suit.Spades, Rank.Eight),
      Card.createCard(Suit.Diamonds, Rank.Three, 0),
    ];

    const gameState = createGameState({
      trumpInfo,
      gamePhase: GamePhase.Playing,
      currentPlayerIndex: 1,
    });
    const stateWithCards = givePlayerCards(gameState, 1, hand);
    const gameContext = createGameContext(stateWithCards, PlayerId.Bot1);

    const lines = generateLeadingLines(
      stateWithCards,
      hand,
      PlayerId.Bot1,
      trumpInfo,
      gameContext,
    );

    const trumpLine = lines.find((l) => l.intent === "trump_control");
    expect(trumpLine).toBeDefined();
    expect(trumpLine?.cards[0].suit).toBe(Suit.Spades);
  });

  // Scenario 8: Side Suit Attack
  it("Scenario 8: Should offer develop_suit when holding off-suit pairs", () => {
    const hand: Card[] = [
      ...Card.createPair(Suit.Clubs, Rank.Eight),
      Card.createCard(Suit.Diamonds, Rank.Three, 0),
    ];

    const gameState = createGameState({
      trumpInfo,
      gamePhase: GamePhase.Playing,
      currentPlayerIndex: 1,
    });
    const stateWithCards = givePlayerCards(gameState, 1, hand);
    const gameContext = createGameContext(stateWithCards, PlayerId.Bot1);

    const lines = generateLeadingLines(
      stateWithCards,
      hand,
      PlayerId.Bot1,
      trumpInfo,
      gameContext,
    );

    const developLine = lines.find((l) => l.intent === "develop_suit");
    expect(developLine).toBeDefined();
    expect(developLine?.cards[0].suit).toBe(Suit.Clubs);
  });

  // Scenario 9: Economical Trick Capture
  it("Scenario 9: Should select the lowest winning card to win economically", () => {
    const leadTrick = createTrick(PlayerId.Bot1, [
      Card.createCard(Suit.Hearts, Rank.Nine, 0),
    ]);

    const hand: Card[] = [
      Card.createCard(Suit.Hearts, Rank.Ace, 0),
      Card.createCard(Suit.Hearts, Rank.King, 0),
      Card.createCard(Suit.Hearts, Rank.Three, 0),
    ];

    const gameState = createGameState({
      trumpInfo,
      gamePhase: GamePhase.Playing,
      currentPlayerIndex: 2,
      currentTrick: leadTrick,
    });
    const stateWithCards = givePlayerCards(gameState, 2, hand);
    const gameContext = createGameContext(stateWithCards, PlayerId.Bot2);

    const lines = generateFollowingLines(
      stateWithCards,
      hand,
      PlayerId.Bot2,
      trumpInfo,
      gameContext,
    );

    const winLine = lines.find((l) => l.intent === "overtake_win");
    expect(winLine).toBeDefined();
    // Must select King (lowest winner) rather than wasting Ace
    expect(winLine?.cards[0].rank).toBe(Rank.King);
  });

  // Scenario 10: Pair and Tractor Preservation
  it("Scenario 10: Should preserve pairs when following suit without matching structure", () => {
    const leadTrick = createTrick(PlayerId.Bot1, [
      Card.createCard(Suit.Hearts, Rank.Ace, 0),
      Card.createCard(Suit.Hearts, Rank.King, 0),
    ]);

    const hand: Card[] = [
      ...Card.createPair(Suit.Hearts, Rank.Eight), // Pair to protect
      Card.createCard(Suit.Hearts, Rank.Four, 0), // Single 1
      Card.createCard(Suit.Hearts, Rank.Six, 0), // Single 2
    ];

    const gameState = createGameState({
      trumpInfo,
      gamePhase: GamePhase.Playing,
      currentPlayerIndex: 2,
      currentTrick: leadTrick,
    });
    const stateWithCards = givePlayerCards(gameState, 2, hand);
    const gameContext = createGameContext(stateWithCards, PlayerId.Bot2);

    const lines = generateFollowingLines(
      stateWithCards,
      hand,
      PlayerId.Bot2,
      trumpInfo,
      gameContext,
    );

    const duckLine = lines.find((l) => l.intent === "duck_low");
    expect(duckLine).toBeDefined();
    expect(duckLine?.cards.length).toBe(2);
    // Should choose the two singles (4, 6) rather than splitting the 8-8 pair
    const ranks = duckLine?.cards.map((c) => c.rank);
    expect(ranks).toContain(Rank.Four);
    expect(ranks).toContain(Rank.Six);
    expect(ranks).not.toContain(Rank.Eight);
  });
});
