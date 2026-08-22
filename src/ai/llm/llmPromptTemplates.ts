export const STATIC_LLM_GAME_RULES = `# Shengji / Tractor — Game Reference

## 1. Objective (points win the round, not tricks)
- The round is decided by POINTS (200 pts total in the deck: 5s=5, 10s=10, Ks=10). Attackers win by capturing 80+ pts; defenders win by holding attackers under 80 (capturing 125+ pts).
- A trick matters only for the points it carries and for the lead it gives the winner. Your role and score are in **## Current State**.
- Kitty multiplier: if attackers win the FINAL trick, the buried kitty points are captured back, multiplied by the final lead structure (single x2, pair x4, 2-pair tractor x8).

## 2. Card Strength (High -> Low)
- Trump Group (one combined suit): Big Joker > Small Joker > trump-rank in trump suit > trump-rank in other suits (equal; first played wins) > trump-suit regulars (A > K > ... skipping trump rank).
- Trump-rank cards in every suit are Trump Group, not their printed suit (2♥ with trump rank 2 is trump, not Hearts); they beat any off-suit Ace.
- Off-Suit: the highest unplayed card of a suit (A, or K if A is trump rank) is the "boss". Cross-suit cards cannot beat each other.
- No-Trump Round: only Jokers and the four trump-rank cards are trump; off-suit bosses cannot be ruffed.

## 3. Combos & Tractors
- Single (1 card); Pair (2 identical cards); Tractor (2+ consecutive pairs in one suit/trump group).
- Structure rule: only matching combo structures can beat a play (a single cannot beat a pair; a pair cannot beat a tractor).
- Trump tractor order: trump-suit A -> off-suit rank -> trump rank -> SJ -> BJ (two off-suit-rank pairs are equal, not consecutive).
- Off-suit tractors skip the trump rank (6-8 is consecutive when 7 is trump rank).
- Multi-combo: 2+ combos of one non-trump suit led together; legal only when every component is unbeatable, or all 3 opponents/partners are void.

## 4. Following — the Absolute Laws (legality, not strategy)
- **## Active Trick** names the led group — follow THAT group only. A trump-rank lead is a Trump Group lead.
- If you hold cards in the led group, you MUST follow it, matching the led combo structure and total card count.
- NEVER split a pair you hold while a matching combo is required, and NEVER play cards you do not hold — copy notations from YOUR HAND.
- Void rule: only when void in the led group may you ruff with trump (to contest the trick) or sluff off-suit (which automatically loses).

## 5. Reading the Options & Strategy
- **## Lead Options** / **## Your Options** list legal plays and consequence classes. Pick your cards from those listed options.
- **Point Priority**: POINTS WIN THE GAME (80 threshold). When opponents are winning points on the table (5, 10, 20 pts), always contest and capture those points (e.g. ruff when void) rather than letting opponents take them.
- **Point Flow**: When your teammate's win is secured, feed point cards (5, 10, K) to bank them; when opponents are winning a trick you cannot win, dump non-point cards to starve them of points.
- **Resource Conservation**: Conserve scarce bosses and high trumps on tricks you cannot win or that are already secured. But never hoard trumps at the expense of surrendering live points to opponents.
- **Position Roles (Inherent to Seat, Regardless of Lead)**:
  - **2nd & 3rd Seat (Middle)**: By position, you have a blocking and threshold role because players act behind you. Your play sets the trick threshold: playing strong blocks the next player from winning cheaply (or takes over the lead from a teammate's pass); ducking low allows the player behind to win with minimal strength.
  - **4th Seat (Last)**: You have complete information for the trick. Win as cheaply as possible against opponents, or contribute points when your teammate's win is secured.
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
  handChoicesStr: string;
  isLeading: boolean;
  optionsStr: string;
  taskInstructionStr: string;
  phaseStr?: string;
  partnerSignalsStr?: string;
}

// 1. Current State Block
function buildCurrentStateBlock(args: UserPromptTemplateArgs): string {
  const phaseLine = args.phaseStr ? `\n- Phase: ${args.phaseStr}` : "";
  const partnerLine = args.partnerSignalsStr
    ? `\n- Teammate initiative: ${args.partnerSignalsStr}`
    : "";
  return `## Current State
- Player: ${args.playerId} (Team ${args.teamId}, partner: ${args.partnerId})
- Role: ${args.isAttacking ? "Attacking — your team must capture 80+ pts this round; points the opponents take are lost from that total" : "Defending — you win by keeping the attackers under 80; every point the attackers capture counts against you"}
- Attacking team points: ${args.attackingPoints} / 80
- Trump: rank ${args.trumpRank}, suit ${args.trumpSuit}
- Live off-suit points (unseen): ${args.liveSuitPointsStr}${phaseLine}${partnerLine}`;
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

// 6. Lead Options Block (leading) — point-framed consequences, no recommendation
function buildLeadOptionsBlock(args: UserPromptTemplateArgs): string {
  return `## Lead Options
${args.optionsStr.trim()}`;
}

// 7. Your Options Block (following) — point-framed consequences, no recommendation
function buildFollowingOptionsBlock(args: UserPromptTemplateArgs): string {
  return `## Your Options
${args.optionsStr.trim()}`;
}

// 8. Task Block
function buildTaskBlock(args: UserPromptTemplateArgs): string {
  return `## Task
${args.taskInstructionStr}
Reply with JSON ONLY: {"reasoning":"<1-2 concise sentences, maximum 30 words explaining tactical intent; do not repeat trick history>","play":["<card>",...]}. Copy card notations from YOUR HAND (repeat notation to play a pair). Never play cards you do not hold.`;
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
        buildFollowingOptionsBlock(args),
        buildTaskBlock(args),
      ];

  return blocks.filter(Boolean).join("\n\n") + "\n";
}
