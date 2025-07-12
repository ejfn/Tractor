# GitHub Copilot Instructions for Tractor Card Game

**Project Overview:** React Native + Expo + TypeScript card game implementing the Chinese Tractor (Shengji) game with AI opponents, multiplayer support, and comprehensive game logic.

## Core Architecture

### Tech Stack
- **Frontend:** React Native + Expo Router + TypeScript
- **Testing:** Jest with comprehensive coverage
- **AI System:** 20 modular AI components with memory-enhanced strategy
- **Game Logic:** Complex multi-combo system with trump mechanics
- **State Management:** Persistent game state with AsyncStorage

### Key Directories
```
src/
├── ai/                    # 20 AI modules (leading, following, memory)
├── game/                  # Game logic (validation, combos, trump)
├── components/            # React Native UI components 
├── types/                 # TypeScript definitions
├── utils/                 # Utilities (logging, sorting)
__tests__/                 # Jest test suites
docs/                      # Comprehensive documentation
```

### Development Standards
- **Type Safety:** Strict TypeScript, zero `any` types
- **Quality Gates:** `npm run qualitycheck` before commits
- **Git Workflow:** Feature branches → PR → merge
- **Testing:** Unit tests for all AI logic and game rules

## AI System Patterns

### Core AI Entry Points
```typescript
// Main AI functions (src/ai/aiLogic.ts)
getAIMove(gameState: GameState, playerId: PlayerId): Card[]
getAIKittySwap(gameState: GameState, playerId: PlayerId): Card[]
getAITrumpDeclaration(gameState: GameState, playerId: PlayerId): AIDeclarationDecision
```

### Strategic Architecture
- **Leading Strategy:** Scoring-based candidate evaluation (4 modules)
- **Following Strategy:** Scenario-based routing with 4-priority chain (10 modules)
- **Memory System:** Card tracking with guaranteed winner detection
- **Team Coordination:** Human + Bot2 vs Bot1 + Bot3

### AI Decision Framework
```typescript
// Priority chain for following plays
Priority 1: Team Coordination (support teammate)
Priority 2: Opponent Blocking (prevent points)
Priority 3: Trick Contention (contest ≥5 points)
Priority 4: Strategic Disposal (weakest cards)
```

## Game Logic Patterns

### Core Types
```typescript
// Essential game types (src/types/)
GameState, Card, TrumpInfo, PlayerId, GamePhase
TrickPosition, PointPressure, GameContext, MemoryContext
```

### Multi-Combo System
```typescript
// Complex combination validation
detectValidCombos(cards: Card[], trumpInfo: TrumpInfo): ComboType[]
validateComboPlay(cards: Card[], leadingCombo: ComboType): boolean
```

### Memory-Enhanced Decisions
```typescript
// AI memory integration
createMemoryContext(gameState: GameState): MemoryContext
createGameContext(gameState: GameState, playerId: PlayerId): GameContext
```

## Testing Conventions

### Test Structure
```typescript
// AI test patterns (__tests__/ai/)
describe("AI Strategy", () => {
  test("should follow priority chain", () => {
    const gameState = createMockGameState();
    const move = getAIMove(gameState, PlayerId.Bot1);
    expect(move).toBeDefined();
  });
});
```

### Mock Utilities
```typescript
// Test helpers (__tests__/helpers/)
createMockGameState(), createAIGameContext(), createTestCardsGameState()
```

## Common Code Patterns

### Error Handling
```typescript
// Comprehensive logging (src/utils/gameLogger.ts)
gameLogger.error("ai_invalid_move", { playerId, aiMove }, "Details");
gameLogger.info("game_state_change", { gamePhase }, "Context");
```

### Type Safety
```typescript
// Strict enum usage
enum GamePhase { Dealing, Playing, Finished }
enum PlayerId { Human, Bot1, Bot2, Bot3 }
enum TrickPosition { First, Second, Third, Fourth }
```

### Card Operations
```typescript
// Consistent card handling
Card.createCard(Suit.Hearts, Rank.Ace, deckId)
Card.createJoker(JokerType.Big, deckId)
sortCards(cards, trumpInfo)
```

## Key Files to Understand

### Essential Game Logic
- `src/game/playProcessing.ts` - Core game flow and AI integration
- `src/game/playValidation.ts` - Rule compliance and move validation
- `src/game/comboDetection.ts` - Multi-combo system core
- `src/types/core.ts` - Fundamental game types

### AI System Core
- `src/ai/aiLogic.ts` - Public AI API and entry points
- `src/ai/aiStrategy.ts` - Strategic decision coordination
- `src/ai/aiGameContext.ts` - Context analysis and memory integration
- `src/ai/following/followingStrategy.ts` - Following play coordination

### Documentation
- `docs/AI_SYSTEM.md` - Complete AI architecture guide
- `docs/GAME_RULES.md` - Tractor game rules and strategy
- `CLAUDE.md` - Development guidelines and conventions

## Development Workflow

### Before Making Changes
1. Run `npm run qualitycheck` to ensure baseline quality
2. Review relevant documentation in `docs/`
3. Check existing tests for patterns and coverage
4. Understand AI system modularity before modifying

### When Adding Features
- Follow modular AI architecture (separate concerns)
- Add comprehensive tests for new game logic
- Update relevant documentation
- Maintain strict type safety
- Use existing utility functions and patterns

### Git Workflow
🚨 **NEVER COMMIT TO MAIN BRANCH** 🚨

**Required workflow:**
```bash
# 1. Create feature branch with username prefix
git checkout -b ejfn/feature-name

# 2. Make changes and commit with descriptive messages
git add . && git commit -m "Description"

# 3. Push and create PR
git push origin ejfn/feature-name -u
gh pr create --title "Title" --body "Description"
```

### Quality Requirements
**ALL quality checks must pass before any commit:**
- ✅ Tests: All tests pass (no failures)
- ✅ TypeScript: Zero compilation errors/warnings  
- ✅ Lint: Zero ESLint warnings/errors

```bash
npm run qualitycheck  # MUST pass completely
```

### Critical Development Rules

#### Duplicate Function Prevention
🚨 **NEVER create duplicate functions** - causes subtle validation bugs

**Before writing ANY new function:**
1. Search existing: `rg "functionName" --type ts`
2. Try importing first: `import { getComboType } from "./comboDetection"`
3. Use specific names for local helpers: `analyzeLocalComboStructure`

**Naming Rules:**
- Generic names (`getComboType`, `validatePlay`) → **MUST be imports**
- Local helpers → Use prefixes (`local`, `internal`, `analyze`)

#### Logging Standards
- **Use `gameLogger` instead of `console.log()`** 
- Follow structured logging patterns from `docs/LOG_EVENT_SCHEMA.md`
- Example: `gameLogger.error("ai_invalid_move", { playerId, aiMove }, "Details");`

This codebase emphasizes **strategic depth, type safety, and maintainable architecture**. Follow established patterns, maintain comprehensive testing, and preserve the modular AI system design.
