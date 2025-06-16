# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@README.md
@docs/AI_SYSTEM.md
@docs/GAME_RULES.md

## Project Overview

Tractor is a React Native Expo app implementing a single-player version of the Chinese card game Shengji (升级), also known as Tractor.

**Platform Support:** Mobile-only (iOS and Android). Currently tested on Android only.

*Game details in [Game Rules](docs/GAME_RULES.md) | AI system in [AI System](docs/AI_SYSTEM.md)*

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npx expo start

# Run on specific platforms
npm run android    # Start on Android
npm run ios        # Start on iOS

# Quality checks
npm run qualitycheck  # Runs typecheck, lint, and test
npm run lint          # Run ESLint
npm run typecheck     # Type checking
npm test              # Run tests
```

*Project structure and architectural highlights detailed in [README.md](README.md)*

## Development Guidelines

### File Organization Philosophy

The codebase is organized by **logical domain** rather than just file type:

- **`src/ai/`** - All AI-related modules for strategic decision-making
- **`src/game/`** - Core game logic, rules, and management systems  
- **`src/types/`** - Modular type definitions with clean re-exports
- **`src/utils/`** - True utilities that don't belong to specific domains
- **`__tests__/`** - Test structure mirrors source code organization

This structure makes it easy to:

- Find related functionality quickly
- Understand dependencies between modules
- Add new features in the right place
- Maintain clean separation of concerns

### Documentation Philosophy

The project uses a streamlined documentation approach:

- **README.md** - Project overview with accurate features and technology details
- **CLAUDE.md** - Comprehensive development guidelines (this file)
- **docs/AI_SYSTEM.md** - Complete AI intelligence documentation with decision trees and strategic flowcharts
- **docs/GAME_RULES.md** - Comprehensive rules reference with quick start guide for new players

This provides complete coverage while eliminating redundancy and maintenance overhead.

**Documentation Guidelines:**

- **README.md** should be scannable and focus on project overview and key features
- **CLAUDE.md** contains all development standards, architecture details, and coding guidelines
- **docs/AI_SYSTEM.md** for comprehensive AI system documentation including decision trees and strategic logic
- **docs/GAME_RULES.md** for complete game rules, quick start guide, and strategy reference
- **Single source of truth**: No duplicate content between files - each document has clear scope
- **Cross-references**: Link between documents rather than duplicating content

### Code Quality

Always run these checks before committing:

```bash
npm run qualitycheck  # Runs all checks
```

**CRITICAL QUALITY REQUIREMENTS:**
- **ALL TESTS MUST PASS**: The main branch has no existing failing tests. Any test failures introduced must be fixed.
- **NO LINT WARNINGS/ERRORS**: All ESLint warnings and errors must be resolved.
- **TYPECHECK MUST PASS**: No TypeScript compilation errors allowed.
- **Zero Tolerance Policy**: `npm run qualitycheck` must pass completely with no failures or warnings before any commit.

### Git Workflow

**IMPORTANT: The main branch is protected. All changes MUST go through pull requests.**

```bash
# 1. ALWAYS create a feature branch (format: {user}/{feature-name})
git checkout -b ejfn/add-new-feature

# 2. Make changes and commit
git add .
git commit -m "Your commit message"

# 3. Push to origin (NEVER push to main directly)
git push origin ejfn/add-new-feature -u

