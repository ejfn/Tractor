import { Card, GameState, PlayerId, TrumpInfo } from "../../types";
import { sortCards } from "../../utils/cardSorting";
import { isTrump } from "../../game/cardValue";

// No static string - loaded directly fromassets/LLM_GAME_RULES.md dynamically!

/**
 * Analyzes the completed tricks in the round to detect which players have emptied (are void in) which suits.
 * A player has emptied a suit if they failed to follow the led suit of a trick.
 */
export function detectSuitVoidsFromHistory(
  gameState: GameState,
  trumpInfo: TrumpInfo
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
 * Loads the rules dynamically from assets/LLM_GAME_RULES.md, supporting OTA updates.
 */
export async function buildLLMSystemPrompt(gameState: GameState): Promise<string> {
  const { trumpInfo } = gameState;
  const trumpRankStr = trumpInfo.trumpRank;
  const trumpSuitStr = trumpInfo.trumpSuit || "None (Joker pairs only)";

  let rulesContent = "";

  if (typeof process !== "undefined" && process.env.NODE_ENV === "test") {
    // Jest/Node environment: read synchronously from disk
    const fs = require("fs");
    const path = require("path");
    const rulesPath = path.resolve(__dirname, "../../../assets/LLM_GAME_RULES.md");
    rulesContent = fs.readFileSync(rulesPath, "utf8");
  } else {
    // Mobile/Expo environment: load using expo-asset and expo-file-system
    try {
      const { Asset } = require("expo-asset");
      const FileSystem = require("expo-file-system");
      
      const asset = Asset.fromModule(require("../../../assets/LLM_GAME_RULES.md"));
      await asset.downloadAsync();
      
      if (asset.localUri) {
        rulesContent = await FileSystem.readAsStringAsync(asset.localUri);
      } else {
        // Fallback to fetch if localUri is not populated
        const response = await fetch(asset.uri);
        rulesContent = await response.text();
      }
    } catch (error) {
      // Emergency fallback if loading fails
      rulesContent = "# Shengji (升级 / Tractor) Elite AI Rules\nFailed to load rules asset.";
    }
  }

  // Replace dynamic placeholders
  return rulesContent
    .replace(/\$\{trumpRankStr\}/g, trumpRankStr)
    .replace(/\$\{trumpSuitStr\}/g, trumpSuitStr)
    .replace(/\${trumpInfo\.trumpSuit \|\| "None"}/g, trumpInfo.trumpSuit || "None")
    .replace(/\${trumpInfo\.trumpRank}/g, trumpInfo.trumpRank);
}

/**
 * Builds the user prompt detailing the current hand, trick state, history, and card choices.
 */
export async function buildLLMUserPrompt(
  gameState: GameState,
  playerId: PlayerId,
  handCards: Card[]
): Promise<{ system: string; user: string }> {
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
  let trickStateStr = "";
  let leadingCardsStr = "None (You are the leader)";
  let playsInTrickStr = "None yet";
  let relevantCardsInfoStr = "";

  if (!gameState.currentTrick || gameState.currentTrick.plays.length === 0) {
    trickStateStr = `You are leading this trick!
As the leader, you can play a combination of any size, BUT it must be a valid Shengji combination:
1. **Single Card**: Select exactly 1 card ID.
2. **Pair**: Select exactly 2 IDENTICAL card IDs (same suit and rank, e.g. two "10♠" cards or two "SJ" cards).
3. **Tractor**: Select consecutive identical pairs (e.g. 10♠-10♠ and J♠-J♠, which is 4 cards total).
4. **Multi-Combo**: Multiple high cards/combos of the SAME suit (e.g., A♣ and K♣-K♣) only if you are completely sure they are unbeatable.

*CRITICAL WARNING FOR LEADING*:
- **AVOID leading with trump cards early in the round** unless you have no other choice! Prefer to lead high non-trump cards (like Aces 'A') to win tricks safely and preserve your trumps to cut other suits later.
- You CANNOT lead a trump multi-combo (multi-combos can only be led in non-trump suits). Trump leads must strictly be a Single, Pair, or Tractor!
- You CANNOT lead a mix of random single cards (e.g. you cannot play a "5♣" and a "7♣" together, or "SJ" and "2♦" together). If you want to play a single card, select exactly ONE choice ID.
`;
  } else {
    const plays = gameState.currentTrick.plays;
    const leadPlay = plays[0];
    leadingCardsStr = leadPlay.cards.map((c) => c.toString()).join(", ");

    trickStateStr = `The trick was led by ${leadPlay.playerId} playing: ${leadingCardsStr}.
You must play exactly ${leadPlay.cards.length} card(s). You must follow the led suit/trump group if you have any.`;

    playsInTrickStr = plays
      .map(
        (p) =>
          `- ${p.playerId} played: ${p.cards.map((c) => c.toString()).join(", ")}`
      )
      .join("\n");

    // Dynamic hand analysis of led suit/group
    const isLeadingTrump = leadPlay.cards.some((c) => isTrump(c, trumpInfo));
    const leadingSuit = leadPlay.cards[0].suit;

    const matchingHandCards = isLeadingTrump
      ? handCards.filter((c) => isTrump(c, trumpInfo))
      : handCards.filter((c) => c.suit === leadingSuit && !isTrump(c, trumpInfo));

    const matchingChoiceIds = choicesMap
      .filter((c) =>
        matchingHandCards.some((hc) => hc.id === c.cardInstance.id)
      )
      .map((c) => c.id);

    relevantCardsInfoStr = `
=== YOUR RELEVANT CARDS FOR THIS TRICK ===
- Led suit/group is: ${isLeadingTrump ? "Trump Group (includes all Jokers, all 2s, and all " + (trumpInfo.trumpSuit || "None") + " cards)" : leadingSuit}
- Number of cards in your hand belonging to this suit/group: ${matchingHandCards.length}
- Choice IDs of these matching cards in your hand: ${matchingChoiceIds.length > 0 ? matchingChoiceIds.join(", ") : "None (You are void in this suit/group)"}

*Important rules for this situation:*
${
  matchingHandCards.length >= leadPlay.cards.length
    ? `- You have enough cards in this suit/group! You MUST follow suit. You must select exactly ${leadPlay.cards.length} card ID(s) ONLY from your relevant cards list: [${matchingChoiceIds.join(", ")}]. Do NOT play cards from other suits.
- If the lead is a Pair (2 identical cards) and you hold any pairs within [${matchingChoiceIds.join(", ")}], you MUST play a pair.`
    : `- You DO NOT have enough cards in this suit/group! You MUST play ALL ${matchingHandCards.length} of your relevant cards: [${matchingChoiceIds.join(", ")}]. For the remaining ${leadPlay.cards.length - matchingHandCards.length} card(s), you must choose non-relevant cards of other suits from your hand to fill the card count. Do NOT select the same choice ID more than once.`
}
`;
  }

  // Reconstruct round tricks history
  const historyStr =
    gameState.tricks.length === 0
      ? "No tricks completed yet in this round."
      : gameState.tricks
          .map((t, idx) => {
            const playsList = t.plays
              .map(
                (p) =>
                  `${p.playerId} played ${p.cards.map((c) => c.toString()).join(", ")}`
              )
              .join(", ");
            return `Trick ${idx + 1}: Led by ${t.plays[0].playerId}. plays: [${playsList}]. Won by: ${t.winningPlayerId} (${t.points} points)`;
          })
          .join("\n");

  // Detect suit voids per player from round trick history
  const voids = detectSuitVoidsFromHistory(gameState, trumpInfo);
  const voidsStr = Object.entries(voids)
    .map(([pId, suitsList]) => `- ${pId}: ${suitsList.length > 0 ? suitsList.join(", ") : "None yet"}`)
    .join("\n");

  const currentPlayer = gameState.players.find((p) => p.id === playerId);
  const teamId = currentPlayer?.team || "A";
  const partnerId = playerId === "bot1" ? "bot3" : playerId === "bot3" ? "bot1" : playerId === "human" ? "bot2" : "human";

  const userPrompt = `=== CURRENT STATE ===
- Your Player ID: ${playerId}
- Your Team: Team ${teamId} (Partner: ${partnerId})
- Current Round Trump Rank: ${trumpInfo.trumpRank}
- Current Round Trump Suit: ${trumpInfo.trumpSuit || "None"}
- Led Suit of this trick: ${gameState.currentTrick && gameState.currentTrick.plays[0] ? (isTrump(gameState.currentTrick.plays[0].cards[0], trumpInfo) ? "Trump Group" : gameState.currentTrick.plays[0].cards[0].suit) : "N/A (You are leading)"}
${relevantCardsInfoStr}
=== TRICK STATE ===
${trickStateStr}

=== CURRENT PLAYS IN THIS TRICK ===
${playsInTrickStr}

=== KNOWN PLAYER SUIT VOIDS (WHO HAS EMPTIED SUITS) ===
Based on completed tricks in this round:
${voidsStr}

*Use this void information strategically:*
- If an opponent is void in a suit, do NOT lead that suit with high-value cards unless you want to force them to use a trump card to cut it.
- If your partner is void in a suit, leading that suit can let them trump-in (cut) to win the trick and capture points!

=== ROUND HISTORY (PREVIOUS TRICKS) ===
${historyStr}

=== YOUR HAND (SORTED BY SUIT & STRENGTH) ===
Your hand has ${handCards.length} cards remaining. Select from these choices by their IDs:
{
  ${choicesStr}
}

=== TASK ===
Select the best card(s) from your hand to play. Your selection must contain exactly the required number of cards and obey all Shengji following/preservation rules.
Respond strictly in JSON format. Do not include markdown code block syntax (like \`\`\`json) in your actual API raw message, or if you do, ensure it is a clean JSON parsable structure.
`;

  const systemPrompt = await buildLLMSystemPrompt(gameState);

  return {
    system: systemPrompt,
    user: userPrompt,
  };
}
