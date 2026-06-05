---
name: game-analysis
description: This skill should be used when analysing Tractor game-simulation logs with BigQuery — e.g. "upload game logs to BigQuery", "run the game analysis", "generate the KPI/performance report", "set up the BigQuery analysis infrastructure", or questions about the game's JSON log-event schema. Wraps the repo-root `analysis/` pipeline (uv-run Python) and documents the log-event shapes its queries consume.
version: 1.0.0
license: UNLICENSED
---

## Overview

Analyse Tractor game-simulation logs in Google Cloud BigQuery. The pipeline lives at the repo root in `analysis/` (kept there so it stays runnable as a CLI); this skill is how to drive it, plus the reference for the log-event shapes it reads.

## Running the pipeline

Run from the repo root:

```bash
uv run analysis/bigquery_main.py setup    # Create the BigQuery dataset / tables / transfer
uv run analysis/bigquery_main.py upload   # Upload local game logs
uv run analysis/bigquery_main.py analyse  # Run analysis and generate the performance report
```

- **Config**: `analysis/config.py` (project / dataset settings).
- **Queries**: `analysis/analysis_query.sql`.
- **Reports**: generated into `analysis/reports/`.
- **Producing logs**: `run_simulations.sh` (repo root) generates the log files that `upload` consumes — see the `simulation-testing` skill.

## Log event reference

The analysis reads newline-delimited JSON log events. See [references/log-events.md](references/log-events.md) for the common envelope and the key event shapes. The authoritative field set for any event is always its `gameLogger` call site in `src/`.
