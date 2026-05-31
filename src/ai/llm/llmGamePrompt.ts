import {
  Card,
  GameState,
  PlayerId,
  getPartnerId,
  TrumpInfo,
  Suit,
} from "../../types";
import { sortCards } from "../../utils/cardSorting";
import { isTrump } from "../../game/cardValue";
import { analyzeSuitAvailability } from "../following/suitAvailabilityAnalysis";
import { detectCandidateLeads } from "../leading/candidateLeadDetection";
import { collectLeadingContext } from "../leading/leadingContext";
import { scoreNonTrumpLead, scoreTrumpLead } from "../leading/leadingScoring";



export const STATIC_LLM_GAME_RULES = `# Shengji (升级 / Tractor) Advanced AI Strategic Rules

## 1. Teammates & Roles
- **Teams**: Counter-clockwise: South (\`human\`) & North (\`bot2\`) [Team A] vs East (\`bot1\`) & West (\`bot3\`) [Team B].
- **Goal**: Cooperate with teammate to advance ranks from **2 to Ace** by winning rounds. The first team to reach rank **Ace** and successfully defend (hold attackers < 80 pts) wins the game.
- **Scoring**: Defenders hold Attackers < 80 pts to advance. Attackers win by capturing 80+ pts.
- **Kitty**: 8 cards are kept in the kitty and are completely out of active play during trick playing.

## 2. Card Values & Trump Hierarchy
- **Points**: 5 = 5pts, 10 = 10pts, King = 10pts (200 total).
- **Trump Group**: Single unified suit. BJ > SJ > Trump-Suit Rank > Off-Suit Ranks (equal, first played wins) > Trump Suit Regulars (A > K > Q > ... > 3). Off-Suit Ranks and Jokers are irreplaceable.
- **Active Ranks**: The Trump-Suit Rank and Off-Suit Ranks are "Active Ranks" — premium trump assets second only to Jokers. They beat every Ace and are listed in your TRUMP GROUP. When discarding or following without winning, sacrifice weakest Trump Suit Regulars (3, 4, 6...) first; NEVER lead, discard, or waste Active Ranks or Jokers as fodder.
- **Off-Suits**: Cards of the trump rank leave their off-suit and join the Trump Group. Remaining cards rank A > K > Q > ... > 3 (or K > Q > ... > 3 if Ace is active rank); the highest card left in its suit is unbeatable unless cut by trump. Cross-suit plays cannot beat each other.

## 3. Combinations & Tractors
- **Combos**: Single; Pair (2 identical cards); Tractor (2+ consecutive pairs in same suit/trump group).
- **Trump Tractor Order (Consecutive Sequence)**: A-Trump-Suit -> Off-Suit Ranks -> Trump-Suit Rank -> SJ -> BJ. Two off-suit rank pairs are NOT consecutive (they are equal); only an off-suit rank pair + trump-suit rank pair forms a valid tractor.
- **Skip Rule**: Off-suit tractor sequences skip the active Trump Rank (e.g., 6-8 is consecutive if 7 is active rank).
- **Preservation**: Do not break a tractor to follow a pair if you have a standalone pair.

## 4. Following & Ruffing Priorities
- **Priority**: 1. Follow suit. 2. Match combo structure (pair/tractor) if possible. 3. Do not break pairs/tractors unnecessarily. 4. If unable to match structure, play highest available component types (e.g., pairs for led tractor).
- **Ruff/Discard (Void Player)**: If void, you can discard (sluff) or trump (ruff). To trump a combo, you must match its structure (e.g. trump pair trumps a pair; 2 singles cannot).
  - **Discard Rule**: If you choose to discard (sluff) or cannot trump: if opponents are winning or likely to win, **NEVER discard point cards (5, 10, K)** as it hands them free points; instead, discard your lowest non-point card of another suit. Feed points **ONLY** when your teammate is winning the trick.
  - **Trump Rule**: Trump to secure high-point tricks or block opponents; conserve your trumps on low-point or unbeatable tricks.
- **Conserve Strength on Follows**: When following a trick that you cannot win or where your teammate is winning overwhelmingly, **conserve your high cards** (Active Ranks, high Trump Regulars A/K, and Jokers); follow with your lowest available cards of the led suit to avoid wasting precious control assets.
- **Exhaustion**: If out of the led suit, any cards are valid.

## 5. Multi-Combo Rules (Same-suit combos led together)
- **Lead**: Non-trump only. Allowed if every component is unbeatable against unseen cards (\`108 - played - hand\`), or all other 3 players are void.
- **Follow**: Match structure (tractors/pairs/singles) and total length. Void players can cut with matching trump structures.
- **Trump vs Trump**: Compare highest component combo type (Tractor > Pair > Single), then compare highest card.

## 6. Strategic Heuristics
- **Conservation**: Retain highest trumps (BJ > SJ > Active Ranks > Trump Regulars: A > K > ... > 3) and off-suit boss cards (Aces > Kings). When forced to play to a trick you cannot win or when teammate is winning, play your lowest available cards and **never** waste Active Ranks or Jokers.
- **Leader (1st)**: Controls tempo. **Preferred leads (in order)**: (1) Off-suit Aces/Kings (boss cards of a non-trump suit — NOT trump-suit Aces/Kings which are mid-tier trump) to establish control; (2) Low trump pairs/tractors (low regulars like 3s, 4s) to drain opponent trumps cheaply — avoid leading high trump pairs (A, K) which are valuable trump control cards; (3) Low off-suit singletons to probe voids. **Avoid**: Leading single trumps — especially single Active Ranks which are premium trump assets, not disposable cards. Reserve Active Ranks, Jokers, and high trump pairs for winning critical tricks later. When your team is already winning the round, prioritize safe off-suit boss leads over aggressive trump plays. Feed points (5, 10, K) to teammate when teammate is void in the led suit.
- **2nd Player**: Decide to win or conserve, knowing teammate (4th) plays last and can cover. If opponents lead points and you hold the boss (e.g., Ace), it is a prime opportunity to win immediately. Otherwise, play lowest non-point to conserve and let 4th player contest. Void -> if you choose to discard instead of trumping, **never discard points to opponents**; play lowest non-point of another suit.
- **3rd Player**: Vital blocking role. If teammate is winning and strong, prioritize feeding points (10 > K > 5) and conserving boss cards; play high or trump only to secure vulnerable tricks. If void, trump/over-trump to secure points or pressure opponents (based on table and potential points), but avoid trumping teammate's winning cards; if choosing to discard, **never discard points to opponents**.
- **4th Player (Perfect Info)**: Last to act. If teammate is winning, feed points safely (10 > K > 5). If opponent is winning: if void, trump/over-trump (ruff/over-ruff) to win the trick and capture points (especially when high points are on the table); if you cannot win or choose not to, discard lowest non-point to conserve and **NEVER feed points to opponents** by discarding point cards. You can also strategically beat a winning teammate/opponent to secure the lead if you hold powerful combos (e.g., unbeatable tractors) to lead next.
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

  // Group choices by category
  const categories: Record<string, typeof choicesMap> = {};
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

  // Determine current trick state
  const currentTrick = gameState.currentTrick;
  const isLeading = !currentTrick || currentTrick.plays.length === 0;
  const requiredCount = !isLeading ? currentTrick.plays[0].cards.length : 0;

  // Helper to map game Card to prompt choice ID
  const cardToChoiceId = (card: Card): string => {
    const match = choicesMap.find((c) => c.cardId === card.id);
    return match ? `${match.id}(${card.toString()})` : card.toString();
  };

  let activeTrickStatusStr = "";
  let leadingCardsStr = "None (You are the leader)";
  let suitAnalysisStr = "";
  let candidateOptionsStr = "";
  let taskInstructionStr = "";

  if (isLeading) {
    activeTrickStatusStr = `- Status: You are leading this trick!