# 4. Create PR for review
gh pr create --title "Your PR title" --body "Description"
```

### Git Workflow Rules

🚨 **CLAUDE CODE AI: DO NOT COMMIT TO MAIN BRANCH!!!!** 🚨

- **NEVER commit or push directly to main branch**
- **ALWAYS create a feature branch for any changes**
- **ALWAYS create a pull request for code review**
- The main branch requires PR approval before merging
- Use descriptive branch names: `ejfn/fix-scoring`, `ejfn/add-tests`

### EAS CLI

EAS CLI is a project dependency. Always use `npx`:

```bash
npx eas update
npx eas build
npx eas --version
```

## Game Architecture

### Core Architecture Principles

- **Modular Game System**: 22 specialized modules organized by functional domain
- **Unified Trick Structure**: Single `plays` array eliminates data inconsistencies
- **Direct Imports**: Clean dependencies without re-export hubs
- **Pure Computation**: Separation of calculations from state mutations
- **Type Safety**: Strict TypeScript with zero tolerance for unsafe patterns

*Complete architecture details in [README.md](README.md)*

*Timing constants in `src/utils/gameTimings.ts` | UI layout details available as needed*

## Type Safety and Code Quality

⚠️ **CRITICAL**: This codebase enforces **STRICT TYPE SAFETY** with zero tolerance for unsafe patterns. All TypeScript compilation must pass with **ZERO ERRORS** and **ZERO WARNINGS**.

### Mandatory Parameter Enforcement ⚠️ CRITICAL

**NEVER make parameters optional when they should always be provided!** 

**✅ Correct Pattern - Mandatory Parameters:**
```typescript
// GOOD: trumpInfo is always required
export const getComboType = (cards: Card[], trumpInfo: TrumpInfo): ComboType => {
  // Implementation
}

// GOOD: All test calls provide required parameter
expect(getComboType(pair, trumpInfo)).toBe(ComboType.Pair);
```

**❌ Incorrect Pattern - False Optionals:**
```typescript
// BAD: Making trumpInfo optional when it's always needed
export const getComboType = (cards: Card[], trumpInfo?: TrumpInfo): ComboType => {
  // This leads to unsafe assumptions and runtime errors
}

// BAD: Non-null assertions to work around bad typing
expect(getComboType(pair, trumpInfo!)).toBe(ComboType.Pair);
```

**🚨 Rules for Parameter Design:**
- If a parameter is used in 100% of cases → Make it **MANDATORY**
- If a parameter has safe defaults → Provide **DEFAULT VALUES**
- If a parameter is contextual → Use **FUNCTION OVERLOADS**
- **NEVER use `?:` for parameters that are always provided**

### Interface vs Inline Types ⚠️ CRITICAL

**ALWAYS use defined interfaces instead of inline object types!**

**✅ Correct Pattern - Defined Interfaces:**
```typescript
// GOOD: Use existing interface
function processDeclaration(declaration: TrumpDeclarationStatus): void {
  // Implementation uses well-defined type
}

// GOOD: Return proper interface
function getDeclarationStatus(): TrumpDeclarationStatus {
  return gameState.trumpDeclarationState?.currentDeclaration;
}
```

**❌ Incorrect Pattern - Inline Objects:**
```typescript
// BAD: Returning inline object when interface exists
function getDeclarationStatus(): { suit: Suit; type: string; player: string } {
  // Duplicates existing TrumpDeclarationStatus interface
}

// BAD: Using inline types in parameters
function processDeclaration(declaration: { suit: Suit; type: string }): void {
  // Should use TrumpDeclarationStatus interface
}
```

### Null vs Undefined Discipline ⚠️ CRITICAL

**Be explicit about nullability patterns!**

**✅ Correct Patterns:**
```typescript
// GOOD: Explicit about what values are allowed
function processPlayer(player: Player | null): void {
  if (player === null) return;
  // Handle non-null player
}

// GOOD: Use proper type guards
function hasCards(hand: Card[] | undefined): hand is Card[] {
  return hand !== undefined && hand.length > 0;
}
```

**❌ Incorrect Patterns:**
```typescript
// BAD: Mixing null and undefined without clear pattern
function processPlayer(player?: Player | null): void {
  // Confusing - what does undefined vs null mean?
}

// BAD: Using non-null assertion instead of proper checking
function processCards(hand?: Card[]): void {
  hand!.forEach(card => /* unsafe */);
}
```

### Enum Filtering for Iterations ⚠️ CRITICAL

**ALWAYS filter out placeholder enum values in iterations!**

**✅ Correct Pattern - Filtered Iterations:**
```typescript
// GOOD: Filter out placeholder values
Object.values(Suit)
  .filter((suit) => suit !== Suit.None)
  .forEach((suit) => {
    // Only process real suits
  });

Object.values(Rank)
  .filter((rank) => rank !== Rank.None)
  .forEach((rank) => {
    // Only process real ranks
  });
```

**❌ Incorrect Pattern - Unfiltered Iterations:**
```typescript
// BAD: Includes placeholder values
Object.values(Suit).forEach((suit) => {
  // Creates invalid cards with Suit.None
  deck.push(Card.createCard(suit, rank, deckId));
});

