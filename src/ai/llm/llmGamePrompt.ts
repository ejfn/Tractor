import {
  Card,
  GameState,
  PlayerId,
  getPartnerId,
  TrumpInfo,
  Suit,
} from "../../types";
import { sortCards } from "../../utils/cardSorting";
import { analyzeSuitAvailability } from "../following/suitAvailabilityAnalysis";
import { detectCandidateLeads } from "../leading/candidateLeadDetection";
import { collectLeadingContext } from "../leading/leadingContext";
import { scoreNonTrumpLead, scoreTrumpLead } from "../leading/leadingScoring";
import {
  STATIC_LLM_GAME_RULES,
  buildUserPromptTemplate,
} from "./llmPromptTemplates";

export interface CardChoice {
  id: string;
  cardId: string;
  display: string;
  cardInstance: Card;
}

/**
 * Analyzes the completed tricks in the round to detect which players have emptied (are void in) which suits.
 * A player has emptied a suit if they failed to follow the led suit of a trick.
 */
export function detectSuitVoidsFromHistory(
  gameState: GameState,
  trumpInfo: TrumpInfo,
): Record<PlayerId, string[]> {
  const voids: Record<PlayerId, Set<string>> = {
    human: new Set<string>(),
    bot1: new Set<string>(),
    bot2: new Set<string>(),
    bot3: new Set<string>(),
  };

  gameState.tricks.forEach((trick) => {
    if (trick.plays.length === 0) return;

    const leadPlay = trick.plays[0];
    const leadCard = leadPlay.cards[0];
    if (!leadCard) return;

    const isTrumpLead = leadCard.isTrump(trumpInfo);
    const ledSuit = isTrumpLead ? "Trump Group" : leadCard.suit;

    trick.plays.forEach((play) => {
      const playerCard = play.cards[0];
      if (!playerCard) return;

      const playerPlayedTrump = playerCard.isTrump(trumpInfo);

      // Determine if player followed the led suit
      let followedSuit = false;
      if (isTrumpLead) {
        followedSuit = playerPlayedTrump;
      } else {
        followedSuit = !playerPlayedTrump && playerCard.suit === ledSuit;
      }

      if (!followedSuit) {
        // Player did not follow suit, so they are void (empty) in the led suit!
        voids[play.playerId].add(ledSuit);
      }
    });
  });

  // Convert sets to sorted arrays for deterministic output
  return {
    human: Array.from(voids.human).sort(),
    bot1: Array.from(voids.bot1).sort(),
    bot2: Array.from(voids.bot2).sort(),
    bot3: Array.from(voids.bot3).sort(),
  };
}

/**
 * Helper to build unique card choices and map them to categories.
 */
