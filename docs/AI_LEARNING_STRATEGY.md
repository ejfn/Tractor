# AI Learning Strategy: Simulation-Driven Improvement

**A systematic framework for enhancing AI strategy through automated simulation and data analysis.**

*Related Documentation: [AI System](AI_SYSTEM.md) | [Game Rules](GAME_RULES.md)*

## 1. Overview

The current AI system is built on a robust, modular architecture with sophisticated, rule-based strategic logic. While effective, this logic is based on established heuristics. The next evolution of the AI is to introduce a **data-driven feedback loop** where the AI can learn and improve from gameplay data.

The `test:simulation` command provides the capability to run thousands of full game simulations in a short period. This document outlines a comprehensive strategy to leverage the data generated from these simulations to objectively measure, analyze, and refine the AI's decision-making processes.

**The core goal is to move from heuristic-based strategy to data-validated strategy.**

## 2. The Four-Phase Improvement Framework

We will implement a cyclical, four-phase framework for continuous AI improvement:

1.  **Phase 1: Enhanced Data Generation**: Augment the simulation to produce structured, analyzable logs.
2.  **Phase 2: Automated Analysis Pipeline**: Create scripts to process the log data and extract actionable insights.
3.  **Phase 3: Data-Driven Strategy Refinement**: Use the analysis to make targeted, evidence-based changes to the AI's code.
4.  **Phase 4: A/B Testing & Validation**: Validate that the changes lead to a statistically significant improvement in performance.

---

### Phase 1: Enhanced Data Generation

The foundation of this system is high-quality, structured data. The existing `gameLogger` already provides a solid base with its structured JSON output. The key is to enhance our logging by systematically capturing the AI's decision-making context at the `DEBUG` level.

**Key Actions:**

1.  **Activate `DEBUG` Logging in Simulations**: Modify the simulation environment (e.g., in `__tests__/setup.js` or the simulation test file itself) to set the `gameLogger`'s `logLevel` to `DEBUG`. This will ensure that the detailed AI decision logs are captured during simulation runs.

2.  **Log `GameContext` at Decision Points**: Go through the key AI modules (`aiStrategy.ts`, `leadingStrategy.ts`, `followingStrategy.ts`, etc.) and add `gameLogger.debug()` calls at every significant decision point. Each log entry must include:
    *   `decisionPoint`: A unique, descriptive name for the decision being made (e.g., `lead_weak_multi_combo`, `third_player_takeover_assessment`).
    *   `context`: A complete snapshot of the `GameContext` object at the moment of the decision. This is the most critical piece of data, as it tells us *why* the AI made its choice.
    *   `decision`: The action the AI ultimately took (e.g., the specific cards played, the suit declared for trump).
    *   `optionsConsidered` (Optional but Recommended): An array of the other valid plays the AI considered but did not choose.

3.  **Simulation Runner**: Create a script (e.g., `run_simulations.sh`) that can:
    *   Run the `npm run test:simulation` command for a specified number of iterations (e.g., 10,000 games).
    *   Pipe the structured JSON output into a dedicated directory, such as `simulation_data/`, with each game having its own log file.

### Phase 2: Automated Analysis Pipeline

With a large dataset of structured logs, we need an automated way to process it and find meaningful patterns. This phase focuses on transforming raw log data into actionable strategic insights.

**Key Actions:**

1.  **Data Ingestion and Parsing**: Develop a suite of scripts (e.g., in Python using the `pandas` library) to efficiently parse the millions of JSON log entries from the `simulation_data/` directory into a structured, queryable format like a DataFrame or a database (e.g., SQLite for local analysis).

2.  **Define Key Performance Indicators (KPIs)**: The analysis pipeline will compute and track a range of KPIs to provide a multi-faceted view of AI performance. These will include:
    *   **Primary KPI**: Attacking Team Win Rate (the ultimate measure of success).
    *   **Secondary KPIs**:
        *   *Point Capture Efficiency*: Average points captured per round by the attacking team.
        *   *Trump Efficiency*: Points won per trump card played. A high value indicates effective trump usage.
        *   *Kitty Swap Effectiveness*: Net points gained or lost from the kitty (points buried vs. points lost from the kitty bonus).
        *   *Trick Win Rate by Position*: The percentage of tricks won when playing in the 1st, 2nd, 3rd, and 4th positions.
        *   *Successful Declaration Rate*: The percentage of rounds won when a team has declared trump.

