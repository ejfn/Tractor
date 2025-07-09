# GEMINI.md

This file provides essential guidance for developing in the Tractor repository. It outlines key standards, architectural principles, and development workflows.

## 1. Project Overview & Documentation

Tractor is a React Native implementation of the classic Chinese card game Shengji (升级). For a full overview of features and technology, please see the [README.md](README.md).

All detailed documentation is located in the `docs/` folder.

- **[Game Rules](docs/GAME_RULES.md)**: Complete rules, quick start, and strategy reference.
- **[AI System](docs/AI_SYSTEM.md)**: Comprehensive AI intelligence documentation.
- **[Multi-Combo System](docs/MULTI_COMBO.md)**: Complete multi-combo implementation guide.
- **[Reporting and Analysis](docs/REPORTING_AND_ANALYSIS.md)**: Guide to the project's reporting and analysis tools.
- **[Log Event Schema](docs/LOG_EVENT_SCHEMA.md)**: Detailed schema for log events.
- **[Versioning Strategy](docs/VERSIONING_STRATEGY.md)**: Project versioning strategy.

## 2. Quick Start

```bash
# Install dependencies
npm install

# Start development server
npx expo start

# Run on specific platforms
npm run android
npm run ios

# Run all quality checks (types, lint, tests)
npm run qualitycheck
```

## 3. Core Development Guidelines

### Git Workflow

**The `main` branch is protected. DO NOT commit directly to `main`.**

1.  **Create a feature branch**: `git checkout -b {user}/{feature-name}` (e.g., `ejfn/add-new-feature`).
2.  **Commit your changes**.
3.  **Push to your branch**: `git push origin {branch-name}`.
4.  **Create a Pull Request** for review.

### Code Quality

This project enforces a **zero-tolerance policy** for quality issues. Before committing, ensure your changes pass all checks:

```bash
npm run qualitycheck
```

- **ALL TESTS MUST PASS**
- **NO LINT WARNINGS/ERRORS**
- **TYPECHECK MUST PASS**

### Type Safety

Strict type safety is mandatory. Key principles include:
- **Use Enums, Not Strings**: Always use enums (`PlayerId`, `GamePhase`, etc.) instead of magic strings.
- **Mandatory Parameters**: If a function parameter is always used, it must be mandatory. Do not use `?` for required parameters.
- **No Type Assertions**: Avoid `!` and `as`. Fix the root type mismatch instead of using assertions.
- **Filter Enum Iterations**: Always filter out placeholder values like `Suit.None` or `Rank.None` when iterating over enums.

### Architecture & Best Practices
- **Modular Design**: The codebase is organized by logical domain (`src/ai`, `src/game`). Keep modules focused with single responsibilities.
- **Direct Imports**: Use direct module imports instead of re-export hubs for cleaner dependencies.
- **Unified Trick Structure**: The game state uses a single `plays` array in the current trick to avoid data inconsistencies.
- **Pure Computation**: Separate calculations from state mutations where possible.
- **No Duplicate Functions**: Before adding a new function, search the codebase to ensure it doesn't already exist.

## 4. Critical Technical Concepts

### Multi-Combo Validation
A "multi-combo" is a play of multiple combinations from the same suit. A lead is only valid if **each component is unbeatable by ALL other three players combined**. For full details, see the [Multi-Combo Documentation](docs/MULTI_COMBO.md).

### `compareCards` vs. `evaluateTrickPlay`
- `compareCards`: Use for direct comparison of two cards in the **same suit or trump group**. Throws an error for cross-suit comparisons.
- `evaluateTrickPlay`: Use for all trick-taking logic where cards can be from **different suits**.

## 5. Commit Message Signature

When creating a commit message or pull request, append the following signature at the end:

```
Generated with [Gemini](https://gemini.google.com)
Co-authored-by: Gemini <noreply@google.com>
```
