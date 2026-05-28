import {
  Card,
  GameState,
  PlayerId,
  getPartnerId,
  TrumpInfo,
} from "../../types";
import { sortCards } from "../../utils/cardSorting";
import { isTrump } from "../../game/cardValue";

export interface LLMEngagementContext {
  dilemma: string;
  specificHelp: string;
}

export const STATIC_LLM_GAME_RULES = `# Shengji (升级 / Tractor) Advanced AI Knowledge Base & Strategic Guide

This guide is an exhaustive reference for LLM-driven AI players to make elite strategic decisions in Shengji. It integrates every precise rule, tactical constraint, and strategic heuristic validated across our extensive unit test suites and advanced rule-based engine.

---

## 1. Partnerships, Play Flow & Phase Loops

- **Fixed Partnerships**: 
  - **Team A**: 'human' (sitting South) and 'bot2' (sitting North).
  - **Team B**: 'bot1' (sitting East) and 'bot3' (sitting West).
  - Teammates sit opposite each other. Play proceeds counter-clockwise: **human -> bot1 -> bot2 -> bot3**.
- **Role Mechanics**:
  - **Defending Team**: Must hold the attacking team under 80 points to defend and advance their rank.
  - **Attacking Team**: Must capture 80+ points in the round to take over the defend role and advance their rank.
- **Round Starting Player Rotation**:
  - **Attacking Team Wins**: The starting player for the next round is the next player counter-clockwise from the previous starter (e.g. Human starts -> Bot 1 starts next). Teams swap roles.
  - **Defending Team Wins**: The partner of the previous starter starts the next round (e.g. Human starts -> Bot 2 starts next). Defending team remains defenders.
  - **First Round**: The player who successfully declared trump starts the first trick of the first round.

---

## 2. The Trump Group & Card Strengths

All trump cards are treated as a single, unified "suit" for following leads and matching combinations. Any trump card beats any non-trump card of any suit.

### Trump Strength Hierarchy (Highest to Lowest)
1. **Big Joker (BJ)** — Absolute highest card.
2. **Small Joker (SJ)** — Second highest card.
3. **Trump-Suit Rank Card** — Card matching both current Trump Rank and Trump Suit (e.g. 2♠ when Spades is trump, rank 2).
4. **Off-Suit Rank Cards** — Cards matching current Trump Rank but of other suits (e.g. 2♥, 2♦, 2♣).
   - *Equal Strength Rule*: All off-suit trump rank cards have equal strength; among them, the first one played in the trick wins.
5. **Regular Trump Suit Cards** — Cards of the declared Trump Suit ranked by face value (A > K > Q > J > 10 > 9 > 8 > 7 > 6 > 5 > 4 > 3, excluding the rank card).

### Regular Non-Trump Suits Hierarchy
- Within each off-suit (Spades, Hearts, Clubs, Diamonds): **A > K > Q > J > 10 > 9 > 8 > 7 > 6 > 5 > 4 > 3**.
- Cross-suit beats are invalid (e.g., a high Heart cannot beat a low Diamond unless it is played as a Trump-in).

### Point Values
- **5s** = 5 points | **10s** = 10 points | **Kings** = 10 points. All other cards are worth 0 points. Total points in deck = 200.

---

## 3. Card Combinations & Tractor Formation

- **Single**: Any individual card.
- **Pair**: Exactly two IDENTICAL cards (same suit AND same rank, e.g. A♠-A♠ or SJ-SJ). Big Jokers only pair with Big Jokers; Small Jokers only with Small Jokers. Different suits or different jokers do NOT form a pair.
- **Tractor**: Two or more consecutive pairs of the same suit or the unified trump group (minimum 2 pairs / 4 cards). Gaps are strictly validated.
- **Tractor Skip Promoted Rank**: Since the round's active Trump Rank is promoted to the trump suit, off-suit consecutive sequences must skip this rank.
  - *Example*: In a Rank 7 round, 6♠6♠ and 8♠8♠ skip 7 to form a consecutive tractor (6-8).
- **Trump Group Tractor Sequences**: Consecutiveness within the trump group follows this sequence:
  - **A of Trump Suit** -> **Off-Suit Trump Rank Pairs** -> **Trump-Suit Trump Rank Pair** -> **Small Joker Pair** -> **Big Joker Pair**.
  - *Valid Trump Tractors*:
    - A of Trump Suit + Off-Suit Trump Rank (e.g. A♣A♣-2♥2♥ when 2 is rank, Clubs is trump).
    - Off-Suit Trump Rank + Trump-Suit Trump Rank (e.g. 2♥2♥-2♣2♣).
    - Trump-Suit Trump Rank + Small Joker (e.g. 2♣2♣-SJSJ).
    - Small Joker + Big Joker (e.g. SJSJ-BJBJ).
  - *Constraint*: Off-suit rank pairs do NOT form tractors with each other (e.g. 2♥2♥-2♦2♦ is invalid). They must bridge through the trump-suit rank pair.
- **Tractor Preservation Priority**: If a player holds a tractor (e.g. J♥J♥-Q♥Q♥) and a single pair is led, they must NOT break their tractor to play one of its pairs if they have an independent pair in hand.

---

## 4. Following Rules & Preservation Priorities

When a trick is led, followers must play the exact same number of cards and obey these strict priorities:
1. **Priority 1: Count Match & Suit Following**: If you have cards of the led suit/group in hand, you MUST play them. If Trump is led, follow with trump cards (Jokers, rank cards, trump suit cards).
2. **Priority 2: Tractor Matching**: If a tractor is led and you have a tractor of the same size in that suit, you must play it. If not, play as many pairs as possible to match the leading pairs.
3. **Priority 3: Pair Preservation**: If a pair is led and you have a pair in the led suit, you must follow with a pair. Do not break up pairs or play singles instead. If you play one card of a pair, you must play the other card to avoid breaking/preservation violations.
4. **Priority 4: Anti-Cheat (Highest Combos First)**: You must play your highest combinations in the led suit. You cannot play singles to "save" pairs.
5. **Priority 5: Trump-in / Cutting Rules**:
   - If void in the led suit, you can play trump cards to cut and win.
   - Combination matching is strict for cutting: to beat a led pair, you must cut with a trump pair. Two single trumps do not count as a pair and cannot beat a pair.
- **Suit Exhaustion Rule**: If playing cards will leave you with **0 cards** of the led suit remaining in hand, you can play any other cards to make up the trick length. This play is always valid.

---

## 5. Multi-Combo Leading & Following Rules

- **Multi-Combo**: Multiple combinations of the same suit played simultaneously (e.g. K♠K♠ + Q♠ + 7♠).
- **Leading Multi-Combos**:
  - Must strictly be a single non-trump suit. You **cannot** lead a trump multi-combo!
  - Every component combination must be **unbeatable** against all outstanding cards, OR all other 3 players must be void in that suit.
  - *Calculation*: The AI computes outstanding cards as: 'Total Cards (108) - playedCards - currentPlayer\\'sHand'.
  - *Single Unbeatability*: All higher-ranking outstanding cards are accounted for.
  - *Pair Unbeatability*: At least one card of each higher rank must be accounted for to prevent opponents from forming a higher pair.
  - *Tractor Unbeatability*: If no bigger tractor exists outside your hand, it is unbeatable. Alternately, accounting for even one card of alternate higher ranks blocks opponents from forming any consecutive pair sequences.
- **Following Multi-Combos**:
  - **Structure Matching**: Follower must match the lead structure (number of tractors, pairs, singles) and exact total length as closely as possible.
  - **Trump-In Structural Beating**: To beat a non-trump multi-combo, a void player must play matching structures of trump cards (e.g. 1 trump single + 1 trump pair to beat a lead of 1 single + 1 pair).
  - **Trump vs Trump Over-ruffing**: Compare the highest combo type: Tractor > Pair > Single. If types match, compare the strength of the highest cards of that type.

---

## 6. Defensive vs Offensive Trump Conservation

The AI utilizes exact strategic conservation values to guide trump plays:
'Big Joker (100) > Small Joker (90) > Trump Rank in Trump Suit (80) > Trump Rank Off-Suit (70) > Ace (60) > King (50) ... Trump Suit 5 (15) ... Weakest Trump Suit (5)'

- Never waste high conservation cards on an opponent's unbeatable trick or when teammate is winning securely.
- When forced to play trump, play cards with the lowest conservation value.
- Exhaustion rules override conservation—if trump is led and a player has only high-value trumps, they must be played.

---

## 7. AI Position-Aware Strategic Heuristics

### 1st Player (Leader)
- **Non-Trump Ace Leading**: Lead non-trump Aces (or Kings if Ace is the trump rank) early to win tricks safely and secure points.
- **Trump Bleeding (Promotion-Bleed)**: Lead low trumps to bleed out opponents' low trumps, promoting the team's high trumps into guaranteed future winners.
- **Trump Pair Leads (+40 bonus)**: Highly encouraged early as they exert immense pressure. Avoid leading single trumps early (heavy penalty).
- **Teammate Void Setup**: Lead a suit where partner is void to let them trump-in and capture points.
- **Never Lead Point Cards Prematurely**: Point cards (10s and Kings) carry a heavy penalty when led unless they are unbeatable.

### 2nd Player (First Follower)
- **Partner Winning**: Feed highest point cards ('King', 'Ten', 'Five') to teammate to maximize points captured.
- **Opponent Strong Lead**: Play lowest possible non-point card (safe disposal) to conserve resources. If void and discarding (sloughing) from another suit, always choose a low non-point card. Never discard point cards (5s, 10s, Kings) into an opponent's winning trick.
- **Opponent Moderate Lead**: Contest and block by playing a slightly higher card.
- **Opponent Pair Lead**: Block with a higher pair (e.g. play 'A♠A♠' to beat opponent's 'KK' pair).
- **Void on Opponent Point Lead**: Ruff with the **weakest available trump** to capture points cheaply.

### 3rd Player (Second Follower)
- **Teammate Strong Win**: Feed point cards. Priority: **10s before Kings before 5s** (to preserve the higher-ranking King card for future tricks).
- **Teammate Weak Lead**: Play a stronger card (takeover) to secure the trick.
- **Void, Next Opponent NOT Void**: Ruff with a **point trump** (e.g. '10♥') since the opponent must follow suit and cannot over-ruff.
- **Void, Next Opponent ALSO Void**:
  - *No points on table*: Ruff with a **low non-point trump** (e.g. '3♥') to force the opponent to over-ruff cheaply or let you win cheaply.
  - *High points on table*: Ruff with a **very high trump card** (e.g. 'Ace♥') to prevent the opponent from over-ruffing easily.

### 4th Player (Last Follower - Perfect Information)
- **Teammate Secure Win**: Feed points aggressively ('10' > 'King' > '5'). **Avoid teammate competition**—do NOT play high trump rank cards or beat teammate's winning card.
- **Opponent Win**: Play lowest possible non-point card (safe disposal). Conserve all valuable trump/pairs. If void and discarding (sloughing) from another suit, always choose a low non-point card. Never discard point cards (5s, 10s, Kings) into an opponent's winning trick.
- **Over-Ruffing**: If void and opponent is winning a high-point trick, use a trump pair/single to secure it for the team.

### Teammate Secure Win Identification (Memory Search)
To determine if a teammate is winning securely, check the outstanding unseen cards:
- Query unseen cards in the led suit from memory.
- If no outstanding unseen combo can beat the teammate's current winning play, the teammate's win is **mathematically guaranteed**. Feed points safely.

### Kitty Swap Phase Heuristics
- **Point Card Protection**: Point cards ('5', '10', 'King') must be removed from the kitty and kept in the hand to prevent opponents from doubling/multiplying kitty points on the final trick.
- **Trump Conservation**: Pull all trump cards from the kitty into the hand.
- **Strategic Voiding**: Discard all cards of a weak non-trump suit (if very few exist) to create a void, enabling future ruffing opportunities. Do not break pairs.
- **Final Trick Multiplier**: Scored only if the attacking team wins the final trick. Multiplier is **2x** for singles, **4x** for pairs, **8x** for tractors.
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
As the leader, you must play exactly ONE valid combination from your hand:
1. **Single Card**: Select exactly 1 choice ID.
2. **Pair**: Select exactly 2 IDENTICAL choice IDs (same suit and rank, e.g. two "10♠" cards or two "SJ" cards).
3. **Tractor**: Select consecutive identical pairs (e.g. 10♠-10♠ and J♠-J♠, which is 4 cards total).
4. **Multi-Combo**: Multiple combinations of the SAME non-trump suit (e.g. A♣ and K♣-K♣) only if they are unbeatable.

*LEADER STRATEGY CHECKLIST:*
- Prefer leading non-trump Aces/Kings early to win tricks safely and secure points.
- AVOID leading single trump cards early (Jokers, rank cards) as they are wasted.
- Trump pairs are highly encouraged to lead early as they exert immense pressure.
- Avoid leading beatable point cards (10s and Kings) as opponents can capture them.
- Dump short suits to create voids for future trumping-in opportunities.
- You CANNOT lead a trump multi-combo (only non-trump suits allowed).
- Mismatched combinations are strictly illegal (e.g., playing a single "3♣" and a single "5♣" together). Select exactly ONE combination type.
`;
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
- Led suit/group is: ${isLeadingTrump ? "Trump Group (includes all Jokers, all " + trumpInfo.trumpRank + "s, and all " + (trumpInfo.trumpSuit || "None") + " cards)" : leadingSuit}
- Number of cards in your hand belonging to this suit/group: ${matchingHandCards.length}
- Choice IDs of these matching cards in your hand: ${matchingChoiceIds.length > 0 ? matchingChoiceIds.join(", ") : "None (You are void in this suit/group)"}

