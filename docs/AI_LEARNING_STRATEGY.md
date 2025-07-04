# AI Learning Strategy: Simulation-Driven Improvement

**A systematic framework for enhancing AI strategy through automated simulation and data analysis.**

*Related Documentation: [AI System](AI_SYSTEM.md) | [Game Rules](GAME_RULES.md) | [Log Event Schema](LOG_EVENT_SCHEMA.md)*

## 1. Progress Update (July 4, 2025)

The AI Learning Strategy framework has been successfully implemented and is operational.

- **Phase 1 (Data Generation)** ✅ **Complete**. Standardized AI decision logging with `ai_leading_decision` and `ai_following_decision` events.
- **Phase 2 (Analysis Pipeline)** ✅ **Complete**. Full BigQuery pipeline with automated log ingestion, performance-focused KPI analysis, and comprehensive reporting with embedded visualizations.
- **Phase 3 (Strategy Refinement)** 🔄 **Ready**. Analysis system identifies specific decision patterns and strategic opportunities for improvement.
- **Phase 4 (A/B Testing)** 📋 **Framework Ready**. Infrastructure supports comparing different AI strategies through simulation.

The system now provides actionable insights into AI performance with position-based analysis, win rate tracking, and strategic decision effectiveness.

## 2. Overview

The current AI system is built on a robust, modular architecture with sophisticated, rule-based strategic logic. While effective, this logic is based on established heuristics. The next evolution of the AI is to introduce a **data-driven feedback loop** where the AI can learn and improve from gameplay data.

The `test:simulation` command provides the capability to run thousands of full game simulations in a short period. This document outlines a comprehensive strategy to leverage the data generated from these simulations to objectively measure, analyze, and refine the AI's decision-making processes.

**The core goal is to move from heuristic-based strategy to data-validated strategy.**

## 3. The Four-Phase Improvement Framework

We will implement a cyclical, four-phase framework for continuous AI improvement:

1.  **Phase 1: Enhanced Data Generation**: Augment the simulation to produce structured, analyzable logs.
2.  **Phase 2: Automated Analysis Pipeline**: Create scripts to process the log data and extract actionable insights.
3.  **Phase 3: Data-Driven Strategy Refinement**: Use the analysis to make targeted, evidence-based changes to the AI's code.
4.  **Phase 4: A/B Testing & Validation**: Validate that the changes lead to a statistically significant improvement in performance.

---

### Phase 1: Enhanced Data Generation

The foundation of this system is high-quality, structured data. The existing `gameLogger` already provides a solid base with its structured JSON output. The key is to enhance our logging by systematically capturing the AI's decision-making context at the `DEBUG` level.

**Key Actions:**

1.  **Activate `DEBUG` Logging in Simulations**: ✅ **Completed**. The simulation environment is configured to use `DEBUG` level logging via the `LOG_LEVEL` environment variable, which is set in the `run_simulations.sh` script.

2.  **Log `GameContext` at Decision Points**: ✅ **Completed**. `gameLogger.debug()` calls have been added to key AI modules (`aiStrategy.ts`, `leadingStrategy.ts`, `followingStrategy.ts`) to capture the full `GameContext` at every significant decision point.

3.  **Simulation Runner**: ✅ **Completed**. A script named `run_simulations.sh` has been created. It runs the `npm run test:simulation` command with the `TARGET_GAMES` and `LOG_LEVEL` environment variables, piping the structured JSON output into a dedicated `logs/` directory. The `gameLogger` has been made configurable to support this.

### Phase 2: Automated Analysis Pipeline ✅ **COMPLETE**

A comprehensive cloud-based analysis pipeline has been implemented to process simulation data and generate actionable insights.

**Key Achievements:**

1.  **BigQuery Data Warehouse**: ✅ **Completed**. Automated log ingestion pipeline uploads simulation logs to Google Cloud BigQuery for scalable analytics and complex SQL queries.

2.  **Performance-Focused KPIs**: ✅ **Completed**. The analysis system computes comprehensive performance metrics:
    *   **Position-Based Analysis**: Win rates and point collection by trick position (Leading, 2nd, 3rd, 4th player)
    *   **Team Performance**: Win rates by team (A vs B) and role (attacking vs defending)
    *   **Point Efficiency**: Total points collected per round by position and overall game efficiency
    *   **AI Strategy Effectiveness**: Usage frequency and context analysis of decision points
    *   **Game Balance Metrics**: Average rounds per game, kitty effectiveness, trump utilization

