# Game Rules & How to Play

This guide provides comprehensive rules and gameplay instructions for Tractor (升级), also known as Shengji.

## Game Objective

Work with your AI teammate to collect points (5s, 10s, Kings) and advance through card ranks. The first team to reach Ace wins!

## Team Setup

- **Team A**: You + Bot 2
- **Team B**: Bot 1 + Bot 3
- **Play Order**: Counter-clockwise (Human → Bot 1 → Bot 2 → Bot 3)

## Basic Rules

### 1. Trump Declaration

**Declaration Types & Strength Hierarchy:**
- **Single** (strength: 1) - One trump rank card (NO jokers allowed for singles)
- **Pair** (strength: 2) - Two identical trump rank cards (same rank AND same suit)
- **Small Joker Pair** (strength: 3) - Two small jokers only
- **Big Joker Pair** (strength: 4) - Two big jokers only (strongest)

**Declaration Rules:**
- Declarations happen during the dealing phase
- Players can override weaker declarations with stronger ones
- Same player can only strengthen in the SAME suit (cannot redeclare same rank in different suit)
- **Strengthening Rule**: If you declared a single (e.g., 2♠) and get another matching card (another 2♠), you can upgrade to a pair (2♠-2♠) as long as your declaration hasn't been overridden
- Different players can override with ANY suit if using stronger combination
- Only same jokers make pairs (Small-Small or Big-Big, never mixed)

**First Round Special Rules:**
- Trump declarer (winner of declaration) leads the first trick
- **Trump declarer's team becomes the DEFENDING team** (only for first round)
- **Other team becomes the ATTACKING team** (only for first round)
- Kitty cards always belong to whoever leads the first trick

### 2. Trick Play
- Follow suit when possible (must play same suit if you have it)
- Highest card wins trick unless trumped
- Trick winner leads next trick
- Must match combination type when following (singles, pairs, tractors)

### 3. Point Collection
- **5s**: 5 points each
- **10s and Kings**: 10 points each
- **Other cards**: 0 points
- Team collects points from tricks they win

### 4. Round Advancement
- **Attacking team** (starts with lower rank) needs 80+ points to advance
- **Defending team** (starts with higher rank) tries to prevent this
- Successful teams advance 1-3 ranks based on performance
- Teams alternate between attacking and defending roles

## Card Hierarchy

Cards are ranked from highest to lowest trump strength:

### Trump Group (All trump cards beat non-trump cards)
1. **Big Joker** (🃏) - Highest trump card
2. **Small Joker** (🃏) - Second highest trump
3. **Trump rank in trump suit** (e.g., 2♠ when Spades trump, rank 2)
4. **Trump rank in off-suits** (e.g., 2♥, 2♣, 2♦ when Spades trump)
   - *Equal strength - first played wins*
5. **Trump suit cards** (A♠, K♠, Q♠, J♠, 10♠, 9♠, 8♠, 7♠, 6♠, 5♠, 4♠, 3♠ when Spades trump)

**Complete Trump Group Example (when rank 2, trump suit Spades):**
- **BJ** > **SJ** > **2♠** > **2♥, 2♣, 2♦** > **A♠** > **K♠** > **Q♠** > **J♠** > **10♠** > **9♠** > **8♠** > **7♠** > **6♠** > **5♠** > **4♠** > **3♠**

### Non-Trump Cards
- Ranked within each suit: A, K, Q, J, 10, 9, 8, 7, 6, 5, 4, 3
- Cannot beat any trump group cards
- Higher cards beat lower cards of same suit only

## Combination Types

### Singles
- **Definition**: Any individual card
- **Rules**: Must follow suit if possible, trump beats non-trump
- **Example**: Playing 8♠ when Hearts are led

### Pairs
- **Definition**: Two identical cards (same rank AND same suit)
- **Valid Examples**: 
  - 8♥-8♥ (two 8 of Hearts)
  - Small Joker pair
  - Big Joker pair
- **Invalid Examples**: 
  - 8♥-8♦ (different suits)
  - Small Joker + Big Joker (different types)

### Tractors
- **Definition**: Two or more consecutive pairs of the same suit
- **Valid Examples**:
  - 7♥7♥-8♥8♥ (consecutive pairs in Hearts)
  - Small Joker pair + Big Joker pair (consecutive trump pairs)
  - 2♠2♠-3♠3♠-4♠4♠ (three consecutive pairs)
- **Invalid Examples**:
  - 7♥7♥-8♦8♦ (different suits)
  - 7♥7♥-9♥9♥ (non-consecutive)
  - Trump + non-trump pairs mixed

## Smart Card Selection

The game features intelligent card selection to help with combination play:

### Auto-Selection Features
- **Pair Detection**: Tap any card in a pair → both cards selected automatically
- **Tractor Priority**: When leading, prioritizes tractors over pairs for optimal play
- **Following Logic**: Auto-selects matching combination type when possible
- **Toggle Control**: Tap selected card again to deselect and choose manually

### Selection Strategy
- **Leading**: Prioritizes strongest available combinations
- **Following**: Attempts to match the led combination type
- **Fallback**: Single card selection when no combinations available
- **Manual Override**: Always allows manual selection by toggling cards

## Scoring & Advancement

### Point Values
- **5s**: 5 points each
- **10s**: 10 points each  
- **Kings**: 10 points each
- **All other cards**: 0 points

### Win Conditions
- **Attacking Team Success**: Collect 80+ points in the round
- **Defending Team Success**: Hold attacking team below 80 points
- **Game Victory**: First team to advance to Ace rank

