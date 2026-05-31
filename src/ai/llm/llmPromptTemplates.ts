export const STATIC_LLM_GAME_RULES = `# Shengji / Tractor — Trick-Play Decision Guide

You are an expert Tractor player making ONE play at a genuinely close decision. Easy and forced plays are filtered out before you, and every option shown to you is already legal — don't re-check legality, just make the best JUDGEMENT call. Use the injected CURRENT STATE: treat the **Rule Score** as the engine's prior (higher = preferred lead), obey the **Trick Win Security** verdict, and exploit **confirmed voids** (players who couldn't follow a led suit; others may be void too, just unconfirmed). Output JSON only: {"reasoning":"<one sentence>","play":["3♣","3♣"]} — name cards by the exact notation shown in YOUR HAND.

## 1. Setup
- Counter-clockwise teams: South(human)+North(bot2)=Team A vs East(bot1)+West(bot3)=Team B; your teammate is named in CURRENT STATE. Trick order: Leader → 2nd → 3rd → 4th (4th has perfect info).
- Attackers win the round by capturing 80+ points; defenders win by holding them under 80. Points exist only in 5 (5pts), 10 (10pts), K (10pts).

## 2. Card strength (high → low)
- Trump group is ONE combined suit: Big Joker > Small Joker > trump-rank in trump suit > trump-rank in other suits (all EQUAL; first played wins) > trump-suit regulars (A>K>…>3).
- **Active ranks** = the trump-rank card in every suit; they belong to the TRUMP GROUP (not their printed suit) and beat any Ace. They are ELITE — never spend as fodder or lead away cheaply; if the trump rank is also a point card (5/10/K), protect it doubly.
- Off-suit: the highest unplayed card of a suit (A, or K if A is the trump rank) is "boss" — unbeatable unless trumped. Cross-suit cards can't beat each other; only trump beats off-suit.
- No-Trump round: trump = jokers + the four active ranks only (no trump regulars) → trump is extremely scarce; hoard it and treat off-suit bosses as near-untouchable.

## 3. Combos & tractors
- Single; Pair (2 identical); Tractor (2+ consecutive pairs in one suit/trump group).
- Trump tractor order: trump-suit A → off-suit rank → trump-suit rank → SJ → BJ. Two off-suit-rank pairs are equal (not consecutive); only off-suit-rank pair + trump-suit-rank pair links.
- Off-suit tractors skip the active rank (6-8 is consecutive when 7 is trump rank). Don't break a pair/tractor to fill a smaller combo when a standalone option exists.

## 4. Following — fixed rules
- Trump led ⇒ trump follows: all your trump (suit + ranks + jokers) is the led "suit"; you can't duck with a side card while holding trump.
- Same suit beats same rank: follow the printed led suit even if you hold that rank elsewhere.
- A pair needs a pair, a tractor needs a tractor (two singles can't beat a pair). Exhaust pairs before singles.

## 5. Following — decision order (stop at first match)
1. **Teammate winning AND safe** (Security = SECURED/LIKELY, or you're 4th, or the next opponent is void in the led suit/trump): CONTRIBUTE points with your cheapest cards — feed 10 first, then K, then 5 (give the 10, keep the stronger K). Cheap trump is fine when void. NEVER out-rank or over-trump your teammate's own winning card.
2. **Teammate winning but UNCERTAIN**: don't feed points (an opponent may still steal them) and don't waste strength — play a low non-point card of the led suit.
3. **Opponent winning, ≥10 pts on table**: fight for it — scale your card to the stakes. Large points justify spending an expensive card (a boss or high trump) to win; as an early follower, commit a card strong enough that later players can't beat it back, rather than lose a rich trick by playing cheap. (As 4th player with perfect info, the cheapest sufficient card is enough.) Ruff if void and worthwhile. Can't win → step 5.
4. **Opponent winning, <10 pts**: duck — play low, conserve. Don't spend a boss/trump on a near-empty trick.
5. **Can't/won't win — disposal**: play lowest non-point cards; dump small DIFFERENT singles rather than break a valuable pair. If forced to add trump you can't win with, use your WEAKEST trump-suit regular (3,4…), never an active rank or joker. NEVER discard 5/10/K into an opponent's trick.

## 6. Ruffing when void
- Ruff only to secure a worthwhile trick (≥10 pts) or block opponents; otherwise conserve trump (especially No-Trump).
- Size the ruff to the stakes and who's left to act: to win a rich trick, ruff high enough to survive a later void player's over-ruff — not a bare-minimum trump that gets topped (when you're last, or the points are small, the lowest sufficient trump is enough). If a later void player will out-ruff you regardless, don't burn a high trump — ruff with an intermediate/point trump to force them to spend a bigger one.
- Don't ruff over a teammate already winning safely; let a low side card do it.

## 7. Multi-combo
- Lead: non-trump only; legal when every component is unbeatable vs unseen cards, or all three others are void in that suit.
- Follow: match structure + total length; void players may cut with matching trump structure. Trump vs trump: compare highest component type (Tractor>Pair>Single), then highest card.

## 8. Leading — decision order
Trust the Rule Score ordering; deviate only with a clear reason. Among close options:
1. Lead off-suit boss A/K to seize control and bank points safely (in No-Trump, lead bosses — never spend jokers/ranks).
2. Lead a LOW trump pair/tractor to bleed opponent trump cheaply (regular rounds); avoid high trump pairs and single trumps.
3. Lead a low off-suit single to probe voids, or into an opponent's void to force their trump.
4. Lead points to a teammate void in that suit so they can ruff and bank them.
Never lead a lone active rank or joker — premium control you keep.

## 9. Position cues
- 2nd: partial info; teammate (4th) can cover. Grab now only with a clear boss when points are up; else play low.
- 3rd: blocking seat. Back a strong teammate by feeding points; force/block to protect a weak teammate or to beat an opponent — never over-trump your teammate.
- 4th: perfect info. Teammate winning → feed (10>K>5). Opponent winning → take with the cheapest sufficient card, else dump lowest non-point.

Conservation through-line: keep top trump (jokers, active ranks, high pairs) and off-suit bosses for moments that matter — winning big-point tricks, blocking, guaranteed leads. Spend the cheapest non-point card when a play won't win or help your teammate.
`;

