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
  ComboType,
  JokerType,
} from "../../types";
import { isComboUnbeatable } from "../../game/multiComboValidation";
import { compareCards } from "../../game/cardComparison";
import { sortCards } from "../../utils/cardSorting";
import { analyzeSuitAvailability } from "../following/suitAvailabilityAnalysis";
import { detectCandidateLeads } from "../leading/candidateLeadDetection";
import { collectLeadingContext } from "../leading/leadingContext";
import { scoreNonTrumpLead, scoreTrumpLead } from "../leading/leadingScoring";
import { createGameContext } from "../aiGameContext";
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
  const allCategories = [...categoryOrder];
  Object.keys(categories).forEach((cat) => {
    if (!allCategories.includes(cat)) {
      allCategories.push(cat);
    }
  });

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
 * Helper to build trick context and scoring candidates when leading.
 */
function localBuildLeadingPromptContext(
  handCards: Card[],
  gameState: GameState,
  playerId: PlayerId,
  trumpInfo: TrumpInfo,
  cardToDisplay: (card: Card) => string,
): {
  activeTrickStatusStr: string;
  taskInstructionStr: string;
  candidateOptionsStr: string;
} {
  const activeTrickStatusStr = `- Status: You are leading this trick!
- Requirement: You must play exactly ONE valid combination from your hand (Single, Pair, Tractor, or unbeatable same-suit Multi-Combo). Mismatched combination types are strictly illegal.`;
  const taskInstructionStr =
    "Select exactly ONE valid combination of cards from your hand (Single, Pair, Tractor, or unbeatable same-suit Multi-Combo) to lead the trick.";

  const candidates = detectCandidateLeads(
    handCards,
    gameState,
    playerId,
    trumpInfo,
  );
  const context = collectLeadingContext(gameState, playerId);
  const nonTrumpCandidates = candidates
    .filter((candidate) => !candidate.metadata.isTrump)
    .map((candidate) => ({
      candidate,
      result: scoreNonTrumpLead(candidate, trumpInfo, context),
    }))
    .sort((a, b) => b.result.score - a.result.score);

  const trumpCandidates = candidates
    .filter((candidate) => candidate.metadata.isTrump)
    .map((candidate) => ({
      candidate,
      result: scoreTrumpLead(candidate, trumpInfo, context),
    }))
    .sort((a, b) => b.result.score - a.result.score);

  const scoredCandidates = [...nonTrumpCandidates, ...trumpCandidates].sort(
    (a, b) => b.result.score - a.result.score,
  );

  const allOptions = scoredCandidates
    .map((entry, idx) => {
      const cardsStr = entry.candidate.cards.map(cardToDisplay).join(", ");
      return `- Option L${idx + 1}: Play [${cardsStr}] (Rule Score: ${entry.result.score})`;
    })
    .join("\n");

  const candidateOptionsStr = `Here are the candidate combinations you can lead, along with a strategic rating from the rule-based engine:
${allOptions || "- No candidates found (using fallback)"}
`;

  return {
    activeTrickStatusStr,
    taskInstructionStr,
    candidateOptionsStr,
  };
}

/**
 * Renders a short, situation-specific "how to play this seat" bullet for the
 * following path. STATIC_LLM_GAME_RULES §5/§6 state the general principles;
 * this picks the one that actually applies to THIS seat, names the concrete
 * players, and spells out the beat-back inference a small model would otherwise
 * have to derive on its own. It scaffolds the LLM's judgement among the legal
 * options — it does not choose the card.
 */
