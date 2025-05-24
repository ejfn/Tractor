# Tractor Game Architecture

This document outlines the architectural design of the Tractor card game application, focusing on code organization, component structure, and data flow.

## Architectural Overview

The application follows a Controller/View separation pattern to separate game logic from UI presentation:

```mermaid
graph TD
    A["Controller (Game Logic)"] --> B["View (Presentation)"]
    A --> C["Custom Hooks"]
    C --> D["Utility Modules"]
```

## Code Organization

### 1. Screen Components

- **GameScreenController** (`src/screens/GameScreenController.tsx`): The main entry point that manages game logic and state
- **GameScreenView** (`src/screens/GameScreenView.tsx`): Handles the visual presentation of the game

### 2. UI Components

- **Player Views**:
  - `AIPlayerView.tsx`: Renders AI players in different positions
  - `HumanPlayerView.tsx`: Renders the human player's hand with interactive cards
  - `PlayerHand.tsx` and `PlayerHandAnimated.tsx`: Card positioning and animations
  
- **Game Elements**:
  - `AnimatedCard.tsx`: Card component with animation capabilities
  - `CardBack.tsx`: Visual representation of card backs
  - `CardPlayArea.tsx`: Central area where cards are played
  - `GameTable.tsx`: Overall table layout for positioning players
  - `TrumpDeclarationModal.tsx`: UI for trump suit selection
  - `TrickResultDisplay.tsx`: Shows the result of each trick
  - `GameOverScreen.tsx`: End-of-game screen with results
  
- **Status Elements**:
  - `GameStatus.tsx`: Shows current game state information
  - `ThinkingIndicator.tsx`: Visual indicator for AI "thinking"

### 3. Custom Hooks

- **Animation Management**: `useAnimations.ts` - Manages card animations
- **Game State**: `useGameState.ts` - Core game state management and updates
- **AI Management**: `useAITurns.ts` - Controls AI player turns and actions
- **Trick Processing**: `useTrickResults.ts` - Handles trick completion and scoring

### 4. Utility Modules

- **Game Logic**: `gameLogic.ts` - Core game mechanics and rule implementation
- **AI Logic**: `aiLogic.ts` - AI player decision making
- **Play Management**: `gamePlayManager.ts` - Handles play validation and processing
- **Round Management**: `gameRoundManager.ts` - Manages round initialization and completion
- **Trump Management**: `trumpManager.ts` - Trump card declaration and management

### 5. Type Definitions

- **Game Types** (`src/types/game.ts`): Core type definitions for game entities
  - Card, Player, Combo, and GameState interfaces
  - Enum definitions for Suit, Rank, GamePhase, PlayerId, and PlayerName
  - Type-safe constants eliminating magic strings throughout the codebase

## Data Flow

The application follows a unidirectional data flow pattern:

```mermaid
graph LR
    A["User Input"] --> B["Controller Processing"]
    B --> C["State Update"]
    C --> D["View Update"]
    D --> E["Component Rendering"]
    E -.-> A
```

1. **User Input**: Player selects cards or actions
2. **Controller Processing**: GameScreenController processes inputs with utility modules
3. **State Update**: State changes are managed through custom hooks
4. **View Update**: GameScreenView rerenders based on new state
5. **Component Rendering**: Individual components receive props and render UI

## Component Hierarchy

```mermaid
graph TD
    A["GameScreenController"] --> B["GameScreenView"]
    B --> C["GameTable"]
    C --> D["AIPlayerView - Top"]
    C --> E["AIPlayerView - Left"]
    C --> F["AIPlayerView - Right"]
    C --> G["HumanPlayerView"]
    C --> H["CardPlayArea"]
    H --> I["TrickResultDisplay"]
    G --> J["PlayerHandAnimated"]
    J --> K["AnimatedCard"]
```

## Key Patterns

### Controller/View Separation

The Controller handles:
- Game state management
- User action processing
- AI player logic
- Card validation and processing

The View handles:
- UI rendering
- Animation coordination
- User interaction capture
- Layout organization

### Type Safety and Enum Usage