3.  **Advanced SQL Analytics**: ✅ **Completed**. Sophisticated BigQuery queries extract insights from trick-level data:
    *   **Trick Position Analysis**: Flattens JSON play data to analyze player positions and performance
    *   **Memory System Integration**: Tracks AI card memory usage and strategic decision effectiveness
    *   **Strategic Decision Tracking**: Correlates specific AI decision points with game outcomes

4.  **Automated Reporting System**: ✅ **Completed**. Python-based report generator (`generate_kpi_report.py`) produces:
    *   **Comprehensive Markdown Reports**: Detailed performance analysis with versioned filenames
    *   **Embedded Visualizations**: Charts showing position win rates and point distribution patterns
    *   **Strategic Insights**: Most-used AI decision points and their effectiveness
    *   **Actionable Metrics**: Clear performance indicators for identifying improvement opportunities

### Data Schema and Event Types

For detailed documentation of all log event types and their data structures, see **[Log Event Schema](LOG_EVENT_SCHEMA.md)**.

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

## Current Operational Workflow

1.  **Generate Data**: Run `./run_simulations.sh [number_of_games]` to generate comprehensive simulation logs.
2.  **Upload to BigQuery**: Use `python analysis/setup_bigquery.py` to upload logs to cloud data warehouse.
3.  **Generate KPI Report**: Execute `python analysis/generate_kpi_report.py` to produce performance analysis with visualizations.
4.  **Analyze Insights**: Review position-based performance, AI strategy effectiveness, and identify improvement opportunities.
5.  **Form Hypothesis**: Based on data patterns (e.g., "3rd player position shows suboptimal takeover decisions").
6.  **Implement Change**: Create feature branch and modify relevant AI modules using data-driven insights.
7.  **Validate with A/B Test**: Compare new strategy against baseline using simulation framework.
8.  **Statistical Analysis**: Verify improvements are statistically significant before merging.
9.  **Deploy and Monitor**: Merge improvements and generate new performance reports to track progress.

## Current Analysis Capabilities

The implemented system provides comprehensive insights into:

- **Position Dominance**: Leading players win 42% of tricks, demonstrating strategic importance of trick leadership
- **Point Distribution**: Clear hierarchy showing Leading > 4th > 2nd > 3rd player effectiveness
- **AI Decision Patterns**: Analysis of 15+ strategic decision points and their usage frequency
- **Game Balance**: 194.5 points captured per round out of ~200 available (97% efficiency)
- **Strategic Effectiveness**: Identification of most/least effective AI strategies for targeted improvements

## Analysis Pipeline Files

The current implementation includes:

**Core Analysis Scripts:**
- `analysis/setup_bigquery.py` - BigQuery table setup and log upload automation
- `analysis/kpi_report_query.sql` - Performance-focused SQL query for comprehensive metrics
- `analysis/generate_kpi_report.py` - Python report generator with embedded visualizations
- `analysis/upload_logs.sh` - Bash script for automated log uploading to BigQuery

**Documentation:**
- `docs/LOG_EVENT_SCHEMA.md` - Complete event type documentation with field specifications
- `docs/AI_LEARNING_STRATEGY.md` - This strategy document (updated)

**Generated Outputs:**
- `analysis_reports/kpi_report_[version].md` - Versioned performance reports with embedded charts
- `analysis_reports/position_win_rates_[version].png` - Position-based win rate visualizations
- `analysis_reports/position_points_per_round_[version].png` - Point distribution charts

## Benefits of This Approach

- **Objective Improvement**: Replaces subjective tweaking with evidence-based enhancements.
- **Reduces Bias**: Decisions are driven by data, not developer intuition alone.
- **Accelerated Learning**: The AI can effectively "learn" from millions of hands of experience in a matter of days.
- **Compound Gains**: Small, consistent improvements will lead to a significantly more formidable AI over time.
- **Identifies Blind Spots**: The data will uncover subtle, non-obvious flaws in the current strategy.
