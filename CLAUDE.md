# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tractor is a React Native Expo app that implements a single-player version of the Chinese card game Shengji (升级), also known as Tractor. It's a trick-taking card game where players work in teams to advance through card ranks from 2 to Ace. The game uses concepts like trumps, combinations of cards, and strategic play.

## Commands

### Development

```bash
# Install dependencies
npm install

# Start the development server
npx expo start

# Run on specific platforms
npm run android  # Start on Android
npm run ios      # Start on iOS

# Linting
npm run lint

# Type checking
npm run typecheck
```

### Project Structure

- `/src/types/game.ts` - Core game type definitions
- `/src/utils/gameLogic.ts` - Game mechanics and rule implementation
- `/src/utils/aiLogic.ts` - AI player decision making
- `/src/components/` - React components for game UI elements
- `/src/screens/` - Screen components (GameScreen, EnhancedGameScreen)
- `/app/` - Expo Router app routing

## Core Game Architecture

The game implements the following key concepts:

1. **Game State Management**
   - The game state is managed through React state in `EnhancedGameScreen.tsx`
   - The `GameState` type defines the complete state of the game

2. **Card Mechanics**
   - Cards have suits, ranks, and jokers
   - Cards have point values (5s = 5 points, 10s and Ks = 10 points)
   - Trump cards are determined by a trump rank and optionally a trump suit
   - Trump cards follow a hierarchy: Big Jokers > Small Jokers > Trump rank in trump suit > Trump rank in other suits > Trump suit cards

3. **Combo Types and Rules**
   - Singles: Any card can be played as a single
   - Pairs: Two identical cards (same rank AND same suit), including joker pairs (SJ-SJ, BJ-BJ)
   - Tractors: Consecutive pairs of the same suit (e.g., 7♥-7♥-8♥-8♥)
   - Special rules:
     - Cards of same rank but different suits do NOT form pairs or tractors
     - Trump cards of different levels don't form tractors with each other
     - SJ-SJ-BJ-BJ forms a special tractor (the most powerful combo)
     - Any trump combo beats any non-trump combo of the same type and length

4. **Game Flow**
   - Phases: dealing, declaring, playing, scoring, gameOver
   - Players take turns playing cards following specific combination rules
   - Teams (A and B) alternate between defending and attacking

5. **AI Logic**
   - AI players use advanced strategy logic (no difficulty settings)
   - AI makes strategic decisions about card play and trump declaration
   - AI analyzes trick points, partner position, and remaining cards

## Development Notes

- The project uses TypeScript with strict type checking
- UI is built with React Native components
- Animations use React Native's Animated API
- The project follows Expo's recommended structure and configuration
- Optimized for mobile platforms (especially Android)
- Web platform support is disabled for better performance focus

## Quality Checks

Before committing changes, always run:

```bash
# Check for linting issues
npm run lint

# Check for type errors
npm run typecheck
```

Ensure that you address all errors before committing. You may see linting warnings, but they should not be increased from baseline. For tests, run:

```bash
# Run tests
npm test
```

## UI Implementation Details

### Card Rendering

- Human player cards: 65x95px size, displayed at the bottom of the screen
- AI player cards: 40x60px size (reduced from 50x75px), displayed around the table (top, left, right)
- Cards use a simplified 3x3 grid pattern for card backs with a centered "T" emblem
- Each AI player shows up to 10 stacked cards
- Jokers have no border and use smaller "JOKER" text
- Popup card in the play area has standard size with white border

### Player Layout

- **Top Player (Bot 2)**:
  - Cards displayed horizontally, stacked left to right with -30px overlap
  - Cards rotated 180° to face downward toward the center
  - Shown with a small label "Bot 2" and card count

- **Left Player (Bot 1)**:
  - Cards displayed vertically, stacked top to bottom with -48px overlap
  - Cards rotated 90° to face right/center
  - Shown with a small label "Bot 1" and card count

- **Right Player (Bot 3)**:
  - Cards displayed vertically, stacked bottom to top with -48px overlap
  - Cards rotated 270° to face left/center
  - Shown with a small label "Bot 3" and card count

- **Human Player**:
  - No label (obvious from position at the bottom)
  - Cards with -40px overlap for compact display
  - Selected cards rise by 10px with no z-index change

### Team Status Display

- Displayed in the top corners of the play area
- **Defending Team (Team A)**: Left corner with shield icon (🛡️)
- **Attacking Team (Team B)**: Right corner with sword icon (⚔️)
- Both have consistent height with point display for attacking team

### Play Area Layout

- Cards are positioned in four regions, one for each player:
  - Top: Cards played by the top player
  - Left: Cards played by the left player
  - Right: Cards played by the right player
  - Bottom: Cards played by the human player
- Trump/kitty card in center with reduced opacity

### Animation Implementation

- Card movement animations use React Native's Animated API with spring physics
- Animations include position, rotation, scale bounce, and fade
- Played cards animate from player's hand to their respective area on the table
- Animation uses enhanced parameters for natural motion:
  - friction: 8.5
  - tension: 50
  - velocity: 3

### Performance Optimizations

- Rendering optimizations with React Native flags:
  - backfaceVisibility: 'hidden'
  - shouldRasterizeIOS: true
  - renderToHardwareTextureAndroid: true
- Minimal shadow effects for better performance
- Careful management of z-index for proper stacking
- Web platform support disabled to focus on mobile performance
- Removing web-specific styling code for cleaner implementation
- Single AI strategy implementation (no difficulty switching) for simplicity

### Card Suit Ordering Logic

The game uses a rotated suit ordering system that maintains an alternating black-red pattern while prioritizing the trump suit:

1. The base suit order is: Spades ♠ (black), Hearts ♥ (red), Clubs ♣ (black), Diamonds ♦ (red)

2. When a suit is declared as trump, the ordering rotates to put the trump suit first while maintaining the alternating color pattern:
   - No trump declared: Spades, Hearts, Clubs, Diamonds
   - Clubs is trump: Clubs, Diamonds, Spades, Hearts
   - Diamonds is trump: Diamonds, Spades, Hearts, Clubs
   - Hearts is trump: Hearts, Clubs, Diamonds, Spades
   - Spades is trump: Spades, Hearts, Clubs, Diamonds

3. The implementation in `PlayerHandAnimated.tsx` rotates the standard suit order by:
   - Finding the index of the trump suit in the standard order
   - Slicing the array to place the trump suit and all suits after it at the beginning
   - Followed by all suits that came before the trump suit in the standard ordering

4. This rotation applies to both:
   - Main suit group ordering (lines 82-109)
   - Ordering within the trump rank cards (lines 62-88)

This approach ensures the player's hand is organized with:

1. Jokers first (Big, then Small)
2. Trump cards next (trump rank cards, then trump suit cards)
3. Remaining suits in rotated order to maintain alternating black-red pattern
