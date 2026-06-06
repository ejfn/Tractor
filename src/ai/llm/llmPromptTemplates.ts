export const STATIC_LLM_GAME_RULES = `# Shengji / Tractor — Trick-Play Decision Guide

## 1. Objectives & Points
- **Team Roles**: Attacking vs defending roles are specified in the **## Current State** block (injected in the prompt below).
- **Victory Condition**: Attackers win the round by capturing 80+ points; defenders win by keeping attackers under 80 points.
- **Point Cards**: Points exist only on 5 (5pts), 10 (10pts), and K (10pts) cards.

## 2. Card Strength (High → Low)
- **Trump Group**: Treated as ONE combined suit: Big Joker > Small Joker > trump-rank in trump suit > trump-rank in other suits (equal; first played wins) > trump regulars (A > K > ... > 3).
- **Active Ranks**: The trump-rank cards in all suits belong to the Trump Group, not their printed suit. They beat any Ace. Protect them and never waste them cheaply.
- **Off-Suit**: The highest unplayed card of a suit (A, or K if A is trump rank) is "boss" — unbeatable unless ruffed. Cross-suit cards cannot beat each other.
- **No-Trump Round**: No trump suit declared. The Trump Group consists ONLY of Jokers and the four active ranks (no other cards are trump). Trump is extremely scarce — hoard it, and off-suit bosses are near-untouchable.

## 3. Combos & Tractors
- **Combo Types**: Single (1 card); Pair (2 identical cards); Tractor (2+ consecutive pairs in one suit/trump group).
- **Trump Tractor Sequence**: Trump A → off-suit rank → trump rank → SJ → BJ. Two off-suit rank pairs are equal (not consecutive).
- **Off-Suit Tractor Sequence**: Consecutive ranks skip the active rank (e.g. 6-8 is consecutive when 7 is trump rank). Do not break a pair/tractor to fill a smaller combo if a standalone option exists.

## 4. Leading Strategy
Trust the **Rule Score** ordering as your baseline, cashing bosses first and bleeding opponents' trumps only with low trump pairs if you have excess trump.
- **Boss Cash-out**: Lead off-suit boss A/K to score points safely. Never lead high trump combos or lone active ranks/jokers cheaply.
- **Probe Voids / Discard**: Lead low off-suit singles/rubbish to probe voids, or feed points to a void teammate to ruff.
- **Multi-Combo Leads**: Leading a multi-combo (multiple combos of the same suit played at once, non-trump only) is legal ONLY when every component is unbeatable (boss) or all three other players are void in that suit.

## 5. Following Strategy & Constraints
- **Absolute Laws**: Follow the led suit/trump group if you hold it. You must match the led combo structure — obey the requirements in **## Suit-Following Analysis** (provided in the prompt below). If you do not hold matching combos (e.g. you hold only singles under a pair lead), follow with singles instead. NEVER split pairs when matching combos are held, and NEVER play or duplicate cards that are not explicitly shown in your hand list — you cannot play a pair or repeat a card's notation unless you hold multiple copies of that card (shown multiple times in your hand/available cards). If a multi-combo is led, match the combo structure and total length.
- **Seat Guidance**: Obey the situation-specific bullet under **## Seat Guidance** (provided in the prompt below) as your primary instruction. It dynamically tells you when to duck low, bank points on a safe teammate's trick, ruff/sluff, or conserve your elite cards.
- **Ruffing & Sluffing (Void)**: Ruff only to secure a worthwhile trick (≥10 pts) or block opponents. Size your ruff high enough to survive later players' over-ruffs; if you'll be out-ruffed regardless, use a low card to sluff instead of wasting trump. Never ruff over a teammate who is winning safely.
- **Conserve Control**: Keep your high trumps and off-suit bosses for tricks you lead or can absolutely win. Spend your cheapest non-point cards on lost tricks.

## 6. Position Cues
- **2nd Seat**: Commit early only with a clear boss when points are up. Teammate (4th) can still cover.
- **3rd Seat**: Back a strong teammate or block an opponent, but ensure your play survives the 4th seat. Never over-trump your teammate.
- **4th Seat**: Perfect information. Act precisely to win the trick or dump trash with zero waste.

Conservation through-line: Keep top trumps and off-suit bosses for moments that matter (winning big tricks, blocking, guaranteed leads). Dump cheap non-point cards when you cannot win.
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

// 1. Current State Block
function buildCurrentStateBlock(args: UserPromptTemplateArgs): string {
  return `## Current State
- Player: ${args.playerId} (Team ${args.teamId}, partner: ${args.partnerId})
- Role: ${args.isAttacking ? "Attacking (capture 80+ pts)" : "Defending (limit to <80 pts)"}
- Attacking team points: ${args.attackingPoints} / 80
- Trump: rank ${args.trumpRank}, suit ${args.trumpSuit}
- Live off-suit points (unseen): ${args.liveSuitPointsStr}`;
}

// 2. History Block
function buildHistoryBlock(args: UserPromptTemplateArgs): string {
  return `## Recent Tricks
${args.historyStr}`;
}

// 3. Voids Block
function buildVoidsBlock(args: UserPromptTemplateArgs): string {
  return `## Confirmed Voids
${args.voidsStr}`;
}

// 4. Active Trick Block
function buildActiveTrickBlock(args: UserPromptTemplateArgs): string {
  return `## Active Trick
${args.activeTrickStatusStr}`;
}

// 5. Hand Block
function buildHandBlock(args: UserPromptTemplateArgs): string {
  return `## Your Hand (grouped by suit, strongest → weakest)
${args.handChoicesStr}`;
}

// 6. Lead Options Block
function buildLeadOptionsBlock(args: UserPromptTemplateArgs): string {
  return `## Lead Options
${args.candidateOptionsStr.trim()}`;
}

// 7. Suit Following Analysis Block
function buildSuitAnalysisBlock(args: UserPromptTemplateArgs): string {
  return `## Suit-Following Analysis
${args.suitAnalysisStr.trim()}`;
}

// 8. Seat Guidance Block
function buildSeatGuidanceBlock(args: UserPromptTemplateArgs): string {
  if (!args.seatGuidanceStr) return "";
  return `## Seat Guidance
${args.seatGuidanceStr}`;
}

// 9. Task Block
function buildTaskBlock(args: UserPromptTemplateArgs): string {
  return `## Task
${args.taskInstructionStr}
Reply with JSON ONLY: {"reasoning":"<one sentence>","play":["<card>",...]}. Copy card notations from YOUR HAND (repeat notation to play a pair). Never play cards you do not hold.`;
}

/**
 * Builds the dynamic user prompt using injected state variables.
 */
export function buildUserPromptTemplate(args: UserPromptTemplateArgs): string {
  const blocks = args.isLeading
    ? [
        buildCurrentStateBlock(args),
        buildHistoryBlock(args),
        buildVoidsBlock(args),
        buildHandBlock(args),
        buildLeadOptionsBlock(args),
        buildTaskBlock(args),
      ]
    : [
        buildCurrentStateBlock(args),
        buildHistoryBlock(args),
        buildVoidsBlock(args),
        buildActiveTrickBlock(args),
        buildHandBlock(args),
        buildSeatGuidanceBlock(args),
        buildSuitAnalysisBlock(args),
        buildTaskBlock(args),
      ];

  return blocks.filter(Boolean).join("\n\n") + "\n";
}