- Requirement: You must play exactly ONE valid combination from your hand (Single, Pair, Tractor, or unbeatable same-suit Multi-Combo). Mismatched combination types are strictly illegal.`;
    taskInstructionStr = "Select exactly ONE valid combination of cards from your hand (Single, Pair, Tractor, or unbeatable same-suit Multi-Combo) to lead the trick.";

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

    candidateOptionsStr = `Here are the candidate combinations you can lead, along with a strategic rating from the rule-based engine:
${allOptions || "- No candidates found (using fallback)"}
`;
  } else {
    const plays = currentTrick.plays;
    const leadPlay = plays[0];
    const winningPlayerId = currentTrick.winningPlayerId || leadPlay.playerId;
    const isTeammateWinning = winningPlayerId === getPartnerId(playerId);
    const trickPoints = currentTrick.points || 0;

    leadingCardsStr = leadPlay.cards.map((c) => c.toString()).join(", ");

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
    activeTrickStatusStr = statusLines.join("\n");
    taskInstructionStr = `Select exactly ${requiredCount} card(s) from your hand following the trick requirement and suit following rules.`;

    // Analyze suit following using the same engine as algorithmic AI
    const analysis = analyzeSuitAvailability(
      leadPlay.cards,
      handCards,
      trumpInfo,
    );

    const ledSuitDisplay = analysis.evaluateSuit === Suit.None ? "Trump Group" : analysis.evaluateSuit;
    const lines: string[] = [
      `- Led combo type: ${analysis.leadingComboType} (${analysis.requiredLength} cards)`,
      `- Led suit/group: ${ledSuitDisplay}`,
      `- Your cards in that suit: ${analysis.availableCount}`,
      `- Scenario: ${analysis.scenario}`,
    ];

    switch (analysis.scenario) {
      case "valid_combos": {
        lines.push(`- You have matching ${analysis.leadingComboType} combos to choose from:`);
        for (const combo of analysis.validCombos) {
          const ids = combo.cards.map(cardToChoiceId).join(", ");
          lines.push(`    • ${combo.type}: [${ids}]`);
        }
        break;
      }
      case "enough_remaining": {
        lines.push(`- You have enough cards in the led suit but NO matching ${analysis.leadingComboType} combos.`);
        lines.push(`- You must still play ${analysis.requiredLength} card(s) from this suit. Available cards:`);
        lines.push(`    ${analysis.remainingCards.map(cardToChoiceId).join(", ")}`);
        break;
      }
      case "insufficient": {
        lines.push(`- You only have ${analysis.availableCount} card(s) but ${analysis.requiredLength} are required.`);
        lines.push(`- You MUST play ALL your cards in that suit: ${analysis.remainingCards.map(cardToChoiceId).join(", ")}`);
        lines.push(`- Fill the remaining ${analysis.requiredLength - analysis.availableCount} slot(s) from other suits (discard or trump).`);
        break;
      }
      case "void": {
        lines.push(`- You are VOID in the led suit. You may trump (ruff) with trump cards or discard (sluff) from any suit.`);
        break;
      }
    }

    suitAnalysisStr = lines.join("\n") + "\n";
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

  const userPrompt = `=== CURRENT STATE ===
