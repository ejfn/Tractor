# Tractor (升级)

A React Native implementation of the classic Chinese card game **Tractor** (also known as Shengji/升级), featuring intelligent AI opponents and authentic gameplay mechanics.

![Platforms](https://img.shields.io/badge/Platforms-Android%20%7C%20iOS-blue)
![React Native](https://img.shields.io/badge/React%20Native-Expo-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-green)
![Tests](https://img.shields.io/badge/Tests-533%20Passing-brightgreen?logo=jest)
![EAS Update](https://github.com/ejfn/Tractor/actions/workflows/eas-update.yml/badge.svg?branch=main)

## What is Tractor?

**Tractor** is a classic Chinese card game where you work with an AI teammate to collect points and advance through card ranks. The first team to reach Ace wins!

- **Teams**: You + Bot 2 vs Bot 1 + Bot 3  
- **Progressive Dealing**: Cards dealt one-by-one with real-time trump declaration opportunities
- **Trump System**: Declare trump by playing pairs during dealing with hierarchy-based overrides
- **Combinations**: Singles, pairs, and tractors (consecutive pairs)
- **Points**: 5s (5pts), 10s and Kings (10pts)
- **Objective**: Collect enough points to advance through card ranks

*For complete rules and strategy guide, see **[Game Rules](docs/GAME_RULES.md)***

## Key Features

- **4-Phase AI Intelligence** with sophisticated strategic decision-making
- **Progressive dealing with real-time trump declarations** during card distribution
- **AI trump declaration strategy** with hand quality analysis and timing optimization
- **Smooth card animations** with React Native Reanimated
- **Smart card auto-selection** for pairs and tractors
- **Touch-optimized UI** with team color coding and dark theme
- **Comprehensive testing** with 533 tests across 75 test suites

## Technology

Built with **React Native + Expo** for mobile platforms:

- **React Native 0.76+** - Cross-platform mobile development
- **Expo SDK 52** - Development tools and native API access
- **TypeScript 5.7+** - Type safety and developer experience
- **Jest** - Testing framework with React Testing Library
- **ESLint** - Code linting with React Native specific rules
- **React Native Reanimated** - High-performance animations

*Mobile-only support for Android and iOS. Currently tested on Android only.*

## AI Intelligence

Sophisticated **4-phase AI system** with restructured priority chain, real-time trick analysis, enhanced opponent blocking, strategic point card management, and intelligent trump conservation.

**Latest Enhancements:**

- **Trump Declaration Strategy**: Sophisticated dealing phase AI with hand quality analysis, timing optimization, and strategic override decisions
- **Strategic Pair Conservation**: AI intelligently preserves valuable pairs when out of suit, using strategic mixed combinations instead
- **Strategic Point Management**: AI avoids wasting point cards when opponent is winning
- **Trump Conservation Hierarchy**: Optimal selection using conservation values (Big Joker: 100 → Small Joker: 90 → Trump rank cards: 70-80 → Trump suit cards: 5-60)
- **Enhanced Opponent Blocking**: Sophisticated response based on trick value and card conservation
- **Low-Value Trick Optimization**: Conservation logic for 0-4 point tricks to preserve valuable cards

*For complete AI system documentation, see **[AI System Guide](docs/AI_SYSTEM.md)***

## Architecture

**React Native + TypeScript** with modular design: AI intelligence modules, game logic, consolidated React hooks, and UI components.

**Key architectural highlights:**

- **Consolidated hook architecture**: Single-responsibility hooks with minimal interdependencies
- **Progressive dealing system**: Unified dealing and trump declaration management
- **Type-safe enum usage**: Eliminates magic strings throughout the codebase
- **Modular AI system**: 4-phase intelligence with strategic decision trees

*Architecture details are covered in **[CLAUDE.md](CLAUDE.md)***

## Documentation

- **[Game Rules](docs/GAME_RULES.md)** - Complete rules and strategy guide
- **[AI System](docs/AI_SYSTEM.md)** - Detailed AI intelligence documentation
- **[AI Decision Trees](docs/AI_DECISION_TREE.md)** - Comprehensive AI decision logic and strategic flowcharts
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
