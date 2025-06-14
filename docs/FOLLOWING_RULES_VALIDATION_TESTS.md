# Following Rules Validation Tests

**Comprehensive documentation of all following validation test scenarios in the Tractor codebase**

*This document catalogs every test scenario that validates following play rules using `isValidPlay()`. These tests ensure the complex Shengji/Tractor game rules are correctly implemented when responding to led combinations.*

## ⚠️ CRITICAL SYNCHRONIZATION REQUIREMENT

**🚨 MANDATORY: This documentation MUST stay perfectly synchronized with the actual test files!**

- **Any change to test IDs, descriptions, or test scenarios in the code files MUST be reflected here**
- **Any change to this documentation MUST be verified against the actual test files**
- **Test counts, numbering, and descriptions must match exactly between docs and code**
- **Before any commit: Verify every test listed here exists in the corresponding test file**

**Test Files Location**: `__tests__/followingRulesValidation/`

---

**🎯 Test Purity**: All FRV tests focus exclusively on following rules validation using the `isValidPlay()` function. No other game logic functions are tested in these files.

---

## Overview

The play validation system enforces the complex rules of Tractor/Shengji card game for **following plays only**. After the recent test reorganization that consolidated 8 historical bug-based files into 4 logical rule-based categories, this document serves as a comprehensive reference for all following validation test coverage.

**Core Following Rules Tested:**
- Basic Suit Following (combination matching, length requirements, pair following)
- Void and Cross-Suit Rules (when void in led suit, mixed combinations, edge cases)
- Trump Unification (jokers + trump rank + trump suit = single group)
- Tractor Following Priority (pairs before singles, same-suit preservation)

**Test Coverage:**
- **Total Tests**: 59 comprehensive test scenarios across 4 test files
- **FRV-1**: 13 single card following tests
- **FRV-2**: 20 pair following tests  
- **FRV-3**: 18 tractor following tests
- **FRV-4**: 8 trump unification tests

---

# Following Validation Test Coverage (Reorganized Structure)

## 1. Single Following Rules
**File**: [`__tests__/followingRulesValidation/singleFollowingRules.test.ts`](../__tests__/followingRulesValidation/singleFollowingRules.test.ts)

**Purpose**: Tests fundamental single card following requirements including same-suit following, trump unification, cross-suit scenarios, and trump exhaustion cases.

| Test ID | Trump Info | Leading Cards | Player Hand | Attempted Play | Expected | Description |
|---------|------------|---------------|-------------|----------------|----------|-------------|
| FRV-1.1 | 2 ♠️ | 5♥️ | K♥️ A♣️ Q♦️ | K♥️ + A♣️ Q♦️ | ✅ + ❌ | Basic same-suit single following |
| FRV-1.2 | 2 ♠️ | 5♥️ | A♥️ K♥️ 3♥️ Q♣️ | A♥️ K♥️ 3♥️ + Q♣️ | ✅ + ❌ | Multiple same-suit cards - any valid |
| FRV-1.3 | 2 ♠️ | 5♥️ | A♣️ K♦️ Q♠️ | A♣️ K♦️ Q♠️ | ✅ VALID | Cross-suit valid when void in led suit |
| FRV-1.4 | 2 ♠️ | 5♥️ | A♠️ K♣️ Q♦️ | A♠️ K♣️ Q♦️ | ✅ VALID | Must use trump when void in non-trump lead |
| FRV-1.5 | 2 ♥️ | 5♥️ | A♥️ K♥️ Q♣️ | A♥️ K♥️ + Q♣️ | ✅ + ❌ | Trump suit single following |
| FRV-1.6 | 2 ♥️ | 🃏 | 🃟 🃏 K♣️ | 🃟 🃏 + K♣️ | ✅ + ❌ | Joker single following |
| FRV-1.7 | 2 ♥️ | 2♠️ | 2♥️ 2♣️ K♦️ | 2♥️ 2♣️ + K♦️ | ✅ + ❌ | Trump rank single following |
| FRV-1.8 | 2 ♥️ | 5♥️ | A♥️ 🃏 K♣️ | A♥️ 🃏 + K♣️ | ✅ + ❌ | Trump unification - all trump types valid when trump led |
| FRV-1.9 | 2 ♥️ | 5♥️ | A♠️ K♣️ Q♦️ | A♠️ K♣️ Q♦️ | ✅ VALID | Non-trump valid when no trump cards left |
| FRV-1.10 | 2 ♥️ | 2♠️ | 2♣️ A♥️ K♦️ | 2♣️ A♥️ + K♦️ | ✅ + ❌ | Trump rank following when trump rank led |
| FRV-1.11 | 2 ♥️ | K♠️ | Q♠️ K♣️ A♦️ 5♥️ | Q♠️ + K♣️ A♦️ 5♥️ | ✅ + ❌ | Same rank different suit following |
| FRV-1.12 | 2 ♥️ | K♣️ | A♥️ Q♠️ J♦️ | A♥️ Q♠️ J♦️ | ✅ VALID | Cross-suit valid when void in non-trump lead |
| FRV-1.13 | 2 ♥️ | K♥️ | A♥️ Q♠️ J♦️ | A♥️ + Q♠️ J♦️ | ✅ + ❌ | Must use trump when trump lead and trump available |