function localBuildSeatGuidance(g: {
  isLast: boolean;
  isTeammateWinning: boolean;
  teammateWinSafe: boolean;
  canBeatWinnerInSuit: boolean;
  winningPlayerId: string;
  winningCardStr: string;
  oppListStr: string;
  trickPoints: number;
  isTrumpLead: boolean;
  isAnyOpponentVoid: boolean;
  isVoidScenario: boolean;
}): string {
  let bullet: string;

  if (g.isVoidScenario) {
    // Void in the led suit → ruff or sluff (§6).
    if (g.isTeammateWinning && g.teammateWinSafe) {
      bullet = `${g.winningPlayerId} (teammate) is winning safely — don't ruff over them; sluff a spare point card (10/K) to bank points for your team, else your lowest off-suit non-point.`;
    } else if (g.isTeammateWinning) {
      bullet = `${g.winningPlayerId} (teammate) leads but it isn't safe — sluff a low off-suit non-point; don't ruff over your own teammate.`;
    } else if (g.trickPoints >= 10) {
      bullet = `${g.winningPlayerId} (opponent) holds ${g.trickPoints} pts — their card is only takeable by ruffing, so ruff to capture if you can survive ${g.isLast ? "the rest (you're last)" : g.oppListStr} (size it to top a later void player); can't secure it → sluff your lowest off-suit NON-point, never a 5/10/K into their trick.`;
    } else {
      bullet = `Only ${g.trickPoints} pts and ${g.winningPlayerId} (opponent) leads — sluff your lowest off-suit non-point and conserve trump.`;
    }
  } else if (g.isTeammateWinning) {
    // Following the led suit, teammate currently winning (§5.1 / §5.2).
    bullet = g.teammateWinSafe
      ? `${g.winningPlayerId} (teammate)'s win is safe — bank your biggest spare points, giving 10s and Ks freely (do not worry if playing points out-ranks your teammate's card, as your team still takes the trick); hold back only a live boss A/K you can cash on your own trick.`
      : `${g.winningPlayerId} (teammate) leads but ${g.oppListStr} can still steal it — play a low non-point card of the led suit; don't commit points yet.`;
  } else if (g.isLast) {
    // Opponent winning, you act last with full info (§5.3 / §9 4th).
    bullet = `You play last with full info — beat ${g.winningPlayerId}'s ${g.winningCardStr} with your cheapest sufficient card if you can (prefer winning if you hold points that can win or the trick contains points; never conserve off-suit cards); otherwise dump your lowest non-point (never a 5/10/K into an opponent's trick).`;
  } else if (g.trickPoints >= 10) {
    // Opponent winning, rich trick, players still behind you (§5.3).
    if (!g.canBeatWinnerInSuit) {
      bullet = `${g.trickPoints} pts at stake but you hold nothing that beats ${g.winningPlayerId}'s ${g.winningCardStr} here — duck low and keep your points/high cards for a trick you can win.`;
    } else {
      const caveat = g.isTrumpLead
        ? "a regular trump K/10 loses to active ranks/jokers, so commit only a truly unbeatable trump — else duck low"
        : g.isAnyOpponentVoid
          ? "a void opponent can ruff, so even the suit boss may be cut — weigh ducking"
          : "only the suit boss survives the players behind you; a mid card can be over-taken — else duck";
      bullet = `${g.trickPoints} pts at stake and ${g.oppListStr} act after you — fight only with a card they can't beat back: ${caveat}.`;
    }
  } else {
    // Opponent winning, thin trick (§5.4).
    bullet = `Only ${g.trickPoints} pts and ${g.oppListStr} still to act — if off-suit and you can beat the winner, play your boss/highest to win the trick and secure the lead; if trump or you cannot beat the winner, duck low and conserve.`;
  }

  return `- ${bullet}`;
}

/**
 * Helper to build trick context and scenario analysis when following.
 */
