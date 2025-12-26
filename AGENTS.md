# AGENTS.md

This file provides guidance to coding agents when working with this repository.

## Project Overview

**Tractor** is a React Native Expo app implementing the Chinese card game Shengji (升级/Tractor) with AI opponents.

- **Platform**: Mobile-only (iOS and Android)
- **Stack**: React Native, Expo, TypeScript, React i18next, Jest

## Documentation

- [README.md](README.md) - Project overview, features, and quick start
- [docs/AI_SYSTEM.md](docs/AI_SYSTEM.md) - AI intelligence system documentation
- [docs/GAME_RULES.md](docs/GAME_RULES.md) - Complete game rules and strategy
- [docs/MULTI_COMBO.md](docs/MULTI_COMBO.md) - Multi-combo implementation guide
- [docs/LOG_EVENT_SCHEMA.md](docs/LOG_EVENT_SCHEMA.md) - Log event structure
- [docs/VERSIONING_STRATEGY.md](docs/VERSIONING_STRATEGY.md) - Versioning strategy and OTA compatibility

## Setup Commands

```bash
# Install and run
npm install
npx expo start

# Quality checks
npm run qualitycheck  # Runs typecheck, lint, and test
npm run android       # Android platform
npm run ios           # iOS platform

# Analysis
uv run analysis/bigquery_main.py setup   # Setup BigQuery infrastructure
uv run analysis/bigquery_main.py upload  # Upload logs to BigQuery
uv run analysis/bigquery_main.py analyse # Run analysis
```

## Code Style

### Type Safety (Strict)
- Zero tolerance for unsafe TypeScript patterns
- Mandatory parameters: never make optional when always provided
- Use defined interfaces, not inline object types
- Always use enums instead of magic strings
- Filter `Suit.None` and `Rank.None` in iterations
- No type assertions: fix root type mismatches with proper type guards

### Key Enums
```typescript
enum PlayerId { Human = 'human', Bot1 = 'bot1', Bot2 = 'bot2', Bot3 = 'bot3' }
enum GamePhase { Dealing = 'dealing', Playing = 'playing', Scoring = 'scoring' }
enum TrickPosition { First = 'first', Second = 'second', Third = 'third', Fourth = 'fourth' }
enum PointPressure { LOW = 'low', MEDIUM = 'medium', HIGH = 'high' }
```

### File Organization
- `src/ai/` - AI strategic decision-making (20 focused modules)
- `src/game/` - Core game logic and rules
- `src/types/` - Type definitions with clean re-exports
- `src/utils/` - Domain-agnostic utilities
- `__tests__/` - Mirrors source code structure

### Logging
Use `gameLogger` instead of `console.log()`

## Git Workflow

> **IMPORTANT**: Never commit to main branch. Never commit automatically.

```bash
# 1. Create feature branch
git checkout -b ejfn/feature-name

# 2. Make changes and commit
git add . && git commit -m "Description"

# 3. Push and create PR
git push origin ejfn/feature-name -u
gh pr create --title "Title" --body "Description"
```

- Main branch is protected - requires PR approval
- Use descriptive branch names: `ejfn/fix-scoring`, `ejfn/add-tests`
- Always use `npx eas` for EAS CLI commands

## Testing

- Read existing tests first before writing new ones
- Always import enums at top of test files
- Use real initialization + targeted mocking
- No magic strings in test assertions
- Run typecheck before running tests

## Critical Domain Rules

### Multi-Combo Validation
Multi-combo validation involves **ALL OTHER THREE PLAYERS** (teammates + opponents combined):
- Multi-combo: Multiple combos from same suit played simultaneously
- Unbeatable: When ALL OTHER THREE PLAYERS cannot beat it with available cards
- Available cards = Total cards (108) - playedCards - currentPlayer'sHand
- Exhaustion Rule: Mixed-suit plays valid when player exhausts relevant suit

See [docs/MULTI_COMBO.md](docs/MULTI_COMBO.md) for complete documentation.

### Game Rules
- Unified Trick Structure: Access leading cards via `trick.plays[0].cards`
- Real-time Winner Tracking: Use `winningPlayerId` field (don't recalculate)
- Trump Group Unity: ALL trump cards treated as same suit for combinations
- Pure Computation: Separate calculations from state mutations

### Card Comparison
- `compareCards(cardA, cardB, trumpInfo)` - Direct card comparison (same suit/trump only)
- `evaluateTrickPlay(cards, trick, trumpInfo, hand)` - Trick context evaluation with cross-suit support

## Duplicate Function Prevention

Before writing ANY new function:
1. Search existing: `rg "functionName" --type ts`
2. Try importing first: `import { getComboType } from "./comboDetection"`
3. Use specific names for local helpers: `analyzeLocalComboStructure`

Generic names (`getComboType`, `validatePlay`) → **MUST be imports**
Local helpers → Use prefixes (`local`, `internal`, `analyze`)
