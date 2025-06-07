# Tractor (升级)

A React Native implementation of the classic Chinese card game **Tractor** (also known as Shengji/升级), featuring intelligent AI opponents and authentic gameplay mechanics.

![Platforms](https://img.shields.io/badge/Platforms-Android%20%7C%20iOS-blue)
![React Native](https://img.shields.io/badge/React%20Native-Expo-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-green)
![Tests](https://img.shields.io/badge/Tests-561%20Passing-brightgreen?logo=jest)
![EAS Update](https://github.com/ejfn/Tractor/actions/workflows/eas-update.yml/badge.svg?branch=main)

## What is Tractor?

**Tractor** (升级/Shengji) is a challenging Chinese trick-taking card game where strategy and teamwork are essential. You partner with an AI teammate to collect points and advance through card ranks from 2 to Ace.

**Core Gameplay:**
- **Team-based**: You + Bot 2 vs Bot 1 + Bot 3 in strategic cooperation
- **Rank Progression**: Start at rank 2, advance through ranks by collecting 80+ points per round
- **Trump Declaration**: Players can declare trump during progressive dealing using pairs or jokers
- **Card Combinations**: Play singles, pairs, or tractors (consecutive pairs) with complex following rules
- **Victory Condition**: First team to advance to Ace rank wins the game

**Unique Features:**
- **Progressive Dealing**: Cards dealt one-by-one with real-time trump declaration opportunities
- **Kitty Management**: Winner receives 8 hidden cards that can provide massive endgame bonuses
- **Complex Trump Hierarchy**: Big Joker > Small Joker > Trump rank cards > Trump suit cards

*Complete rules and quick start guide in **[Game Rules](docs/GAME_RULES.md)***

## Key Features

- **🧠 4-Phase AI Intelligence**: Memory-enhanced decision trees with strategic point management and trump conservation
- **🃏 Smart Card Auto-Selection**: Intelligent pair/tractor detection with tap-to-toggle controls
- **⚡ Progressive Dealing System**: Real-time trump declarations with sophisticated AI strategy
- **🎯 Advanced Kitty Management**: Strategic suit elimination and endgame bonus multipliers
- **📱 Touch-Optimized UI**: Smooth animations, team color coding, and dark theme support
- **🏆 Authentic Gameplay**: Complete Shengji/Tractor rules with proper combination following

## Technology & Architecture

**Built with React Native + Expo** for cross-platform mobile development:

- **React Native 0.76+** - Cross-platform mobile framework
- **Expo SDK 52** - Development tools and native API access
- **TypeScript 5.7+** - Strict type safety and enhanced developer experience
- **Jest** - 549 comprehensive tests with React Testing Library
- **ESLint** - Code quality with React Native specific rules
- **React Native Reanimated** - High-performance card animations

**Architectural Highlights:**
- **Modular AI System**: 8 specialized modules with 4-phase intelligence
- **Consolidated Hook Architecture**: Single-responsibility hooks with minimal interdependencies
- **Progressive Dealing System**: Unified dealing and trump declaration management
- **RoundResult System**: Pure computation approach for consistent UI timing
- **Type-Safe Development**: Enum usage eliminates magic strings throughout codebase

*Mobile-only support for Android and iOS. Architecture details in **[CLAUDE.md](CLAUDE.md)***

## AI Intelligence

**Sophisticated 4-phase AI system** with memory-enhanced decision trees, strategic point management, and intelligent trump conservation.

**Core AI Capabilities:**
- **🧠 Memory-Enhanced Strategy**: Card tracking with guaranteed winner identification
- **🎯 4-Priority Decision Chain**: Team coordination → Opponent blocking → Trick contention → Strategic disposal
- **🃏 Advanced Kitty Management**: Suit elimination strategy with trump conservation
- **⚡ Real-Time Trump Declarations**: Hand quality analysis with timing optimization
- **🛡️ Strategic Conservation**: Trump hierarchy preservation and point card management

**Latest Intelligence Features:**
- **Memory-Enhanced Biggest Remaining**: Uses card tracking to identify guaranteed winners
- **Strategic Point Timing**: Prioritizes point collection before opponents run out of suit
- **Enhanced Opponent Blocking**: Sophisticated response based on trick value and conservation
- **Trump Conservation Hierarchy**: Optimal selection using conservation values (Big Joker: 100 → 3♠: 5)

*Complete AI documentation in **[AI System Guide](docs/AI_SYSTEM.md)***

## Documentation

- **[Game Rules](docs/GAME_RULES.md)** - Complete rules, quick start, and strategy reference
- **[AI System](docs/AI_SYSTEM.md)** - Comprehensive AI intelligence documentation
- **[CLAUDE.md](CLAUDE.md)** - Development guidelines and project architecture

## Built with Claude Code

This project is fully developed using [Claude Code](https://claude.ai/code), Anthropic's AI-powered development assistant. All development guidelines and project architecture details are documented in [CLAUDE.md](CLAUDE.md).

## Future Enhancements

- **Multi-game Learning** - Cross-game strategy improvement
- **Difficulty Scaling** - Adaptive challenge based on player skill
- **Advanced Psychology** - Deep behavioral modeling
- **iOS Testing** - Comprehensive iOS platform validation

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Enjoy playing Tractor!** 🃏✨