- Your Player ID: ${playerId}
- Your Team: Team ${teamId} (Teammate: ${partnerId})
- Current Round Trump Rank: ${trumpInfo.trumpRank}
- Current Round Trump Suit: ${trumpInfo.trumpSuit || "None"}

=== ROUND HISTORY (PREVIOUS TRICKS) ===
${historyStr}

=== CONFIRMED PLAYER SUIT VOIDS (WHO HAS FAILED TO FOLLOW SUIT) ===
These players are 100% confirmed void because they failed to follow suit in a previous trick. Note: Other players may also be void if they recently played their last card of a suit, but they are not yet confirmed:
${voidsStr}

=== ACTIVE TRICK STATUS ===
${activeTrickStatusStr}

=== YOUR HAND (GROUPED BY SUIT & SORTED FROM STRONGEST TO WEAKEST) ===
Your hand has ${handCards.length} cards remaining:

${handChoicesStr}

${isLeading ? "=== CANDIDATE LEAD OPTIONS ===" : "=== SUIT FOLLOWING ANALYSIS ==="}
${isLeading ? candidateOptionsStr : suitAnalysisStr}

=== TASK ===
${taskInstructionStr}
Output ONLY a raw JSON object (no markdown \`\`\`json wrappers) matching this format:
{"reasoning": "brief strategic explanation here", "play": ["c1", "c2"]}
`;

  const systemPrompt = buildLLMSystemPrompt(gameState);

  return {
    system: systemPrompt,
    user: userPrompt,
  };
}
