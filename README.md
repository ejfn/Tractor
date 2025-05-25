# Tractor Card Game

A React Native implementation of the Chinese card game Shengji (升级), also known as Tractor. This is a trick-taking card game where players work in teams to advance through card ranks from 2 to Ace.

![Mobile Only](https://img.shields.io/badge/Platform-Mobile%20Only-red)
![React Native](https://img.shields.io/badge/React%20Native-Expo-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-green)
![Tests](https://img.shields.io/badge/Tests-299%20Passing-brightgreen)

## ✨ Game Features

### Core Gameplay
- **Single-player** against 3 AI opponents with master-level strategic intelligence
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
- **Strategic AI** with 4-phase intelligence system
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
npm run qualitycheck # Runs typecheck + lint + test (299 tests)
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

## 🧠 AI Strategic Intelligence

The game features a **4-phase AI intelligence system** providing master-level strategic play:

### ✅ Phase 1: Team Role Awareness
**Strategic Intelligence**: AI distinguishes between attacking vs defending team roles with sophisticated context awareness.

**Key Features:**
- **Dynamic Point Collection**: Attacking teams adapt strategy based on current score (LOW/MEDIUM/HIGH pressure)
- **Strategic Point Denial**: Defending teams conserve trumps and block strategically
- **Late-Round Urgency**: Increased aggression when approaching critical thresholds
- **Partner Coordination**: Teams work together to maximize effectiveness

### ✅ Phase 2: Position-Based Adaptive Play
**Advanced Intelligence**: AI adapts strategy based on trick position with sophisticated information usage.

**Position Strategies:**
- **First (Leading)**: Probe opponents, control trick direction, gather information
- **Second**: Balanced approach, moderate risk-taking, consider partner possibilities
- **Third**: Informed decisions based on first two plays, higher partner coordination
- **Fourth**: Perfect information optimization, maximum risk tolerance

**Advanced Features:**
- **Play Style Evolution**: Conservative → Balanced → Aggressive → Desperate
- **Combo Strength Analysis**: Weak/Medium/Strong/Critical classification
- **Dynamic Strategy Matrices**: Information gathering, risk taking, partner coordination

### ✅ Phase 3: Card Memory & Counting System
**Expert Intelligence**: Sophisticated card tracking and probability-based decision making for near-human-level play.

**Memory Capabilities:**
- **Comprehensive Card Tracking**: Monitors every card played with player attribution
- **Play Pattern Analysis**: Records and analyzes behavioral patterns per player
- **Opponent Hand Modeling**: Estimates remaining cards and hand strength per player
- **Bayesian Probability Updates**: Dynamic probability calculations based on observed play
- **Suit Void Exploitation**: Leverages known suit exhaustions for strategic advantage
- **Perfect Information Endgame**: Optimal decisions when uncertainty is eliminated

### ✅ Phase 4: Advanced Combination Logic
**Master Intelligence**: Sophisticated combination pattern recognition with dynamic strategy adaptation.

**Combination Mastery:**
- **Dynamic Pattern Recognition**: Identifies optimal combination patterns based on game context
- **Adaptive Strategy Selection**: Real-time strategy adjustment based on hand profile and position
- **Memory-Enhanced Combinations**: Integrates card memory for optimal timing decisions
- **Risk/Reward Optimization**: Sophisticated risk assessment with reward calculation
- **Multi-Dimensional Analysis**: Considers effectiveness, timing, risk, reward, and alternatives
- **Trump Combination Coordination**: Advanced trump tractor and pair timing optimization

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
│   ├── aiLogic.ts         # AI decision making (4-phase system)
│   ├── aiAdvancedCombinations.ts # Phase 4: Advanced combination logic
│   ├── aiCardMemory.ts    # Phase 3: Card memory & counting
│   ├── aiGameContext.ts   # Phase 1-2: Context & position intelligence
│   └── gameTimings.ts     # Animation timing constants
├── hooks/                 # Custom React hooks
│   ├── useGameState.ts    # Core game state management
│   ├── useAITurns.ts      # AI turn coordination
│   └── useTrickResults.ts # Trick completion handling
├── components/            # UI components
└── __tests__/             # Comprehensive test suite (299 tests)
    ├── utils/             # AI intelligence tests (69 tests across 4 phases)
    │   ├── aiGameContext.test.ts         # Phase 1: Team role tests
    │   ├── aiGameContextPhase2.test.ts   # Phase 2: Position tests  
    │   ├── aiCardMemory.test.ts          # Phase 3: Memory tests
    │   └── aiAdvancedCombinations.test.ts # Phase 4: Combination tests
    ├── game-logic/        # Game mechanics tests (62 tests)
    ├── game-flow/         # Game flow integration tests (65 tests)
    ├── card-tracking/     # Card counting verification tests (25 tests)
    ├── components/        # Component tests (18 tests)
    ├── game-state/        # State management tests (15 tests)
    └── helpers/           # Test utilities
```

### Technical Features
- **Type-safe enums** eliminate magic strings throughout codebase
- **4-phase AI system** with 91.4% test coverage across intelligence modules
- **Comprehensive card memory** with 98.7% test coverage
- **Immutable state updates** ensure predictable game flow
- **299 passing tests** with extensive AI and game logic coverage
- **Advanced combination analysis** with effectiveness scoring
- **Memory-enhanced decision making** with uncertainty management

## 🧪 Quality & Testing

### Test Coverage
- **299 total tests** passing across all systems
- **69 AI intelligence tests** covering all 4 phases
- **Component testing** with React Testing Library
- **Game logic testing** for all card combinations and rules
- **Integration testing** for complete game flows
- **Memory system testing** with 98.7% coverage

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
npm test               # Full test suite (299 tests)

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

For detailed project guidance, see [CLAUDE.md](./CLAUDE.md).

## 📄 License

[MIT License](LICENSE) - Feel free to use this project for learning and development.

## 🙏 Acknowledgments

- **Shengji/Tractor** - Traditional Chinese card game
- **React Native & Expo** - Amazing mobile development tools
- **Open source community** - For excellent libraries and tools

---

*Built with ❤️ using React Native and TypeScript*