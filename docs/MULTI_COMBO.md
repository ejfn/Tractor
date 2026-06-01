# Multi-Combo Documentation

**Complete guide to multi-combo implementation in Tractor**

*Related Documentation: [Game Rules](GAME_RULES.md) | [AI System](AI_SYSTEM.md) | [AGENTS.md](../AGENTS.md)*

---

## What is a Multi-Combo?

In Tractor/Shengji, a **multi-combo** is multiple combos from the same suit played simultaneously:

- **`A♥ + K♥ + Q♥`** = 3 singles from Hearts
- **`A♥A♥ + K♥`** = pair + single from Hearts  
- **`K♥K♥-Q♥Q♥ + J♥ + 9♥`** = tractor + singles from Hearts

**🚨 CRITICAL RULES:**
- **Same suit only**: All combos must be from the same non-trump suit for leading
- **Unbeatable requirement**: Each component combo must be unbeatable OR all other players must be void in that suit
- **ALL OTHER THREE PLAYERS**: Multi-combo validation considers all 3 other players (teammates + opponents)

---

## Implementation

Multi-combo handling spans a few modules. This is the conceptual map — see the named source files for the exact signatures and logic.

**Detection & structure** (`multiComboAnalysis.ts`): a play is a multi-combo when it contains more than one combo from a single suit (it has no single overall combo type). Detection summarises the play's *structure* — total length, number of pairs, and the tractors and their sizes — which is what a following play must match.

**Leading** — validity is checked in `playValidation.ts` (human plays) and proposed by `candidateLeadDetection.ts` (AI). A multi-combo lead is legal only when **every component is unbeatable** by the three other players' unseen cards, **or** all three other players are **void** in the suit. The AI proposes such a lead only when it can find two or more unbeatable components in one suit.

**Unbeatable check** (`isComboUnbeatable` in `multiComboValidation.ts`): a component is unbeatable when no stronger same-suit combo can still exist in the unseen cards — derived from the memory of played cards, the player's own hand, and (for the round starter) the visible kitty.

**Following** (`multiComboFollowingStrategy.ts`): match the led structure in the same suit if possible; otherwise beat it with a matching trump structure; otherwise dispose. If the player runs out of the led suit mid-play, the **exhaustion rule** makes any remaining cards legal.

**Trump-vs-trump** (`cardComparison.ts`): when two trump responses compete, the higher *highest-component type* wins (tractor > pair > single), with ties broken on card strength.

---

## AI Integration

**Leading**: the leading strategy treats an unbeatable multi-combo as a top-priority lead (`leadingStrategy.ts` / `candidateLeadDetection.ts`).

**Following**: when the led play is a multi-combo, `followingStrategy.ts` routes to `executeMultiComboFollowingAlgorithm` instead of the regular following logic.

> On the optional LLM path, multi-combo following is short-circuited to this same
> `executeMultiComboFollowingAlgorithm` (logged as `llm_adaptive_shortcut_follow_multi_combo`)
> — the model is not consulted, since the response is deterministic.

---

## Game Rules Integration

### Leading Rules

1. **Non-trump suits only**: Cannot lead trump multi-combos
2. **Unbeatable requirement**: Each component must be unbeatable by all other 3 players
3. **Void exception**: Can lead any multi-combo if all others void in that suit

### Following Rules

1. **Structure matching**: Must match total length and try to match combo types
2. **Trump responses**: Can beat non-trump multi-combos with trump structure match
3. **Exhaustion rule**: If void after play → any combination is valid
4. **Trump vs trump**: Highest combo type wins (tractors > pairs > singles)

---

## Examples

### Valid Multi-Combo Leads

```typescript
// Example 1: All unbeatable singles
Cards: [A♠, K♠, Q♠]
Played: [A♠, K♠, Q♠] (other copies already played)
Result: ✅ Valid multi-combo lead

// Example 2: Mix of unbeatable combos  
Cards: [A♠, A♠, K♠, J♠, J♠]
Structure: A♠A♠ (unbeatable pair) + K♠ (unbeatable single) + J♠J♠ (unbeatable pair)
Result: ✅ Valid multi-combo lead

// Example 3: Void suit exploitation
Cards: [7♠, 8♠, 9♠] (all others void in Spades)
Result: ✅ Valid multi-combo lead (void exception)
```

### Following Examples

```typescript
// Example 1: Same-suit structure match
Leading: K♠ + Q♠ + J♠ (3 singles)
Response: 10♠ + 9♠ + 8♠ (3 singles, same suit)
Result: ✅ Valid following

// Example 2: Trump structure match
Leading: K♠ + Q♠ + J♠ (3 singles, non-trump)
Response: 5♥ + 4♥ + 3♥ (3 trump singles)
Result: ✅ Valid trump response

// Example 3: Exhaustion rule
Leading: K♠ + Q♠ + J♠ + 10♠ (4 singles)
Hand: [9♠, 8♠, 7♠, 5♥] (only 3 spades left)
Response: 9♠ + 8♠ + 7♠ + 5♥ (3 spades + 1 other)
Result: ✅ Valid by exhaustion rule
```

---

## Design Notes

The implementation favours correctness and maintainability: one structure analysis drives detection, following is priority-based routing, and the exhaustion rule is checked early.

---

## See Also

- **[Game Rules](GAME_RULES.md)** - Complete game rules including multi-combo regulations
- **[AI System](AI_SYSTEM.md)** - AI decision-making integration
- **[AGENTS.md](../AGENTS.md)** - Development guidelines and architecture