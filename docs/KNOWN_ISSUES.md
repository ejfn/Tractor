# Known Issues

This document details current known issues in the Tractor card game application and their status.

## AI Turn Handling

### Bot 1 Not Playing After Human Player

**Status**: In Progress

**Description**: 
There is an issue where Bot 1 (the player to the left of the human player) sometimes fails to play cards after the human player completes their turn. The bot appears to get into a "thinking" state but does not complete its move.

**Technical Details**:
- The issue appears to be related to state management in the `useAITurns` hook
- Enhanced logging has been added to track the game state transitions
- The `handleAIMove` function may not be receiving the correct game state when called
- `useAITurns` may not properly detect the player change from human to Bot 1

**Workaround**:
When playing the game, if Bot 1 gets stuck in a thinking state:
1. Force-quit the application
2. Restart the game
3. The issue may not occur on every playthrough

**Progress**:
- Added comprehensive logging to debug the AI turn flow
- Implemented defensive code in the AI move handling logic
- Added fallbacks for empty moves (will play a random card if AI logic fails)
- Created tests for the `useAITurns` hook to help isolate the issue

**Next Steps**:
- Analyze logs from the running app to determine exact failure point
- Investigate potential race conditions in state updates
- Consider rewriting the AI turn management with a more direct approach
- Test on different devices to see if the issue is platform-specific

## UI and Display

### Card Animation Flicker

**Status**: Known Issue

**Description**:
On some Android devices, card animations may occasionally flicker during transitions.

**Technical Details**:
- May be related to hardware acceleration settings
- More pronounced on older devices with limited GPU capability

**Workaround**:
- No user workaround currently available
- Development team is collecting data on affected devices

## Platform Limitations

### Web Platform Support

**Status**: Not Supported (By Design)

**Description**:
The application is specifically designed for mobile platforms (Android and iOS) and does not support web browsers or desktop environments.

**Technical Details**:
- Uses React Native APIs that don't translate to web environments
- Animation system relies on React Native's Animated API
- Touch interactions designed specifically for mobile devices
- Card rendering optimized for mobile screen sizes

**Next Steps**:
- No plans to add web support
- See [MOBILE_ONLY.md](./MOBILE_ONLY.md) for more details on platform support