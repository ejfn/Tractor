# Game Rules Reference

**Comprehensive Rules & Strategy Guide for Tractor (升级/Shengji)**

*For AI details, see **[AI System](AI_SYSTEM.md)** | For development, see **[CLAUDE.md](../CLAUDE.md)***

---

## Quick Start (New Players)

**Never played Tractor?** Here's everything you need for your first game:

### **The Goal**
Work with your AI teammate to collect 80+ points per round and advance through card ranks from 2 to Ace. First team to Ace wins!

### **Your Team**
- **You + Bot 2** vs **Bot 1 + Bot 3**
- Play goes counter-clockwise: You → Bot 1 → Bot 2 → Bot 3

### **Key Points to Remember**
1. **Point Cards**: Only 5s (5pts), 10s (10pts), and Kings (10pts) are worth points
2. **Trump Cards**: Beat all non-trump cards. Jokers are always trump.
3. **Follow Suit**: Must play same suit as led if you have it
4. **Combinations**: Can play singles, pairs (identical cards), or tractors (consecutive pairs)
5. **80 Points**: Your team needs 80+ points to advance ranks

### **During Play**
- **Trump Declaration**: During dealing, you can declare trump with pairs or jokers
- **Smart Selection**: Tap cards - the game auto-selects good combinations
- **Kitty Cards**: If you win trump declaration, you get 8 bonus cards to manage
- **Final Trick**: Winning the last trick can give huge bonus points!

**That's it!** The AI will help guide you. For detailed rules, see sections below.

---

## Quick Lookup Tables