Object.values(Rank).forEach((rank) => {
  // Creates invalid cards with Rank.None
  deck.push(Card.createCard(suit, rank, deckId));
});
```

**🚨 Mandatory Enum Filters:**
- `Suit.None` → Only for jokers, NEVER for deck creation
- `Rank.None` → Only for jokers, NEVER for deck creation
- **Always filter placeholder values in iterations**

### Type Assertion Prevention ⚠️ CRITICAL

**AVOID type assertions - fix root type mismatches instead!**

**✅ Correct Pattern - Proper Type Guards:**
```typescript
// GOOD: Proper conditional with type guard
if (!isLeading && leadingCombo && leadingCombo.length > 1 && trumpInfo) {
  const leadingComboType = getComboType(leadingCombo, trumpInfo);
  // Safe usage
}

// GOOD: Explicit validation
function processGameState(state: GameState | null): void {
  if (!state) throw new Error('GameState is required');
  // Proceed with guaranteed non-null state
}
```

**❌ Incorrect Pattern - Type Assertions:**
```typescript
// BAD: Non-null assertion
const leadingComboType = getComboType(leadingCombo, trumpInfo!);

// BAD: Type casting
const gameState = state as GameState;

// BAD: Any type escape hatch
const result = (someValue as any).doSomething();
```

### Interface Hierarchy Best Practices ⚠️ CRITICAL

**Design clear inheritance relationships!**

**✅ Correct Pattern - Clean Interface:**
```typescript
// GOOD: Single unified interface
interface GameContext {
  trumpInfo: TrumpInfo;
  currentPlayer: PlayerId;
  memoryContext?: MemoryContext; // Optional memory enhancement
}
```

**❌ Incorrect Pattern - Complex Hierarchy:**
```typescript
// BAD: Unnecessary inheritance complexity
interface GameContextBase {
  trumpInfo: TrumpInfo;
  currentPlayer: PlayerId;
}

interface GameContext extends GameContextBase {
  memoryContext?: MemoryContext;
}

// BAD: Type intersection when simple interface works
type GameContext = GameContextBase & { memoryContext?: MemoryContext };
```

### Quality Gates ⚠️ CRITICAL

**ALL TYPE SAFETY REQUIREMENTS MUST PASS:**

```bash
npm run qualitycheck  # MUST return with zero errors
```

**Zero Tolerance Policy:**
- ✅ **TypeCheck: PASSED** (0 errors) - MANDATORY
- ✅ **Lint: PASSED** (0 warnings) - MANDATORY  
- ✅ **Tests: PASSED** (all tests) - MANDATORY

**Any TypeScript compilation error or lint warning blocks development until resolved.**

### Enum Usage ⚠️ CRITICAL

**ALWAYS USE ENUMS INSTEAD OF MAGIC STRINGS!** The codebase uses TypeScript enums extensively to eliminate magic strings and ensure type safety:

```typescript
// Player identification - use instead of magic strings
enum PlayerId {
  Human = 'human',
  Bot1 = 'bot1', 
  Bot2 = 'bot2',
  Bot3 = 'bot3'
}

// Player display names
enum PlayerName {
  Human = 'You',
  Bot1 = 'Bot 1',
  Bot2 = 'Bot 2',
  Bot3 = 'Bot 3'
}

// Game phases - replaces string literals
enum GamePhase {
  Dealing = 'dealing',
  Declaring = 'declaring', 
  Playing = 'playing',
  Scoring = 'scoring',
  RoundEnd = 'roundEnd',
  GameOver = 'gameOver'
}

// AI Strategy Enums (Memory-Enhanced System)
enum TrickPosition {
  First = 'first',
  Second = 'second', 
  Third = 'third',
  Fourth = 'fourth'
}

