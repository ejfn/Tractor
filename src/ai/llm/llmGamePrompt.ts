import {
  Card,
  GameState,
  PlayerId,
  getPartnerId,
  TrumpInfo,
} from "../../types";
import { sortCards } from "../../utils/cardSorting";
import { isTrump } from "../../game/cardValue";

export type LLMEngagementContext = string;

export const STATIC_LLM_GAME_RULES = `# Shengji (升级 / Tractor) Advanced AI Strategic Rules

## 1. Teammates & Roles
- **Teams**: Counter-clockwise: South (\`human\`) & North (\`bot2\`) [Team A] vs East (\`bot1\`) & West (\`bot3\`) [Team B].
- **Goal**: Cooperate with teammate to advance ranks from **2 to Ace** by winning rounds. The first team to reach rank **Ace** and successfully defend (hold attackers < 80 pts) wins the game.
- **Scoring**: Defenders hold Attackers < 80 pts to advance. Attackers win by capturing 80+ pts.
- **Kitty**: 8 cards are kept in the kitty and are completely out of active play during trick playing.

## 2. Card Values & Trump Hierarchy
- **Points**: 5 = 5pts, 10 = 10pts, King = 10pts (200 total).
- **Trump Group**: Single unified suit. BJ > SJ > Trump-Suit Rank > Off-Suit Ranks (equal, first played wins) > Trump Suit Regulars (A > K > Q > ... > 3). Off-Suit Ranks and Jokers are irreplaceable — when forced to discard trumps, sacrifice the weakest Trump Suit Regulars first.
- **Off-Suits**: Cards of the trump rank leave their off-suit and join the Trump Group. Remaining cards rank A > K > Q > ... > 3 (or K > Q > ... > 3 if Ace is active rank); the highest card left in its suit is unbeatable unless cut by trump. Cross-suit plays cannot beat each other.

## 3. Combinations & Tractors
- **Combos**: Single; Pair (2 identical cards); Tractor (2+ consecutive pairs in same suit/trump group).
- **Trump Tractor Order (Consecutive Sequence)**: A-Trump-Suit -> Off-Suit Ranks -> Trump-Suit Rank -> SJ -> BJ. Two off-suit rank pairs are NOT consecutive (they are equal); only an off-suit rank pair + trump-suit rank pair forms a valid tractor.
- **Skip Rule**: Off-suit tractor sequences skip the active Trump Rank (e.g., 6-8 is consecutive if 7 is active rank).
- **Preservation**: Do not break a tractor to follow a pair if you have a standalone pair.

## 4. Following & Ruffing Priorities
- **Priority**: 1. Follow suit/trump. 2. Match combo structure (tractor/pair) if possible. 3. Preserve pairs/tractors (do not break unnecessarily). 4. If you cannot fully match the combo structure, play your highest available combination types (e.g. play pairs if tractor led).
- **Ruff/Discard**: If void, you can discard or cut with trump. To cut a combo, you must match its structure (e.g. trump pair cuts a pair; 2 single trumps cannot).
- **Exhaustion**: If play leaves you with 0 cards of the led suit, any cards are valid.

## 5. Multi-Combo Rules (Same-suit combos led together)
- **Lead**: Non-trump only. Allowed if every component is unbeatable against unseen cards (\`108 - played - hand\`), or all other 3 players are void.
- **Follow**: Match structure (tractors/pairs/singles) and total length. Void players can cut with matching trump structures.
- **Trump vs Trump**: Compare highest component combo type (Tractor > Pair > Single), then compare highest card.

## 6. Strategic Heuristics
- **Conservation**: Retain highest trumps (BJ > SJ > Trump Ranks > Trump Regulars: A > K > ... > 3) and off-suit boss cards (Aces > Kings); play lowest (non-point/low trump regulars) when forced or teammate wins.
- **Leader (1st)**: Controls the trick start and tempo. Lead off-suit Aces/Kings early; lead trump pairs (avoid single trumps). High trumps (Jokers, Active Ranks, and High Trump Regulars like Aces/Kings) are precious control assets; leading them early (especially as singletons) is inefficient unless holding sufficient trumps to exhaust opponents' trumps and run long off-suits. Feed point cards (5, 10, K) if teammate is void. Play high non-points to force out opponent trumps.
- **2nd Player**: Decide whether to win or conserve, evaluating that your teammate (4th Player) plays last and can cover the trick. If opponents lead points and you hold the boss card (e.g. Ace), it is a prime opportunity to win immediately, unless conserving it. Otherwise, play lowest non-point to conserve resources and allow the 4th Player to win or contest. Void -> ruff with modest trump to win or block.
- **3rd Player**: Vital blocking role because the last player is an opponent (4th) playing with perfect info. If teammate is winning and their card is strong, prioritize feeding point cards (10 > K > 5) and conserving non-point boss cards; only play high or ruff to secure a vulnerable trick. If void, ruff or over-ruff to secure points or block and pressure the opponent, but avoid ruffing teammate's dominant winning cards.
- **4th Player (Perfect Info)**: Final play with perfect info. If teammate is winning, feed points safely; however, you can strategically beat a winning teammate or opponent (even on point-free tricks) to secure the lead if needed to run a powerful combination (unbeatable tractor/long suit) next. If opponent is winning and you cannot or choose not to win, play lowest non-point to conserve.
`;

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
  engagementContext?: LLMEngagementContext,
): { system: string; user: string } {
  const trumpInfo = gameState.trumpInfo;
  const sortedHand = sortCards(handCards, trumpInfo);

  // Generate unique IDs for hand cards
  const choicesMap = sortedHand.map((card, index) => ({
    id: `c${index + 1}`,
    cardId: card.id,
    display: `${card.toString()}${card.isTrump(trumpInfo) ? " (Trump)" : ""}${card.points > 0 ? ` [${card.points}pts]` : ""}`,
    cardInstance: card,
  }));

  const choicesStr = choicesMap
    .map((c) => `"${c.id}": "${c.display}"`)
    .join(",\n  ");

  // Determine current trick state
  const currentTrick = gameState.currentTrick;
  const isLeading = !currentTrick || currentTrick.plays.length === 0;
  const requiredCount = !isLeading ? currentTrick.plays[0].cards.length : 0;

  let trickStateStr = "";
  let leadingCardsStr = "None (You are the leader)";
  let playsInTrickStr = "None yet";
  let relevantCardsInfoStr = "";

  if (isLeading) {
    trickStateStr = `You are leading this trick!
As the leader, you must play exactly ONE valid combination from your hand (Single, Pair, Tractor, or unbeatable same-suit Multi-Combo). Mismatched combination types are strictly illegal.`;
  } else {
    const plays = currentTrick.plays;
    const leadPlay = plays[0];
    leadingCardsStr = leadPlay.cards.map((c) => c.toString()).join(", ");

    trickStateStr = `The trick was led by ${leadPlay.playerId} playing: ${leadingCardsStr}.
You must play exactly ${requiredCount} card(s). You must follow the led suit/trump group if you have any.`;

    playsInTrickStr = plays
      .map(
        (p) =>
          `- ${p.playerId} played: ${p.cards.map((c) => c.toString()).join(", ")}`,
      )
      .join("\n");

    // Dynamic hand analysis of led suit/group
    const isLeadingTrump = leadPlay.cards.some((c) => isTrump(c, trumpInfo));
    const leadingSuit = leadPlay.cards[0].suit;

    const matchingHandCards = isLeadingTrump
      ? handCards.filter((c) => isTrump(c, trumpInfo))
      : handCards.filter(
        (c) => c.suit === leadingSuit && !isTrump(c, trumpInfo),
      );

    const matchingChoiceIds = choicesMap
      .filter((c) =>
        matchingHandCards.some((hc) => hc.id === c.cardInstance.id),
      )
      .map((c) => c.id);

    relevantCardsInfoStr = `
=== YOUR RELEVANT CARDS FOR THIS TRICK ===
- Led suit/group is: ${isLeadingTrump ? "Trump Group (includes Jokers, " + trumpInfo.trumpRank + "s, and " + (trumpInfo.trumpSuit || "None") + " cards)" : leadingSuit}
- Choice IDs of matching cards in hand: ${matchingChoiceIds.length > 0 ? matchingChoiceIds.join(", ") : "None (You are void)"}
${matchingHandCards.length >= requiredCount
        ? `- You have enough matching cards and MUST follow suit. Select exactly ${requiredCount} card ID(s) ONLY from: [${matchingChoiceIds.join(", ")}].`
        : `- You DO NOT have enough matching cards! You MUST play ALL ${matchingHandCards.length} matching card(s): [${matchingChoiceIds.join(", ")}]. Select any other ${requiredCount - matchingHandCards.length} card(s) of other suits to discard.`
      }
`;
  }

  // Reconstruct round tricks history (limit to last 3 tricks to keep prompt light)
  const recentTricks = gameState.tricks.slice(-3);
  const historyStr =
    gameState.tricks.length === 0
      ? "No tricks completed yet in this round."
      : recentTricks
        .map((t, idx) => {
          const absoluteIdx =
            gameState.tricks.length - recentTricks.length + idx;
          const playsList = t.plays
            .map(
              (p) =>
                `${p.playerId} played ${p.cards.map((c) => c.toString()).join(", ")}`,
            )
            .join(", ");
          return `Trick ${absoluteIdx + 1}: Led by ${t.plays[0].playerId}. plays: [${playsList}]. Won by: ${t.winningPlayerId} (${t.points} points)`;
        })
        .join("\n");

  // Detect suit voids per player from round trick history
  const voids = detectSuitVoidsFromHistory(gameState, trumpInfo);
  const voidsStr = Object.entries(voids)
    .map(
      ([pId, suitsList]) =>
        `- ${pId}: ${suitsList.length > 0 ? suitsList.join(", ") : "None yet"}`,
    )
    .join("\n");

  const currentPlayer = gameState.players.find((p) => p.id === playerId);
  const teamId = currentPlayer?.team || "A";
  const partnerId = getPartnerId(playerId);

  let engagementSection = "";
  if (engagementContext) {
    engagementSection = `
=== STRATEGIC DECISION POINT: CONTEXT & SPECIFIC HELP ===
- ${engagementContext}
`;
  }

  const userPrompt = `${engagementSection}
=== CURRENT STATE ===
- Your Player ID: ${playerId}
- Your Team: Team ${teamId} (Teammate: ${partnerId})
- Current Round Trump Rank: ${trumpInfo.trumpRank}
- Current Round Trump Suit: ${trumpInfo.trumpSuit || "None"}
- Led Suit of this trick: ${gameState.currentTrick && gameState.currentTrick.plays[0] ? (isTrump(gameState.currentTrick.plays[0].cards[0], trumpInfo) ? "Trump Group" : gameState.currentTrick.plays[0].cards[0].suit) : "N/A (You are leading)"}
${relevantCardsInfoStr}
=== TRICK STATE ===
${trickStateStr}

=== CURRENT PLAYS IN THIS TRICK ===
${playsInTrickStr}

=== CONFIRMED PLAYER SUIT VOIDS (WHO HAS FAILED TO FOLLOW SUIT) ===
These players are 100% confirmed void because they failed to follow suit in a previous trick. Note: Other players may also be void if they recently played their last card of a suit, but they are not yet confirmed:
${voidsStr}

=== ROUND HISTORY (PREVIOUS TRICKS) ===
${historyStr}

=== YOUR HAND (SORTED BY SUIT & STRENGTH) ===
Your hand has ${handCards.length} cards remaining. Select from these choices by their IDs:
{
  ${choicesStr}
}

=== TASK ===
Select exactly the required number of cards following Shengji rules. Output ONLY a raw JSON object (no markdown \`\`\`json wrappers) matching this format:
{"reasoning": "brief strategic explanation here", "play": ["c1", "c2"]}
`;

  const systemPrompt = buildLLMSystemPrompt(gameState);

  return {
    system: systemPrompt,
    user: userPrompt,
  };
}
