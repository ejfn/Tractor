import { Card, GameContext, GameState, PlayerId } from "../../types";
import { StrategicLine } from "./llmStrategicLines";
import { RoundStrategyPlan } from "./llmPlanState";
import { detectStrategicInflection } from "./llmInflectionDetector";

export interface CompactLLMResponse {
  line: string;
  strategy?: string;
  reason?: string;
}

export const COMPACT_SYSTEM_PROMPT = `You are a Shengji (Tractor) card game master strategist.
You decide high-level strategic lines. The game engine handles all card validation and execution.
Always output strictly valid JSON matching the requested format.`;

/**
 * Builds an ultra-compact (<400 tokens) prompt tailored for fast lightweight models (e.g. Gemini Flash Lite).
 */
export function buildCompactLLMPrompt(
  gameState: GameState,
  playerId: PlayerId,
  hand: Card[],
  lines: StrategicLine[],
  currentPlan: RoundStrategyPlan,
  gameContext: GameContext,
): { system: string; user: string } {
  const { trumpInfo } = gameState;
  const isAttacking = gameContext.isAttackingTeam;
  const currentPts = gameContext.currentPoints;
  const tricksPlayed = gameState.tricks.length;
  const cardsRemaining = hand.length;

  const roleStr = isAttacking
    ? `Attacking Team (Score: ${currentPts} / 80 pts required)`
    : `Defending Team (Holding attackers at ${currentPts} / 80 pts)`;

  const trumpStr = `Trump: ${trumpInfo.trumpRank} of ${trumpInfo.trumpSuit || "No-Trump"}`;
  const progressStr = `${tricksPlayed} tricks played · ${cardsRemaining} cards in hand`;

  // Check for any real-time inflection alerts
  const inflectionAlert = detectStrategicInflection(
    gameState,
    playerId,
    currentPlan,
    gameContext,
  );

  const alertBlock = inflectionAlert ? `\n# ⚠️ ALERT: ${inflectionAlert}` : "";

  // Render Strategic Lines
  const linesFormatted = lines
    .map((l) => `- [Line ${l.id}] ${l.label} → ${l.description}`)
    .join("\n");

  const validLineIds = lines.map((l) => `"${l.id}"`).join(" | ");

  const userPrompt = `# Role: ${roleStr} | ${trumpStr}
# Progress: ${progressStr}
# Active Plan: ${currentPlan.goal} (${currentPlan.reasoning})${alertBlock}

## Your Strategic Choices:
${linesFormatted}

## Task:
Select the best strategic line for your team.
Output JSON ONLY:
{
  "line": ${validLineIds},
  "strategy": "rush_points" | "conserve_and_control" | "feed_partner" | "kitty_defense",
  "reason": "<1 short sentence rationale>"
}`;

  return {
    system: COMPACT_SYSTEM_PROMPT,
    user: userPrompt,
  };
}

/**
 * Parses the model's JSON response and extracts the selected line ID.
 */
export function parseCompactLLMResponse(
  rawText: string,
  availableLines: StrategicLine[],
): {
  selectedLine: StrategicLine | null;
  parsedResponse: CompactLLMResponse | null;
} {
  let cleaned = rawText
    .trim()
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .trim();

  // Strip code fences if present
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  try {
    const parsed: CompactLLMResponse = JSON.parse(cleaned);
    const lineKey = (parsed.line || "").trim().toUpperCase();

    const matchingLine = availableLines.find(
      (l) => l.id.toUpperCase() === lineKey,
    );
    return {
      selectedLine: matchingLine ?? null,
      parsedResponse: parsed,
    };
  } catch {
    // If JSON parsing failed, try regex match for "line": "A" or just the letter
    const match =
      cleaned.match(/"line"\s*:\s*"([A-D])"/i) || cleaned.match(/\b([A-D])\b/);
    if (match) {
      const lineKey = match[1].toUpperCase();
      const matchingLine = availableLines.find(
        (l) => l.id.toUpperCase() === lineKey,
      );
      return {
        selectedLine: matchingLine ?? null,
        parsedResponse: { line: lineKey },
      };
    }

    return { selectedLine: null, parsedResponse: null };
  }
}
