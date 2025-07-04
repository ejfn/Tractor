import {
  Card,
  Combo,
  ComboType,
  GameState,
  PlayerId,
  Rank,
  Suit,
  TrumpInfo,
} from "../types";
import { gameLogger } from "../utils/gameLogger";
import { calculateCardStrategicValue, isTrump } from "./cardValue";
import { getComboType, identifyCombos } from "./comboDetection";
import { isValidPlay } from "./playValidation";

// Local helper functions to avoid circular dependencies

// Get the leading suit from a combo
const getLeadingSuit = (combo: Card[]): Suit | undefined => {
  // Find the first card that has a suit
  for (const card of combo) {
    if (card.suit) {
      return card.suit;
    }
  }
  return undefined;
};

/**
 * Get all valid card combinations for a player given the current game state
 *
 * This function consolidates all the game rule validation logic that was previously
 * scattered in the AI layer. It uses the existing isValidPlay function as the
 * foundation to ensure single source of truth for validation rules.
 *
 * @param playerHand Cards in the player's hand
 * @param gameState Current game state
 * @returns Array of valid combinations the player can play
 */
export const getValidCombinations = (
  playerHand: Card[],
  gameState: GameState,
): Combo[] => {
  const { currentTrick, trumpInfo, players, currentPlayerIndex } = gameState;

  // CRITICAL FIX: Check if player should be leading a new trick
  // This happens when:
  // 1. No current trick exists, OR
  // 2. Current trick is completed AND current player won it (should lead next trick)
  const currentPlayer = players[currentPlayerIndex];
  const isTrickComplete =
    currentTrick && currentTrick.plays.length === players.length;
  const isWinnerOfCompletedTrick =
    isTrickComplete && currentTrick.winningPlayerId === currentPlayer.id;

  if (
    !currentTrick ||
    !currentTrick.plays[0]?.cards ||
    isWinnerOfCompletedTrick
  ) {
    gameLogger.info(
      "trick_started",
      {
        playerId: currentPlayer.id,
        reason: !currentTrick
          ? "no_current_trick"
          : !currentTrick.plays[0]?.cards
            ? "no_leading_cards"
            : "won_previous_trick",
        previousTrickComplete: isTrickComplete,
        handSize: playerHand.length,
      },
      `Player ${currentPlayer.id} leading new trick with ${playerHand.length} cards`,
    );
    return identifyCombos(playerHand, trumpInfo);
  }

  // Get all possible combinations from player's hand
  const allCombos = identifyCombos(playerHand, trumpInfo);
  const leadingCards = currentTrick.plays[0].cards;
  const leadingLength = leadingCards.length;

  // ISSUE #104 PROPER FIX: Context-aware combo filtering
  const leadingSuit = getLeadingSuit(leadingCards);
  const isLeadingTrump = leadingCards.some((card) => isTrump(card, trumpInfo));
  const leadingComboType = getComboType(leadingCards, trumpInfo);

  // Check if player has cards of the led suit/trump
  const playerHasMatchingCards = isLeadingTrump
    ? playerHand.some((card) => isTrump(card, trumpInfo))
    : playerHand.some(
        (card) => card.suit === leadingSuit && !isTrump(card, trumpInfo),
      );

  // Filter combinations that match the leading combo length and pass validation
  const validCombos = allCombos.filter((combo) => {
    if (combo.cards.length !== leadingLength) {
      return false;
    }

    // CRITICAL: When out of suit, reject certain combo types from other NON-TRUMP suits
    if (!playerHasMatchingCards && combo.type === leadingComboType) {
      // Player is out of suit/trump and this is a "proper" combo of the same type
      // BUT: Allow trump combos even when out of led suit (trump beats non-trump)
      const comboIsTrump = combo.cards.some((card) => isTrump(card, trumpInfo));
      if (!comboIsTrump) {
        // FIXED: Only reject non-trump PAIRS and TRACTORS when out of suit
        // Singles should always be allowed when out of suit (basic Tractor rule)
        if (combo.type !== ComboType.Single) {
          return false;
        }
      }
    }

    return isValidPlay(
      combo.cards,
      playerHand,
      gameState.players[gameState.currentPlayerIndex].id,
      gameState,
    );
  });

  // Always generate to provide AI with disposal options, even when proper combos exist
  const mixedCombos = generateMixedCombinations(
    playerHand,
    leadingCards,
    trumpInfo,
    gameState,
    currentPlayer.id,
  );

  // Combine proper combos with mixed combos for full strategic options
  const allValidCombos = [...validCombos, ...mixedCombos];

  // Remove duplicates based on card IDs
  const uniqueCombos = allValidCombos.filter(
    (combo, index, array) =>
      array.findIndex(
        (other) =>
          combo.cards.length === other.cards.length &&
          combo.cards.every((card) =>
            other.cards.some((otherCard) => otherCard.id === card.id),
          ),
      ) === index,
  );

  return uniqueCombos;
};

