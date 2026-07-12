import {
  Card,
  GameState,
  GameContext,
  MemoryContext,
  PlayerId,
  getPartnerId,
  TrumpInfo,
  Suit,
  Rank,
} from "../../types";
import { sortCards } from "../../utils/cardSorting";
import { createGameContext } from "../aiGameContext";
import {
  buildFollowingOptions,
  buildLeadingOptions,
} from "./llmPositionDiagnosis";
import {
  STATIC_LLM_GAME_RULES,
  buildUserPromptTemplate,
} from "./llmPromptTemplates";

/**
 * Projects the engine's per-player void memory into the string shape the prompt
 * consumes: off-suit voids by name plus "Trump Group" when a player is out of
 * trump. Reusing MemoryContext keeps the LLM path on the same void detection as
 * the rule-based AI (which also accounts for the in-progress trick).
 */
function localVoidsFromMemory(
  memoryContext: MemoryContext,
): Record<string, string[]> {
  const voids: Record<string, string[]> = {};
  Object.values(memoryContext.playerMemories).forEach((pm) => {
    const suits = Array.from(pm.suitVoids).map((s) => `${s}`);
    voids[pm.playerId] = [
      ...suits,
      ...(pm.trumpVoid ? ["Trump Group"] : []),
    ].sort();
  });
  return voids;
}

/**
 * Helper to build the hand display, grouped by suit/trump category.
 * Cards are shown by their plain notation (the same form the LLM replies with).
 */
