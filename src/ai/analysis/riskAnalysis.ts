import { GameContext, PointPressure } from "../../types";

/**
 * Risk Analysis - Strategic risk assessment for AI decisions
 *
 * Provides risk calculation and assessment functions for various
 * AI strategic decisions and tactical situations.
 */

/**
 * Calculate risk assessment for 3rd player tactical decisions
 */
export function calculateThirdPlayerRisk(
  leadStrength: "weak" | "moderate" | "strong",
  isVulnerableToFourthPlayer: boolean,
  takeoverRecommendation: "support" | "takeover" | "strategic",
  context: GameContext,
): number {
  let risk = 0.3; // Base risk level

  // Increase risk for takeover attempts
  if (takeoverRecommendation === "takeover") {
    risk += 0.3;
  }

  // Adjust based on teammate lead strength
  switch (leadStrength) {
    case "strong":
      risk -= 0.1; // Lower risk with strong teammate
      break;
    case "weak":
      risk += 0.2; // Higher risk with weak teammate
      break;
  }

  // Adjust based on 4th player vulnerability
  if (isVulnerableToFourthPlayer) {
    risk -= 0.1; // Lower risk when protecting from 4th player
  }

  // Adjust based on game pressure
  if (context.pointPressure === PointPressure.HIGH) {
    risk -= 0.1; // Lower risk tolerance in high pressure
  }

  return Math.max(0, Math.min(1, risk));
}
