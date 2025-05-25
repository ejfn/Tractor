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

## 🧠 AI Strategy & Intelligence

### Current AI Implementation
The bot players use strategic logic rather than random play, with several layers of decision-making:

**Basic Strategy Features:**
- **Partner awareness**: Avoids competing when partner is winning a trick
- **Point threshold logic**: Fights harder for tricks with 15+ points (5s, 10s, Kings)
- **Trump leading decisions**: Considers hand strength and round timing
- **Card conservation**: Avoids wasting point cards when leading

**Strategic Decision Tree:**
1. **Leading a trick**: Balances between probing with moderate cards and avoiding easy points for opponents
2. **Following in trick**: Uses partner status, trick points, and card strength to decide
3. **Trump declaration**: Considers suit distribution and trump rank cards

### Enhanced AI Implementation (Issue #20) ✅

#### ✅ Phase 1: Team Role Awareness (IMPLEMENTED)
**Strategic Intelligence**: AI now distinguishes between attacking vs defending team roles with sophisticated context awareness.

**Current Implementation:**
```typescript
interface GameContext {
  isAttackingTeam: boolean;
  currentPoints: number;     // Points collected by attacking team
  pointsNeeded: number;      // Usually 80 to advance level  
  cardsRemaining: number;    // Cards left in round
  trickPosition: TrickPosition;  // Position in current trick
  pointPressure: PointPressure;  // LOW/MEDIUM/HIGH urgency
  playStyle: PlayStyle;          // Conservative/Balanced/Aggressive/Desperate
}
```

**✅ Attacking Strategy Implementation:**
- ✅ Dynamic point collection based on current progress (LOW: 24pts, MEDIUM: 24-56pts, HIGH: 56+pts)
- ✅ Risk/reward calculation with point pressure adaptation
- ✅ Late-round urgency when approaching failure threshold
- ✅ Aggressive leading when desperate for points

**✅ Defending Strategy Implementation:**
- ✅ Strategic point denial with trump conservation
- ✅ Active disruption when attacking team approaches 80 points
- ✅ Partner coordination to maximize defensive effectiveness
- ✅ Conservative early play, aggressive blocking when necessary

#### ✅ Phase 2: Position-Based Adaptive Play (IMPLEMENTED)
**Advanced Intelligence**: AI adapts strategy based on trick position with sophisticated information usage.

**Current Implementation:**
```typescript
enum TrickPosition {
  First = "first",    // Leading - probe opponents, set trick tone
  Second = "second",  // Early follower - some info, balanced approach
  Third = "third",    // Late follower - good info, calculated risks
  Fourth = "fourth"   // Last player - perfect info, optimal decisions
}

interface PositionStrategy {
  informationGathering: number;  // 0.8 (First) → 0.2 (Fourth)
  riskTaking: number;           // 0.4 (First) → 0.8 (Fourth)  
  partnerCoordination: number;  // 0.2 (First) → 0.9 (Fourth)
  disruptionFocus: number;      // 0.6 (First) → 0.3 (Fourth)
}
```

**✅ Position Strategy Implementation:**
- **✅ First (Leading)**: Probe with strategic combos, control trick direction, gather opponent info
- **✅ Second**: Balanced approach, moderate risk-taking, consider partner possibilities
- **✅ Third**: Informed decisions based on first two plays, higher partner coordination
- **✅ Fourth**: Perfect information optimization, maximum risk tolerance, full partner visibility

**✅ Advanced Combo Intelligence:**
```typescript
interface ComboAnalysis {
  strength: ComboStrength;        // Weak/Medium/Strong/Critical
  isTrump: boolean;
  hasPoints: boolean;
  pointValue: number;
  disruptionPotential: number;    // Strategic disruption value
  conservationValue: number;      // Value of keeping this combo
}
```

**✅ Strategic Decision Matrix:**
- **✅ Combo Selection**: Strength-based filtering with trump prioritization
- **✅ Trick Analysis**: Partner status detection and contest evaluation
- **✅ Play Style Evolution**: Dynamic adaptation from Conservative → Desperate
- **✅ Resource Management**: Smart trump and point card conservation

#### ✅ Integrated: Dynamic Point Pressure System (IMPLEMENTED IN PHASES 1 & 2)
**Enhanced Intelligence**: AI dynamically adjusts aggression based on score progression with sophisticated pressure adaptation.

**✅ Current Implementation:**
```typescript
enum PointPressure {
  LOW = "low",        // < 30% of points needed (< 24 points)
  MEDIUM = "medium",  // 30-70% of points needed (24-56 points)
  HIGH = "high"       // 70%+ of points needed (56+ points)
}

function determinePlayStyle(
  isAttackingTeam: boolean,
  pointPressure: PointPressure,
  cardsRemaining: number
): PlayStyle {
  // Dynamic style evolution based on pressure and endgame
}
```

**✅ Pressure-Based Strategic Adaptations:**
- **✅ LOW**: Conservative information gathering, long-term positioning, resource conservation
- **✅ MEDIUM**: Balanced aggression with selective point targeting and moderate risks
- **✅ HIGH**: Maximum aggression/defense, short-term focus, desperate measures
- **✅ ENDGAME**: Automatic escalation to Aggressive/Desperate with ≤3 cards remaining

