# Tractor Card Game

A React Native implementation of the Chinese card game Shengji (升级), also known as Tractor. This is a trick-taking card game where players work in teams to advance through card ranks.

## Game Features

- Single-player game against 3 AI opponents
- 2 teams: Team A (you + Bot 2) and Team B (Bot 1 + Bot 3)
- Trick-taking gameplay with trump cards
- Visual card animations and modern UI
- Special handling for jokers and trump cards

## Game Rules

In Tractor (Shengji):
- Players are divided into two teams (A and B)
- One team defends while the other attacks
- Trump cards are determined by rank and suit
- Points are scored by capturing certain cards (5s, 10s, Kings)
- The objective is to capture cards and advance through ranks from 2 to Ace

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
- `/src/screens/` - Screen components (GameScreen, SimpleGameScreen)
- `/app/` - Expo Router app routing

## Technology

- React Native with Expo
- TypeScript
- React Native Animated API for animations
- Expo Router for navigation