## 2. Pair Following Rules
**File**: [`__tests__/followingRulesValidation/pairFollowingRules.test.ts`](../__tests__/followingRulesValidation/pairFollowingRules.test.ts)

**Purpose**: Tests fundamental pair following requirements including combination matching, length validation, void scenarios, and cross-suit following rules.

| Test ID | Trump Info | Leading Cards | Player Hand | Attempted Play | Expected | Description |
|---------|------------|---------------|-------------|----------------|----------|-------------|
| FRV-2.1 | 2 ♠️ | 3♥️ 3♥️ | 7♥️ 7♥️ 8♣️ | 7♥️ + 7♥️ 7♥️ | ❌ + ✅ | Basic combination length validation |
| FRV-2.2 | 2 ♠️ | 3♥️ 3♥️ | 7♥️ 7♥️ 8♥️ 9♣️ | 7♥️ 7♥️ | ✅ VALID | Must use same-suit pair when available |
| FRV-2.3 | 2 ♠️ | 3♥️ 3♥️ | 7♥️ 7♥️ 8♥️ 9♣️ | 7♥️ 9♣️ | ❌ INVALID | Cannot mix suits when same-suit pair available |
| FRV-2.4 | 2 ♠️ | 3♥️ 3♥️ | 7♥️ 8♣️ 9♦️ | 7♥️ 8♣️ | ✅ VALID | Must include leading suit when insufficient |
| FRV-2.5 | 2 ♠️ | 3♥️ 3♥️ | 7♥️ 8♣️ 9♦️ | 8♣️ 9♦️ | ❌ INVALID | Cannot skip leading suit card |
| FRV-2.6 | 2 ♠️ | 3♥️ 3♥️ | 7♣️ 8♣️ 9♦️ | 7♣️ 8♣️ | ✅ VALID | Clubs combo valid when no Hearts |
| FRV-2.7 | 2 ♠️ | K♥️ K♥️ | Q♥️ J♥️ A♠️ | Q♥️ J♥️ | ✅ VALID | Two different leading suit cards OK |
| FRV-2.8 | 2 ♠️ | K♥️ K♥️ | Q♥️ J♥️ 10♥️ A♠️ | Q♥️ J♥️ | ✅ VALID | Mixed Hearts valid when no pairs available |
| FRV-2.9 | 2 ♥️ | 4♦️ 4♦️ | A♣️ A♣️ 7♦️ 7♦️ | A♣️ A♣️ | ❌ INVALID | Must follow suit when available |
| FRV-2.10 | 2 ♥️ | 4♦️ 4♦️ | A♣️ A♣️ 7♠️ 8♥️ | A♣️ A♣️ | ✅ VALID | Valid when void in led suit |
| FRV-2.11 | 2 ♠️ | 5♠️ 5♠️ | A♠️ Q♠️ 7♥️ | A♠️ Q♠️ | ✅ VALID | Trump singles when no trump pairs |
| FRV-2.12 | 2 ♥️ | 5♥️ 5♥️ | 🃏 🃏 A♥️ K♥️ Q♠️ | 🃏 🃏 + A♥️ K♥️ | ✅ + ❌ | Must use joker pairs when leading trump pairs |
| FRV-2.13 | 2 ♥️ | 5♥️ 5♥️ | 2♠️ 2♠️ A♥️ K♥️ Q♣️ | 2♠️ 2♠️ + A♥️ K♥️ | ✅ + ❌ | Must use trump rank pairs when leading trump pairs |
| FRV-2.14 | 2 ♥️ | 5♥️ 5♥️ | A♥️ A♥️ K♥️ Q♥️ J♣️ | A♥️ A♥️ + K♥️ Q♥️ | ✅ + ❌ | Must use trump suit pairs when leading trump pairs |
| FRV-2.15 | 2 ♥️ | 5♥️ 5♥️ | A♥️ A♥️ K♠️ K♠️ Q♣️ | A♥️ A♥️ + K♠️ K♠️ | ✅ + ❌ | Cannot use non-trump when trump pairs available |
| FRV-2.16 | 2 ♥️ | 5♥️ 5♥️ | 🃏 A♥️ 2♠️ K♣️ | 🃏 A♥️ | ✅ VALID | Trump singles valid when no trump pairs |
| FRV-2.17 | 2 ♥️ | 5♥️ 5♥️ | 🃏 A♥️ K♠️ Q♣️ | 🃏 A♥️ + K♠️ Q♣️ | ✅ + ❌ | Cannot use non-trump singles when trump singles available |
| FRV-2.18 | 2 ♥️ | 5♥️ 5♥️ | K♠️ Q♣️ J♦️ 10♠️ | K♠️ Q♣️ | ✅ VALID | Non-trump singles valid when no trump cards left |
| FRV-2.19 | 2 ♥️ | 5♥️ 5♥️ | 🃟 🃟 🃏 A♥️ K♠️ | 🃟 🃟 + 🃏 A♥️ | ✅ + ❌ | Mixed trump types - joker hierarchy |
| FRV-2.20 | 2 ♥️ | 5♥️ 5♥️ | 🃏 🃟 2♠️ A♥️ K♣️ | 🃏 🃟, 🃏 2♠️, 🃟 A♥️ + 🃏 K♣️ | ✅ + ❌ | Mixed trump singles when no trump pairs |

