export const STATIC_LLM_GAME_RULES = `# Shengji / Tractor — Game Reference

## 1. Objective (points win the round, not tricks)
- The round is decided by POINTS. Attackers win by capturing 80+ points; defenders win by holding attackers under 80.
- Points exist only on 5 (5 pts), 10 (10 pts), and K (10 pts). A trick matters only for the points it carries and for the lead it hands the winner.
- Your role (attacking/defending) and the running score are in **## Current State**.
- Kitty multiplier: if the attackers win the FINAL trick of the round, the hidden kitty's points are scored back, multiplied by the final lead's structure — single x2, one pair x4, two-pair tractor x8 (2^(pairs+1)). The last trick can swing the round.

## 2. Card Strength (High -> Low)
- Trump Group (one combined suit): Big Joker > Small Joker > trump-rank in trump suit > trump-rank in other suits (equal; first played wins) > trump-suit regulars (A > K > ... > 3).
- Trump-rank cards in every suit belong to the Trump Group, not their printed suit; they beat any off-suit Ace.
- Off-Suit: the highest unplayed card of a suit (A, or K if A is trump rank) is the "boss". Cross-suit cards cannot beat each other.
- No-Trump Round: only Jokers and the four trump-rank cards are trump; everything else is plain. Off-suit bosses cannot be ruffed.

## 3. Combos & Tractors
- Single (1 card); Pair (2 identical cards); Tractor (2+ consecutive pairs in one suit/trump group).
- Trump tractor order: trump-suit A -> off-suit rank -> trump rank -> SJ -> BJ; two off-suit-rank pairs are equal (not consecutive).
- Off-suit tractors skip the trump rank (6-8 is consecutive when 7 is the trump rank).
- A multi-combo is two or more combos of one non-trump suit led together; legal only when every component is unbeatable, or all three other players are void in that suit.

## 4. Following — the Absolute Laws (legality, not strategy)
- If you hold the led suit/trump group, you MUST follow it, matching the led combo structure and total length.
- NEVER split a pair you hold while a matching combo is required, and NEVER play a card you do not hold — copy notations from YOUR HAND, repeating a notation only if you hold two copies.
- If you cannot match the structure, follow with whatever cards of that suit you have. Only when void in the led suit may you trump (ruff) or discard another suit.

## 5. Reading the Options
- **## Lead Options** (when leading) and **## Your Options** (when following) list EVERY legal play and what it does in points — which plays win, what they capture or concede, and what they cost you. These are facts, not advice.
- Choose the play that is best for your team's point total this round. The engine has done the counting and the lookahead; the strategic judgement is yours.
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
        buildFollowingOptionsBlock(args),
        buildTaskBlock(args),
      ];

  return blocks.filter(Boolean).join("\n\n") + "\n";
}
