import { Card, ComboType, TrumpInfo } from "../types";
import {
  identifyCombos,
  checkSameSuitPairPreservation,
  checkTractorFollowingPriority,
  getComboType,
} from "./comboDetection";
import { isTrump } from "./gameHelpers";

// Local helper function to avoid circular dependencies
const getLeadingSuit = (combo: Card[]) => {
  // Find the first card that has a suit
  for (const card of combo) {
    if (card.suit) {
      return card.suit;
    }
  }
  return undefined;
};

/**
 * Check if a play is valid following Shengji rules
 * This function is extracted to avoid circular dependencies between
 * playProcessing.ts and combinationGeneration.ts
 */
export const isValidPlay = (
  playedCards: Card[],
  leadingCombo: Card[] | null,
  playerHand: Card[],
  trumpInfo: TrumpInfo,
): boolean => {
  // If no leading combo, any valid combo is acceptable
  if (!leadingCombo) {
    const combos = identifyCombos(playerHand, trumpInfo);
    return combos.some(
      (combo) =>
        combo.cards.length === playedCards.length &&
        combo.cards.every((card) =>
          playedCards.some((played) => played.id === card.id),
        ),
    );
  }

  // Shengji rules: Must match the combination length
  if (playedCards.length !== leadingCombo.length) {
    return false;
  }

  // Get the leading combo's suit
  const leadingSuit = getLeadingSuit(leadingCombo);
  const isLeadingTrump = leadingCombo.some((card) => isTrump(card, trumpInfo));

  // Find available cards in player's hand
  const trumpCards = playerHand.filter((card) => isTrump(card, trumpInfo));
  const leadingSuitCards = playerHand.filter(
    (card) => card.suit === leadingSuit && !isTrump(card, trumpInfo),
  );

  // Get combo types
  const leadingType = getComboType(leadingCombo, trumpInfo);
  const playedType = getComboType(playedCards, trumpInfo);

  // CRITICAL: Only enforce combo type if player has ENOUGH cards of leading suit
  // to form a valid combo of the same type

  // Check if player can actually form a matching combo
  const canFormMatchingCombo = () => {
    if (isLeadingTrump && trumpCards.length >= leadingCombo.length) {
      const trumpCombos = identifyCombos(trumpCards, trumpInfo);
      return trumpCombos.some(
        (combo) =>
          combo.type === leadingType &&
          combo.cards.length === leadingCombo.length,
      );
    } else if (leadingSuitCards.length >= leadingCombo.length) {
      const suitCombos = identifyCombos(leadingSuitCards, trumpInfo);
      return suitCombos.some(
        (combo) =>
          combo.type === leadingType &&
          combo.cards.length === leadingCombo.length,
      );
    }
    return false;
  };

  // Only enforce combo type if player can actually form a matching combo
  if (canFormMatchingCombo() && playedType !== leadingType) {
    return false;
  }

  // 1. If leading with trumps, must play trumps if you have them
  if (isLeadingTrump) {
    if (trumpCards.length > 0) {
      // 🚨 CRITICAL RULE: ALL TRUMP CARDS ARE TREATED AS SAME SUIT
      // Trump group = Jokers + Trump Rank Cards + Trump Suit Cards
      // Must play ALL trump cards when following trump lead

      if (trumpCards.length >= leadingCombo.length) {
        // Player has enough trumps to potentially match the leading combo
        const allTrumps = playedCards.every((card) => isTrump(card, trumpInfo));
        if (!allTrumps) {
          return false; // Must play all trumps when following trump lead
        }

        // Enhanced validation: When following trump tractors/pairs, must respect hierarchy
        // If player can form matching trump combo type, they must use it
        if (canFormMatchingCombo()) {
          const playerTrumpCombos = identifyCombos(trumpCards, trumpInfo);

          // Check if played cards form the required combo type
          const matchingTrumpCombos = playerTrumpCombos.filter(
            (combo) =>
              combo.type === leadingType &&
              combo.cards.length === leadingCombo.length,
          );

          if (matchingTrumpCombos.length > 0) {
            // Player has matching trump combos available, verify they used one
            const usedMatchingCombo = matchingTrumpCombos.some((combo) =>
              combo.cards.every((card) =>
                playedCards.some((played) => played.id === card.id),
              ),
            );

            if (!usedMatchingCombo) {
              return false; // Must use proper trump combo when available
            }
          }
        }

        return true;
      } else {
        // Player doesn't have enough trumps to match leading combo length
        // Check if they're using trump pairs when available (must prioritize trump pairs)
        if (
          leadingType === ComboType.Pair ||
          leadingType === ComboType.Tractor
        ) {
          // Check if player has any trump pairs available
          const playerTrumpCombos = identifyCombos(trumpCards, trumpInfo);
          const trumpPairs = playerTrumpCombos.filter(
            (combo) => combo.type === ComboType.Pair,
          );

          if (trumpPairs.length > 0) {
            // Player has trump pairs available
            // Check if any trump pairs were used in the played cards
            const usedTrumpPairs = trumpPairs.some((pair) =>
              pair.cards.every((card) =>
                playedCards.some((played) => played.id === card.id),
              ),
            );

            if (!usedTrumpPairs) {
              // Player has trump pairs but didn't use any
              // Check if they played any pairs at all (including non-trump pairs)
              const playedCombos = identifyCombos(playedCards, trumpInfo);
              const playedPairs = playedCombos.filter(
                (combo) => combo.type === ComboType.Pair,
              );

              if (playedPairs.length > 0) {
                // Played non-trump pairs when trump pairs were available - invalid
                return false;
              }
            }
          }
        }

        // CRITICAL FIX: When trump is led and player cannot form proper trump combinations,
        // they MUST use ALL available trump cards (cannot play pure non-trump combinations)
        const playedNonTrumpCards = playedCards.filter(
          (card) => !isTrump(card, trumpInfo),
        );

        // Only apply strict rule when: playing pure non-trump combinations while having trump available
        if (
          playedNonTrumpCards.length === playedCards.length &&
          trumpCards.length > 0
        ) {
          // Player played pure non-trump while having trump available
          // This violates the rule: must use trump when trump is led
          return false;
        }

        // Issue #126 Fix: Also check same-suit pair preservation for trump following
        return checkSameSuitPairPreservation(
          playedCards,
          leadingCombo,
          playerHand,
          trumpInfo,
        );
      }
    } else {
      // No trump cards, can play anything
      return true;
    }
  }

  // 2. Check if player can match same combo type in same suit
  const matchingCombos = identifyCombos(leadingSuitCards, trumpInfo).filter(
    (combo) =>
      combo.type === leadingType && combo.cards.length === leadingCombo.length,
  );

  if (matchingCombos.length > 0) {
    // Must play a matching combo in the same suit
    const isMatchingCombo = matchingCombos.some(
      (combo) =>
        combo.cards.length === playedCards.length &&
        combo.cards.every((card) =>
          playedCards.some((played) => played.id === card.id),
        ) &&
        playedCards.every((played) =>
          combo.cards.some((card) => card.id === played.id),
        ),
    );
    return isMatchingCombo;
  }

  // 3. If can't match combo type in same suit but have enough cards of the suit,
  // must play cards of the leading suit (combo type not enforced)
  if (leadingSuitCards.length >= leadingCombo.length) {
    // Must play cards of the leading suit
    const allLeadingSuit = playedCards.every((card) =>
      leadingSuitCards.some((handCard) => handCard.id === card.id),
    );

    // Issue #126 Fix: Also check same-suit pair preservation
    if (allLeadingSuit) {
      // Issue #207 Fix: Check tractor following priority (pairs before singles)
      if (
        !checkTractorFollowingPriority(
          playedCards,
          leadingCombo,
          playerHand,
          trumpInfo,
        )
      ) {
        return false;
      }

      return checkSameSuitPairPreservation(
        playedCards,
        leadingCombo,
        playerHand,
        trumpInfo,
      );
    }

    return false;
  }

  // 4. If player has some cards of the leading suit, but not enough for the combo,
  // they must play all the cards they have of that suit
  if (
    leadingSuitCards.length > 0 &&
    leadingSuitCards.length < leadingCombo.length
  ) {
    // This rule always applies regardless of combo type - must use all leading suit cards

    // Count how many cards of the leading suit were played
    const playedLeadingSuitCards = playedCards.filter(
      (card) => card.suit === leadingSuit && !isTrump(card, trumpInfo),
    );

    // Must use all available cards of the leading suit
    // Check if all cards of the leading suit in the hand were played
    const allLeadingSuitCardsPlayed = leadingSuitCards.every((handCard) =>
      playedLeadingSuitCards.some(
        (playedCard) => playedCard.id === handCard.id,
      ),
    );

    // Also check that we played exactly the right number of leading suit cards
    const playedRightNumberOfLeadingSuitCards =
      playedLeadingSuitCards.length === leadingSuitCards.length;

    if (!allLeadingSuitCardsPlayed || !playedRightNumberOfLeadingSuitCards) {
      return false;
    }

    // The remaining cards can be anything to make up the required length
    const playedNonLeadingSuitCount =
      playedCards.length - playedLeadingSuitCards.length;
    const requiredNonLeadingSuitCount =
      leadingCombo.length - leadingSuitCards.length;

    // Must play exactly the right number of total cards
    if (playedNonLeadingSuitCount !== requiredNonLeadingSuitCount) {
      return false;
    }

    // All cards must be from the player's hand
    const allPlayedFromHand = playedCards.every((card) =>
      playerHand.some((handCard) => handCard.id === card.id),
    );

    // Issue #126 Fix: Also check same-suit pair preservation for partial suit following
    if (allPlayedFromHand) {
      // Issue #207 Fix: Check tractor following priority for partial suit following
      if (
        !checkTractorFollowingPriority(
          playedCards,
          leadingCombo,
          playerHand,
          trumpInfo,
        )
      ) {
        return false;
      }

      return checkSameSuitPairPreservation(
        playedCards,
        leadingCombo,
        playerHand,
        trumpInfo,
      );
    }

    return false;
  }

  // 5. If no cards of the leading suit, can play ANY cards of the correct length,
  // regardless of combo type - the combo type check is only applied when player has
  // enough cards of leading suit to form a valid combo

  // First, verify all played cards are from the player's hand
  const allPlayedFromHand = playedCards.every((card) =>
    playerHand.some((handCard) => handCard.id === card.id),
  );

  if (!allPlayedFromHand) {
    return false;
  }

  // If we have no cards of the leading suit, any selection of correct length is valid
  if (leadingSuitCards.length === 0) {
    // Just need to verify the length, which we've already done at the start
    return true;
  }

  // Default - should only reach here in edge cases
  return true;
};
