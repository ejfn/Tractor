# Tractor Card Game

A React Native implementation of the Chinese card game Shengji (升级), also known as Tractor. This is a trick-taking card game where players work in teams to advance through card ranks.

## Game Features

- Single-player game against 3 AI opponents
- 2 teams: Team A (you + Bot 2) and Team B (Bot 1 + Bot 3)
- Trick-taking gameplay with trump cards
- Visual card animations and modern UI
- Special handling for jokers and trump cards

## Game Rules

### Basic Gameplay

In Tractor (Shengji):

- Players are divided into two teams (A and B)
- One team defends while the other attacks
- Trump cards are determined by a trump rank and optionally a trump suit
- Points are scored by capturing certain cards (5s = 5 points, 10s and Kings = 10 points)
- The objective is to capture cards and advance through ranks from 2 to Ace

### Trump Cards Hierarchy

Trump cards are played in this order of strength (highest to lowest):

1. Big Jokers
2. Small Jokers
3. Trump rank cards in the trump suit (e.g., 2♥ when 2 is trump rank and Hearts is trump suit)
4. Trump rank cards in other suits (e.g., 2♦, 2♣, 2♠ when 2 is trump rank)
5. Cards of the trump suit (e.g., all other Hearts when Hearts is trump suit)

### Card Combinations

#### Singles

- Any card can be played as a single
- Jokers and trump cards beat non-trump singles
- Within trumps, the hierarchy above applies

#### Pairs

- A valid pair consists of two *identical* cards (same rank AND same suit)
- Two Small Jokers (SJ-SJ) or two Big Jokers (BJ-BJ) form valid pairs
- Cards of the same rank but different suits (e.g., 8♥-8♦) do NOT form a valid pair
- Different jokers (SJ-BJ) do NOT form a valid pair

#### Tractors

- A Tractor is formed by consecutive pairs of the same suit
- Example: 7♥-7♥-8♥-8♥ is a valid Tractor
- All cards must be in the same suit
- SJ-SJ-BJ-BJ forms a special Tractor (the highest possible)

#### Tractor Rules

- Pairs of different suits never form Tractors (7♥-7♥-8♠-8♠ is NOT a Tractor)
- Trump cards of different levels never form Tractors (2♥-2♥-3♥-3♥ when 2 is trump rank is NOT a Tractor)
- A-A-2-2 is NOT a Tractor (non-consecutive in rank order)
- Any trump Tractor beats any non-trump Tractor of the same length (i.e., with the same number of pairs)

## Development

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

3. Run on specific platforms

   ```bash
   npm run android  # Start on Android
   npm run ios      # Start on iOS
   npm run web      # Start on web
   ```

## Project Structure

- `/src/types/game.ts` - Core game type definitions
- `/src/utils/gameLogic.ts` - Game mechanics and rule implementation
- `/src/utils/aiLogic.ts` - AI player decision making
- `/src/components/` - React components for game UI elements
- `/src/screens/` - Screen component (EnhancedGameScreen)
- `/app/` - Expo Router app routing

## Technology

- React Native with Expo
- TypeScript
- React Native Animated API for animations
- Expo Router for navigation