function localBuildHandChoicesAndMap(
  sortedHand: Card[],
  trumpInfo: TrumpInfo,
): { choicesMap: CardChoice[]; handChoicesStr: string } {
  // Generate unique IDs for hand cards
  const choicesMap = sortedHand.map((card, index) => ({
    id: `c${index + 1}`,
    cardId: card.id,
    display: `${card.toString()}${card.isTrump(trumpInfo) ? " (Trump)" : ""}${card.points > 0 ? ` [${card.points}pts]` : ""}`,
    cardInstance: card,
  }));

  // Group choices by category
  const categories: Record<string, CardChoice[]> = {};
  choicesMap.forEach((choice) => {
    let cat = "Off-Suit " + choice.cardInstance.suit;
    if (choice.cardInstance.isTrump(trumpInfo)) {
      cat = "Trump Group";
    }
    if (!categories[cat]) {
      categories[cat] = [];
    }
    categories[cat].push(choice);
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

  const handChoicesStr = allCategories
    .map((cat) => {
      const catCards = categories[cat] || [];
      if (catCards.length === 0) {
        return `--- ${cat.toUpperCase()} (void) ---`;
      }
      const catChoices = catCards
        .map((c) => `  ${c.id}: ${c.display}`)
        .join("\n");
      return `--- ${cat.toUpperCase()} (${catCards.length} cards) ---\n${catChoices}`;
    })
    .join("\n\n");

  return { choicesMap, handChoicesStr };
}

/**
 * Helper to build trick context and scoring candidates when leading.
 */
function localBuildLeadingPromptContext(
  handCards: Card[],
  gameState: GameState,
  playerId: PlayerId,
  trumpInfo: TrumpInfo,
  cardToChoiceId: (card: Card) => string,
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
      const cardsStr = entry.candidate.cards.map(cardToChoiceId).join(", ");
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
 * Helper to build trick context and scenario analysis when following.
 */
function localBuildFollowingPromptContext(
  handCards: Card[],
  gameState: GameState,
  playerId: PlayerId,
  trumpInfo: TrumpInfo,
  cardToChoiceId: (card: Card) => string,
): {
  activeTrickStatusStr: string;
  taskInstructionStr: string;
  suitAnalysisStr: string;
} {
  const currentTrick = gameState.currentTrick;
  if (!currentTrick || currentTrick.plays.length === 0) {
    return {
      activeTrickStatusStr: "",
      taskInstructionStr: "",
      suitAnalysisStr: "",
    };
  }

  const plays = currentTrick.plays;
  const leadPlay = plays[0];
  const requiredCount = leadPlay.cards.length;
  const winningPlayerId = currentTrick.winningPlayerId || leadPlay.playerId;
  const isTeammateWinning = winningPlayerId === getPartnerId(playerId);
  const trickPoints = currentTrick.points || 0;

  const leadingCardsStr = leadPlay.cards.map((c) => c.toString()).join(", ");

  const playsStr = plays
    .map(
      (p) =>
        `- ${p.playerId} played: ${p.cards.map((c) => c.toString()).join(", ")}${p.playerId === winningPlayerId ? " ⭐ (CURRENT LEADING PLAY)" : ""}`,
    )
    .join("\n");

  const statusLines = [
    `- Led by: ${leadPlay.playerId} playing [${leadingCardsStr}]`,
    `- Requirement: You must play exactly ${requiredCount} card(s). You must follow the led suit/trump group if you have any.`,
    `\nPlays in this trick so far:`,
    playsStr,
    `\n- Current Trick Winner: ${winningPlayerId} (Teammate: ${isTeammateWinning ? "YES" : "NO"})`,
    `- Current Points in Trick: ${trickPoints} pts`,
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
        const ids = combo.cards.map(cardToChoiceId).join(", ");
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
        `    ${analysis.remainingCards.map(cardToChoiceId).join(", ")}`,
      );
      break;
    }
    case "insufficient": {
      lines.push(
        `- You only have ${analysis.availableCount} card(s) but ${analysis.requiredLength} are required.`,
      );
      lines.push(
        `- You MUST play ALL your cards in that suit: ${analysis.remainingCards.map(cardToChoiceId).join(", ")}`,
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

  return {
    activeTrickStatusStr,
    taskInstructionStr,
    suitAnalysisStr,
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
function localFormatPlayerVoids(
  gameState: GameState,
  trumpInfo: TrumpInfo,
): string {
  const voids = detectSuitVoidsFromHistory(gameState, trumpInfo);
  return Object.entries(voids)
    .map(
      ([pId, suitsList]) =>
        `- ${pId}: ${suitsList.length > 0 ? suitsList.join(", ") : "None yet"}`,
    )
    .join("\n");
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

  // Build the unique card choices and display format
  const { choicesMap, handChoicesStr } = localBuildHandChoicesAndMap(
    sortedHand,
    trumpInfo,
  );

  // Helper to map game Card to prompt choice ID
  const cardToChoiceId = (card: Card): string => {
    const match = choicesMap.find((c) => c.cardId === card.id);
    return match ? `${match.id}(${card.toString()})` : card.toString();
  };

  // Determine current trick state
  const currentTrick = gameState.currentTrick;
  const isLeading = !currentTrick || currentTrick.plays.length === 0;

  let activeTrickStatusStr = "";
  let taskInstructionStr = "";
  let candidateOptionsStr = "";
  let suitAnalysisStr = "";

  if (isLeading) {
    const context = localBuildLeadingPromptContext(
      handCards,
      gameState,
      playerId,
      trumpInfo,
      cardToChoiceId,
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
      cardToChoiceId,
    );
    activeTrickStatusStr = context.activeTrickStatusStr;
    taskInstructionStr = context.taskInstructionStr;
    suitAnalysisStr = context.suitAnalysisStr;
  }

  // Reconstruct round tricks history (limit to last 3 tricks to keep prompt light)
  const historyStr = localFormatRecentTricksHistory(gameState);

  // Detect suit voids per player from round trick history
  const voidsStr = localFormatPlayerVoids(gameState, trumpInfo);

  const currentPlayer = gameState.players.find((p) => p.id === playerId);
  const teamId = currentPlayer?.team || "A";
  const partnerId = getPartnerId(playerId);

  const userPrompt = buildUserPromptTemplate({
    playerId,
    teamId,
    partnerId,
    trumpRank: trumpInfo.trumpRank,
    trumpSuit: trumpInfo.trumpSuit || "None",
    historyStr,
    voidsStr,
    activeTrickStatusStr,
    handCardsCount: handCards.length,
    handChoicesStr,
    isLeading,
    candidateOptionsStr,
    suitAnalysisStr,
    taskInstructionStr,
  });

  const systemPrompt = buildLLMSystemPrompt(gameState);

  return {
    system: systemPrompt,
    user: userPrompt,
  };
}
