// Phase 4: Advanced Combination Logic Types

import { ComboStrength } from "./ai";
import { Card, Combo, ComboType, MultiCombo } from "./card";
import { PlayerId } from "./core";

export enum CombinationPotential {
  None = "none", // No combinations possible
  Weak = "weak", // Basic pairs/tractors possible
  Strong = "strong", // High-value combinations available
  Dominant = "dominant", // Game-changing combinations possible
}

export enum CombinationContext {
  Leading = "leading", // Leading a trick, can choose any combination
  Following = "following", // Must follow the lead combination type
  Defending = "defending", // Defensive play, prevent opponent wins
  Attacking = "attacking", // Aggressive play, try to take control
}

export interface AdvancedComboPattern {
  type: ComboType;
  minCards: number;
  maxCards: number;
  strengthRange: [ComboStrength, ComboStrength];
  situationalValue: number; // 0.0-1.0 based on game context
  opponentDisruption: number; // How much this disrupts opponents
  partnerSupport: number; // How much this helps partner
}

export interface CombinationAnalysis {
  pattern: AdvancedComboPattern;
  cards: Card[];
  effectiveness: number; // Overall effectiveness score (0.0-1.0)
  timing: "immediate" | "delayed" | "endgame"; // When to play this combo
  risk: number; // Risk factor (0.0-1.0)
  reward: number; // Potential reward (0.0-1.0)
  alternativeCount: number; // How many other similar combos are available
}

export interface HandCombinationProfile {
  totalCombinations: number;
  tractorPotential: CombinationPotential;
  pairPotential: CombinationPotential;
  trumpCombinations: number;
  pointCombinations: number;
  flexibilityScore: number; // How many different strategies are possible
  dominanceLevel: number; // How likely to win with these combinations
}

export interface CombinationStrategy {
  context: CombinationContext;
  preferredPatterns: AdvancedComboPattern[];
  avoidancePatterns: AdvancedComboPattern[]; // Combinations to avoid
  adaptiveThreshold: number; // When to switch strategies
  memoryInfluence: number; // How much memory affects combination choice
}

// Multi-Combo Detection and Validation Types

export interface MultiComboValidation {
  isValid: boolean;
  invalidReasons: string[];
  voidStatus: {
    allOpponentsVoid: boolean;
    voidPlayers: PlayerId[];
  };
  unbeatableStatus: {
    allUnbeatable: boolean;
    beatableComponents: {
      combo: Combo;
      beatenBy: string; // Description of what can beat it
    }[];
  };
}

export interface MultiComboDetection {
  isMultiCombo: boolean;
  components?: MultiCombo; // Contains combos field with individual combos
  validation?: MultiComboValidation;
}

export interface BeatingCombo {
  playerId: PlayerId;
  combo: Combo;
  confidence: number; // 0.0-1.0 based on memory certainty
}
