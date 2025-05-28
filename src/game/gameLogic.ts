import {
  Card,
  Combo,
  ComboType,
  GameState,
  GamePhase,
  JokerType,
  Player,
  PlayerId,
  PlayerName,
  Rank,
  Suit,
  Team,
  TeamId,
  Trick,
  TrumpInfo,
} from "../types";
// No UUID used in this project

// Create a new deck of cards (2 decks for Shengji)
export const createDeck = (): Card[] => {
  const deck: Card[] = [];

  // Create 2 decks with all suits and ranks
  for (let deckNum = 0; deckNum < 2; deckNum++) {
    // Regular cards
    Object.values(Suit).forEach((suit) => {
      Object.values(Rank).forEach((rank) => {
        // Calculate points: 5s = 5, 10s and Ks = 10, others = 0
        let points = 0;
        if (rank === Rank.Five) {
          points = 5;
        } else if (rank === Rank.Ten || rank === Rank.King) {
          points = 10;
        }

        deck.push({
          suit,
          rank,
          id: `${suit}_${rank}_${deckNum}`,
          points,
        });
      });
    });

    // Add jokers
    deck.push({
      joker: JokerType.Small,
      id: `Small_Joker_${deckNum}`,
      points: 0,
    });

    deck.push({
      joker: JokerType.Big,
      id: `Big_Joker_${deckNum}`,
      points: 0,
    });
  }

  return deck;
};

// Shuffle deck using Fisher-Yates algorithm
export const shuffleDeck = (deck: Card[]): Card[] => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

// Deal cards to players
export const dealCards = (state: GameState): GameState => {
  const newState = { ...state };
  const { players, deck } = newState;

  // Calculate cards per player (leaving 8 for kitty in a 4-player game)
  const cardsPerPlayer = Math.floor((deck.length - 8) / players.length);

  players.forEach((player, index) => {
    const startIdx = index * cardsPerPlayer;
    player.hand = deck.slice(startIdx, startIdx + cardsPerPlayer);
  });

  // Set kitty cards (bottom 8 cards)
  newState.kittyCards = deck.slice(deck.length - 8);

  // Update game phase
  newState.gamePhase = GamePhase.Declaring;

  return newState;
};

// Check if a card is a trump
export const isTrump = (card: Card, trumpInfo: TrumpInfo): boolean => {
  // Jokers are always trump
  if (card.joker) return true;

  // Cards of trump rank are trump
  if (card.rank === trumpInfo.trumpRank) return true;

  // Cards of trump suit (if declared) are trump
  if (trumpInfo.declared && card.suit === trumpInfo.trumpSuit) return true;

  return false;
};

// Get trump hierarchy level (for comparing trumps)
export const getTrumpLevel = (card: Card, trumpInfo: TrumpInfo): number => {
  // Not a trump
  if (!isTrump(card, trumpInfo)) return 0;

  // Red Joker - highest
  if (card.joker === JokerType.Big) return 5;

  // Black Joker - second highest
  if (card.joker === JokerType.Small) return 4;

  // Trump rank card in trump suit - third highest
  if (card.rank === trumpInfo.trumpRank && card.suit === trumpInfo.trumpSuit)
    return 3;

  // Trump rank cards in other suits - fourth highest
  if (card.rank === trumpInfo.trumpRank) return 2;

  // Trump suit cards - fifth highest
  if (trumpInfo.declared && card.suit === trumpInfo.trumpSuit) return 1;

  return 0; // Not a trump (shouldn't reach here)
};