The codebase enforces type safety through comprehensive enum usage:

```typescript
// Type-safe player identification
enum PlayerId {
  Human = 'human',
  Bot1 = 'bot1',
  Bot2 = 'bot2',
  Bot3 = 'bot3'
}

// Type-safe player display names
enum PlayerName {
  Human = 'You',
  Bot1 = 'Bot 1',
  Bot2 = 'Bot 2', 
  Bot3 = 'Bot 3'
}

// Type-safe game phases
enum GamePhase {
  Dealing = 'dealing',
  Declaring = 'declaring',
  Playing = 'playing',
  Scoring = 'scoring',
  RoundEnd = 'roundEnd',
  GameOver = 'gameOver'
}
```

Benefits:
- **Compile-time error checking** prevents invalid string usage
- **IntelliSense support** for better developer experience
- **Refactoring safety** when changing game constants
- **Consistent naming** across the entire codebase

### Custom Hook Composition

Custom hooks are composed to manage specific aspects of the game:

```typescript
// In GameScreenController.tsx
const { gameState, updateGameState } = useGameState(initialState);
const { animationValues, runAnimations } = useAnimations();
const { processTrickResult } = useTrickResults(gameState, updateGameState);
const { handleAITurn } = useAITurns(gameState, updateGameState, animationValues);
```

### UI Component Composition

UI components are composed to build the complete game interface:

```tsx
// In GameScreenView.tsx
return (
  <GameTable
    topPlayer={<AIPlayerView position="top" player={players[2]} ... />}
    leftPlayer={<AIPlayerView position="left" player={players[1]} ... />}
    rightPlayer={<AIPlayerView position="right" player={players[3]} ... />}
    bottomPlayer={<HumanPlayerView player={players[0]} ... />}
    centerContent={
      <>
        <CardPlayArea
          currentTrick={currentTrick}
          trumpCard={trumpCard}
          ...
        />
        {showTrickResult && (
          <TrickResultDisplay
            lastCompletedTrick={lastCompletedTrick}
            ...
          />
        )}
      </>
    }
  />
);
```

## Animation System

The game uses React Native's Animated API for fluid card interactions:

1. **Animation Values**: Managed through the useAnimations hook
2. **Choreography**: Sequence of animations coordinated for natural motion
3. **Interpolation**: Translates animation progress to visual properties
4. **Performance**: Uses native driver where possible for smooth performance

## Scoring and Rank Advancement Rules

### Point Scoring

- **5s**: 5 points each
- **10s and Kings**: 10 points each
- **Other cards**: 0 points
- **Target**: Attacking team needs 80+ points to win the round

### Rank Advancement Rules

#### When Defending Team Successfully Defends (Attackers < 80 points)

The defending team advances based on the attacking team's points:

- **40-79 points**: Defenders advance +1 rank
- **< 40 points**: Defenders advance +2 ranks
- **0 points**: Defenders advance +3 ranks

#### When Attacking Team Wins (Attackers ≥ 80 points)

The attacking team becomes the new defending team and:

- **80-119 points**: Play at their current rank (no advancement)
- **120-159 points**: Advance +1 rank
- **160-199 points**: Advance +2 ranks
- **Pattern**: For every additional 40 points beyond 80, advance +1 rank

#### Examples

Scenario: Team A at rank 5, Team B at rank 3 (defending)

- Team A scores 60 points → Team B advances to rank 4, remains defending
- Team A scores 25 points → Team B advances to rank 5, remains defending
- Team A scores 0 points → Team B advances to rank 6, remains defending
- Team A scores 100 points → Team A becomes defending at rank 5
- Team A scores 140 points → Team A becomes defending at rank 6
- Team A scores 180 points → Team A becomes defending at rank 7

## Performance Considerations

- **Component Memoization**: Key components use React.memo to prevent unnecessary rerenders
- **Animation Optimization**: Hardware acceleration via renderToHardwareTextureAndroid
- **State Management**: Careful state updates to minimize cascading rerenders
- **Asset Management**: Optimized images and simplified card designs
- **View Flattening**: Minimized view hierarchy depth for better performance