## 3. Tractor Following Rules
**File**: [`__tests__/followingRulesValidation/tractorFollowingRules.test.ts`](../__tests__/followingRulesValidation/tractorFollowingRules.test.ts)

**Purpose**: Tests complex tractor following scenarios including pair priority, tractor matching, trump tractor rules, and insufficient tractor combinations.

| Test ID | Trump Info | Leading Cards | Player Hand | Attempted Play | Expected | Description |
|---------|------------|---------------|-------------|----------------|----------|-------------|
| FRV-3.1 | 5 ♥️ | 3♦️ 3♦️ 4♦️ 4♦️ | A♦️ A♦️ 8♦️ 7♦️ 7♦️ 6♦️ 2♣️ | 8♦️ 7♦️ 7♦️ 6♦️ | ❌ INVALID | Must use ALL pairs before singles |
| FRV-3.2 | 5 ♥️ | 3♦️ 3♦️ 4♦️ 4♦️ | A♦️ A♦️ 7♦️ 7♦️ 8♦️ 6♦️ 2♣️ | A♦️ A♦️ 7♦️ 7♦️ | ✅ VALID | All pairs used first |
| FRV-3.3 | 5 ♥️ | 3♦️ 3♦️ 4♦️ 4♦️ | A♦️ A♦️ 8♦️ 6♦️ 2♣️ | A♦️ A♦️ 8♦️ 6♦️ | ✅ VALID | Use available pair + singles |
| FRV-3.4 | 5 ♥️ | 3♥️ 3♥️ 4♥️ 4♥️ | A♥️ A♥️ 8♥️ 7♥️ 7♥️ 6♥️ 2♣️ | 8♥️ 7♥️ 7♥️ 6♥️ | ❌ INVALID | Must use ALL trump pairs first |
| FRV-3.5 | 2 ♠️ | 7♥️ 7♥️ 8♥️ 8♥️ | 9♥️ 9♥️ A♠️ A♠️ K♣️ K♣️ Q♦️ J♦️ | 9♥️ A♠️ K♣️ Q♦️ | ❌ INVALID | Same-suit pair preservation |
| FRV-3.6 | 2 ♠️ | 7♥️ 7♥️ 8♥️ 8♥️ | 9♥️ 9♥️ 6♥️ 5♥️ 4♥️ A♠️ K♣️ | 9♥️ 6♥️ 5♥️ 4♥️ | ❌ INVALID | Breaking pair unnecessarily |
| FRV-3.7 | 2 ♠️ | 7♥️ 7♥️ 8♥️ 8♥️ | 9♥️ 9♥️ 6♥️ A♠️ A♠️ K♣️ K♣️ Q♦️ | 9♥️ 6♥️ A♠️ K♣️ | ❌ INVALID | Breaking pair when insufficient Hearts |
| FRV-3.8 | 2 ♠️ | 4♠️ 4♠️ 5♠️ 5♠️ | 6♠️ 6♠️ 7♠️ 8♠️ 9♦️ 10♣️ | 6♠️ 7♠️ 8♠️ 9♦️ | ❌ INVALID | Rule applies to trump combinations too |
| FRV-3.9 | 2 ♠️ | 3♥️ 3♥️ 4♥️ 4♥️ | 7♥️ 7♥️ 8♥️ 8♥️ 9♣️ | 7♥️ 7♥️ 8♥️ 8♥️ | ✅ VALID | Tractor-to-tractor matching |
| FRV-3.10 | 2 ♠️ | 3♥️ 3♥️ 4♥️ 4♥️ | 6♥️ 6♥️ 9♥️ 9♥️ 10♣️ | 6♥️ 6♥️ 9♥️ 9♥️ | ✅ VALID | Non-consecutive pairs when no tractor available |
| FRV-3.11 | 2 ♠️ | 3♥️ 3♥️ 4♥️ 4♥️ 5♥️ 5♥️ | 7♥️ 7♥️ 8♥️ 9♥️ 10♥️ J♥️ 7♣️ | 7♥️ 7♥️ 8♥️ 9♥️ 10♥️ J♥️ | ✅ VALID | Insufficient tractor combinations |
| FRV-3.12 | 2 ♠️ | 3♥️ 3♥️ 4♥️ 4♥️ | 7♥️ 8♥️ 9♣️ 10♦️ | 7♥️ 8♥️ 9♣️ 10♦️ | ✅ VALID | Must use all Hearts + fill with others |
| FRV-3.13 | 2 ♠️ | 3♥️ 3♥️ 4♥️ 4♥️ | 7♥️ 8♥️ 9♣️ 10♦️ | 7♥️ 9♣️ 10♦️ 8♥️ | ✅ VALID | Order doesn't matter if all Hearts included |
| FRV-3.14 | 2 ♠️ | 3♥️ 3♥️ 4♥️ 4♥️ | 7♥️ 8♥️ 9♣️ 10♦️ | 9♣️ 10♦️ 7♥️ 8♥️ | ✅ VALID | Order variation - all Hearts included |
| FRV-3.15 | 2 ♥️ | 7♠️ 7♠️ 8♠️ 8♠️ | 9♠️ 9♠️ 10♠️ 10♠️ K♥️ | 9♠️ 9♠️ 10♠️ 10♠️ | ✅ VALID | Same-suit tractor following |
| FRV-3.16 | 2 ♥️ | 7♠️ 7♠️ 8♠️ 8♠️ | 9♠️ 9♠️ 10♠️ J♠️ K♥️ | 9♠️ 9♠️ 10♠️ J♠️ | ✅ VALID | Use all pairs + singles when insufficient |
| FRV-3.17 | 2 ♥️ | 7♠️ 7♠️ 8♠️ 8♠️ | 9♠️ 9♠️ 10♠️ J♠️ K♥️ | 9♠️ 9♠️ K♥️ 10♠️ | ❌ INVALID | Cannot use other suits when same suit available |
| FRV-3.18 | 2 ♥️ | 7♠️ 7♠️ 8♠️ 8♠️ | 9♥️ 9♥️ 10♣️ J♦️ K♥️ | 9♥️ 9♥️ 10♣️ J♦️ | ✅ VALID | Mixed suits when out of leading suit |