/**
 * CONSOLIDATED: Generates rule-compliant mixed combinations with trump conservation priority
 * Fixed to use single, clean combination generator with proper trump conservation
 */
export const generateMixedCombinations = (
  playerHand: Card[],
  leadingCards: Card[],
  trumpInfo: TrumpInfo,
  gameState: GameState,
  playerId: PlayerId,
): Combo[] => {
  const leadingLength = leadingCards.length;
  const validMixedCombos: Combo[] = [];
  const leadingSuit = getLeadingSuit(leadingCards);
  const isLeadingTrump = leadingCards.some((card) => isTrump(card, trumpInfo));

  // Smart Combination Generator - eliminates exponential complexity
  // Uses hierarchical filtering and pattern-based generation
  const generateSmartCombinations = (
    cards: Card[],
    length: number,
  ): Card[][] => {
    if (length === 1) {
      return cards.map((card) => [card]);
    }
    if (length > cards.length) {
      return [];
    }

    // PERFORMANCE LIMIT: Prevent exponential blowup
    const MAX_COMBINATIONS = 50;
    const MAX_CARDS_FOR_FULL_GENERATION = 15;

    // For large hands, use strategic sampling instead of exhaustive generation
    if (cards.length > MAX_CARDS_FOR_FULL_GENERATION) {
      return generateStrategicSample(
        cards,
        length,
        MAX_COMBINATIONS,
        leadingCards,
      );
    }

    // For smaller hands, use optimized iterative generation
    return generateIterativeCombinations(cards, length, MAX_COMBINATIONS);
  };

  // Strategic sampling for large hands - focus on trump conservation hierarchy
  const generateStrategicSample = (
    cards: Card[],
    length: number,
    maxCombos: number,
    leadingCards: Card[],
  ): Card[][] => {
    const combinations: Card[][] = [];

    // Sort cards by trump conservation hierarchy (weakest first)
    const sortedCards = [...cards].sort((a, b) => {
      const valueA = calculateCardStrategicValue(a, trumpInfo, "basic");
      const valueB = calculateCardStrategicValue(b, trumpInfo, "basic");
      return valueA - valueB; // Weakest first for disposal
    });

    // Strategy 1: Take weakest consecutive cards
    if (sortedCards.length >= length) {
      combinations.push(sortedCards.slice(0, length));
    }

    // Strategy 2: Sliding window through sorted cards
    const windowSize = Math.min(length + 5, sortedCards.length);
    for (
      let start = 0;
      start <= sortedCards.length - windowSize &&
      combinations.length < maxCombos;
      start += 3
    ) {
      const window = sortedCards.slice(start, start + windowSize);
      if (window.length >= length) {
        combinations.push(window.slice(0, length));
      }
    }

    // Strategy 3: Mixed trump/non-trump when appropriate (NOT when following suit/trump)
    const trumpCards = sortedCards.filter((card) => isTrump(card, trumpInfo));
    const nonTrumpCards = sortedCards.filter(
      (card) => !isTrump(card, trumpInfo),
    );

    // CRITICAL FIX: Determine if we're following a suit-specific lead
    const leadingSuit = getLeadingSuit(leadingCards);
    const isLeadingTrump = leadingCards.some((card) =>
      isTrump(card, trumpInfo),
    );

    // Check if player has sufficient relevant cards to properly follow
    const relevantCards = isLeadingTrump
      ? trumpCards
      : cards.filter(
          (card) => card.suit === leadingSuit && !isTrump(card, trumpInfo),
        );
    const hasSufficientRelevantCards = relevantCards.length >= length;

    if (trumpCards.length > 0 && nonTrumpCards.length > 0 && length >= 2) {
      // CRITICAL FIX: Skip Strategy 3 when following suit/trump leads with sufficient relevant cards
      // This prevents invalid mixed combinations like [3♠,6♣,9♠,8♠] when player has enough trump
      const shouldSkipMixedStrategy =
        (isLeadingTrump || leadingSuit) && hasSufficientRelevantCards;

      if (!shouldSkipMixedStrategy) {
        const trumpCount = Math.min(1, trumpCards.length, length - 1);
        const nonTrumpCount = length - trumpCount;

        if (nonTrumpCards.length >= nonTrumpCount) {
          const mixedCombo = [
            ...trumpCards.slice(0, trumpCount),
            ...nonTrumpCards.slice(0, nonTrumpCount),
          ];
          if (mixedCombo.length === length) {
            combinations.push(mixedCombo);
          }
        }
      }
    }

    return combinations.slice(0, maxCombos);
  };

  // Optimized iterative generation for smaller hands
  const generateIterativeCombinations = (
    cards: Card[],
    length: number,
    maxCombos: number,
  ): Card[][] => {
    const combinations: Card[][] = [];
    const totalCards = cards.length;

    // Use bit manipulation for efficient iteration
    const maxMask = (1 << totalCards) - 1;

    for (
      let mask = 0;
      mask <= maxMask && combinations.length < maxCombos;
      mask++
    ) {
      // Count bits set in mask
      let bitCount = 0;
      let tempMask = mask;
      while (tempMask) {
        bitCount += tempMask & 1;
        tempMask >>>= 1;
      }

      if (bitCount === length) {
        const combination: Card[] = [];
        for (let i = 0; i < totalCards; i++) {
          if (mask & (1 << i)) {
            combination.push(cards[i]);
          }
        }
        combinations.push(combination);
      }
    }

    return combinations;
  };

  // PRIORITY 1: Intelligent combination construction with trump conservation
  const constructOptimalCombination = (): Card[] | null => {
    const combo: Card[] = [];

    // Step 1: Use ALL required suit cards (Tractor rule)
    const requiredSuitCards = isLeadingTrump
      ? playerHand.filter((card) => isTrump(card, trumpInfo))
      : playerHand.filter(
          (card) => card.suit === leadingSuit && !isTrump(card, trumpInfo),
        );

    if (requiredSuitCards.length >= leadingLength) {
      // 🚨 CRITICAL FIX: Preserve pairs when following trump tractors
      // Must use ALL pairs before ANY singles when following trump leads

      // First, identify all combos including tractors in required suit cards
      const allCombosInRequiredSuit = identifyCombos(
        requiredSuitCards,
        trumpInfo,
      );

      // CRITICAL FIX: Prioritize tractors over pairs for trump tractor following
      const tractorsInRequiredSuit = allCombosInRequiredSuit
        .filter((combo) => combo.type === ComboType.Tractor)
        .sort((a, b) => b.cards.length - a.cards.length); // Largest tractors first

      const pairsInRequiredSuit = allCombosInRequiredSuit
        .filter((combo) => combo.type === ComboType.Pair)
        .sort((a, b) => {
          // Sort pairs by conservation value of the pair (weakest pairs first)
          const valueA = calculateCardStrategicValue(
            a.cards[0],
            trumpInfo,
            "basic",
          );
          const valueB = calculateCardStrategicValue(
            b.cards[0],
            trumpInfo,
            "basic",
          );
          return valueA - valueB;
        });

      // Use tractors first, then pairs
      const selectedCards: Card[] = [];

      // Priority 1: Use the largest tractor that fits
      for (const tractor of tractorsInRequiredSuit) {
        if (selectedCards.length + tractor.cards.length <= leadingLength) {
          selectedCards.push(...tractor.cards);
          break; // Only use one tractor
        }
      }

      // Priority 2: Use remaining pairs
      for (const pair of pairsInRequiredSuit) {
        // Skip pairs that are already part of selected tractor
        const pairOverlapsWithSelected = pair.cards.some((card) =>
          selectedCards.some((selected) => selected.id === card.id),
        );
        if (
          !pairOverlapsWithSelected &&
          selectedCards.length + 2 <= leadingLength
        ) {
          selectedCards.push(...pair.cards);
        }
      }

      // If we still need more cards, add singles (sorted by conservation)
      if (selectedCards.length < leadingLength) {
        const usedCardIds = new Set(selectedCards.map((c) => c.id));
        const remainingCards = requiredSuitCards
          .filter((card) => !usedCardIds.has(card.id))
          .sort((a, b) => {
            const valueA = calculateCardStrategicValue(a, trumpInfo, "basic");
            const valueB = calculateCardStrategicValue(b, trumpInfo, "basic");
            return valueA - valueB; // Weakest first
          });

        const needed = leadingLength - selectedCards.length;
        selectedCards.push(...remainingCards.slice(0, needed));
      }

      return selectedCards.length === leadingLength ? selectedCards : null;
    }

    // Step 2: Partial suit following - use ALL required suit cards + others
    if (requiredSuitCards.length > 0) {
      combo.push(...requiredSuitCards);

      // 🚨 CRITICAL FIX: When following trump leads, must exhaust ALL trump cards before non-trump
      if (isLeadingTrump) {
        // For trump leads: Use ALL remaining trump cards before any non-trump cards
        const allTrumpCards = playerHand.filter((card) =>
          isTrump(card, trumpInfo),
        );
        const remainingTrumpCards = allTrumpCards.filter(
          (card) => !combo.some((c) => c.id === card.id),
        );

        // Add ALL remaining trump cards first
        combo.push(...remainingTrumpCards);

        // Only if we still need more cards, add non-trump cards
        if (combo.length < leadingLength) {
          const nonTrumpCards = playerHand
            .filter((card) => !isTrump(card, trumpInfo))
            .filter((card) => !combo.some((c) => c.id === card.id))
            .sort((a, b) => {
              const valueA = calculateCardStrategicValue(
                a,
                trumpInfo,
                "strategic",
              );
              const valueB = calculateCardStrategicValue(
                b,
                trumpInfo,
                "strategic",
              );
              return valueA - valueB; // Weakest first
            });

          const remaining = leadingLength - combo.length;
          combo.push(...nonTrumpCards.slice(0, remaining));
        }
      } else {
        // For non-trump leads: Use original logic (strategic value sorting)
        const remainingCards = playerHand
          .filter((card) => !combo.some((c) => c.id === card.id))
          .sort((a, b) => {
            const valueA = calculateCardStrategicValue(
              a,
              trumpInfo,
              "strategic",
            );
            const valueB = calculateCardStrategicValue(
              b,
              trumpInfo,
              "strategic",
            );
            return valueA - valueB; // Weakest first
          });

        const remaining = leadingLength - combo.length;
        combo.push(...remainingCards.slice(0, remaining));
      }

      return combo.length === leadingLength ? combo : null;
    }

    // Step 3: No required suit cards - choose weakest cards while preserving pairs when strategic
    // 🚨 FIX: Preserve pairs when no suit available AND no high-value cards to conserve

    // Check if we have high-value cards worth conserving
    // Only Aces and high-value point cards (10s, Kings) trigger conservation over pair preservation
    // 5s are lower value and pairs may be more strategically valuable
    const hasHighValueCards = playerHand.some(
      (card) => card.rank === Rank.Ace || card.points >= 10,
    );

    // If we have high-value cards, use the original strategy (may break pairs for conservation)
    if (hasHighValueCards) {
      const allCardsSorted = playerHand.sort((a, b) => {
        const valueA = calculateCardStrategicValue(a, trumpInfo, "strategic");
        const valueB = calculateCardStrategicValue(b, trumpInfo, "strategic");
        return valueA - valueB; // Weakest first
      });
      return allCardsSorted.slice(0, leadingLength);
    }

    // If only low-value cards, prefer singles disposal over breaking pairs
    // Priority: Singles first, then pairs only if necessary

    // Get all singles (not in pairs) sorted by strategic value (weakest first)
    const availablePairs = identifyCombos(playerHand, trumpInfo).filter(
      (combo) => combo.type === ComboType.Pair,
    );

    const cardsInPairs = new Set();
    availablePairs.forEach((pair) => {
      pair.cards.forEach((card) => cardsInPairs.add(card.id));
    });

    const availableSingles = playerHand
      .filter((card) => !cardsInPairs.has(card.id))
      .sort((a, b) => {
        const valueA = calculateCardStrategicValue(a, trumpInfo, "strategic");
        const valueB = calculateCardStrategicValue(b, trumpInfo, "strategic");
        return valueA - valueB; // Weakest first
      });

    const selectedCards: Card[] = [];

    // First priority: Use singles (preserve pairs)
    const singlesNeeded = Math.min(leadingLength, availableSingles.length);
    selectedCards.push(...availableSingles.slice(0, singlesNeeded));

    // Only if we need more cards after using all singles, break pairs
    if (selectedCards.length < leadingLength) {
      const pairsSorted = availablePairs.sort((a, b) => {
        const valueA = calculateCardStrategicValue(
          a.cards[0],
          trumpInfo,
          "strategic",
        );
        const valueB = calculateCardStrategicValue(
          b.cards[0],
          trumpInfo,
          "strategic",
        );
        return valueA - valueB; // Weakest pairs first
      });

      for (const pair of pairsSorted) {
        if (selectedCards.length + 2 <= leadingLength) {
          selectedCards.push(...pair.cards);
        } else if (selectedCards.length + 1 <= leadingLength) {
          // Need only 1 more card, break the pair
          selectedCards.push(pair.cards[0]);
        }
        if (selectedCards.length >= leadingLength) break;
      }
    }

    return selectedCards.length === leadingLength ? selectedCards : null;
  };

  // Helper function to determine if a combination breaks pairs
  const determineIsBreakingPair = (cards: Card[]): boolean => {
    // Get all combos from hand to check which cards are in pairs
    const allCombos = identifyCombos(playerHand, trumpInfo);
    const pairCardIds = new Set<string>();

    // Collect all cards that are part of pairs
    allCombos
      .filter((combo) => combo.type === ComboType.Pair)
      .forEach((pair) => {
        pair.cards.forEach((card) => pairCardIds.add(card.id));
      });

    // Check if any card in this combination is from a pair
    return cards.some((card) => pairCardIds.has(card.id));
  };

  // Try optimal construction first - with validation retry
  const optimalCombo = constructOptimalCombination();
  if (optimalCombo) {
    if (isValidPlay(optimalCombo, playerHand, playerId, gameState)) {
      validMixedCombos.push({
        type: ComboType.Single,
        cards: optimalCombo,
        value: calculateCardStrategicValue(optimalCombo[0], trumpInfo, "basic"),
        isBreakingPair: determineIsBreakingPair(optimalCombo),
      });
    } else {
      // If optimal combo fails validation, try simpler approach
      const simpleCombo = playerHand
        .filter((card) =>
          isLeadingTrump
            ? isTrump(card, trumpInfo)
            : card.suit === leadingSuit && !isTrump(card, trumpInfo),
        )
        .sort((a, b) => {
          const valueA = calculateCardStrategicValue(a, trumpInfo, "basic");
          const valueB = calculateCardStrategicValue(b, trumpInfo, "basic");
          return valueA - valueB;
        })
        .slice(0, leadingLength);

      // Pad with weakest cards if needed
      if (simpleCombo.length < leadingLength) {
        const remaining = playerHand
          .filter((card) => !simpleCombo.some((c) => c.id === card.id))
          .sort((a, b) => {
            const valueA = calculateCardStrategicValue(
              a,
              trumpInfo,
              "strategic",
            );
            const valueB = calculateCardStrategicValue(
              b,
              trumpInfo,
              "strategic",
            );
            return valueA - valueB;
          })
          .slice(0, leadingLength - simpleCombo.length);

        simpleCombo.push(...remaining);
      }

      if (
        simpleCombo.length === leadingLength &&
        isValidPlay(simpleCombo, playerHand, playerId, gameState)
      ) {
        validMixedCombos.push({
          type: ComboType.Single,
          cards: simpleCombo,
          value: calculateCardStrategicValue(
            simpleCombo[0],
            trumpInfo,
            "basic",
          ),
          isBreakingPair: determineIsBreakingPair(simpleCombo),
        });
      }
    }
  }

  // PRIORITY 2: Generate additional valid options for AI strategy choice
  const allCombinations = generateSmartCombinations(playerHand, leadingLength);

  // Sort combinations by strategic value (weakest combinations first for better disposal)
  const sortedCombinations = allCombinations
    .filter((cards) => isValidPlay(cards, playerHand, playerId, gameState))
    .sort((a, b) => {
      const valueA = a.reduce(
        (sum, card) =>
          sum + calculateCardStrategicValue(card, trumpInfo, "strategic"),
        0,
      );
      const valueB = b.reduce(
        (sum, card) =>
          sum + calculateCardStrategicValue(card, trumpInfo, "strategic"),
        0,
      );
      return valueA - valueB; // Weakest combinations first
    })
    .slice(0, 5); // Limit to 5 options for performance

  // Add unique combinations to avoid duplicates
  for (const cards of sortedCombinations) {
    const isDuplicate = validMixedCombos.some(
      (existingCombo) =>
        existingCombo.cards.length === cards.length &&
        existingCombo.cards.every((card) =>
          cards.some((c) => c.id === card.id),
        ),
    );

    if (!isDuplicate) {
      validMixedCombos.push({
        type: ComboType.Single,
        cards,
        value: calculateCardStrategicValue(cards[0], trumpInfo, "basic"),
        isBreakingPair: determineIsBreakingPair(cards),
      });
    }
  }

  // CRITICAL SAFETY: Ensure we always return at least one valid combination
  if (validMixedCombos.length === 0) {
    gameLogger.warn(
      "no_valid_combinations_fallback",
      {
        playerHandSize: playerHand.length,
        leadingCards: leadingCards.map((c) => c.getDisplayName()),
        leadingSuit,
        isLeadingTrump,
        relevantSuitCards: playerHand
          .filter((c) =>
            isLeadingTrump ? isTrump(c, trumpInfo) : c.suit === leadingSuit,
          )
          .map((c) => c.getDisplayName()),
      },
      "No valid mixed combinations found, entering fallback logic",
    );
    // Guaranteed fallback: Find any valid combination through systematic search
    const guaranteedCombo = findGuaranteedValidCombination(
      playerHand,
      leadingCards,
      trumpInfo,
      leadingLength,
      gameState,
      playerId,
    );

    if (guaranteedCombo.length === leadingLength) {
      validMixedCombos.push({
        type: ComboType.Single,
        cards: guaranteedCombo,
        value: 1,
        isBreakingPair: determineIsBreakingPair(guaranteedCombo),
      });
    } else {
      // Last resort emergency fallback - should be extremely rare
      const emergencyCombo = playerHand.slice(0, leadingLength);
      gameLogger.error(
        "emergency_fallback_critical",
        {
          playerHand: playerHand.map((c) => c.getDisplayName()),
          leadingCards: leadingCards.map((c) => c.getDisplayName()),
          trumpInfo,
          leadingSuit,
          isLeadingTrump,
          leadingLength,
          guaranteedComboLength: guaranteedCombo.length,
        },
        "CRITICAL: Emergency fallback in generateMixedCombinations",
      );

      validMixedCombos.push({
        type: ComboType.Single,
        cards: emergencyCombo,
        value: 1,
        isBreakingPair: determineIsBreakingPair(emergencyCombo),
      });
    }
  }

  return validMixedCombos;
};