3.  **Correlation and Causal Analysis**: This is the core of the data analysis. The scripts will be designed to identify statistically significant correlations between specific AI decisions and the KPIs. The goal is to move beyond simple observation to data-backed conclusions. Examples of analyses include:
    *   **Decision Impact on Win Rate**: *"What is the impact on the Attacking Team Win Rate when the AI, in the 3rd position, chooses to 'takeover' a teammate's lead with a weak trump, versus playing a supporting role?"* This would be segmented by `pointPressure` and the number of points in the trick.
    *   **Threshold Optimization**: *"What is the optimal hand strength threshold for declaring trump?"* We can analyze the win rate for declarations made with different hand strengths (e.g., based on the number of trump cards, high-value cards, etc.).
    *   **Behavioral Pattern Analysis**: *"Do bots that exhibit a more 'aggressive' `playStyle` early in the game tend to win more or less often?"* This helps validate the logic in `determinePlayStyle`.

4.  **Automated Insight Reports**: The analysis pipeline will culminate in the generation of automated reports. These reports will:
    *   Present the KPIs in a clear, easy-to-understand format (e.g., dashboards with graphs and charts).
    *   Highlight the most significant positive and negative correlations between decisions and outcomes.
    *   Propose specific, data-driven hypotheses for strategy improvements (e.g., *"Hypothesis: The AI is too conservative in leading trump when it has a significant trump advantage. The data shows a 5% increase in win rate when leading trump with a trump advantage > 0.4."*).

### Phase 3: Data-Driven Strategy Refinement

This phase is about translating the data-driven insights from Phase 2 into concrete code improvements.

**Key Actions:**

1.  **Targeted Code Modifications**: Based on the hypotheses generated in the insight reports, developers will make precise changes to the AI's logic. For example, if the data suggests that the `thirdPlayerRiskAnalysis` is too risk-averse, the thresholds in that module will be adjusted.

2.  **Evidence-Based Commits and Pull Requests**: Every change made to the AI's strategy must be justified by the data. Commit messages and pull request descriptions will explicitly reference the analysis that prompted the change. This creates a clear, auditable trail of how the AI is evolving.
    *   **Example Commit Message**:
        ```
        feat(ai): Adjust third-player takeover threshold

        Based on analysis of 100,000 simulated games, the data shows that the AI is too conservative in the third position. This change adjusts the takeover risk threshold from 0.7 to 0.6.

        Reference: AI-LEARNING-STRATEGY.md, Insight Report 2025-06-26
        ```

3.  **Prioritization**: The insight reports will help prioritize which changes are likely to have the most significant impact on the primary KPI (Win Rate), allowing for a focused and efficient development process.

### Phase 4: A/B Testing & Validation

To ensure that a change is a genuine improvement and not just a random fluctuation, every modification must be rigorously validated.

**Key Actions:**

1.  **A/B Testing Framework**: We will enhance the simulation environment to support A/B testing. This will involve running a large number of games where:
    *   **Team A** uses the baseline AI strategy (e.g., the `main` branch).
    *   **Team B** uses the new, modified AI strategy from the feature branch.

2.  **Statistical Significance**: The results of the A/B test will be analyzed to determine if the change in the primary KPI (Win Rate) is statistically significant. We will use established statistical methods (e.g., chi-squared test) to ensure that the observed improvement is not due to random chance.

3.  **Merge Confirmation**: A pull request for a new AI strategy will only be merged into the `main` branch after the A/B test has demonstrated a clear, statistically significant improvement in performance. This prevents regressions and ensures that the AI is always evolving in a positive direction.

## Proposed Workflow

1.  **Generate Data**: Run 100,000 simulations overnight to generate a rich dataset.
2.  **Run Analysis**: Execute the analysis pipeline to produce an insight report.
3.  **Identify Hypothesis**: Review the report and form a hypothesis (e.g., "The AI is wasting high-value trump cards too early").
4.  **Implement Change**: Create a new feature branch and modify the relevant AI module(s) to test the hypothesis.
5.  **Validate with A/B Test**: Run the new branch against `main` in the A/B testing framework.
6.  **Analyze Results**: If the new strategy shows a statistically significant improvement, create a pull request.
7.  **Merge and Repeat**: Merge the improved strategy and begin the cycle again.

## Benefits of This Approach

- **Objective Improvement**: Replaces subjective tweaking with evidence-based enhancements.
- **Reduces Bias**: Decisions are driven by data, not developer intuition alone.
- **Accelerated Learning**: The AI can effectively "learn" from millions of hands of experience in a matter of days.
- **Compound Gains**: Small, consistent improvements will lead to a significantly more formidable AI over time.
- **Identifies Blind Spots**: The data will uncover subtle, non-obvious flaws in the current strategy.