function localBuildHandDisplay(
  sortedHand: Card[],
  trumpInfo: TrumpInfo,
): string {
  // Group cards by category
  const categories: Record<string, Card[]> = {};
  sortedHand.forEach((card) => {
    const cat = card.isTrump(trumpInfo)
      ? "Trump Group"
      : "Off-Suit " + card.suit;
    if (!categories[cat]) {
      categories[cat] = [];
    }
    categories[cat].push(card);
  });

  const categoryOrder = [
    "Trump Group",
    "Off-Suit Spades",
    "Off-Suit Hearts",
    "Off-Suit Clubs",
    "Off-Suit Diamonds",
  ];
  const extraCategories = Object.keys(categories).filter(
    (cat) => !categoryOrder.includes(cat),
  );
  const allCategories = [...categoryOrder, ...extraCategories];

  return allCategories
    .map((cat) => {
      const catCards = categories[cat] || [];
      if (catCards.length === 0) {
        return `--- ${cat.toUpperCase()} (void) ---`;
      }
      // Collapse identical cards to one line tagged with ×N so a small model
      // can read counts directly instead of inferring pairs from repeats.
      const seen = new Set<string>();
      const catChoices = catCards
        .filter((c) => {
          const key = c.toString();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map((c) => {
          const count = catCards.filter(
            (x) => x.toString() === c.toString(),
          ).length;
          return `  ${c.toString()}${count > 1 ? ` ×${count}` : ""}${c.isTrump(trumpInfo) ? " (Trump)" : ""}${c.points > 0 ? ` [${c.points}pts]` : ""}`;
        })
        .join("\n");
      return `--- ${cat.toUpperCase()} (${catCards.length} cards) ---\n${catChoices}`;
    })
    .join("\n\n");
}

/**
 * Builds the raw trick-state facts for the following path: who led, the plays so
 * far, your seat, who is still to act, who currently holds it, and the points at
 * stake. Consequences of each legal play live in the `## Your Options` block.
 */
function localBuildActiveTrickStatus(
  gameState: GameState,
  playerId: PlayerId,
  gameContext: GameContext,
): { activeTrickStatusStr: string; taskInstructionStr: string } {
  const currentTrick = gameState.currentTrick;
  const winnerAnalysis = gameContext.trickWinnerAnalysis;
  if (!currentTrick || currentTrick.plays.length === 0 || !winnerAnalysis) {
    return { activeTrickStatusStr: "", taskInstructionStr: "" };
  }

  const plays = currentTrick.plays;
  const leadPlay = plays[0];
  const requiredCount = leadPlay.cards.length;
  const winnerId = winnerAnalysis.currentWinner;
  const partnerId = getPartnerId(playerId);
  const leadingCardsStr = leadPlay.cards.map((c) => c.toString()).join(", ");
  // Name the follow group explicitly. Trump-rank leads print as off-suit (e.g. 2♥
  // when rank is 2) but the led group is always Trump Group — models otherwise
  // follow the ink color and play illegal Hearts.
  const isTrumpLead = winnerAnalysis.isTrumpLead;
  const ledGroupLabel = isTrumpLead
    ? "Trump Group"
    : `${leadPlay.cards[0]?.suit ?? "unknown"}`;
  const trumpRankNote =
    isTrumpLead &&
    leadPlay.cards.some(
      (c) =>
        !c.joker &&
        c.rank === gameState.trumpInfo.trumpRank &&
        c.suit !== gameState.trumpInfo.trumpSuit,
    )
      ? ` (trump-rank ${gameState.trumpInfo.trumpRank} — printed suit is NOT the led suit)`
      : "";

  const playsStr = plays
    .map(
      (p) =>
        `- ${p.playerId} played: ${p.cards.map((c) => c.toString()).join(", ")}${p.playerId === winnerId ? " ⭐ (currently winning)" : ""}`,
    )
    .join("\n");

  const playedIds = plays.map((p) => p.playerId);
  const yetToPlay = gameState.players
    .map((p) => p.id)
    .filter((id) => id !== playerId && !playedIds.includes(id));
  const seatLabel =
    ["1st (leader)", "2nd", "3rd", "4th"][plays.length] ||
    `${plays.length + 1}th`;
  const yetToPlayStr =
    yetToPlay.length > 0
      ? yetToPlay
          .map((id) => `${id} (${id === partnerId ? "teammate" : "opponent"})`)
          .join(", ")
      : "none — you play last";

  const activeTrickStatusStr = [
    `- Led by: ${leadPlay.playerId} playing [${leadingCardsStr}]`,
    `- Led group: ${ledGroupLabel}${trumpRankNote}`,
    `- Requirement: play exactly ${requiredCount} card(s) from ${ledGroupLabel} if you hold any (see ## Your Options for legal plays).`,
    `\nPlays in this trick so far:`,
    playsStr,
    `\n- Your seat: ${seatLabel} of 4; still to act after you: ${yetToPlayStr}`,
    `- Currently winning: ${winnerId} (${winnerAnalysis.isTeammateWinning ? "your teammate" : "opponent"})`,
    `- Points in this trick: ${winnerAnalysis.trickPoints} pts`,
  ].join("\n");

  const taskInstructionStr = `Select exactly ${requiredCount} card(s) from the led group (${ledGroupLabel}) using a play listed under ## Your Options.`;

  return { activeTrickStatusStr, taskInstructionStr };
}

/**
 * Helper to format the recent tricks history.
 */
function localFormatRecentTricksHistory(gameState: GameState): string {
  const recentTricks = gameState.tricks.slice(-3);
  if (gameState.tricks.length === 0) {
    return "No tricks completed yet in this round.";
  }
  return recentTricks
    .map((t, idx) => {
      const absoluteIdx = gameState.tricks.length - recentTricks.length + idx;
      const playsList = t.plays
        .map(
          (p) =>
            `${p.playerId} played ${p.cards.map((c) => c.toString()).join(", ")}`,
        )
        .join(", ");
      return `Trick ${absoluteIdx + 1}: Led by ${t.plays[0].playerId}. plays: [${playsList}]. Won by: ${t.winningPlayerId} (${t.points} points)`;
    })
    .join("\n");
}

/**
 * Helper to format confirmed player suit voids.
 *
 * A void is only confirmed when a player discards off-suit, so this list is a
 * floor, not the full picture — a player who just played their last card of a
 * suit is void without it showing here. The caveat is stated so the LLM treats
 * "no void shown" as "not proven to hold it", not "definitely holds it".
 */
function localFormatPlayerVoids(voids: Record<string, string[]>): string {
  const rows = Object.entries(voids)
    .map(
      ([pId, suitsList]) =>
        `- ${pId}: ${suitsList.length > 0 ? suitsList.join(", ") : "None yet"}`,
    )
    .join("\n");
  return `${rows}\n(Confirmed only when a player discards off-suit — a player may be void in a suit not listed here if they just played their last card of it.)`;
}

/**
 * Sums the point-card value still unseen in each non-trump suit — points not
 * yet played and not in this player's hand, so they sit in another hand or the
 * hidden kitty. Counts both deck copies (50 pts/suit: 2×5 + 2×10 + 2×K, minus
 * any point rank the trump rank promotes into the trump group). A reference
 * upper bound on what the suit can still yield, not an exact figure.
 */
function localFormatLiveOffSuitPoints(
  gameState: GameState,
  handCards: Card[],
): string {
  const { trumpInfo } = gameState;

  let suitTotal = 50;
  if (trumpInfo.trumpRank === Rank.Five) suitTotal -= 10;
  else if (trumpInfo.trumpRank === Rank.Ten) suitTotal -= 20;
  else if (trumpInfo.trumpRank === Rank.King) suitTotal -= 20;

  // Every card this player can already account for (played + on table + hand).
  const seen: Card[] = [
    ...gameState.tricks.flatMap((t) => t.plays.flatMap((pl) => pl.cards)),
    ...(gameState.currentTrick?.plays.flatMap((pl) => pl.cards) ?? []),
    ...handCards,
  ];

  const parts = [Suit.Spades, Suit.Hearts, Suit.Clubs, Suit.Diamonds]
    .filter((suit) => suit !== trumpInfo.trumpSuit)
    .map((suit) => {
      const seenPts = seen
        .filter((c) => !c.isTrump(trumpInfo) && c.suit === suit)
        .reduce((sum, c) => sum + c.points, 0);
      return `${suit} ${Math.max(0, suitTotal - seenPts)}`;
    });
  return parts.join(" · ");
}

/**
 * Builds the static system instructions prompt detailing rules and strategic guidelines.
 */
export function buildLLMSystemPrompt(_gameState: GameState): string {
  return STATIC_LLM_GAME_RULES;
}

/**
 * Builds the user prompt detailing the current hand, trick state, history, and card choices.
 */
export function buildLLMUserPrompt(
  gameState: GameState,
  playerId: PlayerId,
  handCards: Card[],
): { system: string; user: string } {
  const trumpInfo = gameState.trumpInfo;
  const sortedHand = sortCards(handCards, trumpInfo);

  // Build the hand display
  const handChoicesStr = localBuildHandDisplay(sortedHand, trumpInfo);

  // Build the engine's game context once — single source for trick-winner
  // analysis and per-player void memory (shared with the rule-based AI).
  const gameContext = createGameContext(gameState, playerId);
  const voids = localVoidsFromMemory(gameContext.memoryContext);

  // Determine current trick state
  const currentTrick = gameState.currentTrick;
  const isLeading = !currentTrick || currentTrick.plays.length === 0;

  let activeTrickStatusStr = "";
  let taskInstructionStr = "";
  let optionsStr = "";

  if (isLeading) {
    optionsStr = buildLeadingOptions(
      gameState,
      playerId,
      handCards,
      trumpInfo,
      gameContext,
    );
    taskInstructionStr =
      "Select exactly ONE valid combination of cards from your hand (Single, Pair, Tractor, or unbeatable same-suit Multi-Combo) to lead the trick.";
  } else {
    const status = localBuildActiveTrickStatus(
      gameState,
      playerId,
      gameContext,
    );
    activeTrickStatusStr = status.activeTrickStatusStr;
    taskInstructionStr = status.taskInstructionStr;
    optionsStr = buildFollowingOptions(
      gameState,
      playerId,
      handCards,
      gameContext,
      voids,
    );
  }

  // Reconstruct round tricks history (limit to last 3 tricks to keep prompt light)
  const historyStr = localFormatRecentTricksHistory(gameState);

  // Confirmed per-player voids from the engine's memory context
  const voidsStr = localFormatPlayerVoids(voids);

  // Point cards still unseen in each off-suit (others' hands or hidden kitty)
  const liveSuitPointsStr = localFormatLiveOffSuitPoints(gameState, handCards);

  const currentPlayer = gameState.players.find((p) => p.id === playerId);
  const teamId = currentPlayer?.team || "A";
  const partnerId = getPartnerId(playerId);

  const userPrompt = buildUserPromptTemplate({
    playerId,
    teamId,
    partnerId,
    trumpRank: trumpInfo.trumpRank,
    trumpSuit: trumpInfo.trumpSuit || "None",
    isAttacking: gameContext.isAttackingTeam,
    attackingPoints: gameContext.currentPoints,
    historyStr,
    voidsStr,
    liveSuitPointsStr,
    activeTrickStatusStr,
    handChoicesStr,
    isLeading,
    optionsStr,
    taskInstructionStr,
  });

  const systemPrompt = buildLLMSystemPrompt(gameState);

  return {
    system: systemPrompt,
    user: userPrompt,
  };
}