// Compare two cards based on trump rules
export const compareCards = (
  cardA: Card,
  cardB: Card,
  trumpInfo: TrumpInfo,
): number => {
  // First compare by trump status
  const aIsTrump = isTrump(cardA, trumpInfo);
  const bIsTrump = isTrump(cardB, trumpInfo);

  // If only one is trump, it wins
  if (aIsTrump && !bIsTrump) return 1;
  if (!aIsTrump && bIsTrump) return -1;

  // If both are trump, check specific trump hierarchy
  if (aIsTrump && bIsTrump) {
    // Compare using trump hierarchy levels
    const aLevel = getTrumpLevel(cardA, trumpInfo);
    const bLevel = getTrumpLevel(cardB, trumpInfo);

    if (aLevel !== bLevel) {
      return aLevel - bLevel; // Higher level wins
    }

    // Same level trumps - need to handle specific cases
    if (aLevel === 2) {
      // Both are trump rank in non-trump suits - they have equal strength
      // Return 0 to indicate equal strength (first played wins in trick context)
      return 0;
    } else if (aLevel === 1) {
      // Both are trump suit - compare by rank
      return compareRanks(cardA.rank!, cardB.rank!);
    } else {
      // Same level jokers or trump rank in trump suit - equal strength
      return 0;
    }
  }

  // Non-trump comparison
  // If suits are the same, compare ranks
  if (cardA.suit === cardB.suit) {
    return compareRanks(cardA.rank!, cardB.rank!);
  }

  // Different suits, and not trumps - equal strength (first played wins)
  return 0;
};

// Compare ranks
const compareRanks = (rankA: Rank, rankB: Rank): number => {
  const rankOrder = [
    Rank.Two,
    Rank.Three,
    Rank.Four,
    Rank.Five,
    Rank.Six,
    Rank.Seven,
    Rank.Eight,
    Rank.Nine,
    Rank.Ten,
    Rank.Jack,
    Rank.Queen,
    Rank.King,
    Rank.Ace,
  ];
  return rankOrder.indexOf(rankA) - rankOrder.indexOf(rankB);
};

// Identify valid combinations in a player's hand
export const identifyCombos = (
  cards: Card[],
  trumpInfo: TrumpInfo,
): Combo[] => {
  const combos: Combo[] = [];

  // Group cards by suit and rank
  const cardsBySuit = groupCardsBySuit(cards, trumpInfo);

  // Look for singles
  cards.forEach((card) => {
    combos.push({
      type: ComboType.Single,
      cards: [card],
      value: getCardValue(card, trumpInfo),
    });
  });

  // Handle joker pairs separately
  const smallJokers = cards.filter((card) => card.joker === JokerType.Small);
  const bigJokers = cards.filter((card) => card.joker === JokerType.Big);

  // Add Small Joker pairs
  if (smallJokers.length >= 2) {
    for (let i = 0; i < smallJokers.length - 1; i++) {
      combos.push({
        type: ComboType.Pair,
        cards: [smallJokers[i], smallJokers[i + 1]],
        value: getCardValue(smallJokers[i], trumpInfo),
      });
    }
  }

  // Add Big Joker pairs
  if (bigJokers.length >= 2) {
    for (let i = 0; i < bigJokers.length - 1; i++) {
      combos.push({
        type: ComboType.Pair,
        cards: [bigJokers[i], bigJokers[i + 1]],
        value: getCardValue(bigJokers[i], trumpInfo),
      });
    }
  }

  // Special tractor: SJ-SJ-BJ-BJ
  if (smallJokers.length >= 2 && bigJokers.length >= 2) {
    combos.push({
      type: ComboType.Tractor,
      cards: [...smallJokers.slice(0, 2), ...bigJokers.slice(0, 2)],
      value: 10000, // Highest possible value
    });
  }

  // Look for regular pairs and tractors
  Object.values(cardsBySuit).forEach((suitCards) => {
    // Skip the joker group since we've handled jokers separately
    if (suitCards.length > 0 && suitCards[0].joker) {
      return;
    }

    const cardsByRank = groupCardsByRank(suitCards);

    Object.values(cardsByRank).forEach((rankCards) => {
      // Pairs
      if (rankCards.length >= 2) {
        for (let i = 0; i < rankCards.length - 1; i++) {
          combos.push({
            type: ComboType.Pair,
            cards: [rankCards[i], rankCards[i + 1]],
            value: getCardValue(rankCards[i], trumpInfo),
          });
        }
      }
    });

    // Look for tractors within this suit
    findTractors(suitCards, trumpInfo, combos);
  });

  return combos;
};

