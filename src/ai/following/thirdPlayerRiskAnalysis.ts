import {
  GameContext,
  PointPressure,
  TrumpInfo,
  Card,
  PlayerId,
} from "../../types";
import { analyze3rdPlayerMemoryContext } from "../aiCardMemory";

/**
 * Risk Analysis - Strategic risk assessment for AI decisions
 *
 * Provides risk calculation and assessment functions for various
 * AI strategic decisions and tactical situations.
 */

/**
 * Phase 3: Enhanced 3rd Player Risk Assessment with Memory Integration
 *
 * Comprehensive risk analysis using memory data, trump exhaustion analysis,
 * and final player prediction for optimal tactical decision making.
 */
export function calculateMemoryEnhanced3rdPlayerRisk(
  leadingCards: Card[],
  secondPlayerCards: Card[],
  trumpInfo: TrumpInfo,
  currentPlayer: PlayerId,
  context: GameContext,
  baseRisk?: number,
): {
  finalRiskAssessment: number;
  memoryFactors: {
    finalPlayerVoidRisk: number;
    trumpAdvantageRisk: number;
    confidenceLevel: number;
  };
  recommendedAction: "support" | "takeover" | "conservative" | "strategic";
  reasoning: string;
} {
  // Start with base risk or calculate from context
  let finalRisk = baseRisk ?? 0.3;

  // Memory analysis factors
  let finalPlayerVoidRisk = 0;
  let trumpAdvantageRisk = 0;
  let confidenceLevel = 0.5; // Base confidence
  let recommendedAction: "support" | "takeover" | "conservative" | "strategic" =
    "strategic";
  let reasoning = "Standard 3rd player risk assessment";

  // Enhanced memory analysis when available
  if (context.memoryContext?.cardMemory) {
    try {
      const memoryAnalysis = analyze3rdPlayerMemoryContext(
        context.memoryContext.cardMemory,
        leadingCards,
        secondPlayerCards,
        trumpInfo,
        currentPlayer,
      );

      // Use memory analysis risk assessment as primary
      finalRisk = memoryAnalysis.riskAssessment;
      confidenceLevel = 0.8; // High confidence with memory data
      recommendedAction = memoryAnalysis.recommendedAction;
      reasoning = memoryAnalysis.reasoning;

      // Extract detailed memory factors
      const finalPlayerPrediction = memoryAnalysis.finalPlayerPrediction;

      // Final player void risk
      if (finalPlayerPrediction.likelyVoid) {
        finalPlayerVoidRisk = -0.3; // Negative risk (advantage) when final player void
        reasoning += " - Final player likely void";
      } else {
        finalPlayerVoidRisk = 0.1; // Slight risk if final player not void
      }

      // Trump advantage risk
      if (finalPlayerPrediction.trumpAdvantage > 0.3) {
        trumpAdvantageRisk = -0.2; // Lower risk with trump advantage
        reasoning += " - Strong trump advantage";
      } else if (finalPlayerPrediction.trumpAdvantage < -0.3) {
        trumpAdvantageRisk = 0.2; // Higher risk with trump disadvantage
        reasoning += " - Trump disadvantage detected";
      } else {
        trumpAdvantageRisk = 0.05; // Neutral trump situation
      }

      // Adjust confidence based on prediction strength
      switch (finalPlayerPrediction.predictedResponse) {
        case "weak":
          confidenceLevel += 0.1;
          break;
        case "strong":
          confidenceLevel -= 0.05; // Slightly less confident against strong opponents
          break;
      }

      // Factor in takeover opportunity
      if (memoryAnalysis.optimalTakeoverOpportunity && finalRisk < 0.4) {
        reasoning += " - Optimal takeover opportunity";
      } else if (finalRisk > 0.7) {
        reasoning += " - High risk situation";
      }
    } catch (error) {
      console.warn("Enhanced 3rd player risk analysis failed:", error);
      // Fallback to base risk calculation
      reasoning = "Memory analysis failed - using base calculation";
    }
  }

  // Apply additional context adjustments
  if (context.pointPressure === PointPressure.HIGH) {
    finalRisk -= 0.1; // Lower risk tolerance in high pressure
    reasoning += " - High point pressure";
  }

  if (context.cardsRemaining <= 5) {
    finalRisk += 0.1; // Higher risk in endgame
    reasoning += " - Endgame scenario";
  }

  // Clamp final risk to valid range
  finalRisk = Math.max(0, Math.min(1, finalRisk));
  confidenceLevel = Math.max(0, Math.min(1, confidenceLevel));

  return {
    finalRiskAssessment: finalRisk,
    memoryFactors: {
      finalPlayerVoidRisk,
      trumpAdvantageRisk,
      confidenceLevel,
    },
    recommendedAction,
    reasoning,
  };
}