## 4. Trump Unification Rules
**File**: [`__tests__/followingRulesValidation/trumpUnificationRules.test.ts`](../__tests__/followingRulesValidation/trumpUnificationRules.test.ts)

**Purpose**: Tests mixed trump tractors that demonstrate trump unification - unique combinations only possible because ALL trump cards (jokers + trump rank + trump suit) are treated as the same suit.

| Test ID | Trump Info | Leading Cards | Player Hand | Attempted Play | Expected | Description |
|---------|------------|---------------|-------------|----------------|----------|-------------|
| FRV-4.1 | 2 ♥️ | 5♥️ 5♥️ 6♥️ 6♥️ | 🃏 🃏 🃟 🃟 A♥️ A♥️ K♦️ | 🃏 🃏 🃟 🃟 | ✅ VALID | Big Joker pair + Small Joker pair forms consecutive joker tractor |
| FRV-4.2 | 2 ♥️ | 5♥️ 5♥️ 6♥️ 6♥️ | 🃏 🃏 🃟 🃟 A♥️ A♥️ K♦️ | 🃏 🃏 A♥️ A♥️ | ❌ INVALID | Must use joker tractor 🃏+🃟 pairs, not break up for other combinations |
| FRV-4.3 | 2 ♥️ | 5♥️ 5♥️ 6♥️ 6♥️ | 2♥️ 2♥️ 2♠️ 2♠️ 2♣️ 2♣️ K♦️ | 2♥️ 2♥️ 2♠️ 2♠️ | ✅ VALID | Trump suit rank pair + off-suit rank pair forms valid tractor |
| FRV-4.4 | 2 ♥️ | 5♥️ 5♥️ 6♥️ 6♥️ | 2♥️ 2♥️ 2♠️ 2♠️ 2♣️ 2♣️ K♦️ | 2♠️ 2♠️ 2♣️ 2♣️ | ❌ INVALID | Cannot use only off-suit rank pairs when trump suit rank pair available |
| FRV-4.5 | 7 ♥️ | 3♥️ 3♥️ 4♥️ 4♥️ | 5♥️ 5♥️ 6♥️ 6♥️ 9♥️ 9♥️ K♦️ | 5♥️ 5♥️ 6♥️ 6♥️ | ✅ VALID | Standard consecutive pairs within trump suit (no skip-rank) |
| FRV-4.6 | 7 ♥️ | 3♥️ 3♥️ 4♥️ 4♥️ | 5♥️ 5♥️ 6♥️ 6♥️ 9♥️ 9♥️ K♦️ | 6♥️ 6♥️ 9♥️ 9♥️ | ❌ INVALID | Cannot form 6-9 tractor when gap spans multiple ranks |
| FRV-4.7 | 2 ♥️ | 5♥️ 5♥️ 6♥️ 6♥️ | 3♥️ 3♥️ 4♥️ 4♥️ A♣️ A♣️ K♦️ | 3♥️ 3♥️ A♣️ A♣️ | ❌ INVALID | Cannot mix trump tractor with non-trump pairs |
| FRV-4.8 | 2 ♥️ | 5♥️ 5♥️ 6♥️ 6♥️ | 3♥️ 3♥️ 4♥️ 4♥️ A♣️ A♣️ K♦️ | 3♥️ 3♥️ 4♥️ 4♥️ | ✅ VALID | Must use consecutive trump tractor when available |


