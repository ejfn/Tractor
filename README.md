# Tractor Card Game

A React Native implementation of the Chinese card game Shengji (升级), also known as Tractor. This is a trick-taking card game where players work in teams to advance through card ranks.

![Mobile Only](https://img.shields.io/badge/Platform-Mobile%20Only-red)
![React Native](https://img.shields.io/badge/React%20Native-Expo-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-green)

## Game Features

- Single-player game against 3 AI opponents with advanced strategy
- 2 teams: Team A (you + Bot 2) vs Team B (Bot 1 + Bot 3)
- Trick-taking gameplay with trump cards
- Visual card animations and modern UI
- Special handling for jokers and trump cards
- Optimized for mobile (especially Android) experience

## Quick Start

> ⚠️ **IMPORTANT: This is a mobile-only application!**  
> Tractor is designed exclusively for Android and iOS devices. It will not work in web browsers.

```bash
# Install dependencies
npm install

# Start on Android
npm run android

# Start on iOS
npm run ios

# Or use Expo CLI
npx expo start  # Press 'a' for Android or 'i' for iOS
```

## Game Rules

### Basic Gameplay

- 4 players divided into 2 teams (A and B)
- One team defends while the other attacks
- Trump cards determined by rank and optionally suit
- Points scored by capturing 5s (5 points), 10s and Kings (10 points)
- Objective: capture cards and advance through ranks (2 to Ace)

### Trump Hierarchy

From highest to lowest:

1. **Big Jokers**
2. **Small Jokers**
3. **Trump rank in trump suit** (e.g., 2♥ when 2 is trump and Hearts is trump suit)
4. **Trump rank in other suits** (e.g., 2♦, 2♣, 2♠)
5. **Trump suit cards** (all other Hearts when Hearts is trump)

### Card Combinations

#### Singles
- Any single card
- Trump cards beat non-trump singles

#### Pairs
- Two identical cards (same rank AND same suit)
- Valid: 8♥-8♥, SJ-SJ, BJ-BJ
- Invalid: 8♥-8♦ (different suits), SJ-BJ (different jokers)

#### Tractors
- Consecutive pairs of the same suit
- Valid: 7♥-7♥-8♥-8♥
- Special: SJ-SJ-BJ-BJ (highest tractor)
- Invalid: 
  - Different suits (7♥-7♥-8♠-8♠)
  - Non-consecutive (A-A-2-2)
  - Trump ranks when one is trump (2♥-2♥-3♥-3♥ when 2 is trump)

## Development

### Commands

```bash
npm run lint          # Run ESLint
npm run typecheck     # TypeScript checks
npm run test          # Run tests
npm run qualitycheck  # Run all checks (typecheck + lint + test)
```

### Project Structure

```
/src/
├── types/            # Type definitions
├── utils/            # Game logic
├── hooks/            # Custom React hooks
├── components/       # UI components
├── screens/          # Screen components
└── __tests__/        # Test files

/app/                 # Expo Router configuration
/docs/                # Additional documentation
```

### Key Files

- `src/types/game.ts` - Core game types
- `src/utils/gameLogic.ts` - Game mechanics
- `src/utils/aiLogic.ts` - AI strategy
- `src/hooks/useGameState.ts` - State management
- `src/screens/GameScreenController.tsx` - Main game controller

## Documentation

For detailed information, see the [docs folder](./docs/):

- [Architecture](./docs/ARCHITECTURE.md) - Component structure
- [Testing](./docs/TESTING.md) - Test coverage
- [Mobile Only](./docs/MOBILE_ONLY.md) - Platform details
- [Known Issues](./docs/KNOWN_ISSUES.md) - Current bugs

## Technology Stack

- **React Native** with Expo
- **TypeScript** with strict checking
- **Animated API** for card animations
- **Expo Router** for navigation
- **Jest** & React Testing Library
- **EAS** for builds and updates

## Requirements

- Node.js 18+ 
- npm 9+
- iOS Simulator (Mac) or Android Emulator
- Expo CLI (`npx expo`)

## Contributing

1. Create a feature branch: `{user}/{feature-name}`
2. Make changes and test thoroughly
3. Run `npm run qualitycheck`
4. Submit a pull request

## License

[Add your license here]

## Acknowledgments

- Original Shengji/Tractor card game
- React Native and Expo teams
- Contributors and testers