function localBuildFollowingPromptContext(
  handCards: Card[],
  gameState: GameState,
  playerId: PlayerId,
  trumpInfo: TrumpInfo,
  cardToDisplay: (card: Card) => string,
  gameContext: GameContext,
  voids: Record<string, string[]>,
): {
  activeTrickStatusStr: string;
  taskInstructionStr: string;
  suitAnalysisStr: string;
  seatGuidanceStr: string;
} {
  const currentTrick = gameState.currentTrick;
  const trickWinner = gameContext.trickWinnerAnalysis;
  if (!currentTrick || currentTrick.plays.length === 0 || !trickWinner) {
    return {
      activeTrickStatusStr: "",
      taskInstructionStr: "",
      suitAnalysisStr: "",
      seatGuidanceStr: "",
    };
  }

  const plays = currentTrick.plays;
  const leadPlay = plays[0];
  const requiredCount = leadPlay.cards.length;
  const winningPlayerId = trickWinner.currentWinner;
  const partnerId = getPartnerId(playerId);
  const isTeammateWinning = trickWinner.isTeammateWinning;
  const trickPoints = trickWinner.trickPoints;

  const leadingCardsStr = leadPlay.cards.map((c) => c.toString()).join(", ");

  const playsStr = plays
    .map(
      (p) =>
        `- ${p.playerId} played: ${p.cards.map((c) => c.toString()).join(", ")}${p.playerId === winningPlayerId ? " ⭐ (CURRENT LEADING PLAY)" : ""}`,
    )
    .join("\n");

  // Determine who is left to act in this trick
  const playedPlayerIds = plays.map((p) => p.playerId);
  const yetToPlay = gameState.players
    .map((p) => p.id)
    .filter((id) => id !== playerId && !playedPlayerIds.includes(id));

  const remainingOpponents = yetToPlay.filter((id) => id !== partnerId);

  // Confirmed voids come from the engine's MemoryContext (passed in).
  const leadCard = leadPlay.cards[0];
  const isTrumpLead = trickWinner.isTrumpLead;
  const ledSuit = isTrumpLead ? "Trump Group" : leadCard?.suit || "";
  const isAnyOpponentVoid = remainingOpponents.some((oppId) => {
    const oppVoids = voids[oppId] || [];
    return oppVoids.includes(ledSuit);
  });

  const winningPlay = plays.find((p) => p.playerId === winningPlayerId);
  const winningCard = winningPlay?.cards[0] || null;
  const winningCardStr = winningCard ? winningCard.toString() : "their card";

  // "Boss" is an OFF-SUIT notion only: the highest card still live in a side
  // suit, beatable only by a ruff. Memory-aware via isComboUnbeatable (fed the
  // engine's played-card memory) — a K becomes boss once both Aces are gone.
  // Only meaningful for teammate-win safety below, so skip it otherwise.
  const winnerOffSuitBoss =
    isTeammateWinning &&
    !!winningCard &&
    !winningCard.isTrump(trumpInfo) &&
    isComboUnbeatable(
      { type: ComboType.Single, cards: [winningCard], value: 0 },
      winningCard.suit,
      gameContext.memoryContext.playedCards,
      handCards,
      trumpInfo,
      [],
    );

  // The trump group has no "boss"; only the Big Joker is guaranteed unbeatable
  // (conservative — other high trumps are covered by the all-void check below).
  const winnerTopTrump = !!winningCard && winningCard.joker === JokerType.Big;

  // Can THIS player beat the current winner with a same-group card in hand?
  const canBeatWinnerInSuit =
    !!winningCard &&
    handCards.some((c) => {
      const sameGroup = winningCard.isTrump(trumpInfo)
        ? c.isTrump(trumpInfo)
        : !c.isTrump(trumpInfo) && c.suit === winningCard.suit;
      return sameGroup && compareCards(c, winningCard, trumpInfo) > 0;
    });

  // All remaining opponents are confirmed void in the led suit/trump group.
  const allRemainingOpponentsVoidLed =
    remainingOpponents.length > 0 &&
    remainingOpponents.every((oppId) => (voids[oppId] || []).includes(ledSuit));

  // Teammate's win is "safe" when no opponents remain; their card is an off-suit
  // boss the remaining (non-void) opponents can't top; they hold the top trump;
  // or it is a trump trick and every remaining opponent is out of trump. An
  // opponent void in an OFF-suit lead is NOT safe — they can ruff.
  const teammateWinSafe =
    isTeammateWinning &&
    (remainingOpponents.length === 0 ||
      (winnerOffSuitBoss && !isAnyOpponentVoid) ||
      winnerTopTrump ||
      (isTrumpLead && allRemainingOpponentsVoidLed));

  const oppListStr = remainingOpponents.join(" and ");
  let winSecurityStr = "";
  if (isTeammateWinning) {
    if (remainingOpponents.length === 0) {
      winSecurityStr = `SECURED WIN: Your teammate (${winningPlayerId}) is winning, and there are NO opponents left to act. Your team is guaranteed to win this trick.`;
    } else if (teammateWinSafe) {
      const why =
        winnerOffSuitBoss && !isAnyOpponentVoid
          ? `with a card (${winningCardStr}) no remaining opponent can beat`
          : winnerTopTrump
            ? `with the top trump (${winningCardStr})`
            : `a trump trick while the remaining opponents are out of trump`;
      winSecurityStr = `LIKELY WIN: Your teammate (${winningPlayerId}) is winning ${why}. They are extremely likely to win this trick.`;
    } else {
      winSecurityStr = `UNCERTAIN: Your teammate (${winningPlayerId}) is winning, but opponent(s) [${oppListStr}] have yet to play — the card is beatable or an opponent may be void / hold higher, so the outcome is uncertain.`;
    }
  } else {
    winSecurityStr = `UNCERTAIN: Opponent (${winningPlayerId}) is currently winning the trick.`;
  }

  const isLast = yetToPlay.length === 0;
  const seatLabel =
    ["1st (leader)", "2nd", "3rd", "4th"][plays.length] ||
    `${plays.length + 1}th`;
  const yetToPlayStr =
    yetToPlay.length > 0
      ? yetToPlay
          .map((id) => `${id} (${id === partnerId ? "teammate" : "opponent"})`)
          .join(", ")
      : "none — you play last";

  const statusLines = [
    `- Led by: ${leadPlay.playerId} playing [${leadingCardsStr}]`,
    `- Requirement: You must play exactly ${requiredCount} card(s). You must follow the led suit/trump group if you have any.`,
    `\nPlays in this trick so far:`,
    playsStr,
    `\n- Your seat: ${seatLabel} of 4; still to act after you: ${yetToPlayStr}`,
    `- Current Leading Player: ${winningPlayerId} (Teammate: ${isTeammateWinning ? "YES" : "NO"})`,
    `- Current Points in Trick: ${trickPoints} pts`,
    `- Trick Win Security: ${winSecurityStr}`,
  ];
  const activeTrickStatusStr = statusLines.join("\n");
  const taskInstructionStr = `Select exactly ${requiredCount} card(s) from your hand following the trick requirement and suit following rules.`;

  // Analyze suit following using the same engine as algorithmic AI
  const analysis = analyzeSuitAvailability(
    leadPlay.cards,
    handCards,
    trumpInfo,
  );

  const ledSuitDisplay =
    analysis.evaluateSuit === Suit.None ? "Trump Group" : analysis.evaluateSuit;
  const lines: string[] = [
    `- Led combo type: ${analysis.leadingComboType} (${analysis.requiredLength} cards)`,
    `- Led suit/group: ${ledSuitDisplay}`,
    `- Your cards in that suit: ${analysis.availableCount}`,
    `- Scenario: ${analysis.scenario}`,
  ];

  switch (analysis.scenario) {
    case "valid_combos": {
      lines.push(
        `- You have matching ${analysis.leadingComboType} combos to choose from:`,
      );
      for (const combo of analysis.validCombos) {
        const ids = combo.cards.map(cardToDisplay).join(", ");
        lines.push(`    • ${combo.type}: [${ids}]`);
      }
      break;
    }
    case "enough_remaining": {
      lines.push(
        `- You have enough cards in the led suit but NO matching ${analysis.leadingComboType} combos.`,
      );
      lines.push(
        `- You must still play ${analysis.requiredLength} card(s) from this suit. Available cards:`,
      );
      lines.push(
        `    ${analysis.remainingCards.map(cardToDisplay).join(", ")}`,
      );
      break;
    }
    case "insufficient": {
      lines.push(
        `- You only have ${analysis.availableCount} card(s) but ${analysis.requiredLength} are required.`,
      );
      lines.push(
        `- You MUST play ALL your cards in that suit: ${analysis.remainingCards.map(cardToDisplay).join(", ")}`,
      );
      lines.push(
        `- Fill the remaining ${analysis.requiredLength - analysis.availableCount} slot(s) from other suits (discard or trump).`,
      );
      break;
    }
    case "void": {
      lines.push(
        `- You are VOID in the led suit. You may trump (ruff) with trump cards or discard (sluff) from any suit.`,
      );
      break;
    }
  }

  const suitAnalysisStr = lines.join("\n") + "\n";

  const seatGuidanceStr = localBuildSeatGuidance({
    isLast,
    isTeammateWinning,
    teammateWinSafe,
    canBeatWinnerInSuit,
    winningPlayerId,
    winningCardStr,
    oppListStr,
    trickPoints,
    isTrumpLead,
    isAnyOpponentVoid,
    isVoidScenario: analysis.scenario === "void",
  });

  return {
    activeTrickStatusStr,
    taskInstructionStr,
    suitAnalysisStr,
    seatGuidanceStr,
  };
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
 */
function localFormatPlayerVoids(voids: Record<string, string[]>): string {
  return Object.entries(voids)
    .map(
      ([pId, suitsList]) =>
        `- ${pId}: ${suitsList.length > 0 ? suitsList.join(", ") : "None yet"}`,
    )
    .join("\n");
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
export function buildLLMSystemPrompt(gameState: GameState): string {
  const { trumpInfo } = gameState;
  const trumpRankStr = trumpInfo.trumpRank;
  const trumpSuitStr = trumpInfo.trumpSuit || "None (Joker pairs only)";

  // Replace dynamic placeholders
  return STATIC_LLM_GAME_RULES.replace(/\$\{trumpRankStr\}/g, trumpRankStr)
    .replace(/\$\{trumpSuitStr\}/g, trumpSuitStr)
    .replace(
      /\${trumpInfo\.trumpSuit \|\| "None"}/g,
      trumpInfo.trumpSuit || "None",
    )
    .replace(/\${trumpInfo\.trumpRank}/g, trumpInfo.trumpRank);
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

  // Render a card as the plain notation the LLM also replies with
  const cardToDisplay = (card: Card): string => card.toString();

  // Build the engine's game context once — single source for trick-winner
  // analysis and per-player void memory (shared with the rule-based AI).
  const gameContext = createGameContext(gameState, playerId);
  const voids = localVoidsFromMemory(gameContext.memoryContext);

  // Determine current trick state
  const currentTrick = gameState.currentTrick;
  const isLeading = !currentTrick || currentTrick.plays.length === 0;

  let activeTrickStatusStr = "";
  let taskInstructionStr = "";
  let candidateOptionsStr = "";
  let suitAnalysisStr = "";
  let seatGuidanceStr = "";

  if (isLeading) {
    const context = localBuildLeadingPromptContext(
      handCards,
      gameState,
      playerId,
      trumpInfo,
      cardToDisplay,
    );
    activeTrickStatusStr = context.activeTrickStatusStr;
    taskInstructionStr = context.taskInstructionStr;
    candidateOptionsStr = context.candidateOptionsStr;
  } else {
    const context = localBuildFollowingPromptContext(
      handCards,
      gameState,
      playerId,
      trumpInfo,
      cardToDisplay,
      gameContext,
      voids,
    );
    activeTrickStatusStr = context.activeTrickStatusStr;
    taskInstructionStr = context.taskInstructionStr;
    suitAnalysisStr = context.suitAnalysisStr;
    seatGuidanceStr = context.seatGuidanceStr;
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
    handCardsCount: handCards.length,
    handChoicesStr,
    isLeading,
    candidateOptionsStr,
    suitAnalysisStr,
    seatGuidanceStr,
    taskInstructionStr,
  });

  const systemPrompt = buildLLMSystemPrompt(gameState);

  return {
    system: systemPrompt,
    user: userPrompt,
  };
}
