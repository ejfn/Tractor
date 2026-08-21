import { PlayerId, Suit } from "../../src/types";
import {
  getActiveRoundPlan,
  updateActiveRoundPlan,
  resetRoundStrategyPlans,
} from "../../src/ai/llm/llmPlanState";

describe("llmPlanState", () => {
  beforeEach(() => {
    resetRoundStrategyPlans();
  });

  it("should initialize default attacking plan for attacking player", () => {
    const plan = getActiveRoundPlan(PlayerId.Bot1, true, 1);
    expect(plan.goal).toBe("rush_points");
    expect(plan.trumpPolicy).toBe("strict_conservation");
  });

  it("should initialize default defending plan for defending player", () => {
    const plan = getActiveRoundPlan(PlayerId.Bot2, false, 1);
    expect(plan.goal).toBe("conserve_and_control");
    expect(plan.trumpPolicy).toBe("strict_conservation");
  });

  it("should update plan correctly and persist across tricks", () => {
    const initial = getActiveRoundPlan(PlayerId.Bot1, true, 1);
    expect(initial.goal).toBe("rush_points");

    const updated = updateActiveRoundPlan(
      PlayerId.Bot1,
      {
        goal: "feed_partner",
        targetSuit: Suit.Hearts,
        reasoning: "Partner is void in Hearts",
      },
      5,
    );

    expect(updated.goal).toBe("feed_partner");
    expect(updated.targetSuit).toBe(Suit.Hearts);
    expect(updated.lastUpdatedTrick).toBe(5);

    // Subsequent retrieval should match updated plan
    const retrieved = getActiveRoundPlan(PlayerId.Bot1, true, 6);
    expect(retrieved.goal).toBe("feed_partner");
    expect(retrieved.targetSuit).toBe(Suit.Hearts);
  });

  it("should reset all plans on resetRoundStrategyPlans", () => {
    updateActiveRoundPlan(PlayerId.Bot1, { goal: "feed_partner" }, 3);
    resetRoundStrategyPlans();

    const freshPlan = getActiveRoundPlan(PlayerId.Bot1, true, 1);
    expect(freshPlan.goal).toBe("rush_points");
  });
});