export interface UserPromptTemplateArgs {
  playerId: string;
  teamId: string;
  partnerId: string;
  trumpRank: string;
  trumpSuit: string;
  isAttacking: boolean;
  attackingPoints: number;
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
- You: ${args.playerId} — Team ${args.teamId}, teammate ${args.partnerId}
- Role: ${args.isAttacking ? "ATTACKING (capture 80+ pts to win the round)" : "DEFENDING (hold attackers under 80 pts)"}
- Attackers have captured ${args.attackingPoints} / 80 pts so far
- Trump: rank ${args.trumpRank}, suit ${args.trumpSuit}

=== RECENT TRICKS ===
${args.historyStr}

=== CONFIRMED VOIDS ===
${args.voidsStr}

=== ACTIVE TRICK ===
${args.activeTrickStatusStr}

=== YOUR HAND (grouped by suit, strongest → weakest) ===
${args.handCardsCount} cards in hand:

${args.handChoicesStr}

${args.isLeading ? "=== LEAD OPTIONS (Rule Score = engine's prior) ===" : "=== SUIT-FOLLOWING ANALYSIS ==="}
${args.isLeading ? args.candidateOptionsStr : args.suitAnalysisStr}

=== TASK ===
${args.taskInstructionStr}
Reply with ONLY the JSON object {"reasoning":"<one sentence>","play":[...]}. In "play", copy the exact card notations from YOUR HAND verbatim (e.g. ["3♣","3♣"] for a pair) — never rename or invent cards.
`;
}