// Helper function for guaranteed valid combination discovery
function findGuaranteedValidCombination(
  hand: Card[],
  leading: Card[],
  trump: TrumpInfo,
  length: number,
  gameState: GameState,
  playerId: PlayerId,
): Card[] {
  const leadingSuit = getLeadingSuit(leading);
  const isLeadingTrump = leading.some((card) => isTrump(card, trump));

  // Strategy 1: Try all cards of leading suit/trump first
  const leadingSuitCards = isLeadingTrump
    ? hand.filter((card) => isTrump(card, trump))
    : hand.filter((card) => card.suit === leadingSuit && !isTrump(card, trump));

  if (leadingSuitCards.length >= length) {
    const combo = leadingSuitCards.slice(0, length);
    if (isValidPlay(combo, hand, playerId, gameState)) {
      return combo;
    }
  }

  // Strategy 2: Mixed combinations with required suit cards
  if (leadingSuitCards.length > 0 && leadingSuitCards.length < length) {
    const otherCards = hand
      .filter((card) => !leadingSuitCards.some((lsc) => lsc.id === card.id))
      .slice(0, length - leadingSuitCards.length);

    const combo = [...leadingSuitCards, ...otherCards];
    if (
      combo.length === length &&
      isValidPlay(combo, hand, playerId, gameState)
    ) {
      return combo;
    }
  }

  // Strategy 3: Brute force - try different combinations until we find valid one
  for (let startIndex = 0; startIndex <= hand.length - length; startIndex++) {
    const combo = hand.slice(startIndex, startIndex + length);
    if (isValidPlay(combo, hand, playerId, gameState)) {
      return combo;
    }
  }

  // Strategy 4: Sliding window with step size
  for (let step = 1; step < Math.min(3, hand.length); step++) {
    const combo: Card[] = [];
    for (let i = 0; i < hand.length && combo.length < length; i += step) {
      combo.push(hand[i]);
    }

    // Fill remaining slots if needed
    if (combo.length < length) {
      for (let i = 0; i < hand.length && combo.length < length; i++) {
        if (!combo.some((c) => c.id === hand[i].id)) {
          combo.push(hand[i]);
        }
      }
    }

    if (
      combo.length === length &&
      isValidPlay(combo, hand, playerId, gameState)
    ) {
      return combo;
    }
  }

  // Return empty array if no valid combination found (very rare edge case)
  return [];
}
