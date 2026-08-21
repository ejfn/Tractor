import { LegalAction } from "./llmActionSpace";

export const SYSTEM_STRATEGIC_REASONER = `You are a Grandmaster AI playing the Chinese card game Shengji (升级/Tractor).
Your goal is to maximize your team's total points and game control.
- Points: 5 (5 pts), 10 (10 pts), King (10 pts). Non-point cards are 0 pts.
- Attackers win by taking 80+ pts; Defenders win by holding Attackers below 80.
- Positional Tactics: In 2nd/3rd seat, raise ceiling (10/Q/K) to block 4th seat from winning cheaply. In 4th seat, win as cheaply as possible.
- Point Starvation: Concede 0-point trash when opponents win; never bleed points unnecessarily.
- You will be given the match state, your hand structure, and an enumerated list of verified legal actions.
- Output JSON ONLY: {"thought": "<concise tactical rationale, max 30 words>", "actionIndex": <1-based integer index [1..N], do NOT use 0>}`;

/**
 * Builds the ultra-compact, structured user prompt (<350 tokens).
 */
export function buildCompactTrickPrompt(
  perceptionBlock: string,
  actions: LegalAction[],
): { system: string; user: string } {
  const actionsList = actions
    .map(
      (a) =>
        `${a.index}: ${a.label} (${a.points} pts at stake) — ${a.description}`,
    )
    .join("\n");

  const userPrompt = [
    perceptionBlock,
    `\n=== AVAILABLE LEGAL ACTIONS ===`,
    actionsList,
    `\n=== INSTRUCTION ===`,
    `Select the best action index [1..${actions.length}] (1-based, do NOT use 0).`,
    `Output JSON ONLY: {"thought": "...", "actionIndex": <1-based integer>}`,
  ].join("\n");

  return {
    system: SYSTEM_STRATEGIC_REASONER,
    user: userPrompt,
  };
}