// Group cards by suit (considering trumps)
const groupCardsBySuit = (
  cards: Card[],
  trumpInfo: TrumpInfo,
): Record<string, Card[]> => {
  const cardsBySuit: Record<string, Card[]> = {};

  cards.forEach((card) => {
    let suitKey = "joker";

    if (card.suit) {
      // For trumps, preserve their suit for pair matching
      // This ensures cards of different suits don't form pairs,
      // even if they're both trumps

      if (card.rank === trumpInfo.trumpRank) {
        // For trump rank cards, use a compound key with both trump indicator and suit
        // This allows us to identify them as trumps while maintaining suit separation
        suitKey = `trump_${card.suit}`;
      } else if (isTrump(card, trumpInfo)) {
        // If card is trump suit but not trump rank, group it with trumps
        // These are all the same suit, so we can group them together
        suitKey = "trump_suit";
      } else {
        // Normal card
        suitKey = card.suit;
      }
    }

    if (!cardsBySuit[suitKey]) {
      cardsBySuit[suitKey] = [];
    }

    cardsBySuit[suitKey].push(card);
  });

  return cardsBySuit;
};

// Group cards by rank within a suit
const groupCardsByRank = (cards: Card[]): Record<string, Card[]> => {
  const cardsByRank: Record<string, Card[]> = {};

  cards.forEach((card) => {
    if (!card.rank) return; // Skip jokers

    if (!cardsByRank[card.rank]) {
      cardsByRank[card.rank] = [];
    }

    cardsByRank[card.rank].push(card);
  });

  return cardsByRank;
};

// Get numerical value of a card for combo comparison
const getCardValue = (card: Card, trumpInfo: TrumpInfo): number => {
  // Jokers have highest value
  if (card.joker) {
    return card.joker === JokerType.Big ? 1000 : 999;
  }

  // Evaluate based on rank and whether it's trump
  const rankValues: Record<Rank, number> = {
    [Rank.Two]: 2,
    [Rank.Three]: 3,
    [Rank.Four]: 4,
    [Rank.Five]: 5,
    [Rank.Six]: 6,
    [Rank.Seven]: 7,
    [Rank.Eight]: 8,
    [Rank.Nine]: 9,
    [Rank.Ten]: 10,
    [Rank.Jack]: 11,
    [Rank.Queen]: 12,
    [Rank.King]: 13,
    [Rank.Ace]: 14,
  };

  let value = rankValues[card.rank!];

  // Trump cards have higher value
  if (isTrump(card, trumpInfo)) {
    value += 100;

    // Trump suit is higher than trump rank of other suits
    if (card.suit === trumpInfo.trumpSuit) {
      value += 50;
    }
  }

  return value;
};

// Find tractors (consecutive pairs) in a suit
const findTractors = (
  cards: Card[],
  trumpInfo: TrumpInfo,
  combos: Combo[],
): void => {
  // Group cards by rank
  const cardsByRank = groupCardsByRank(cards);

  // Find all pairs
  const pairs: { rank: Rank; cards: Card[] }[] = [];
  Object.entries(cardsByRank).forEach(([rank, rankCards]) => {
    if (rankCards.length >= 2) {
      // Add all possible pairs of this rank
      for (let i = 0; i < rankCards.length - 1; i += 2) {
        pairs.push({
          rank: rank as Rank,
          cards: [rankCards[i], rankCards[i + 1]],
        });
      }
    }
  });

  // Sort pairs by rank value
  pairs.sort((a, b) => getRankValue(a.rank) - getRankValue(b.rank));

  // Find consecutive pairs to form tractors
  for (let i = 0; i < pairs.length - 1; i++) {
    const currentRankValue = getRankValue(pairs[i].rank);
    const nextRankValue = getRankValue(pairs[i + 1].rank);

    // Check if consecutive
    if (nextRankValue - currentRankValue === 1) {
      // Found a tractor!
      const tractorCards = [...pairs[i].cards, ...pairs[i + 1].cards];

      // Calculate value based on the highest rank in the tractor
      const value = Math.max(
        getCardValue(pairs[i].cards[0], trumpInfo),
        getCardValue(pairs[i + 1].cards[0], trumpInfo),
      );

      combos.push({
        type: ComboType.Tractor,
        cards: tractorCards,
        value: value,
      });
    }
  }
};

