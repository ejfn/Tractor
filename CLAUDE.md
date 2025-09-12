# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

@README.md | @docs/AI_SYSTEM.md | @docs/GAME_RULES.md | @docs/MULTI_COMBO.md | @docs/LOG_EVENT_SCHEMA.md

## Project Overview

Tractor is a React Native Expo app implementing the Chinese card game Shengji (升级/Tractor) with AI opponents.

**Platform**: Mobile-only (iOS and Android). Currently tested on Android.  
**Stack**: React Native + Expo, TypeScript, React i18next, Jest

*Complete details in linked documentation above*

## 🚨 CRITICAL MULTI-COMBO RULES 🚨

**Multi-combo validation involves ALL OTHER THREE PLAYERS (teammates + opponents combined)**

### Core Concepts
- **Multi-combo**: Multiple combos from same suit played simultaneously
- **Unbeatable**: When ALL OTHER THREE PLAYERS cannot beat it with available cards  
- **Available cards** = Total cards (108) - playedCards - currentPlayer'sHand
- **Exhaustion Rule**: Mixed-suit plays valid when player exhausts relevant suit

### Examples
- ✅ `A♥ + K♥ + Q♥` = Multi-combo (3 singles from Hearts)
- ✅ `A♥A♥ + K♥` = Multi-combo (pair + single from Hearts)
- ✅ `A♥A♥-K♥K♥` → Always unbeatable (highest possible 2-pair tractor)
- ⚠️ `10♥10♥-9♥9♥` → Possibly beatable if `K♥K♥-Q♥Q♥` available to others

*Complete system documentation in [Multi-Combo](docs/MULTI_COMBO.md)*

## Quick Start

```bash
# Install and run
npm install
npx expo start

# Quality checks (REQUIRED before commits)
npm run qualitycheck  # Runs typecheck, lint, and test
npm run android       # Android platform
npm run ios          # iOS platform

# Analysis and reporting
uv run analysis/bigquery_main.py setup   # Setup BigQuery infrastructure
uv run analysis/bigquery_main.py upload  # Upload logs to BigQuery
uv run analysis/bigquery_main.py analyse # BigQuery analysis (for production)
```

## Development Guidelines

### 🚨 CRITICAL: Git Workflow Rules
**NEVER commit code until explicitly asked to do so**

Claude must only commit changes when the user explicitly requests it. This includes:
- ❌ **Never** commit automatically after making code changes
- ❌ **Never** commit as part of "completing" a task
- ✅ **Only** commit when user says "commit" or "commit these changes"
- ✅ **Always** ask before committing if unclear

### File Organization
**Organized by logical domain:**
- `src/ai/` - AI strategic decision-making (20 focused modules)
- `src/game/` - Core game logic and rules
- `src/types/` - Type definitions with clean re-exports
- `src/utils/` - Domain-agnostic utilities
- `__tests__/` - Mirrors source code structure