### Rank Advancement
Based on attacking team performance:
- **80-99 points**: Advance 1 rank
- **100-119 points**: Advance 2 ranks  
- **120+ points**: Advance 3 ranks
- **Under 80 points**: No advancement (defending team advances instead)

## Strategic Tips

### General Strategy
- **Point Management**: Focus on collecting 5s, 10s, and Kings
- **Trump Conservation**: Save trump cards for critical moments
- **Combination Building**: Build pairs and tractors for stronger plays
- **Team Coordination**: Work with your AI teammate

### Positional Play
- **Leading**: Control the trick direction, probe for information
- **Following**: Balance point collection with combination requirements
- **Late Position**: Maximize point collection or block opponents

### Trump Usage
- **Timing**: Use trumps strategically, not wastefully
- **Conservation**: Save high trumps for important tricks
- **Blocking**: Use trumps to prevent opponent point collection
- **Coordination**: Work with teammate for optimal trump usage

## Common Mistakes

### Card Play Errors
- **Suit Following**: Forgetting to follow suit when possible
- **Combination Matching**: Not matching the led combination type
- **Trump Waste**: Using high trumps unnecessarily
- **Point Timing**: Playing point cards at wrong moments

### Strategic Errors
- **Poor Trump Declaration**: Declaring trump without strong holdings
- **Isolation**: Not coordinating with teammate
- **Point Neglect**: Focusing only on winning tricks, ignoring points
- **Endgame Planning**: Not saving critical cards for final tricks

### Trump Declaration Errors
- **Invalid Single Jokers**: Trying to declare with single jokers (not allowed)
- **Mixed Joker Pairs**: Attempting Small + Big joker pair (invalid)
- **Same Player Suit Switching**: Redeclaring same rank in different suit
- **Weak Override Attempts**: Trying to override with equal or lower strength
- **Cross-Suit Pairs**: Using different suits for pair declarations

## Trump Declaration System

### Declaration Types & Examples

**Valid Declarations:**
- ✅ **Single 2♠** (trump rank 2, spades) - strength 1
- ✅ **Pair 2♥-2♥** (two 2s of hearts) - strength 2
- ✅ **Small Joker Pair** (two small jokers) - strength 3
- ✅ **Big Joker Pair** (two big jokers) - strength 4

**Invalid Declarations:**
- ❌ **Single Small Joker** (jokers cannot declare as singles)
- ❌ **Single Big Joker** (jokers cannot declare as singles)
- ❌ **Mixed Joker Pair** (Small + Big joker)
- ❌ **Cross-suit pair** (2♠ + 2♥)

### Override Rules & Examples

**Same Player Rules:**
- Can only strengthen in the SAME suit
- Cannot redeclare same rank in different suit

*Example:* If you declared 2♠ (single), you can later declare 2♠-2♠ (pair) but NOT 2♥ (single in different suit)

**Different Player Rules:**
- Can override with ANY suit if using stronger combination
- Must use higher strength to override

*Example:* Player A declares 2♠ (single), Player B can override with 2♥-2♥ (pair) or any joker pair

### Declaration Sequence Example

1. **Player A**: Declares 2♠ (single, strength 1)
2. **Player B**: Declares 2♥-2♥ (pair, strength 2) ✅ Valid override
3. **Player A**: Attempts 2♣ (single, strength 1) ❌ Invalid - same player, different suit
4. **Player A**: Gets another 2♠ and declares 2♠-2♠ (pair, strength 2) ❌ Invalid - Player B already overrode with 2♥ pair
5. **Player C**: Declares Small Joker Pair (strength 3) ✅ Valid override
6. **Player D**: Declares Big Joker Pair (strength 4) ✅ Valid override - FINAL

**Result**: Player D wins trump declaration with Big Joker Pair

### Strengthening Example

1. **Player A**: Declares 2♠ (single, strength 1)
2. **Dealing continues**: Player A receives another 2♠
3. **Player A**: Can now declare 2♠-2♠ (pair, strength 2) ✅ Valid strengthening
4. **Player B**: Must use strength 3+ to override (e.g., joker pair)

**Key**: Strengthening only works if your original declaration hasn't been overridden!

### First Round & Kitty Rules

**First Round Team Assignment:**
- **No team roles decided** when game starts
- **Trump declarer's team becomes DEFENDING team** (only for first round)
- **Other team becomes ATTACKING team** (only for first round)
- Trump declarer (Player D above) leads the first trick
- Sets the starting position and team roles for the entire game

**Kitty Cards:**
- Always belong to whoever leads the first trick
- In first round: Trump declarer gets kitty
- In later rounds: Previous trick winner who leads gets kitty

**Important**: After first round, team roles alternate normally between rounds based on performance.

## Advanced Concepts

### Trump Suit Rotation
When trump is declared, the suit order rotates to maintain black-red alternation:
- **No Trump**: ♠ ♥ ♣ ♦
- **Hearts Trump**: ♥ ♣ ♦ ♠
- **Clubs Trump**: ♣ ♦ ♠ ♥
- **Diamonds Trump**: ♦ ♠ ♥ ♣
- **Spades Trump**: ♠ ♥ ♣ ♦

### Equal Strength Rules
- When trump rank cards in different suits have equal strength
- **Rule**: First played wins among equal strength cards
- **Example**: If 2♥ and 2♣ are both played (when Spades trump, rank 2), whichever was played first wins

### Combination Hierarchy
- **Trump combinations** always beat **non-trump combinations** of same type
- **Higher combinations** (tractors) beat **lower combinations** (pairs) beat **singles**
- **Within same type**: Higher cards beat lower cards
- **Following**: Must play same combination type if possible