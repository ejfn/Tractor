# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tractor is a React Native Expo app implementing a single-player version of the Chinese card game Shengji (升级), also known as Tractor. It's a trick-taking card game where players work in teams to advance through card ranks from 2 to Ace.

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
├── types/game.ts          # Core game type definitions
├── utils/                 # Game logic utilities
│   ├── gameLogic.ts       # Core mechanics and rules
│   ├── gamePlayManager.ts # Card play validation and tricks
│   ├── gameTimings.ts     # Animation timing constants
│   ├── aiLogic.ts         # AI decision making
│   └── trumpManager.ts    # Trump card management
├── hooks/                 # Custom React hooks
│   ├── useGameState.ts    # Core game state management
│   ├── useAITurns.ts      # AI turn handling
│   ├── useTrickResults.ts # Trick completion logic
│   └── useAnimations.ts   # Card animations
├── components/            # UI components
├── screens/               # Screen components
└── __tests__/             # Test files
```

## Development Guidelines

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

3. **Combination Rules**
   - **Singles**: Any card
   - **Pairs**: Two identical cards (same rank AND suit)
   - **Tractors**: Consecutive pairs of same suit
   - Special: SJ-SJ-BJ-BJ forms highest tractor

4. **Game Flow**
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
- Web platform disabled
- Centralized timing for predictable animations

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

## Best Practices

- Use Batch tool for multiple operations
- Read file references with `file_path:line_number` format
- Prefer general solutions over special cases
- Maintain consistent player transitions
- Follow existing code conventions