### Documentation Strategy
- **README.md** - Project overview and key features
- **CLAUDE.md** - Development guidelines (this file)
- **docs/** - Specialized documentation (AI, game rules, multi-combo system)
- **Single source of truth** - No duplicate content between files

### Complete Documentation Reference
- **[README.md](README.md)** - Project overview, features, and quick start
- **[docs/AI_SYSTEM.md](docs/AI_SYSTEM.md)** - Comprehensive AI intelligence documentation
- **[docs/GAME_RULES.md](docs/GAME_RULES.md)** - Complete game rules and strategy guide
- **[docs/MULTI_COMBO.md](docs/MULTI_COMBO.md)** - Multi-combo implementation guide
- **[docs/LOG_EVENT_SCHEMA.md](docs/LOG_EVENT_SCHEMA.md)** - Log event structure documentation

### Git Workflow
🚨 **NEVER COMMIT TO MAIN BRANCH** 🚨

**Required workflow:**
```bash
# 1. Create feature branch
git checkout -b ejfn/feature-name

# 2. Make changes and commit  
git add . && git commit -m "Description"

# 3. Push and create PR
git push origin ejfn/feature-name -u
gh pr create --title "Title" --body "Description"
```

**Rules:**
- Main branch is protected - requires PR approval
- Use descriptive branch names: `ejfn/fix-scoring`, `ejfn/add-tests`
- Always use `npx eas` for EAS CLI commands

## Architecture Overview

### Core Principles
- **Modular Design**: 20 AI modules + focused game modules
- **Unified Trick Structure**: Single `plays` array eliminates inconsistencies  
- **Direct Imports**: Clean dependencies without re-export hubs
- **Pure Computation**: Separation of calculations from state mutations
- **Strict Type Safety**: Zero tolerance for unsafe TypeScript patterns

### Key Systems
- **Game State Persistence**: Auto-save/restore with AsyncStorage
- **Memory-Enhanced AI**: Card tracking with guaranteed winner detection
- **Multi-Combo System**: Complex combination validation and strategy
- **Internationalization**: English/Chinese with type-safe translations

*Complete details in [README.md](README.md) and docs/ folder*

## Type Safety & Code Standards

⚠️ **STRICT TYPE SAFETY** - Zero tolerance for unsafe patterns

### Critical Rules
1. **Mandatory Parameters**: Never make parameters optional when always provided
2. **Use Defined Interfaces**: No inline object types when interfaces exist  
3. **Enum Usage**: Always use enums instead of magic strings
4. **Filter Enums**: Always filter `Suit.None` and `Rank.None` in iterations
5. **No Type Assertions**: Fix root type mismatches with proper type guards
6. **Clean Interfaces**: Simple unified interfaces over complex hierarchies

### Enum Examples
```typescript
// ✅ GOOD: Use enums
PlayerId.Human, GamePhase.Playing, TrickPosition.First

// ❌ BAD: Magic strings  
'human', 'playing', 'first'
```

### Key Enums
```typescript
enum PlayerId { Human = 'human', Bot1 = 'bot1', Bot2 = 'bot2', Bot3 = 'bot3' }
enum GamePhase { Dealing = 'dealing', Playing = 'playing', Scoring = 'scoring' }
enum TrickPosition { First = 'first', Second = 'second', Third = 'third', Fourth = 'fourth' }
enum PointPressure { LOW = 'low', MEDIUM = 'medium', HIGH = 'high' }
```

### Testing Best Practices
- **Read existing tests first** before writing new ones
- **Always import enums** at top of test files
- **Use real initialization** + targeted mocking
- **No magic strings** in test assertions
- **Run typecheck** before running tests

## Technical Implementation

### Core Game Rules  
- **Unified Trick Structure**: Access leading cards via `trick.plays[0].cards`
- **Real-time Winner Tracking**: Use `winningPlayerId` field (don't recalculate)
- **Trump Group Unity**: ALL trump cards treated as same suit for combinations
- **Pure Computation**: Separate calculations from state mutations

### Card Comparison Functions ⚠️ CRITICAL

**`compareCards(cardA, cardB, trumpInfo)`** - Direct card comparison
- ✅ Same suit or trump group only
- ❌ Cross-suit non-trump comparison (throws error)

**`evaluateTrickPlay(cards, trick, trumpInfo, hand)`** - Trick context evaluation  
- ✅ Cross-suit trick evaluation, legal play validation, AI decisions
- Returns: `{ canBeat: boolean, isLegal: boolean, strength: number }`

## Best Practices

### Core Principles
- 🚨 **NO SPECIAL CASES** - Always prefer general solutions over player-specific hacks
- **Direct Imports** - No re-export hubs for cleaner dependencies  
- **Modular Design** - Keep modules focused (150-300 lines) with single responsibilities
- **Use Enums** - Always import and use enums instead of magic strings
- **File References** - Use `file_path:line_number` format when referencing code

### AI Strategy Guidelines
- **4-Priority Decision Chain** - Avoid conflicts and rabbit holes
- **Point Card Strategy** - Strategic disposal avoiding point cards when opponent winning
- **Trump Conservation** - Use hierarchy with conservation values
- **Memory System** - Leverage card tracking for guaranteed winner detection

### Development Standards
- **Logging** - Use `gameLogger` instead of `console.log()` (see [Log Event Schema](docs/LOG_EVENT_SCHEMA.md))
- **Testing** - Include point card management and trump conservation in AI tests
- **Documentation** - Update when adding features or changing architecture

### 🚨 CRITICAL: Duplicate Function Prevention

**NEVER create duplicate functions** - causes subtle validation bugs

**Before writing ANY new function:**
1. Search existing: `rg "functionName" --type ts`
2. Try importing first: `import { getComboType } from "./comboDetection"`
3. Use specific names for local helpers: `analyzeLocalComboStructure`

**Naming Rules:**
- Generic names (`getComboType`, `validatePlay`) → **MUST be imports**
- Local helpers → Use prefixes (`local`, `internal`, `analyze`)

```bash
# Pre-commit check for duplicates
rg "export\s+(function|const)\s+(\w+)" -o | sort | uniq -d
```

## Additional Systems

### Internationalization (i18n)
- **Languages**: English (primary), Chinese (Traditional/Simplified)
- **Type-Safe Hooks**: `useCommonTranslation()`, `useGameTranslation()`, etc.
- **Auto-Detection**: Device locale with persistent user preferences
- **Namespaces**: `common`, `game`, `trumpDeclaration`, `modals`

### Hook Architecture
**Single-responsibility hooks:**
- `useGameState` - Core state management + integrated persistence
- `useProgressiveDealing` - Unified dealing and trump declarations  
- `useAITurns` - AI turn handling
- `useTrickResults` - Trick completion and display
- `useTranslation` - Type-safe internationalization

### Automated Badge System
**Dynamic test count badge** auto-updates via EAS workflow:
- Extracts Jest test count during quality checks
- Updates GitHub Gist with shield.io endpoint JSON
- Zero maintenance, always accurate

## Development Lessons

### Key Insights from Project Evolution

**Architecture Lessons:**
- **Modular AI Design**: Split 1,844-line monolithic file into 20 focused modules organized by domain
- **Unified Data Structures**: Eliminate dual fields (`leadingCombo`/`plays`) that cause inconsistencies
- **Direct Imports**: Remove re-export hubs for cleaner dependencies and IDE navigation
- **Pure Computation**: Separate calculations from state mutations for testability

**Type Safety Enforcement:**
- **Zero Tolerance**: All TypeScript compilation must pass with 0 errors/warnings
- **Mandatory Parameters**: Never make parameters optional when always provided
- **Systematic Parameter Audit**: Review all function signatures to eliminate unsafe patterns

**AI Development Patterns:**
- **4-Priority Decision Chain**: Structured approach avoids conflicts and rabbit holes
- **Memory-Enhanced Intelligence**: 15-25% improvement through card tracking and guaranteed winner detection  
- **Trump Conservation Hierarchy**: Dynamic values based on exhaustion analysis
- **Position-Specific Logic**: Specialized strategies for 2nd, 3rd, 4th player positions

**Critical Bug Fixes:**
- **Trump Group Unification**: Fixed fundamental rule where trump cards incorrectly separated by suit
- **Multi-Combo Validation**: ALL OTHER THREE PLAYERS logic (not just opponents)
- **Exhaustion Rule**: Mixed-suit plays valid when player exhausts relevant suit

**Persistence System:**
- **Auto-Save Strategy**: Phase changes, round transitions, trick completions, player turns
- **Card Deserialization**: Maintains class methods after JSON parsing
- **Version Management**: Simple numeric versioning with automatic fallback

**Major Refactoring Benefits:**
- **Test-Driven Validation**: Maintain 100% coverage during large changes
- **Systematic Approach**: File-by-file updates with comprehensive testing
- **Performance Gains**: Consolidating logic eliminates redundant function calls

## Test Development Insights

### Testing Best Practices
- **Always check existing tests to learn what patterns and helpers are available when making new tests**
```