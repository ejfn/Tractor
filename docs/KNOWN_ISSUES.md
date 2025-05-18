# Known Issues

This document details current known issues in the Tractor card game application and their status.

## Game Logic Issues

### Card Strength Rules

**Status**: Known Issue

**Description**:
The card strength comparison logic (which cards can win over others) is not correctly implemented according to proper Tractor/Shengji rules.

**Technical Details**:
- Incorrect trump card hierarchy implementation
- Issues with consecutive pairs (tractor) strength calculation
- Problems with following suit requirements and when trumps can be played
- Card strength comparison doesn't properly handle all edge cases

**Current State**:
- Affects core gameplay mechanics
- May result in incorrect trick winners
- Players may notice cards winning when they shouldn't

**Next Steps**:
- Review and correct card strength comparison logic in `gameLogic.ts`
- Implement proper trump hierarchy rules
- Add comprehensive tests for all card combination scenarios
- Ensure following suit rules are correctly enforced

### Bot Intelligence

**Status**: Known Issue

**Description**:
The bot players (AI opponents) lack strategic intelligence and make poor gameplay decisions.

**Technical Details**:
- Bots use programmed logic rather than machine learning models
- Current implementation focuses on valid moves rather than strategic play
- Bots don't consider:
  - Card counting or tracking played cards
  - Partner's plays and team strategy
  - Optimal trump declaration timing
  - Strategic holding of high cards
  - Point card management

**Current State**:
- Bots play randomly from valid options
- No difficulty levels implemented
- Makes the game too easy for experienced players
- Doesn't provide realistic gameplay experience

**Next Steps**:
- Implement basic strategy patterns (e.g., playing low cards when losing)
- Add card tracking to remember what's been played
- Implement partner awareness for team play
- Consider difficulty levels (easy, medium, hard)
- Add strategic decision making for trump declaration
- Improve point card play decisions

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

## UI Timing Issues

### Human Thinking Indicator Flash

**Status**: Known Issue

**Description**:
The human player's thinking indicator briefly flashes when the human wins a trick, appearing momentarily during the transition before the trick result is displayed.

**Technical Details**:
- Issue occurs due to timing gap between state updates
- When human wins a trick:
  1. `currentPlayerIndex` is immediately set to the human (winner)
  2. `isCurrentPlayer` becomes true
  3. Brief delay before `showTrickResult` is set to true
  4. During this gap, the thinking indicator condition `isCurrentPlayer && !showTrickResult` evaluates to true
  5. Thinking indicator appears briefly then disappears when trick result shows
- Particularly noticeable when the last AI player's card animation is still playing

**Attempted Solutions**:
- Adding `waitingForAI` check - didn't help as it's already false when AI completes move
- Checking current trick state - too complex and didn't resolve timing issue
- Adding delay to thinking indicator - works but adds unwanted delay to all human turns
- Using `isTransitioningTricks` state - didn't fully resolve the timing gap

**Current State**:
- Issue remains unresolved but is cosmetic only
- Does not affect gameplay functionality
- Most noticeable when human wins tricks against AI players

**Next Steps**:
- Consider deeper refactoring of state transition timing
- Investigate if trick completion and UI state updates can be better synchronized
- May require changes to how `currentPlayerIndex` is updated relative to UI state

## Game Rules Issues

### Next Round Starting Player

**Status**: Known Issue

**Description**:
The game currently selects the first player from the defending team to start the next round, but this doesn't follow the correct Tractor/Shengji rules.

**Technical Details**:
- Current implementation in `gameRoundManager.ts` uses `defendingPlayers[0]`
- Correct rules should be:
  - **First round**: Trump declarer goes first, their team becomes defending
  - **Following rounds**:
    - If defending team defends: The OTHER player in defending team plays first
    - If attacking team wins: The next player (clockwise) from attacking team plays first
- Current implementation doesn't track who declared trump or alternate between teammates

**Current State**:
- Always selects first player from array of defending team players
- Doesn't alternate between teammates when defending team wins
- Doesn't rotate correctly when attacking team wins
- May result in same player always going first

**Example Issues**:
- If Human & Bot2 (Team A) defend and win, Bot2 should play first next round, not Human
- If Bot1 & Bot3 (Team B) attack and win, the next player after current should play first

**Next Steps**:
- Track trump declarer for first round
- Implement teammate alternation for defending team wins
- Implement clockwise rotation for attacking team wins
- Add tests to verify correct player selection logic

### Game Rotation Direction

**Status**: Known Issue

**Description**:
The game currently uses clockwise rotation for player turns and next player selection, but traditional Tractor/Shengji is played counter-clockwise.

**Technical Details**:
- Current implementation rotates clockwise (Human → Bot1 → Bot2 → Bot3)
- Traditional game should rotate counter-clockwise (Human → Bot3 → Bot2 → Bot1)
- Affects:
  - Turn order during tricks
  - Next player selection when attacking team wins
  - Player positioning expectations

**Current State**:
- All player rotations are clockwise
- May confuse players familiar with traditional counter-clockwise play
- Impacts strategic play as position-based strategies are reversed

**Example Issues**:
- When attacking team wins, next player is selected clockwise instead of counter-clockwise
- During tricks, play proceeds clockwise instead of the traditional counter-clockwise

**Next Steps**:
- Update player rotation logic throughout the codebase
- Modify next player selection to use counter-clockwise order
- Update UI player positions if needed
- Add tests to verify counter-clockwise rotation