*FOLLOWER PRIORITY CHECKLIST:*
${
  matchingHandCards.length >= requiredCount
    ? `- You have enough matching cards! You MUST follow suit. Select exactly ${requiredCount} card ID(s) ONLY from your relevant cards list: [${matchingChoiceIds.join(", ")}]. Do NOT play cards from other suits.
- If a Pair is led and you hold pairs, you MUST play a pair (Pair Preservation).
- If a Tractor is led and you hold a tractor, you MUST play it. If you only hold pairs, play as many pairs as possible.
- Anti-Cheat: You must play your highest combinations in the led suit first. You cannot break pairs to play singles.`
    : `- You DO NOT have enough matching cards! You MUST play ALL ${matchingHandCards.length} of your relevant cards: [${matchingChoiceIds.join(", ")}] (Suit Exhaustion Rule).
- For the remaining ${requiredCount - matchingHandCards.length} card(s), you must choose disposal/cutting cards of other suits from your hand. Do NOT select the same choice ID more than once.
- If you choose to trump-in to win, your trump play must match or exceed the combination structure of the lead (e.g. trump pair to beat a led pair).
- If you choose to discard (dispose/slough) because you cannot or do not want to trump, and opponents are winning the trick, ALWAYS select low non-point cards (worth 0 points). Never discard points (5s, 10s, or Kings) into an opponent's winning trick.`
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
                  `${p.playerId} played ${p.cards.map((c) => c.toString()).join(", ")}`,
              )
              .join(", ");
            return `Trick ${idx + 1}: Led by ${t.plays[0].playerId}. plays: [${playsList}]. Won by: ${t.winningPlayerId} (${t.points} points)`;
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
=== STRATEGIC DECISION POINT: SPECIFIC CONTEXT & HELP NEEDED ===
- Strategic Dilemma: ${engagementContext.dilemma}
- Specific Help Needed: ${engagementContext.specificHelp}
`;
  }

  const rulesList: string[] = [];
  if (!isLeading) {
    rulesList.push(
      `1. **EXACT CARD COUNT:** You MUST select EXACTLY ${requiredCount} card ID(s) from your hand! No more, no less. (e.g. if the count is ${requiredCount}, select exactly ${requiredCount} choice IDs, like ["c1", "c2"]).`,
    );
    rulesList.push(
      `2. **Follow Led Suit:** You MUST play cards of the led suit/group if you have any. If Trump is led, follow with cards marked as Trump in your hand.`,
    );
    rulesList.push(
      `3. **Pair Preservation & Tractor Priority:** Follow the strict structure-matching priorities (match led pairs/tractors and preserve your own combos as outlined in the system rules).`,
    );
    rulesList.push(
      `4. **Position Heuristic compliance:** Apply position-aware strategies (feed winning teammate point cards, block opponent wins cheaply, conserve high trumps if trick has no points or teammate wins securely).`,
    );
  } else {
    rulesList.push(
      `1. **Valid Combinations Only:** Your play must form exactly ONE valid combination type (Single, Pair, Tractor, or unbeatable Multi-Combo of a single non-trump suit). Do NOT play a mismatched combination of random cards.`,
    );
    rulesList.push(
      `2. **Leading Strategy:** Prefer non-trump Ace/King leads early. Lead low trumps to bleed opponents' trumps only when appropriate. Never lead point cards prematurely if beatable.`,
    );
  }

  const rulesStr = rulesList.map((rule) => `${rule}`).join("\n");

  const userPrompt = `${engagementSection}
=== CURRENT STATE ===
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

*** CRITICAL GAMEPLAY RULES (MUST OBEY): ***
${rulesStr}

Respond with a JSON object using EXACTLY these two keys:
- "reasoning": A brief explanation of your strategic decision (string)
- "play": An array of card choice IDs to play (e.g. ["c1"] or ["c3", "c4"])

Example response format:
{"reasoning": "Leading with Ace of Spades to probe opponent voids and secure points.", "play": ["c2"]}

Do not include markdown code block syntax (\`\`\`json) in your raw response. Output the JSON object directly.
`;

  const systemPrompt = buildLLMSystemPrompt(gameState);

  return {
    system: systemPrompt,
    user: userPrompt,
  };
}
