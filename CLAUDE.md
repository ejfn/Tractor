# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@README.md
@docs/AI_SYSTEM.md
@docs/GAME_RULES.md

## Project Overview

Tractor is a React Native Expo app implementing a single-player version of the Chinese card game Shengji (升级), also known as Tractor. It's a trick-taking card game where players work in teams to advance through card ranks from 2 to Ace.

**Platform Support:** Mobile-only (iOS and Android). Currently tested on Android only.

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

## Project Structure

```
/src/
├── types/                 # Type definitions (modular organization)
│   ├── index.ts           # Main types re-export file
│   ├── core.ts            # Core game types and enums
│   ├── ai.ts              # AI strategy and intelligence types
│   ├── combinations.ts    # Advanced combination types
│   └── pointFocused.ts    # Point-focused strategy types
├── ai/                    # AI modules and strategy logic
│   ├── aiLogic.ts         # Core AI decision making
│   ├── aiGameContext.ts   # Game context analysis
│   ├── aiAdvancedCombinations.ts # Advanced combination analysis
│   ├── aiCardMemory.ts    # Card memory system (Phase 3)
│   └── aiPointFocusedStrategy.ts # Point-focused strategy
├── game/                  # Core game logic and management
│   ├── gameLogic.ts       # Core mechanics and rules
│   ├── gamePlayManager.ts # Card play validation and tricks
│   ├── gameRoundManager.ts # Round management and scoring
│   └── trumpManager.ts    # Trump card management
├── utils/                 # True utility functions
│   ├── cardAutoSelection.ts # Smart card selection logic
│   └── gameTimings.ts     # Animation timing constants
├── hooks/                 # Custom React hooks
│   ├── useGameState.ts    # Core game state management
│   ├── useAITurns.ts      # AI turn handling
│   ├── useTrickResults.ts # Trick completion logic
│   └── useAnimations.ts   # Card animations
├── components/            # UI components
├── screens/               # Screen components
└── styles/                # Shared styling
```

```
/__tests__/
├── ai/                    # AI module tests
├── game/                  # Game logic tests
├── components/            # UI component tests
├── utils/                 # Utility function tests
├── card-tracking/         # Card counting integration tests
├── game-flow/             # Game flow and interaction tests
├── game-state/            # Game state management tests
└── helpers/               # Test utilities (modular organization)
    ├── index.ts           # Main helpers re-export file
    ├── cards.ts           # Card creation utilities
    ├── players.ts         # Player and team utilities
    ├── gameStates.ts      # Game state scenarios
    ├── trump.ts           # Trump utilities
    ├── tricks.ts          # Trick utilities
    ├── ai.ts              # AI testing utilities
    └── mocks.ts           # Mock setup and assertions
```

```
/docs/
├── AI_SYSTEM.md           # Comprehensive AI intelligence documentation
├── AI_DECISION_TREE.md    # Detailed AI decision logic and strategic flowcharts
├── GAME_RULES.md          # Complete game rules and strategy guide
└── README.md              # Project overview (main entry point)
```

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

The project uses a modular documentation approach:
- **README.md** - Concise project overview and quick reference
- **CLAUDE.md** - Comprehensive development guidelines (this file)
- **docs/AI_SYSTEM.md** - Detailed AI intelligence system documentation
- **docs/AI_DECISION_TREE.md** - Visual decision flowcharts and strategic logic trees
- **docs/GAME_RULES.md** - Complete game rules and strategy guide

This keeps the main README clean while providing comprehensive documentation for developers and users.

**Documentation Guidelines:**
- **README.md** should be scannable and focus on what the project is and key features
- **CLAUDE.md** contains all development standards, architecture details, and coding guidelines
- **docs/AI_SYSTEM.md** for detailed AI system documentation and technical implementation
- **docs/AI_DECISION_TREE.md** for visual flowcharts and decision logic for each AI strategy
- **docs/GAME_RULES.md** for comprehensive game rules, strategy, and player guidance
- Never duplicate content between files - use cross-references instead

### Code Quality

Always run these checks before committing:

```bash
npm run qualitycheck  # Runs all checks
```

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

### Core Concepts

1. **State Management**
   - Managed through custom hooks in `/src/hooks/`
   - `GameState` type defines complete game state
   - State transitions preserve winning player on trick completion

2. **Card Mechanics**
   - Suits: Spades ♠, Hearts ♥, Clubs ♣, Diamonds ♦
   - Special cards: Big Joker, Small Joker
   - Points: 5s = 5pts, 10s and Kings = 10pts
   - Trump hierarchy: Big Joker > Small Joker > Trump rank in trump suit > Trump rank in other suits > Trump suit cards

3. **Smart Card Selection**
   - **Auto-selection**: Tapping a card automatically selects related cards to form optimal combinations
   - **When leading**: Prioritizes tractors over pairs for better play
   - **When following**: Auto-selects matching combination type if possible
   - **Toggle behavior**: Tap selected card again to deselect
   - **Fallback**: Single card selection when no combinations available
   - **Implementation**: `cardAutoSelection.ts` utility with combination detection logic

