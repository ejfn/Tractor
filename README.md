# Tractor Card Game

A React Native implementation of the Chinese card game Shengji (升级), also known as Tractor. This is a trick-taking card game where players work in teams to advance through card ranks from 2 to Ace.

![Mobile Only](https://img.shields.io/badge/Platform-Mobile%20Only-red)
![React Native](https://img.shields.io/badge/React%20Native-Expo-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-green)
![Tests](https://img.shields.io/badge/Tests-192%20Passing-brightgreen)

## ✨ Game Features

### Core Gameplay
- **Single-player** against 3 AI opponents with advanced strategy
- **2 teams**: Team A (Human + Bot 2) vs Team B (Bot 1 + Bot 3)
- **Trick-taking gameplay** with complex trump card mechanics
- **Rank advancement** from 2 through Ace with team role switching

### Visual & UX Features
- 🎴 **Smooth card animations** with React Native Animated API
- 👑 **Round starting player indicator** for clear game flow
- 🎯 **Current player highlighting** with thinking indicators
- 🃏 **Smart card auto-selection** for pairs and tractors
- 📱 **Mobile-optimized UI** designed for touch interaction
- 🎨 **Team color coding** (Green for Team A, Red for Team B)

### Advanced Game Mechanics
- **Complex trump hierarchy** with proper "first played wins" rules
- **Multiple card combinations**: Singles, Pairs, Tractors
- **Strategic AI** with suit-following and trump logic
- **Accurate scoring** system with 5s, 10s, and Kings
- **Round-by-round progression** with defending team rotation

## 📱 Quick Start

> ⚠️ **IMPORTANT: This is a mobile-only application!**  
> Tractor is designed exclusively for Android and iOS devices. It will not work in web browsers.

```bash
# Install dependencies
npm install

# Development
npx expo start       # Choose platform in terminal
npm run android      # Direct Android launch
npm run ios         # Direct iOS launch

# Quality assurance
npm run qualitycheck # Runs typecheck + lint + test (192 tests)
npm run lint         # ESLint with Prettier
npm run typecheck    # TypeScript strict checking
npm test            # Jest test suite
```

## 🎯 Game Rules

### Basic Setup
- **4 players**: Human + 3 AI bots in 2 teams
- **Counter-clockwise play**: Human → Bot1 → Bot2 → Bot3
- **Team composition**: 
  - Team A (Green): Human + Bot2
  - Team B (Red): Bot1 + Bot3

### Trump Card Hierarchy
Trump cards beat non-trump cards. Within trumps, the hierarchy is:

1. **Big Joker** (🃿) - Highest trump
2. **Small Joker** (🃏) - Second highest
3. **Trump rank in trump suit** (e.g., 2♠ when rank=2, suit=Spades)
4. **Trump rank in other suits** (e.g., 2♥, 2♣, 2♦) - *Equal strength, first played wins*
5. **Trump suit cards** (all other Spades when Spades is trump)

### Card Combinations

#### 🃏 Singles
- Any single card
- Must follow suit if possible
- Trump cards beat non-trump

#### 🃟🃟 Pairs  
- **Two identical cards** (same rank AND same suit)
- ✅ Valid: 8♥-8♥, Small Joker pair, Big Joker pair
- ❌ Invalid: 8♥-8♦ (different suits), Small-Big Joker mix

#### 🚂 Tractors
- **Consecutive pairs** of the same suit
- ✅ Valid: 7♥7♥-8♥8♥ or Small Joker pair + Big Joker pair
- ❌ Invalid: Different suits, non-consecutive ranks, mixed trump/non-trump

### Smart Card Selection
- **Auto-selection**: Tap any card in a pair → both cards selected automatically
- **Tractor priority**: When leading, prioritizes tractors over pairs for optimal play
- **Following combinations**: Auto-selects matching combination type when possible
- **Toggle control**: Tap selected card again to deselect and choose manually
- **Fallback**: Single card selection when no combinations available

### Scoring & Advancement
- **Points**: 5s = 5pts, 10s & Kings = 10pts
- **Win condition**: Attacking team needs 80+ points
- **Rank advancement**: Successful teams advance 1-3 ranks based on performance
- **Game end**: First team to reach Ace wins

## 🏗️ Architecture

### Project Structure
```
/src/
├── types/game.ts          # Core game types with TypeScript enums
├── utils/                 # Game logic utilities
│   ├── gameLogic.ts       # Core mechanics and card comparisons
│   ├── gamePlayManager.ts # Turn validation and trick processing
│   ├── gameRoundManager.ts # Round transitions and scoring
│   ├── trumpManager.ts    # Trump declaration handling
│   ├── aiLogic.ts         # AI decision making
│   └── gameTimings.ts     # Animation timing constants
├── hooks/                 # Custom React hooks
│   ├── useGameState.ts    # Core game state management
│   ├── useAITurns.ts      # AI turn coordination
│   └── useTrickResults.ts # Trick completion handling
├── components/            # UI components
│   ├── *PlayerView.tsx    # Player area components
│   ├── CardPlayArea.tsx   # Central play area
│   └── GameTable.tsx      # Main table layout
├── screens/               # Screen-level components
└── __tests__/             # Comprehensive test suite (192 tests)
    ├── components/        # Component tests
    ├── game-logic/        # Game mechanics tests  
    ├── game-flow/         # Game flow integration tests
    └── helpers/           # Test utilities
```

### Key Technical Features
- **Type-safe enums** eliminate magic strings throughout codebase
- **Immutable state updates** ensure predictable game flow
- **Centralized timing** constants for smooth animations
- **Comprehensive test coverage** with 192 passing tests
- **Trump strength rules** with proper "first played wins" implementation
- **Player rotation logic** correctly handles round transitions

## 🧪 Quality & Testing

### Test Coverage
- **192 tests passing** across all game mechanics
- **Component testing** with React Testing Library
- **Game logic testing** for all card combinations and rules
- **Integration testing** for complete game flows
- **Trump mechanics testing** including edge cases

### Code Quality
- **TypeScript strict mode** with full type coverage
- **ESLint + Prettier** for consistent code style
- **Zero magic strings** - all game values use typed enums
- **Immutable patterns** for predictable state management
- **Performance optimized** with minimal re-renders

## 🛠️ Development

### Essential Commands
```bash
# Quality assurance (run before commits)
npm run qualitycheck     # All checks: typecheck + lint + test

# Individual checks  
npm run typecheck        # TypeScript compilation check
npm run lint            # Code style and best practices
npm test               # Full test suite (192 tests)

# Development
npx expo start          # Start development server
```

### Git Workflow
```bash
# 1. Create feature branch
git checkout -b {user}/{feature-name}

# 2. Make changes and test
npm run qualitycheck

# 3. Commit and push  
git add .
git commit -m "Description"
git push origin {branch-name} -u

# 4. Create pull request
gh pr create --title "Title" --body "Description"
```

## 📝 Development Notes

### Known Issues
- Some npm warnings from sub-dependencies (inflight, glob, rimraf) - these are harmless and will be resolved when main dependencies update
- Web platform disabled - this is a mobile-only application

For detailed project guidance, see [CLAUDE.md](./CLAUDE.md).

## 🏗️ Technology Stack

- **[React Native](https://reactnative.dev/)** - Mobile app framework
- **[Expo](https://expo.dev/)** - Development platform and build system
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety with strict checking
- **[Expo Router](https://expo.github.io/router/)** - File-based navigation
- **[Jest](https://jestjs.io/)** & **[React Testing Library](https://testing-library.com/docs/react-native-testing-library/intro/)** - Testing framework
- **[EAS](https://expo.dev/eas)** - Build and deployment service

## ⚙️ Requirements

- **Node.js** 18+ 
- **npm** 9+
- **Mobile device/emulator**:
  - iOS Simulator (Mac required)
  - Android Emulator (Android Studio)
  - Physical device with Expo Go app

## 🤝 Contributing

1. **Create feature branch**: `{username}/{feature-description}`
2. **Implement changes** following existing patterns
3. **Run quality checks**: `npm run qualitycheck` 
4. **Submit pull request** with clear description
5. **All PRs require review** - main branch is protected

### Development Guidelines
- Use TypeScript enums instead of magic strings
- Maintain immutable state patterns  
- Add tests for new functionality
- Follow existing naming conventions
- Update documentation for significant changes

## 📄 License

[MIT License](LICENSE) - Feel free to use this project for learning and development.

## 🙏 Acknowledgments

- **Shengji/Tractor** - Traditional Chinese card game
- **React Native & Expo** - Amazing mobile development tools
- **Open source community** - For excellent libraries and tools
- **Contributors** - Thank you for improvements and bug reports!

---

*Built with ❤️ using React Native and TypeScript*