| **Topic** | **Key Rule** | **Details** |
|-----------|-------------|-------------|
| **Deck** | 2 decks + 4 jokers = 108 cards | [Game Setup](#game-setup) |
| **Card Distribution** | 25 per player + 8 kitty → 33 after pickup | [Kitty Management](#kitty-management) |
| **Trump Hierarchy** | BJ > SJ > Trump Rank > Trump Suit | [Trump System](#trump-system) |
| **Points** | 5s=5pts, 10s=10pts, Kings=10pts (200 total) | [Point Values](#point-values) |
| **Advancement** | 80+ points to advance ranks | [Scoring System](#scoring-system) |
| **Victory** | First team to Ace rank wins | [Victory Conditions](#victory-conditions) |

### **Trump Declaration Strength**
1. **Big Joker Pair** (strength 4) - Strongest
2. **Small Joker Pair** (strength 3)
3. **Regular Pair** (strength 2) - Two identical trump rank cards
4. **Single** (strength 1) - One trump rank card

### **Combination Types**
- **Singles**: Any individual card
- **Pairs**: Two identical cards (same rank AND suit)
- **Tractors**: 2+ consecutive pairs of same suit

### **Following Priority (Tractor)**
1. Tractor (same # pairs) → 2. Same # pairs → 3. All pairs → 4. Singles → 5. Other suits

---

## Table of Contents

1. [Game Setup](#game-setup)
2. [Progressive Dealing & Trump Declaration](#progressive-dealing--trump-declaration)
3. [Kitty Management](#kitty-management)
4. [Trump System](#trump-system)
5. [Card Combinations](#card-combinations)
6. [Trick Play Rules](#trick-play-rules)
7. [Following Rules](#following-rules)
8. [Scoring System](#scoring-system)
9. [Victory Conditions](#victory-conditions)
10. [Special Rules & Edge Cases](#special-rules--edge-cases)
11. [Strategy Guidelines](#strategy-guidelines)

---

## Game Setup

### **Players & Teams**
- **4 Players**: Human + 3 AI bots
- **2 Teams**: 
  - **Team A**: You + Bot 2
  - **Team B**: Bot 1 + Bot 3
- **Play Order**: Counter-clockwise (Human → Bot 1 → Bot 2 → Bot 3)

### **Deck Composition**
- **2 Standard Decks**: 104 cards (52 × 2)
- **4 Jokers**: 2 Big Jokers + 2 Small Jokers
- **Total**: 108 cards

### **Point Values**
- **5s**: 5 points each (8 cards = 40 points)
- **10s**: 10 points each (8 cards = 80 points)
- **Kings**: 10 points each (8 cards = 80 points)
- **All others**: 0 points
- **Total Available**: 200 points

### **Starting Conditions**
- **Both teams start at rank 2**
- **Team roles determined by trump declaration** (first round only)
- **Goal**: Advance through ranks 2→3→4→5→6→7→8→9→10→J→Q→K→A

---

## Progressive Dealing & Trump Declaration

### **Dealing Process**
- **Cards dealt one-by-one** around the table
- **100 cards to players** (25 each), **8 cards to kitty**
- **Real-time trump opportunities** during dealing
- **AI automatic evaluation**, **Human can pause to declare**

### **Trump Declaration System**

#### **Declaration Types & Requirements**
| **Type** | **Requirement** | **Strength** | **Notes** |
|----------|----------------|--------------|-----------|
| **Single** | One trump rank card | 1 | NO jokers allowed |
| **Pair** | Two identical trump rank cards | 2 | Same rank + same suit |
| **Small Joker Pair** | Two Small Jokers | 3 | Must be identical |
| **Big Joker Pair** | Two Big Jokers | 4 | Strongest possible |

#### **Declaration Rules**
- **Available throughout dealing phase**
- **Stronger declarations override weaker ones**
- **Same player**: Can only strengthen in SAME suit
- **Different players**: Can override with ANY suit using higher strength
- **Final opportunity**: Human gets last chance at end of dealing

#### **Examples**
- ✅ **Valid Override**: Player A declares 2♠ (single), Player B overrides with 3♥-3♥ (pair)
- ✅ **Valid Strengthening**: Player A declares 2♠ (single), gets another 2♠, upgrades to 2♠-2♠ (pair)
- ❌ **Invalid**: Player A declares 2♠, then tries to declare 2♥ (same rank, different suit)

### **First Round Special Rules**
- **Trump declarer's team becomes DEFENDING team** (only round 1)
- **Other team becomes ATTACKING team** (only round 1)
- **Trump declarer leads first trick and manages kitty**
- **Subsequent rounds**: Roles alternate based on performance

---

## Kitty Management

### **Who Manages Kitty**
- **First Round**: Trump declarer (winner of final declaration)
- **Later Rounds**: Winner of previous round (round starting player)

### **Kitty Process**

#### **1. Pickup Phase**
- **Automatic**: 8 kitty cards added to hand
- **Total cards**: 25 (original) + 8 (kitty) = **33 cards**
- **Game enters kitty swap phase**

#### **2. Swap Phase**
- **Must select exactly 8 cards** to put back
- **Can choose any combination** of original + kitty cards
- **Strategic decision**: Balance hand optimization vs kitty scoring potential

#### **3. Scoring Rules**
- **Hidden during play**: Kitty cards not revealed
- **Critical endgame rule**: Only scored if attacking team wins FINAL trick
- **Multiplier system**:
  - **Singles final trick**: Kitty points × 2
  - **Pairs/Tractors final trick**: Kitty points × 4

#### **Kitty Bonus Examples**
- **Scenario**: Kitty contains 2 Kings + 1 Five = 25 points
- **Singles final win**: 25 × 2 = **+50 bonus points**
- **Pair final win**: 25 × 4 = **+100 bonus points**
- **Can change 80 points → 180 points** (massive swing!)

---

## Trump System

### **Trump Hierarchy** (Highest to Lowest)

#### **Complete Trump Order**
1. **Big Joker** - Always highest trump
2. **Small Joker** - Always second highest trump
3. **Trump Rank in Trump Suit** - (e.g., 2♠ when rank 2, Spades trump)
4. **Trump Rank in Off-Suits** - Equal strength, first played wins
5. **Trump Suit Cards** - A, K, Q, J, 10, 9, 8, 7, 6, 5, 4, 3 of trump suit

#### **Example: Rank 2, Spades Trump**
**BJ** > **SJ** > **2♠** > **2♥=2♣=2♦** > **A♠** > **K♠** > **Q♠** > **J♠** > **10♠** > **9♠** > **8♠** > **7♠** > **6♠** > **5♠** > **4♠** > **3♠**

### **Trump Properties**
- **All trump cards beat all non-trump cards**
- **Trump rank cards are trump regardless of suit**
- **Jokers are always trump regardless of declaration**
- **Equal strength rule**: Among equal trump rank off-suits, first played wins

### **Non-Trump Cards**
- **Within suit ranking**: A > K > Q > J > 10 > 9 > 8 > 7 > 6 > 5 > 4 > 3
- **Cannot beat trump cards**
- **Cross-suit**: Different non-trump suits cannot beat each other

---

## Card Combinations

### **Singles**
- **Definition**: Any individual card
- **Rules**: Must follow suit if possible, trump beats non-trump
- **Usage**: Basic play, card disposal

### **Pairs**
- **Definition**: Two identical cards (same rank AND same suit)
- **Valid Examples**:
  - 8♥-8♥ (two 8 of Hearts)
  - Small Joker-Small Joker
  - Big Joker-Big Joker
- **Invalid Examples**:
  - 8♥-8♦ (different suits)
  - Small Joker + Big Joker (different joker types)

### **Tractors**
- **Definition**: Two or more consecutive pairs of the same suit
- **Valid Examples**:
  - 7♥7♥-8♥8♥ (two consecutive pairs)
  - 5♠5♠-6♠6♠-7♠7♠ (three consecutive pairs)
  - Small Joker Pair + Big Joker Pair (consecutive trump pairs)
- **Invalid Examples**:
  - 7♥7♥-8♦8♦ (different suits)
  - 7♥7♥-9♥9♥ (non-consecutive, missing 8)
  - Trump + non-trump pairs mixed

### **Combination Strength**
- **Trump combinations always beat non-trump** of same type
- **Higher combinations beat lower**: Tractors > Pairs > Singles
- **Within same type**: Higher cards beat lower cards

---

## Trick Play Rules

### **Basic Mechanics**
1. **Leader plays first**: Any valid combination
2. **Followers respond**: Must follow specific rules
3. **Highest wins**: Based on trump hierarchy and combination rules
4. **Winner leads next**: Trick winner leads subsequent trick

### **Leading Rules**
- **Can play any valid combination** from hand
- **Sets combination type** for all followers
- **Strategic choice**: Controls trick direction and information

### **General Following Rules**
1. **Follow suit if possible**: Must play same suit as led
2. **Match combination type**: Must match singles/pairs/tractors if able
3. **Suit exhaustion first**: Use all cards of led suit before others
4. **Trump when out of suit**: Can use trump if no cards of led suit
5. **Any suit last resort**: Play from other suits only when necessary

---

## Following Rules

### **Basic Following Priority**
When a card/combination is led, followers must:
1. **Follow suit + match type** (if possible)
2. **Follow suit + best available combination** (if exact match impossible)
3. **Use ALL remaining cards of led suit** (if insufficient for combination)
4. **Play trump cards** (if out of led suit entirely)
5. **Play any other suit** (if out of both led suit and trump)

### **Tractor Following Rules**
Complex priority system when tractor is led:

#### **Same Suit Response Priority**
1. **Tractors first**: Play tractor with same number of pairs
2. **Matching pairs**: Play same number of pairs (non-consecutive)
3. **All available pairs**: Use all pairs if insufficient for full response
4. **Fill with singles**: Complete response with singles from same suit
5. **Other suits**: Only when led suit completely exhausted

#### **Trump Tractor Special Rules**
When trump tractor is led:
- **Trump suit pairs** count as valid pairs
- **Trump rank pairs** count as valid pairs
- **Joker pairs** count as valid pairs
- **Can mix different trump pair types** in response

#### **Examples**

**Example 1: Hearts Tractor Response**
- **Led**: 9♥9♥-10♥10♥ (2 pairs)
- **Your Hearts**: J♥-J♥, Q♥-Q♥, K♥, A♥
- **Must play**: J♥-J♥ + Q♥-Q♥ (matching pairs)
- **Cannot play**: K♥ + A♥ + J♥ + Q♥ (breaks up pairs)

**Example 2: Insufficient Pairs**
- **Led**: 9♥9♥-10♥10♥ (2 pairs)
- **Your Hearts**: J♥-J♥, Q♥, K♥ (only 1 pair)
- **Must play**: J♥-J♥ + Q♥ + K♥ (all your Hearts)

**Example 3: Trump Tractor Response**
- **Led**: 3♠3♠-4♠4♠ (trump tractor, 2 pairs)
- **Your trump**: 2♥-2♥ + 5♠-5♠ (trump rank pair + trump suit pair)
- **Can play**: 2♥-2♥ + 5♠-5♠ (valid trump pairs response)

### **Cross-Suit Trump Victory**
**Special rule**: When completely out of led suit, can win with trump combination of same type:
- **Hearts tractor led**, you have no Hearts
- **Can win with trump tractor** of same size
- **Must match combination type** (singles/pairs/tractors)

---

## Scoring System

### **Point Collection**
Teams collect points from tricks they win:
- **5s**: 5 points each
- **10s**: 10 points each
- **Kings**: 10 points each
- **Running total** tracked throughout round

### **Round Advancement**
Based on attacking team's total points:

| **Points Collected** | **Result** |
|---------------------|------------|
| **160+ points** | Attacking team advances 2 ranks |
| **120-159 points** | Attacking team advances 1 rank |
| **80-119 points** | No advancement, teams switch roles |
| **40-79 points** | Defending team advances 1 rank |
| **0-39 points** | Defending team advances 2 ranks |

### **Team Role Changes**
- **80+ points**: Attacking team becomes defending team next round
- **<80 points**: Defending team remains defending team
- **Roles alternate** based on success/failure

### **Kitty Bonus Impact**
- **Can dramatically change outcomes**: 80 points → 180 points
- **Strategic importance**: Final trick becomes extremely valuable
- **Risk/reward**: Attacking team may sacrifice earlier tricks for final trick

---

## Victory Conditions

### **Game Victory**
- **First team to reach Ace rank wins**
- **Rank progression**: 2→3→4→5→6→7→8→9→10→J→Q→K→**A**
- **Multiple rounds required**: Typically 8-12 rounds
- **Average game time**: 30-45 minutes

### **Round Victory**
- **Attacking team**: Needs 80+ points to succeed
- **Defending team**: Needs to hold attackers under 80 points
- **Advancement varies** based on point margin

---

## Special Rules & Edge Cases

### **Equal Strength Trump Cards**
- **Trump rank off-suits have equal strength**
- **First played wins** among equal cards
- **Example**: 2♥ vs 2♣ (when Spades trump) - first played wins

### **Joker Pair Rules**
- **Small Jokers only pair with Small Jokers**
- **Big Jokers only pair with Big Jokers**
- **Never mix Small + Big** in a pair
- **Both types always trump** regardless of declared suit

### **Declaration Edge Cases**
- **Same player strengthening**: Must be same suit as original declaration
- **Override timing**: Can happen anytime during dealing
- **Final opportunity**: Human gets last chance even after dealing completes

### **Kitty Scoring Edge Cases**
- **Only attacking team benefits** from kitty bonus
- **Only if winning final trick** - defending team denial strategy
- **Multiplier based on final trick type** - not kitty contents

---

## Strategy Guidelines

### **Trump Declaration Strategy**
- **Suit length over high cards**: 7+ cards in suit recommended
- **Timing matters**: Peak window at 40-70% of dealing
- **Team coordination**: Consider teammate's likely holdings
- **Override potential**: Evaluate risk of being overridden

### **Kitty Management Strategy**
- **Hand optimization vs scoring potential**
- **Keep valuable combinations** (pairs, tractors)
- **Consider endgame scenarios** (final trick importance)
- **Balance point cards** in kitty vs hand

### **Trick Play Strategy**
- **Point collection focus**: Target 5s, 10s, Kings
- **Trump conservation**: Save high trump for critical moments
- **Team coordination**: Support teammate when winning
- **Endgame planning**: Final trick can change everything

### **Following Strategy**
- **Combination preservation**: Don't break pairs unnecessarily
- **Trump timing**: Use trump strategically, not wastefully
- **Information gathering**: Watch opponent plays for future planning
- **Defensive play**: Avoid giving points when opponent winning

---

## Index

### **By Game Phase**
- **Setup**: [Game Setup](#game-setup)
- **Dealing**: [Progressive Dealing](#progressive-dealing--trump-declaration)
- **Kitty**: [Kitty Management](#kitty-management)
- **Playing**: [Trick Play Rules](#trick-play-rules), [Following Rules](#following-rules)
- **Scoring**: [Scoring System](#scoring-system)

### **By Card Type**
- **Trump**: [Trump System](#trump-system), [Trump Declaration](#progressive-dealing--trump-declaration)
- **Combinations**: [Card Combinations](#card-combinations)
- **Points**: [Point Values](#point-values), [Scoring System](#scoring-system)

### **By Rule Type**
- **Basic Rules**: [Trick Play Rules](#trick-play-rules)
- **Complex Rules**: [Following Rules](#following-rules), [Tractor Following](#following-rules)
- **Special Cases**: [Special Rules & Edge Cases](#special-rules--edge-cases)

---

**Related Documentation:**
- **[AI System](AI_SYSTEM.md)** - AI intelligence documentation
- **[CLAUDE.md](../CLAUDE.md)** - Development guidelines