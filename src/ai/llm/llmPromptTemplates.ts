export const STATIC_LLM_GAME_RULES = `# Shengji (升级 / Tractor) Advanced AI Strategic Rules

## 1. Teammates & Roles
- **Teams**: Counter-clockwise: South (\`human\`) & North (\`bot2\`) [Team A] vs East (\`bot1\`) & West (\`bot3\`) [Team B].
- **Goal**: Cooperate with teammate to advance ranks from **2 to Ace** by winning rounds. The first team to reach rank **Ace** and successfully defend (hold attackers < 80 pts) wins the game.
- **Scoring**: Defenders hold Attackers < 80 pts to advance. Attackers win by capturing 80+ pts.
- **Kitty**: 8 cards are kept in the kitty and are completely out of active play during trick playing.

## 2. Card Values & Trump Hierarchy
- **Points**: 5 = 5pts, 10 = 10pts, King = 10pts (200 total).
- **Trump Group**: Single unified suit. BJ > SJ > Trump-Suit Rank > Off-Suit Ranks (equal, first played wins) > Trump Suit Regulars (A > K > Q > ... > 3). (Note: If Trump Suit is "None" (No-Trump), there are NO Trump Suit Regulars; the Trump Group consists ONLY of Jokers and the active Ranks of all 4 suits). Off-Suit Ranks and Jokers are irreplaceable.
- **Active Ranks MUST NOT be Wasted**: The Trump-Suit Rank and Off-Suit Ranks are "Active Ranks" — elite trump assets second only to Jokers. They beat every regular card including Aces! They are listed in your TRUMP GROUP, NOT their nominal suit. NEVER play them as regular suit cards, NEVER discard them as cheap fodder, and NEVER throw them away when following a trick you cannot win. When discarding or following without winning, sacrifice weakest Trump Suit Regulars (3, 4, 6...) first; NEVER waste Active Ranks or Jokers as fodder. (Note: When the active rank is also a point card like 5, 10, or King, these are double-duty premium assets; protect them fiercely from being captured by opponents).
- **Off-Suits**: Cards of the trump rank leave their off-suit and join the Trump Group. Remaining cards rank A > K > Q > ... > 3 (or K > Q > ... > 3 if Ace is active rank); the highest card left in its suit is unbeatable unless cut by trump. Cross-suit plays cannot beat each other.

## 3. Combinations & Tractors
- **Combos**: Single; Pair (2 identical cards); Tractor (2+ consecutive pairs in same suit/trump group).
- **Trump Tractor Order (Consecutive Sequence)**: A-Trump-Suit -> Off-Suit Ranks -> Trump-Suit Rank -> SJ -> BJ. Two off-suit rank pairs are NOT consecutive (they are equal); only an off-suit rank pair + trump-suit rank pair forms a valid tractor.
- **Skip Rule**: Off-suit tractor sequences skip the active Trump Rank (e.g., 6-8 is consecutive if 7 is active rank).
- **Preservation**: Do not break a tractor to follow a pair if you have a standalone pair.

## 4. Following & Ruffing Priorities
- **Priority**: 1. Follow suit. 2. Match combo structure (pair/tractor) if possible. 3. Do not break pairs/tractors unnecessarily. 4. If unable to match structure, play highest available component types (e.g., pairs for led tractor).
- **Ruff/Discard (Void Player)**: If void, you can discard (sluff) or trump (ruff). To trump a combo, you must match its structure (e.g. trump pair trumps a pair; 2 singles cannot).
  - **Discard Rule**: If you choose to discard (sluff) or cannot trump: if opponents are winning or likely to win, **NEVER discard point cards (5, 10, K)** as it hands them free points. Discard priority: lowest non-point cards from other off-suits first; **avoid discarding trump cards** — trumps are far more valuable as ruffing assets than off-suit low cards. Feed points when your teammate's win is SECURED or LIKELY WIN, preferring higher-value cards first (10/K before 5). If their lead is UNCERTAIN, avoid feeding point cards to prevent opponents from capturing them.
  - **Trump Rule**: Trump to secure high-point tricks or block opponents; conserve your trumps on low-point or unbeatable tricks (especially in No-Trump rounds, where trumps are extremely scarce and should only be used to secure vital points or critical leads).
- **Conserve Strength on Follows**: When following a trick that you cannot win or where your teammate is winning overwhelmingly, **conserve your elite assets** (Jokers and Active Ranks — NEVER discard or waste these as throwaways!); follow with your lowest available cards of the led suit to avoid wasting precious control cards.
- **Exhaustion**: If out of the led suit, any cards are valid.

## 5. Multi-Combo Rules (Same-suit combos led together)
- **Lead**: Non-trump only. Allowed if every component is unbeatable against unseen cards (\`108 - played - hand\`), or all other 3 players are void.
- **Follow**: Match structure (tractors/pairs/singles) and total length. Void players can cut with matching trump structures.
- **Trump vs Trump**: Compare highest component combo type (Tractor > Pair > Single), then compare highest card.

## 6. Strategic Heuristics
- **Conservation**: Retain highest trumps (BJ > SJ > Active Ranks > Trump Regulars) and off-suit boss cards (Aces/Kings). Active Ranks beat Aces; NEVER treat them as low cards or throw them away as cheap disposals. If Trump Suit is "None" (No-Trump), trumps are extremely scarce (only Jokers & Ranks); hoard them fiercely, and treat off-suit boss Aces/Kings as ultra-safe control cards since they are rarely ruffed. If the active rank itself is a point card (5, 10, K), protect them from capture. When forced to play to a trick you cannot win, play lowest cards; never waste Jokers or Ranks.
- **Leader (1st)**: Controls tempo. **Preferred leads (in order)**: (1) Off-suit Aces/Kings to establish control (or all Aces/Kings in No-Trump since there is no trump suit); (2) Low trump pairs/tractors (if regular trump round) to drain opponent trumps cheaply — avoid leading high trump pairs (A, K) or precious Ranks/Jokers; (3) Low off-suit singletons to probe voids. **Avoid**: Leading single trumps — especially single Active Ranks/Jokers which are premium control assets. In No-Trump, hoard Jokers/Ranks and lead off-suit bosses instead. When your team is already winning the round, prioritize safe off-suit boss leads. Feed points (5, 10, K) to teammate when teammate is void in the led suit.
- **2nd Player**: Decide to win or conserve, knowing teammate (4th) plays last and can cover. If opponents lead points and you hold the boss (e.g., Ace), it is a prime opportunity to win immediately. Otherwise, play lowest non-point to conserve and let 4th player contest. Void -> if you choose to discard instead of trumping, **never discard points to opponents**; play lowest non-point of another suit.
- **3rd Player**: Vital blocking role. If teammate is winning and strong, prioritize feeding points (10 > K > 5) and conserving boss cards; play high or trump only to secure vulnerable tricks. If void, trump/over-trump to secure points or pressure opponents (based on table and potential points), but avoid trumping teammate's winning cards; if choosing to discard, **never discard points to opponents**.
- **4th Player (Perfect Info)**: Last to act. If teammate is winning, feed points safely (10 > K > 5). If opponent is winning: if void, trump/over-trump (ruff/over-ruff) to win the trick and capture points (especially when high points are on the table); if you cannot win or choose not to, discard lowest non-point to conserve and **NEVER feed points to opponents** by discarding point cards. You can also strategically beat a winning teammate/opponent to secure the lead if you hold powerful combos (e.g., unbeatable tractors) to lead next.
`;