// Check if a play is valid following Shengji rules
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
  const leadingType = getComboType(leadingCombo);
  const playedType = getComboType(playedCards);

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

        return true;
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
    const isMatchingCombo = matchingCombos.some((combo) =>
      combo.cards.every((card) =>
        playedCards.some((played) => played.id === card.id),
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
    return allLeadingSuit;
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

    return allPlayedFromHand;
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

// Get the leading suit from a combo
export const getLeadingSuit = (combo: Card[]): Suit | undefined => {
  // Find the first card that has a suit
  for (const card of combo) {
    if (card.suit) {
      return card.suit;
    }
  }
  return undefined;
};

// Get the combo type (single, pair, etc.) based on the cards
export const getComboType = (cards: Card[]): ComboType => {
  if (cards.length === 1) {
    return ComboType.Single;
  } else if (cards.length === 2) {
    // Check if it's a joker pair (two of the same joker type)
    if (cards[0].joker && cards[1].joker && cards[0].joker === cards[1].joker) {
      return ComboType.Pair;
    }

    // Check if it's a regular pair (same rank and suit)
    if (
      cards[0].rank &&
      cards[1].rank &&
      cards[0].rank === cards[1].rank &&
      cards[0].suit === cards[1].suit
    ) {
      return ComboType.Pair;
    }
  } else if (cards.length >= 4 && cards.length % 2 === 0) {
    // Check if it's a joker tractor (SJ-SJ-BJ-BJ)
    if (
      cards.length === 4 &&
      cards.filter((c) => c.joker === JokerType.Small).length === 2 &&
      cards.filter((c) => c.joker === JokerType.Big).length === 2
    ) {
      return ComboType.Tractor;
    }

    // Check if it's a regular tractor (consecutive pairs)
    // First check if all cards are the same suit
    const sameSuit =
      cards[0].suit && cards.every((card) => card.suit === cards[0].suit);

    if (sameSuit) {
      // Group cards by rank to find pairs
      const rankCounts = new Map<Rank, number>();
      cards.forEach((card) => {
        if (card.rank) {
          rankCounts.set(card.rank, (rankCounts.get(card.rank) || 0) + 1);
        }
      });

      // Check if all cards form pairs (each rank appears exactly twice)
      const pairs = Array.from(rankCounts.entries()).filter(
        ([_, count]) => count === 2,
      );

      // Must have exactly cards.length / 2 pairs
      const expectedPairs = cards.length / 2;
      if (pairs.length === expectedPairs) {
        // Get the rank values of the pairs
        const pairRanks = pairs.map(([rank, _]) => getRankValue(rank));
        pairRanks.sort((a, b) => a - b);

        // Check if the pairs are consecutive
        let isConsecutive = true;
        for (let i = 0; i < pairRanks.length - 1; i++) {
          if (pairRanks[i + 1] - pairRanks[i] !== 1) {
            isConsecutive = false;
            break;
          }
        }

        if (isConsecutive) {
          return ComboType.Tractor;
        }
      }
    }
  }

  // Default to Single as fallback
  return ComboType.Single;
};

// Helper to get numerical rank value
const getRankValue = (rank: Rank): number => {
  const rankOrder = [
    Rank.Two,
    Rank.Three,
    Rank.Four,
    Rank.Five,
    Rank.Six,
    Rank.Seven,
    Rank.Eight,
    Rank.Nine,
    Rank.Ten,
    Rank.Jack,
    Rank.Queen,
    Rank.King,
    Rank.Ace,
  ];
  return rankOrder.indexOf(rank);
};

// Compare two card combinations
export const compareCardCombos = (
  comboA: Card[],
  comboB: Card[],
  trumpInfo: TrumpInfo,
): number => {
  // Check if combos are the same type (singles, pairs, etc.)
  if (comboA.length !== comboB.length) {
    // In proper Tractor/Shengji, this should never happen
    // Combos of different lengths cannot be compared - this is a fundamental rule violation
    throw new Error(
      `Cannot compare combos of different lengths: ${comboA.length} vs ${comboB.length}`,
    );
  }

  // Get combo types
  const typeA = getComboType(comboA);
  const typeB = getComboType(comboB);

  // For singles, directly compare cards
  if (comboA.length === 1) {
    return compareCards(comboA[0], comboB[0], trumpInfo);
  }

  // CRITICAL FIX: Check combination type compatibility FIRST before trump status
  // This ensures game rule: combination type takes precedence over trump status
  // For tractors vs non-tractors
  if (typeA === ComboType.Tractor && typeB !== ComboType.Tractor) {
    return 1; // Tractor beats non-tractor
  }
  if (typeA !== ComboType.Tractor && typeB === ComboType.Tractor) {
    return -1; // Non-tractor loses to tractor
  }

  // Pairs always beat singles of the same length (regardless of trump status)
  if (typeA === ComboType.Pair && typeB !== ComboType.Pair) {
    return 1; // Pair beats non-pair
  }
  if (typeA !== ComboType.Pair && typeB === ComboType.Pair) {
    return -1; // Non-pair loses to pair
  }

  // Now that combination types are compatible, check trump status
  // Check if any combo contains trumps
  const aIsTrump = comboA.some((card) => isTrump(card, trumpInfo));
  const bIsTrump = comboB.some((card) => isTrump(card, trumpInfo));

  // If one is trump and the other isn't, trump wins (within same combination type)
  if (aIsTrump && !bIsTrump) return 1;
  if (!aIsTrump && bIsTrump) return -1;

  // For pairs (matching ranks)
  if (typeA === ComboType.Pair && typeB === ComboType.Pair) {
    // If they're the same type, ONLY compare the rank if they're from the same suit
    // Otherwise, in Shengji rules, the leading combo always wins unless trumps are involved
    // (and we've already handled the trump cases above)
    if (comboA[0].rank && comboB[0].rank) {
      // Only compare ranks if from the same suit
      if (
        comboA[0].suit &&
        comboB[0].suit &&
        comboA[0].suit === comboB[0].suit
      ) {
        // If both pairs are trump cards, use trump hierarchy instead of rank comparison
        if (aIsTrump && bIsTrump) {
          return compareCards(comboA[0], comboB[0], trumpInfo);
        }
        // For non-trump pairs from same suit, use rank comparison
        return compareRanks(comboA[0].rank, comboB[0].rank);
      } else {
        // Different suits and both are pairs - if both are trump pairs, compare by trump level
        if (aIsTrump && bIsTrump) {
          return compareCards(comboA[0], comboB[0], trumpInfo);
        }
        // Otherwise, in Shengji rules, the leading combo (comboA) wins
        return 1;
      }
    }
  }

  // For tractors, compare the highest card in the tractor
  if (typeA === ComboType.Tractor && typeB === ComboType.Tractor) {
    // First, check if the tractors are from the same suit
    const suitA = comboA[0].suit;
    const suitB = comboB[0].suit;

    const allSameSuitA = suitA && comboA.every((card) => card.suit === suitA);
    const allSameSuitB = suitB && comboB.every((card) => card.suit === suitB);

    // If both are valid tractors from different suits, the leading combo (comboA) wins
    // (We've already handled the trump cases above)
    if (allSameSuitA && allSameSuitB && suitA !== suitB) {
      return 1; // Leading tractor wins when comparing across different suits
    }

    // If they're from the same suit, compare the highest cards
    // Find the highest card in each tractor
    const maxCardA = comboA.reduce(
      (max, card) => (compareCards(max, card, trumpInfo) > 0 ? max : card),
      comboA[0],
    );

    const maxCardB = comboB.reduce(
      (max, card) => (compareCards(max, card, trumpInfo) > 0 ? max : card),
      comboB[0],
    );

    return compareCards(maxCardA, maxCardB, trumpInfo);
  }

  // If different types of combos but same total cards, should already be handled above
  // This shouldn't happen in proper Shengji

  // Check for a specific case where both are marked as "singles" but one is actually
  // multiple cards of the same suit and the other is mixed suits
  if (comboA.length > 1) {
    // For multi-card plays, the rule in Shengji is that the leading suit's play wins
    // unless beaten by a trump play or a proper combo (like a pair)

    // Get the suit of the leading combo (the one that should win if no trump/proper combo)
    const leadingSuit = getLeadingSuit([...comboA, ...comboB]);

    // If both are non-trump and we have a leading suit,
    // the combo that follows the leading suit wins
    if (leadingSuit && !aIsTrump && !bIsTrump) {
      // Count how many cards match the leading suit in each combo
      const aMatchCount = comboA.filter(
        (card) => card.suit === leadingSuit,
      ).length;
      const bMatchCount = comboB.filter(
        (card) => card.suit === leadingSuit,
      ).length;

      // If one follows the suit better than the other, it wins
      if (aMatchCount > bMatchCount) return 1;
      if (aMatchCount < bMatchCount) return -1;
    }
  }

  // Default fallback: compare highest cards
  const maxCardA = comboA.reduce(
    (max, card) => (compareCards(max, card, trumpInfo) > 0 ? max : card),
    comboA[0],
  );

  const maxCardB = comboB.reduce(
    (max, card) => (compareCards(max, card, trumpInfo) > 0 ? max : card),
    comboB[0],
  );

  return compareCards(maxCardA, maxCardB, trumpInfo);
};

// Calculate points in a trick
export const calculateTrickPoints = (trick: Trick): number => {
  let points = 0;

  // Add points from leading combo
  trick.leadingCombo.forEach((card) => {
    points += card.points;
  });

  // Add points from other plays
  trick.plays.forEach((play) => {
    play.cards.forEach((card) => {
      points += card.points;
    });
  });

  return points;
};

// Check if a card is a point card
export const isPointCard = (card: Card): boolean => {
  return card.points > 0;
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
  const { currentTrick, trumpInfo } = gameState;

  // If no current trick, player is leading - all combinations are valid
  if (!currentTrick || !currentTrick.leadingCombo) {
    return identifyCombos(playerHand, trumpInfo);
  }

  // Get all possible combinations from player's hand
  const allCombos = identifyCombos(playerHand, trumpInfo);
  const leadingCombo = currentTrick.leadingCombo;
  const leadingLength = leadingCombo.length;

  // Filter combinations that match the leading combo length and pass validation
  const validCombos = allCombos.filter((combo) => {
    return (
      combo.cards.length === leadingLength &&
      isValidPlay(combo.cards, leadingCombo, playerHand, trumpInfo)
    );
  });

  // If we have valid combinations, return them
  if (validCombos.length > 0) {
    return validCombos;
  }

  // Emergency fallback: Handle edge cases where no standard combinations work
  // This covers scenarios like partial suit following that isValidPlay handles
  // but identifyCombos might not generate as standard combinations
  return getEmergencyValidCombinations(playerHand, gameState);
};

/**
 * Emergency fallback to generate valid card plays when no standard combinations work
 *
 * This handles edge cases like:
 * - Player has some but not enough cards of the leading suit
 * - Player must play trump cards when trump is led but can't form proper combos
 * - Other complex rule scenarios that require manual card selection
 *
 * @param playerHand Cards in the player's hand
 * @param gameState Current game state
 * @returns Array of emergency valid combinations
 */
const getEmergencyValidCombinations = (
  playerHand: Card[],
  gameState: GameState,
): Combo[] => {
  const { currentTrick, trumpInfo } = gameState;

  if (!currentTrick?.leadingCombo) {
    // Should not happen, but fallback to all single cards
    return playerHand.map((card) => ({
      type: ComboType.Single,
      cards: [card],
      value: 10,
    }));
  }

  const leadingCombo = currentTrick.leadingCombo;
  const leadingLength = leadingCombo.length;
  const leadingSuit = getLeadingSuit(leadingCombo);
  const isLeadingTrump = leadingCombo.some((card) => isTrump(card, trumpInfo));

  const emergencyCombos: Combo[] = [];

  // Case 1: Trump is led, player has trump cards but not enough for proper combos
  if (isLeadingTrump) {
    const trumpCards = playerHand.filter((card) => isTrump(card, trumpInfo));

    if (trumpCards.length > 0 && trumpCards.length >= leadingLength) {
      // Try to construct a trump combination by taking the lowest trump cards
      const sortedTrumpCards = [...trumpCards].sort((a, b) =>
        compareCards(a, b, trumpInfo),
      );

      const emergencyTrumpCombo: Combo = {
        type: ComboType.Single, // May not be a proper combo type, but valid play
        cards: sortedTrumpCards.slice(0, leadingLength),
        value: 200,
      };

      // Validate this emergency combination
      if (
        isValidPlay(
          emergencyTrumpCombo.cards,
          leadingCombo,
          playerHand,
          trumpInfo,
        )
      ) {
        emergencyCombos.push(emergencyTrumpCombo);
      }
    }
  }

  // Case 2: Suit is led, player has some but not enough cards of that suit
  if (leadingSuit) {
    const leadingSuitCards = playerHand.filter(
      (card) => card.suit === leadingSuit && !isTrump(card, trumpInfo),
    );

    if (
      leadingSuitCards.length > 0 &&
      leadingSuitCards.length < leadingLength
    ) {
      // Must play all leading suit cards plus other cards to make up the length
      const otherCards = playerHand
        .filter((card) => card.suit !== leadingSuit || isTrump(card, trumpInfo))
        .sort((a, b) => compareCards(a, b, trumpInfo));

      const remainingNeeded = leadingLength - leadingSuitCards.length;

      if (otherCards.length >= remainingNeeded) {
        const emergencyMixedCombo: Combo = {
          type: ComboType.Single, // Mixed cards don't form a proper combo type
          cards: [...leadingSuitCards, ...otherCards.slice(0, remainingNeeded)],
          value: 5,
        };

        // Validate this emergency combination
        if (
          isValidPlay(
            emergencyMixedCombo.cards,
            leadingCombo,
            playerHand,
            trumpInfo,
          )
        ) {
          emergencyCombos.push(emergencyMixedCombo);
        }
      }
    }
  }

  // Case 3: Last resort - try any combination of cards of the right length
  if (emergencyCombos.length === 0) {
    const sortedCards = [...playerHand].sort((a, b) =>
      compareCards(a, b, trumpInfo),
    );

    if (sortedCards.length >= leadingLength) {
      const lastResortCombo: Combo = {
        type: ComboType.Single,
        cards: sortedCards.slice(0, leadingLength),
        value: 1,
      };

      // Always add this as absolute fallback, even if it might not be valid
      // The AI can decide whether to use it
      emergencyCombos.push(lastResortCombo);
    }
  }

  return emergencyCombos;
};

// Initialize a new game
export const initializeGame = (): GameState => {
  // Create players (1 human, 3 AI)
  const players: Player[] = [
    {
      id: PlayerId.Human,
      name: PlayerName.Human,
      isHuman: true,
      hand: [],
      team: TeamId.A,
    },
    {
      id: PlayerId.Bot1,
      name: PlayerName.Bot1,
      isHuman: false,
      hand: [],
      team: TeamId.B,
    },
    {
      id: PlayerId.Bot2,
      name: PlayerName.Bot2,
      isHuman: false,
      hand: [],
      team: TeamId.A,
    },
    {
      id: PlayerId.Bot3,
      name: PlayerName.Bot3,
      isHuman: false,
      hand: [],
      team: TeamId.B,
    },
  ];

  // Create teams
  const teams: [Team, Team] = [
    {
      id: TeamId.A,
      currentRank: Rank.Two,
      points: 0,
      isDefending: true, // Team A defends first
    },
    {
      id: TeamId.B,
      currentRank: Rank.Two,
      points: 0,
      isDefending: false,
    },
  ];

  // Create and shuffle deck
  const deck = shuffleDeck(createDeck());

  // Initialize game state
  const gameState: GameState = {
    players,
    teams,
    deck,
    kittyCards: [],
    currentTrick: null,
    trumpInfo: {
      trumpRank: Rank.Two,
      declared: false,
    },
    tricks: [],
    roundNumber: 1,
    currentPlayerIndex: 0,
    gamePhase: GamePhase.Dealing,
  };

  // Deal cards to players
  return dealCards(gameState);
};