4. **Combination Rules**
   - **Singles**: Any card
   - **Pairs**: Two identical cards (same rank AND suit)
   - **Tractors**: Consecutive pairs of same suit
   - Special: SJ-SJ-BJ-BJ forms highest tractor

5. **Game Flow**
   - Phases: dealing → declaring → playing → scoring → gameOver
   - Teams alternate between defending and attacking
   - Trick winner leads next trick

### Implementation Philosophy

- Fail-fast approach for invalid states
- Centralized timing constants in `gameTimings.ts`
- No special case handling for specific players
- Synchronized state transitions
- Explicit error handling

### Timing Constants

```typescript
// Player move timings
AI_MOVE_DELAY = 600ms              // AI thinking animation
MOVE_COMPLETION_DELAY = 1000ms     // Time to see played cards

// Trick result display timings
TRICK_RESULT_DISPLAY_TIME = 1500ms // Trick result display
ANIMATION_COMPLETION_DELAY = 500ms // Post-animation delay

// Card animation timings
CARD_ANIMATION_FALLBACK = 1000ms   // Max animation wait

// UI interaction timings
CARD_SELECTION_DELAY = 250ms       // Human card selection feedback
ROUND_COMPLETE_BUFFER = 500ms      // Buffer after trick result
STATE_UPDATE_SYNC_DELAY = 100ms    // State update synchronization

// Animation loop timings
THINKING_DOTS_INTERVAL = 300ms     // Thinking dots animation loop
```

## UI Implementation

### Card Rendering

- Human cards: 65x95px (bottom)
- AI cards: 40x60px (top, left, right)
- Card backs: 3x3 grid with "T" emblem

### Player Layout (Counter-clockwise play order)

- **Human**: Bottom, no label, -40px overlap
- **Bot 1**: Right, rotated 270°, -48px vertical overlap
- **Bot 2**: Top, rotated 180°, -30px horizontal overlap
- **Bot 3**: Left, rotated 90°, -48px vertical overlap

### Performance Optimizations

- React Native rendering flags enabled
- Minimal shadows
- Single AI strategy (no difficulty settings)
- Mobile-only platform (web support completely removed)
- Centralized timing for predictable animations

## Type Safety and Code Quality

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

// AI Strategy Enums (Phases 1-3)
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
- **Jest debugging**: Use `silent: true|false` in `jest.config.js` to control console output during test debugging

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
jest.mock('../../src/game/gameLogic', () => ({
  ...jest.requireActual('../../src/game/gameLogic'),
  determineTrickWinner: jest.fn() // Only mock what you need to control
}));

// Avoid: Large mock objects that duplicate real code
```

## Technical Notes

### Trick Completion Flow

1. All 4 players play cards
2. Determine winner, store in `winningPlayerIndex`
3. Display trick result for 2 seconds
4. Clear table
5. Winner leads next trick

### Card Suit Ordering

Trump suit rotates to first position while maintaining alternating black-red pattern:

- No trump: ♠ ♥ ♣ ♦
- Hearts trump: ♥ ♣ ♦ ♠
- Clubs trump: ♣ ♦ ♠ ♥
- Diamonds trump: ♦ ♠ ♥ ♣
- Spades trump: ♠ ♥ ♣ ♦

### Important Rules

- Different suits never form pairs/tractors
- Trump combos beat non-trump combos of same type
- Leading player's cards stored in `trick.leadingCombo`
- Trick plays array contains (players.length - 1) plays
- Always block AI moves during trick result display

## AI Implementation Guidelines (Phases 1-3)

### AI Enum Usage ⚠️ MANDATORY

When working with AI systems, **ALWAYS use the following enums**:

```typescript
// Context and Strategy
const context = createGameContext(gameState, playerId);
if (context.playStyle === PlayStyle.Aggressive) {  // ✅ CORRECT
  // AI logic here
}

// Position-based decisions
if (context.trickPosition === TrickPosition.First) {  // ✅ CORRECT
  return selectLeadingPlay(combos, trumpInfo, context);
}

// Point pressure checks
if (context.pointPressure === PointPressure.HIGH) {  // ✅ CORRECT
  return selectDesperatePlay(combos);
}

// Combo strength evaluation
if (analysis.strength === ComboStrength.Critical) {  // ✅ CORRECT
  preserveForEndgame = true;
}
```

**❌ NEVER do this in AI code:**
```typescript
// Wrong - magic strings
if (context.playStyle === 'aggressive') { }          // ❌ BAD
if (context.trickPosition === 'first') { }           // ❌ BAD  
if (context.pointPressure === 'HIGH') { }            // ❌ BAD
if (analysis.strength === 'critical') { }            // ❌ BAD
```

### AI Memory System Usage

When working with Phase 3 memory features:

```typescript
// Correct memory pattern usage
if (pattern.cardType === 'trump') {                   // ✅ String literal OK here
  pattern.situation = `leading_${pattern.cardType}`;  // ✅ Template literal OK
}

// Memory strategy checks
if (memoryStrategy?.endgameOptimal) {                 // ✅ Boolean check
  return selectEndgameOptimalPlay(combos, context, trumpInfo);
}
```

## Best Practices

- ⚠️ **CRITICAL**: Always import and use enums instead of magic strings
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