export interface UserPromptTemplateArgs {
  playerId: string;
  teamId: string;
  partnerId: string;
  trumpRank: string;
  trumpSuit: string;
  historyStr: string;
  voidsStr: string;
  activeTrickStatusStr: string;
  handCardsCount: number;
  handChoicesStr: string;
  isLeading: boolean;
  candidateOptionsStr: string;
  suitAnalysisStr: string;
  taskInstructionStr: string;
}

/**
 * Builds the dynamic user prompt using injected state variables.
 */
export function buildUserPromptTemplate(args: UserPromptTemplateArgs): string {
  return `=== CURRENT STATE ===
- Your Player ID: ${args.playerId}
- Your Team: Team ${args.teamId} (Teammate: ${args.partnerId})
- Current Round Trump Rank: ${args.trumpRank}
- Current Round Trump Suit: ${args.trumpSuit}

=== ROUND HISTORY (PREVIOUS TRICKS) ===
${args.historyStr}

=== CONFIRMED PLAYER SUIT VOIDS (WHO HAS FAILED TO FOLLOW SUIT) ===
These players are 100% confirmed void because they failed to follow suit in a previous trick. Note: Other players may also be void if they recently played their last card of a suit, but they are not yet confirmed:
${args.voidsStr}

=== ACTIVE TRICK STATUS ===
${args.activeTrickStatusStr}

=== YOUR HAND (GROUPED BY SUIT & SORTED FROM STRONGEST TO WEAKEST) ===
Your hand has ${args.handCardsCount} cards remaining:

${args.handChoicesStr}

${args.isLeading ? "=== CANDIDATE LEAD OPTIONS ===" : "=== SUIT FOLLOWING ANALYSIS ==="}
${args.isLeading ? args.candidateOptionsStr : args.suitAnalysisStr}

=== TASK ===
${args.taskInstructionStr}
Output ONLY a raw JSON object (no markdown \`\`\`json wrappers) matching this format:
{"reasoning": "brief strategic explanation here", "play": ["c1", "c2"]}
`;
}
