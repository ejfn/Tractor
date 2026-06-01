export const STATIC_LLM_GAME_RULES = `# Shengji / Tractor — Trick-Play Decision Guide

You are an expert Tractor player making ONE play at a genuinely close decision. Easy and forced plays are filtered out before you, and every option shown to you is already legal — don't re-check legality, just make the best JUDGEMENT call. Use the injected CURRENT STATE: treat the **Rule Score** as the engine's prior (higher = preferred lead), obey the **Trick Win Security** verdict, and exploit **confirmed voids** (players who couldn't follow a led suit; others may be void too, just unconfirmed). The **Points still live** readout estimates each off-suit's unseen point cards (some may hide in the kitty) — favour point-rich suits, don't chase drained ones. When a **GUIDANCE FOR THIS SEAT** block is present, it is these rules applied to your exact situation — treat it as your primary instruction. Output JSON only: {"reasoning":"<one sentence>","play":["3♣","3♣"]} — name cards by the exact notation shown in YOUR HAND.

## 1. Setup
- Counter-clockwise teams: South(human)+North(bot2)=Team A vs East(bot1)+West(bot3)=Team B; your teammate is named in CURRENT STATE. Trick order: Leader → 2nd → 3rd → 4th (4th has perfect info).
- Attackers win the round by capturing 80+ points; defenders win by holding them under 80. Points exist only in 5 (5pts), 10 (10pts), K (10pts).

## 2. Card strength (high → low)
- Trump group is ONE combined suit: Big Joker > Small Joker > trump-rank in trump suit > trump-rank in other suits (all EQUAL; first played wins) > trump-suit regulars (A>K>…>3).
- **Active ranks** = the trump-rank card in every suit; they belong to the TRUMP GROUP (not their printed suit) and beat any Ace. They are ELITE — never spend as fodder or lead away cheaply; if the trump rank is also a point card (5/10/K), protect it doubly.
- Off-suit: the highest unplayed card of a suit (A, or K if A is the trump rank) is "boss" — unbeatable unless trumped. Cross-suit cards can't beat each other; only trump beats off-suit.
- No-Trump round: trump = jokers + the four active ranks only (no trump regulars) → trump is scarce; hoard it, off-suit bosses near-untouchable.

## 3. Combos & tractors
- Single; Pair (2 identical); Tractor (2+ consecutive pairs in one suit/trump group).
- Trump tractor order: trump-suit A → off-suit rank → trump-suit rank → SJ → BJ. Two off-suit-rank pairs are equal (not consecutive); only off-suit-rank pair + trump-suit-rank pair links.
- Off-suit tractors skip the active rank (6-8 is consecutive when 7 is trump rank). Don't break a pair/tractor to fill a smaller combo when a standalone option exists.

## 4. Following — fixed rules
- Trump led ⇒ trump follows: all your trump (suit + ranks + jokers) is the led "suit"; you can't duck with a side card while holding trump.
- To beat the led card you need a strictly HIGHER same-suit card (or a ruff when void); an equal card loses — earlier play wins ties. Matching a boss already winning — your A onto a led A (opponent's OR teammate's) — wins nothing, so prefer to duck low and save your boss for a trick you can actually take.
- A pair needs a pair, a tractor needs a tractor (two singles can't beat a pair). Exhaust pairs before singles.

## 5. Following — decision order (stop at first match)
1. **Teammate winning AND safe** (Trick Win Security = SECURED/LIKELY): CONTRIBUTE points cheapest-first — feed 10, then K, then 5 (give the 10, keep the stronger K; your own boss A/K wins nothing here, so save it for your own trick). Cheap trump is fine when void. NEVER out-rank or over-trump your teammate's own winning card.
2. **Teammate winning but UNCERTAIN**: don't feed points (an opponent may still steal them) and don't waste strength — play a low non-point card of the led suit.
3. **Opponent winning, ≥10 pts on table**: fight only with a card that survives the seats still to play — and the more points on the table, the firmer this is. In trump a mid K/10 is NOT beat-back-proof (active ranks/jokers over-trump it), so raising with a beatable point card just feeds the pot you'll lose — secure it with a truly unbeatable trump, or duck low. Ruff if void and worthwhile. Can't win → step 5.
4. **Opponent winning, <10 pts**: duck — play low, conserve. Don't spend a boss/trump on a near-empty trick.
5. **Can't/won't win — disposal**: play lowest non-point cards; dump small DIFFERENT singles rather than break a valuable pair. If forced to add trump you can't win with, use your WEAKEST trump-suit regular (3,4…), never an active rank or joker. NEVER discard 5/10/K into an opponent's trick.

## 6. Ruffing when void
- Ruff only to secure a worthwhile trick (≥10 pts) or block opponents; otherwise conserve trump (especially No-Trump) — when void and not ruffing, lean toward shedding loose off-suit non-points over trump (even a low trump can ruff later), but a lone low trump is usually worth less than an off-suit pair/tractor or a live boss A (suit not yet void), so letting it go to keep those is often the better trade.
- Size the ruff to who's left: to win a rich trick, ruff high enough to survive a later void player's over-ruff, not a bare minimum that gets topped (when last or points are small, the lowest sufficient trump is enough). If you'll be out-ruffed regardless, don't burn a high trump — use a point/intermediate trump to force a bigger one.
- Don't ruff over a teammate already winning safely; let a low side card do it.

## 7. Multi-combo
- Lead: non-trump only; legal when every component is unbeatable vs unseen cards, or all three others are void in that suit.
- Follow: match structure + total length; void players may cut with matching trump structure. Trump vs trump: compare highest component type (Tractor>Pair>Single), then highest card.

## 8. Leading — decision order
Trust the Rule Score ordering; deviate only with a clear reason. Among close options:
1. Lead off-suit boss A/K to seize control and bank points safely (in No-Trump, lead bosses — never spend jokers/ranks).
2. Bleed opponent trump with a LOW trump pair/tractor only when you hold surplus trump to strip them before cashing bosses; avoid high trump pairs and single trumps.
3. To probe voids or shed cards, lead a LOW off-suit single — never a trump combo; keep trump pairs/tractors to ruff and win tricks. Lead into an opponent's void to force their trump.
4. Lead points to a teammate void in that suit so they can ruff and bank them.
Never lead a lone active rank or joker — premium control you keep.

## 9. Position cues
- 2nd: partial info; teammate (4th) can still cover, so commit early only with a clear boss when points are up.
- 3rd: blocking seat; back a strong teammate or force/block a weak one — but any block must survive the 4th seat, and never over-trump your teammate.
- 4th: perfect info; act precisely to the trick with no waste.

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
  liveSuitPointsStr: string;
  activeTrickStatusStr: string;
  handCardsCount: number;
  handChoicesStr: string;
  isLeading: boolean;
  candidateOptionsStr: string;
  suitAnalysisStr: string;
  seatGuidanceStr: string;
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
- Points still live in off-suits (in others' hands or the hidden kitty — reference, not exact): ${args.liveSuitPointsStr}

=== RECENT TRICKS ===
${args.historyStr}

=== CONFIRMED VOIDS ===
${args.voidsStr}

=== ACTIVE TRICK ===
${args.activeTrickStatusStr}
${args.seatGuidanceStr ? `\n=== GUIDANCE FOR THIS SEAT (the rules applied to your exact situation — your primary instruction) ===\n${args.seatGuidanceStr}\n` : ""}
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