enum PointPressure {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

enum PlayStyle {
  Conservative = 'conservative',
  Balanced = 'balanced',
  Aggressive = 'aggressive', 
  Desperate = 'desperate'
}

enum ComboStrength {
  Weak = 'weak',
  Medium = 'medium',
  Strong = 'strong',
  Critical = 'critical'
}
```

**⚠️ ALWAYS use enums instead of magic strings:**

- ✅ `PlayerId.Human` instead of `'human'`
- ✅ `GamePhase.Playing` instead of `'playing'`  
- ✅ `PlayerName.Bot1` instead of `'Bot 1'`
- ✅ `TrickPosition.First` instead of `'first'`
- ✅ `PointPressure.HIGH` instead of `'high'` or `'HIGH'`
- ✅ `PlayStyle.Aggressive` instead of `'aggressive'`
- ✅ `ComboStrength.Critical` instead of `'critical'`

**❌ NEVER use magic strings:**

- ❌ `'human'`, `'bot1'`, `'playing'`, `'high'`, `'aggressive'`
- ❌ String literals in conditional checks
- ❌ Hardcoded strings in function parameters
- ❌ String comparisons without enum references

**🔍 Common Enum Mistakes to Avoid:**

- Using `player.id === 'human'` instead of `player.id === PlayerId.Human`
- Returning `'aggressive'` instead of `PlayStyle.Aggressive` from functions
- Comparing with `pointPressure === 'HIGH'` instead of `pointPressure === PointPressure.HIGH`
- Hardcoding position strings like `'first'` instead of `TrickPosition.First`

### Testing Best Practices

- **Avoid unnecessary mocks**: Since Shengji has deterministic initialization, prefer using real `initializeGame` over mocking
- **⚠️ CRITICAL: Always import and use enums in tests**: Import all relevant enums at the top of test files
- **Use type-safe test utilities**: Never use magic strings in test assertions
- **Jest mock limitations**: Only mock what needs to be controlled for the specific test
- **Test realism**: Use actual game logic when possible for more realistic test coverage

**✅ Correct Test Enum Usage:**

```typescript
import { PlayerId, GamePhase, TrickPosition, PointPressure } from '../../src/types';

// Good
expect(gameState.currentPlayer).toBe(PlayerId.Human);
expect(context.trickPosition).toBe(TrickPosition.First);
expect(strategy.pointPressure).toBe(PointPressure.HIGH);

// Bad
expect(gameState.currentPlayer).toBe('human');
expect(context.trickPosition).toBe('first');
expect(strategy.pointPressure).toBe('HIGH');
```

```typescript
// Good: Use real initialization + targeted mocking
jest.mock('../../src/game/cardComparison', () => ({
  ...jest.requireActual('../../src/game/cardComparison'),
  compareCards: jest.fn() // Only mock what you need to control for tests
}));

// Good: Test validation errors for invalid usage
expect(() => {
  compareCards(aceClubs, fourDiamonds, trumpInfo);
}).toThrow('compareCards: Invalid comparison between different non-trump suits');

// Good: Use evaluateTrickPlay for cross-suit trick testing
const result = evaluateTrickPlay(proposedCards, currentTrick, trumpInfo, playerHand);
expect(result.canBeat).toBe(true);

// Avoid: Large mock objects that duplicate real code
```

## Technical Implementation

### Key Implementation Rules

- **Unified Trick Structure**: Leading cards accessed via `trick.plays[0].cards`
- **Real-time Winner Tracking**: `winningPlayerId` field tracks current trick winner
- **Trump Group Unity**: ALL trump cards treated as same suit for combinations
- **Pure Computation**: Separate calculations from state mutations

*Complete game rules and mechanics in [Game Rules](docs/GAME_RULES.md)*

### Card Comparison Functions ⚠️ CRITICAL

The codebase provides two distinct functions for card evaluation with strict usage requirements:

#### `compareCards(cardA, cardB, trumpInfo)` - Direct Card Comparison

**Purpose**: Compare two individual cards within the same suit or trump group

**Valid Usage**:
- ✅ Same suit cards: `compareCards(7♠, A♠, trumpInfo)`
- ✅ Trump vs non-trump: `compareCards(BigJoker, A♠, trumpInfo)`
- ✅ Both trump cards: `compareCards(2♠, SmallJoker, trumpInfo)`

**Invalid Usage** (throws error):
- ❌ Different non-trump suits: `compareCards(A♣, 4♦, trumpInfo)`
- ❌ Cross-suit pair comparison without trick context

**Protection**: Automatically validates and throws descriptive errors for invalid cross-suit non-trump comparisons.

#### `evaluateTrickPlay(cards, trick, trumpInfo, hand)` - Trick Context Evaluation

**Purpose**: Evaluate card plays within trick-taking game context

**Usage**:
- ✅ Trick winner determination across different suits
- ✅ Legal play validation (follow suit, combo type matching)
- ✅ Cross-suit play evaluation in trick context
- ✅ AI strategy decisions for trick competition

**Returns**: `{ canBeat: boolean, isLegal: boolean, strength: number, reason?: string }`

#### Development Guidelines

**When to use `compareCards`:**
- Sorting cards within the same suit
- Trump hierarchy evaluation
- Card strength comparison for same-suit scenarios

**When to use `evaluateTrickPlay`:**
- AI strategy decisions ("Can I beat this trick?")
- Cross-suit trick evaluation
- Legal play validation
- Any trick-taking game logic

**Error Message Guidance:**
```
compareCards: Invalid comparison between different non-trump suits: A♣ vs 4♦. 
Use evaluateTrickPlay() for cross-suit trick comparisons.
```

This protection ensures Shengji/Tractor game rule compliance and prevents invalid card comparisons that could lead to incorrect AI decisions or game logic bugs.

*AI implementation patterns and guidelines detailed in [AI System](docs/AI_SYSTEM.md)*

## Best Practices

- ⚠️ **CRITICAL**: Always import and use enums instead of magic strings
- 🚨 **NO SPECIAL CASE!!!!** - Always prefer general solutions over special case handling. Never add player-specific hacks or special case conditions to solve problems.
- **Import Strategy**: Use direct module imports instead of re-export hubs for cleaner dependencies
- **Modular Design**: Keep modules focused (150-300 lines) with single responsibilities
- Use modular imports from `src/types` index file for clean code
- Read file references with `file_path:line_number` format
- Prefer general solutions over special cases
- Maintain consistent player transitions
- Follow existing code conventions
- Import all relevant enums at the top of every file
- Use shared test utilities from `__tests__/helpers` for consistent testing
- Organize files by logical domain (ai/, game/, utils/) not just file type
- Keep README.md concise and direct detailed information to docs/ files
- Update documentation when adding new features or changing architecture
- Use real-time `winningPlayerId` tracking instead of calculating trick winners
- Avoid redundant winner determination functions
- **AI Strategy**: Use restructured 4-priority decision chain to avoid conflicts and rabbit holes
- **Point Card Strategy**: Implement strategic disposal avoiding point cards when opponent winning
- **Trump Conservation**: Use proper trump hierarchy with conservation values when AI cannot beat opponents
- **Low-Value Trick Handling**: Always use conservation logic for 0-4 point tricks to avoid wasting valuable cards
- **Debugging**: When AI behavior changes, check the priority chain order and handler logic
- **Testing**: Always include point card management and trump conservation in AI tests
- **Logging**: Use `gameLogger` for all logging instead of `console.log()` - provides structured logging with levels and context

## Hook Architecture

**Single-responsibility hooks with minimal interdependencies:**
- `useGameState` - Core game state management
- `useProgressiveDealing` - Unified dealing and trump declarations
- `useAITurns` - AI turn handling
- `useTrickResults` - Trick completion and display
- `useAnimations` - UI animations and timing

**RoundResult System:**
- Pure computation approach with `endRound()` and `prepareNextRound()`
- Separates calculations from state mutations for clean UI timing

## Automated Badge System

**Dynamic Test Count Badge**: The README test count badge automatically updates via the EAS workflow using the Dynamic Badges Action.

**How it works:**
- EAS workflow extracts test count from Jest output during quality checks
- Dynamic Badges Action updates a GitHub Gist with shield.io endpoint JSON
- README badge pulls from: `https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/ejfn/675aef37358f9f2b3b290cbf79440460/raw/tractor-test-count.json`

**Setup requirements:**
- `GIST_SECRET`: GitHub token with gist scope (repository secret)
- `GIST_ID`: GitHub gist ID for badge data storage (repository secret)
- Public gist with `tractor-test-count.json` filename

**Benefits:**
- ✅ Zero manual maintenance - badge updates automatically
- ✅ Always accurate - reflects actual test count from Jest
- ✅ Real-time updates - badge refreshes after workflow completion

## Development Memories

These are lessons learned and principles established through development experience on this project.

### Testing & Debugging

- **Bug reproduction**: When fixing a bug, always try to reproduce it with existing test or a debug test
- **Automated test count badge**: Test count badge automatically updates via EAS workflow using Dynamic Badges Action
- **Test realism**: Use actual game logic when possible for more realistic test coverage
- **API evolution**: When improving APIs, update tests to use the new, better patterns instead of creating legacy compatibility wrappers

### Code Architecture & Quality

- **No special handling**: Do not add any player-specific hacks into AI strategy or special case handling to solve problems
- **General solutions**: Prefer general solutions over special cases to maintain code consistency
- **Hook consolidation**: Always prefer single-responsibility hooks over multiple interdependent hooks
- **Circular dependencies**: Use refs and careful dependency management to avoid useCallback circular dependencies
- **Phase-specific AI handling**: Ensure AI detection hooks handle all relevant game phases (Playing AND KittySwap) to prevent bot players from getting stuck
- **Pure computation**: Use pure functions for complex calculations to improve testability and UI timing consistency
- **State timing**: When UI timing is critical, use refs to preserve state during modal displays and transitions
- **Unified data structures**: Maintain single source of truth for game state - eliminate dual fields that can become inconsistent
- **Modular AI organization**: Group AI logic by functional domain (following/, leading/, analysis/) rather than mixing strategies

### Type Safety Enforcement

- **Zero tolerance policy**: All TypeScript compilation must pass with 0 errors and 0 warnings - no exceptions
- **Mandatory parameters**: Never make parameters optional when they're always provided (e.g., `trumpInfo` in `getComboType`)
- **Interface over inline types**: Always use defined interfaces instead of inline object types for consistency
- **Proper enum filtering**: Always filter out placeholder values (`Suit.None`, `Rank.None`) in iterations to prevent invalid data
- **Type assertion elimination**: Avoid type assertions (`!`, `as`) - fix root type mismatches instead with proper type guards
- **Null vs undefined discipline**: Be explicit about nullability patterns and use consistent approaches
- **Clean inheritance hierarchies**: Design clear interface relationships instead of type intersection hacks
- **Parameter audit methodology**: Systematically review all function signatures to ensure proper type safety

### AI Development Patterns

- **Enum usage**: Always import and use enums instead of magic strings throughout AI code
- **Priority chains**: Use structured priority decision chains to avoid conflicts and rabbit holes
- **Strategic disposal**: Implement strategic disposal patterns that avoid wasting point cards when opponent is winning
- **Trump conservation**: Use proper trump hierarchy with conservation values when AI cannot beat opponents
- **Phase-specific timing**: Use appropriate delays for different game phases (1000ms for kitty swap vs 600ms for regular moves) to enhance user experience

### Memory System Implementation

The AI system now includes a **comprehensive memory-enhanced intelligence system** that tracks cards, analyzes patterns, and makes strategic decisions based on accumulated game knowledge.

#### **Core Memory Features**

- **Card Memory Tracking**: Complete tracking of played cards, estimated hand sizes, and suit void detection
- **Trump Exhaustion Analysis**: Dynamic trump depletion tracking with conservation value calculations  
- **Memory-Enhanced Trump Timing**: Optimal trump usage based on opponent trump exhaustion levels
- **Position-Specific Memory Queries**: Specialized memory analysis for 2nd, 3rd, and 4th player positions
- **Advanced Void Exploitation**: Sophisticated void detection with teammate vs opponent strategic differentiation
- **Point Card Timing Optimization**: Memory-based analysis for optimal point collection timing

#### **Memory System Architecture**

```typescript
// Core memory components
src/ai/aiCardMemory.ts           // Central memory tracking and analysis
src/ai/analysis/voidExploitation.ts    // Advanced void analysis and exploitation
src/ai/analysis/pointCardTiming.ts     // Memory-enhanced point timing optimization

// Position-specific enhancements
src/ai/following/secondPlayerStrategy.ts    // Partial information analysis
src/ai/following/thirdPlayerStrategy.ts     // Risk assessment with memory
src/ai/following/fourthPlayerStrategy.ts    // Perfect information + memory combination
```

#### **Memory-Enhanced Decision Making**

- **Guaranteed Winner Detection**: Uses card memory to identify cards certain to win based on played cards
- **Smart Teammate Void Strategy**: Analyzes when to lead teammate voids for point collection vs protection
- **Trump Conservation Hierarchy**: Dynamic conservation values based on trump exhaustion analysis
- **Memory-Based Point Priority**: Optimal point card selection using memory analysis and guaranteed winners
- **Void-Based Leading**: Strategic leading recommendations based on confirmed and probable voids

#### **Key Memory System Benefits**

- **Intelligence Enhancement**: 15-25% improvement in strategic decision quality through card tracking
- **Strategic Depth**: Complex void exploitation and point timing optimization
- **Team Coordination**: Smart teammate void analysis for optimal point collection
- **Trump Management**: Memory-enhanced trump conservation and timing
- **Test Coverage**: Comprehensive unit tests for all memory system components

#### **Memory System Development Lessons**

- **Modular Memory Integration**: Memory system cleanly integrates across 22 AI modules without architectural disruption
- **Smart Strategy Differentiation**: Teammate void strategy requires different logic than opponent void exploitation
- **Memory-Enhanced Testing**: Memory system enables more realistic AI testing with guaranteed winner scenarios
- **Type Safety in Memory**: Proper typing for memory contexts prevents runtime errors in complex card tracking
- **Conservation Value Hierarchy**: Trump conservation benefits from dynamic memory-based value calculations

### Major Refactoring Lessons

- **Trick Structure Unification**: Eliminated dual `leadingCombo`/`plays` fields that caused inconsistencies across 100+ files
- **AI Modularization**: Split monolithic AI files into 22 specialized modules organized by functional domain (following/, leading/, analysis/, etc.)
- **Game Logic Modularization**: Successfully broke down massive 1,844-line gameLogic.ts into focused, manageable modules
- **Re-export Hub Elimination**: Removed gameLogic.ts re-export pattern and updated 100+ files to use direct module imports for cleaner dependencies
- **Comprehensive Type Safety Overhaul**: Systematic elimination of 40+ TypeScript errors through mandatory parameter enforcement, enum filtering fixes, and interface discipline
- **Systematic Approach**: Large refactoring requires systematic file-by-file updates with comprehensive testing at each step
- **Test-Driven Validation**: Maintain 100% test coverage during refactoring to catch breaking changes immediately
- **Critical Bug Discovery**: Major refactoring often reveals hidden bugs (4th player skip, mixed combinations, hierarchical point avoidance, invalid card creation from `Rank.None`)
- **Performance Optimization**: Consolidating related logic improves performance and eliminates redundant function calls
- **Type Safety Benefits**: Unified structures improve TypeScript inference and eliminate type casting
- **Parameter Audit Value**: Systematic review of all function signatures reveals widespread unsafe optional patterns that should be mandatory
- **Direct Import Benefits**: Eliminating re-export hubs improves IDE navigation, reduces circular dependency risks, and makes import relationships explicit

### Game Rule Compliance Fixes

- **Trump Group Unification (Issue #176)**: Fixed fundamental game logic where trump cards were incorrectly separated by original suit instead of being treated as unified trump group
- **Root Cause**: `groupCardsBySuit` function was creating separate groups (`trump_Hearts`, `trump_Spades`) for trump rank cards, preventing cross-suit trump combinations
- **Solution**: Modified card grouping to treat ALL trump cards (jokers + trump rank cards + trump suit cards) as single "trump" group for combination formation
- **Impact**: AI now correctly forms trump rank pairs across suits (e.g., 2♠-2♥) and uses ALL trump pairs before ANY trump singles when following trump tractors
- **Rule Enforced**: "ALL trump cards are treated as the same suit when following trump leads" - fundamental Tractor/Shengji rule now properly implemented

### Project Management

- **Documentation sync**: Update documentation when adding new features or changing architecture
- **File naming**: Use descriptive names that reflect actual complexity (avoid "Simple" for sophisticated implementations)
- **Modular organization**: Organize files by logical domain (ai/, game/, utils/) rather than just file type