#### 🔄 Phase 3: Card Memory & Counting System (NEXT PHASE)
**Planned Enhancement**: AI will track played cards and estimate remaining distributions for even more sophisticated decisions.

**Planned Implementation:**  
```typescript
interface CardMemory {
  playedCards: Card[];                    // All cards seen this round
  trumpCardsPlayed: number;               // Trump tracking
  pointCardsPlayed: number;               // Point card tracking  
  suitDistribution: Record<string, number>; // Suit exhaustion tracking
  opponentProbabilities: PlayerMemory[];   // Estimated hand distributions
}
```

**Planned Memory-Enhanced Decisions:**
- Estimate remaining trump cards in other hands
- Calculate point card probabilities based on play history
- Adjust strategy based on suit exhaustion patterns
- End-game optimization with accumulated information
- Opponent modeling and prediction

#### 📋 Phase 4: Advanced Combination Logic (PLANNED)
**Future Enhancement**: Further optimization of tractor/pair play timing and combination strategy.

**Planned Advanced Features:**
- **Dynamic Tractor Management**: Optimal timing for breaking up vs preserving tractors
- **Defensive Pair Strategy**: Strategic pair conservation for critical blocking moments
- **Combination Threat Assessment**: Reading and countering opponent combination potential
- **Trump Sequence Optimization**: Advanced trump tractor and pair coordination
- **Multi-trick Planning**: Strategic planning across multiple tricks
- **Perfect Endgame Play**: Optimal play with complete information in final tricks

### Implementation Status

**✅ Phase 1: Team Role Awareness** (COMPLETED)
- ✅ Attacking/defending team detection with role-specific strategies
- ✅ Point progression tracking with dynamic pressure system (LOW/MEDIUM/HIGH)
- ✅ Strategic decision making based on team objectives
- ✅ Comprehensive test coverage (91.3% for AI context module)

**✅ Phase 2: Position-Based Intelligence** (COMPLETED)  
- ✅ Trick position detection (First/Second/Third/Fourth) with position-aware strategy
- ✅ Dynamic play styles (Conservative/Balanced/Aggressive/Desperate)
- ✅ Advanced combo analysis with strength classification and disruption potential
- ✅ Sophisticated trick analysis with partner coordination
- ✅ Position-based strategy matrices optimizing information usage
- ✅ Enhanced decision making for leading vs following plays
- ✅ 24 comprehensive tests covering all Phase 2 functionality

**🔄 Phase 3: Card Memory System** (NEXT)
- Add played card tracking and probability calculations
- Implement suit/trump exhaustion logic
- Memory-enhanced strategic decisions

**📋 Phase 4: Advanced Strategies** (PLANNED)
- Sophisticated combination play optimization
- End-game specialization and perfect information usage
- Advanced tractor/pair timing strategies

### Current AI Capabilities

The AI now features **sophisticated strategic intelligence** with:

**🎯 Dynamic Strategic Adaptation:**
- **Team Role Awareness**: Attacking teams play aggressively for points, defending teams block strategically
- **Point Pressure System**: Strategy intensifies as teams approach the 80-point threshold
- **Position Intelligence**: Different strategies for leading (probe opponents) vs following (optimize decisions)
- **Play Style Evolution**: Conservative → Balanced → Aggressive → Desperate based on game context

**🧠 Advanced Decision Making:**
- **Combo Analysis**: Evaluates card strength (Weak/Medium/Strong/Critical) with trump and point awareness
- **Partner Coordination**: Detects partner status and coordinates team play accordingly
- **Trick Evaluation**: Smart decisions on when tricks are worth contesting
- **Strategic Disposal**: Intelligent card disposal when not contesting tricks

**📊 Strategic Matrices:**
- **Information Gathering**: Higher priority when leading to probe opponent hands
- **Risk Taking**: Calculated risks based on position and available information
- **Disruption Focus**: Strategic timing for disrupting opponent plans
- **Conservation Logic**: Preserve valuable trump and tractor combinations

**💡 Context-Aware Intelligence:**
- **Endgame Recognition**: Increased urgency with fewer cards remaining
- **Trump Management**: Smart trump usage based on game phase and pressure
- **Point Card Strategy**: Dynamic point collection vs denial based on team role
- **Combination Optimization**: Strategic use of pairs and tractors for maximum impact

**🧪 Testing & Quality Assurance:**
- ✅ **260 total tests** passing with comprehensive AI coverage
- ✅ **94.36% code coverage** for Phase 2 AI context module
- ✅ **Type-safe implementation** with TypeScript enums and interfaces
- ✅ **Performance optimized** with efficient combo analysis and strategic caching
- ✅ **Backwards compatible** - all existing functionality preserved

**🎮 User Experience Improvements:**
- More **challenging and realistic** bot opponents
- **Dynamic difficulty** that adapts to game state
- **Strategic variety** - each game feels unique with different AI approaches
- **Team coordination** - bots work together more effectively

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