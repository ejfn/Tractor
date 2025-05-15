# Tractor Documentation

Welcome to the Tractor card game documentation. This folder contains comprehensive documentation about the project's architecture, implementation, and testing approach.

## Available Documentation

- [README.md](../README.md) - Main project overview and setup instructions
- [ARCHITECTURE.md](ARCHITECTURE.md) - Detailed architectural design and code organization
- [TESTING.md](TESTING.md) - Testing methodology, coverage, and best practices
- [MOBILE_ONLY.md](MOBILE_ONLY.md) - Important information about mobile-only support
- [KNOWN_ISSUES.md](KNOWN_ISSUES.md) - List of known issues and their status

## Project Overview

Tractor is a React Native Expo app that implements a single-player version of the Chinese card game Shengji (升级), also known as Tractor. It's a trick-taking card game where players work in teams to advance through card ranks from 2 to Ace.

## Platform Support

⚠️ **IMPORTANT**: Tractor is designed exclusively for mobile platforms (Android and iOS). 

The game **will not work** in web browsers or desktop environments. This is intentional due to the game's specific UI and animation requirements that rely on mobile touch interactions and React Native's mobile-specific APIs.

For detailed information about platform support and usage instructions, please refer to [MOBILE_ONLY.md](MOBILE_ONLY.md).

## Recent Improvements

The codebase has recently undergone significant refactoring to improve maintainability:

1. **Component Separation**: Moved from a monolithic screen component to a controller/view pattern
2. **Utility Modules**: Extracted game logic into focused utility modules
3. **Custom Hooks**: Created hooks for handling animations, game state, and AI turns
4. **UI Components**: Separated player views and game elements into reusable components
5. **Comprehensive Testing**: Added unit and component tests with high coverage
6. **Known Issues**: AI turn handling in the game has been improved with additional logging and error handling

## Documentation Updates

These documentation files are maintained alongside the codebase and will be updated as the project evolves. Please refer to the individual files for detailed information about specific aspects of the project.