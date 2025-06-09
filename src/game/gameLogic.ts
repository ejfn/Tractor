import {
  Card,
  Combo,
  ComboType,
  GamePhase,
  GameState,
  JokerType,
  PlayerId,
  Rank,
  Suit,
  Trick,
  TrumpInfo,
  canOverrideDeclaration,
  detectPossibleDeclarations,
} from "../types";
// Re-exported utilities for backward compatibility
export {
  createDeck,
  shuffleDeck,
  initializeGame,
  initializeTrumpDeclarationState,
} from "../utils/gameInitialization";

// Deal cards to players (original all-at-once dealing for backward compatibility)
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

  // Update game phase - start with dealing for progressive dealing system
  newState.gamePhase = GamePhase.Dealing;

  return newState;
};

// Progressive dealing with trump declaration opportunities
export const dealNextCard = (state: GameState): GameState => {
  const newState = { ...state };
  const { players, deck } = newState;

  // Initialize dealing state if not present
  if (!newState.dealingState) {
    const cardsPerPlayer = Math.floor((deck.length - 8) / players.length);
    // Round 1 always starts from human player (index 0), round 2+ uses roundStartingPlayerIndex
    const startingPlayerIndex =
      newState.roundNumber === 1
        ? 0 // Round 1 always starts from human
        : newState.roundStartingPlayerIndex; // Round 2+ uses round starting player

    newState.dealingState = {
      cardsPerPlayer,
      currentRound: 0,
      currentDealingPlayerIndex: startingPlayerIndex, // Start dealing from appropriate player
      startingDealingPlayerIndex: startingPlayerIndex, // Remember who we started with for round completion
      totalRounds: cardsPerPlayer,
      completed: false,
      kittyDealt: false,
      paused: false,
    };

    // Initialize empty hands
    players.forEach((player) => {
      player.hand = [];
    });
  }

  const dealingState = newState.dealingState;

  // Check if dealing is complete or paused
  if (dealingState.completed || dealingState.paused) {
    return newState;
  }

  // Deal one card to the current player
  // Calculate total cards dealt so far (independent of starting player)
  const cardsDealtSoFar = dealingState.currentRound * players.length;
  // Calculate position within current round (how many players have been dealt to this round)
  const playersDealtInCurrentRound =
    (dealingState.currentDealingPlayerIndex -
      dealingState.startingDealingPlayerIndex +
      players.length) %
    players.length;
  const cardIndex = cardsDealtSoFar + playersDealtInCurrentRound;

  if (cardIndex < deck.length - 8) {
    // Reserve 8 for kitty
    const card = deck[cardIndex];
    const currentPlayer = players[dealingState.currentDealingPlayerIndex];
    currentPlayer.hand.push(card);

    // Move to next player
    dealingState.currentDealingPlayerIndex =
      (dealingState.currentDealingPlayerIndex + 1) % players.length;

    // If we've gone through all players, move to next round
    if (
      dealingState.currentDealingPlayerIndex ===
      dealingState.startingDealingPlayerIndex
    ) {
      dealingState.currentRound++;
    }

    // Check if dealing is complete
    if (dealingState.currentRound >= dealingState.totalRounds) {
      dealingState.completed = true;

      // Deal kitty cards if not already done
      if (!dealingState.kittyDealt) {
        newState.kittyCards = deck.slice(deck.length - 8);
        dealingState.kittyDealt = true;
      }

      // Dealing is complete, but don't immediately transition to playing phase
      // Let the dealing system handle final trump declaration opportunities first
      // The phase transition will happen after final opportunities are processed
    }
  }

  return newState;
};

// Check if dealing is complete
export const isDealingComplete = (state: GameState): boolean => {
  return state.dealingState?.completed ?? false;
};

// Get dealing progress for UI display
export const getDealingProgress = (
  state: GameState,
): { current: number; total: number } => {
  if (!state.dealingState) {
    return { current: 0, total: 1 };
  }

  const {
    currentRound,
    currentDealingPlayerIndex,
    startingDealingPlayerIndex,
    totalRounds,
  } = state.dealingState;

  // Calculate cards dealt in current round
  // currentDealingPlayerIndex is the NEXT player to receive a card
  // We need to count how many cards have actually been dealt from the starting player
  const cardsDealtThisRound =
    (currentDealingPlayerIndex -
      startingDealingPlayerIndex +
      state.players.length) %
    state.players.length;

  // Total cards dealt = completed rounds * players + cards dealt in current round
  const cardsDealt = currentRound * state.players.length + cardsDealtThisRound;
  const totalCards = totalRounds * state.players.length;

  return { current: cardsDealt, total: totalCards };
};

// Check if any player has new declaration opportunities after receiving a card
export const checkDeclarationOpportunities = (
  state: GameState,
): Map<string, any[]> => {
  const opportunities = new Map<string, any[]>();

  if (!state.trumpDeclarationState?.declarationWindow) {
    return opportunities;
  }

  const currentDeclaration = state.trumpDeclarationState?.currentDeclaration;

  state.players.forEach((player) => {
    const declarations = detectPossibleDeclarations(
      player.hand,
      state.trumpInfo.trumpRank,
      currentDeclaration,
      player.id as PlayerId,
    );

    if (declarations.length > 0) {
      // Filter declarations that can actually override current declaration

      const validDeclarations = declarations.filter((declaration) => {
        const mockDeclaration = {
          playerId: player.id,
          rank: state.trumpInfo.trumpRank,
          suit: declaration.suit,
          type: declaration.type,
          cards: declaration.cards,
          timestamp: Date.now(),
        };

        return canOverrideDeclaration(currentDeclaration, mockDeclaration);
      });

      if (validDeclarations.length > 0) {
        opportunities.set(player.id, validDeclarations);
      }
    }
  });

  return opportunities;
};

// Get the last card dealt (for highlighting/animation purposes)
export const getLastDealtCard = (
  state: GameState,
): { playerId: string; card: Card } | null => {
  if (!state.dealingState || state.dealingState.completed) {
    return null;
  }

  const { currentRound, currentDealingPlayerIndex } = state.dealingState;

  // Calculate the previous card position
  let prevPlayerIndex = currentDealingPlayerIndex - 1;
  let prevRound = currentRound;

  if (prevPlayerIndex < 0) {
    prevPlayerIndex = state.players.length - 1;
    prevRound = currentRound - 1;
  }

  // If we're at the very beginning, no card has been dealt yet
  if (prevRound < 0) {
    return null;
  }

  const prevCardIndex = prevRound * state.players.length + prevPlayerIndex;
  const prevPlayer = state.players[prevPlayerIndex];

  if (prevCardIndex < state.deck.length - 8 && prevPlayer.hand.length > 0) {
    return {
      playerId: prevPlayer.id,
      card: prevPlayer.hand[prevPlayer.hand.length - 1], // Last card in hand
    };
  }

  return null;
};

// Pause dealing for trump declarations
export const pauseDealing = (
  state: GameState,
  reason: string = "trump_declaration",
): GameState => {
  const newState = { ...state };

  if (newState.dealingState && !newState.dealingState.completed) {
    newState.dealingState.paused = true;
    newState.dealingState.pauseReason = reason;
  }

  return newState;
};

// Resume dealing after trump declarations are resolved
export const resumeDealing = (state: GameState): GameState => {
  const newState = { ...state };

  if (newState.dealingState) {
    newState.dealingState.paused = false;
    newState.dealingState.pauseReason = undefined;
  }

  return newState;
};

// Check if dealing is currently paused
export const isDealingPaused = (state: GameState): boolean => {
  return state.dealingState?.paused ?? false;
};

// Get dealing pause reason
export const getDealingPauseReason = (state: GameState): string | undefined => {
  return state.dealingState?.pauseReason;
};

// Check if a card is a trump
export const isTrump = (card: Card, trumpInfo: TrumpInfo): boolean => {
  // Jokers are always trump
  if (card.joker) return true;

  // Cards of trump rank are trump
  if (card.rank === trumpInfo.trumpRank) return true;

  // Cards of trump suit (if declared) are trump
  if (trumpInfo.trumpSuit !== undefined && card.suit === trumpInfo.trumpSuit)
    return true;

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
  if (trumpInfo.trumpSuit !== undefined && card.suit === trumpInfo.trumpSuit)
    return 1;

  return 0; // Not a trump (shouldn't reach here)
};

// Compare two cards based on trump rules
// WARNING: This function should only be used when cards are from the same suit
// or when comparing trump cards. For cross-suit comparisons in trick context,
// use evaluateTrickPlay() instead.
export const compareCards = (
  cardA: Card,
  cardB: Card,
  trumpInfo: TrumpInfo,
): number => {
  // Validation: Ensure this function is used correctly
  const aIsTrump = isTrump(cardA, trumpInfo);
  const bIsTrump = isTrump(cardB, trumpInfo);

  // Allow comparison if: same suit, or both trump, or one is trump (trump beats non-trump)
  const sameSuit = cardA.suit === cardB.suit;
  const validComparison = sameSuit || aIsTrump || bIsTrump;

  if (!validComparison) {
    throw new Error(
      `compareCards: Invalid comparison between different non-trump suits: ` +
        `${cardA.rank}${cardA.suit} vs ${cardB.rank}${cardB.suit}. ` +
        `Use evaluateTrickPlay() for cross-suit trick comparisons.`,
    );
  }

  // First compare by trump status

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

/**
 * Evaluates whether a proposed play can beat the current winning combo in a trick
 * This replaces the context-less compareCards for proper trick-taking game logic
 */
export interface TrickPlayResult {
  canBeat: boolean; // Can this play beat the current winner?
  isLegal: boolean; // Is this a legal play given hand and trick context?
  strength: number; // Relative strength (for AI decision making)
  reason?: string; // Why it can/can't beat (for debugging)
}

export function evaluateTrickPlay(
  proposedPlay: Card[],
  currentTrick: Trick,
  trumpInfo: TrumpInfo,
  playerHand: Card[],
): TrickPlayResult {
  // Extract trick context
  const leadingCards = currentTrick.plays[0]?.cards || [];
  const leadingSuit = leadingCards[0]?.suit;
  const leadingComboType = getComboType(leadingCards);
  const proposedComboType = getComboType(proposedPlay);

  // Get current winning combo
  const currentWinningCombo = getCurrentWinningCombo(currentTrick);

  // Step 1: Validate combo type matching
  if (leadingComboType !== proposedComboType) {
    return {
      canBeat: false,
      isLegal: false,
      strength: -1,
      reason: `Must match combo type: ${leadingComboType} was led`,
    };
  }

  // Step 2: Check if player must follow suit
  const hasLedSuit = playerHand.some((card) => card.suit === leadingSuit);
  const proposedSuit = proposedPlay[0]?.suit;

  if (hasLedSuit && proposedSuit !== leadingSuit) {
    // Player has led suit but playing different suit
    const proposedIsTrump = proposedPlay.every((card) =>
      isTrump(card, trumpInfo),
    );

    if (!proposedIsTrump) {
      return {
        canBeat: false,
        isLegal: false,
        strength: -1,
        reason: `Must follow suit: have ${leadingSuit} but playing ${proposedSuit}`,
      };
    }
  }

  // Step 3: Determine if play can beat current winner
  const canBeat = canComboBeaten(
    proposedPlay,
    currentWinningCombo,
    leadingSuit,
    trumpInfo,
  );
  const strength = calculateComboStrength(
    proposedPlay,
    currentWinningCombo,
    trumpInfo,
  );

  return {
    canBeat,
    isLegal: true,
    strength,
    reason: canBeat ? "Can beat current winner" : "Cannot beat current winner",
  };
}

/**
 * Helper function to get the current winning combo from a trick
 */
function getCurrentWinningCombo(trick: Trick): Card[] {
  if (!trick.winningPlayerId) {
    return trick.plays[0]?.cards || []; // Leader is winning by default
  }

  // Find the winning play
  const winningPlay = trick.plays.find(
    (play) => play.playerId === trick.winningPlayerId,
  );
  return winningPlay ? winningPlay.cards : trick.plays[0]?.cards || [];
}

// Note: Using existing getComboType function defined later in file

/**
 * Core logic: Can proposedCombo beat currentWinningCombo?
 */
function canComboBeaten(
  proposedCombo: Card[],
  currentWinningCombo: Card[],
  leadingSuit: Suit | undefined,
  trumpInfo: TrumpInfo,
): boolean {
  const proposedSuit = proposedCombo[0]?.suit;
  const winningSuit = currentWinningCombo[0]?.suit;

  const proposedIsTrump = proposedCombo.every((card) =>
    isTrump(card, trumpInfo),
  );
  const winningIsTrump = currentWinningCombo.every((card) =>
    isTrump(card, trumpInfo),
  );

  // Trump beats non-trump
  if (proposedIsTrump && !winningIsTrump) {
    return true;
  }

  // Non-trump cannot beat trump
  if (!proposedIsTrump && winningIsTrump) {
    return false;
  }

  // Different suits (both non-trump) - cannot beat
  if (proposedSuit !== winningSuit && !proposedIsTrump && !winningIsTrump) {
    return false;
  }

  // Same suit or both trump - compare by rank/strength
  if (proposedSuit === winningSuit || (proposedIsTrump && winningIsTrump)) {
    // Use existing compareCards for same-suit/trump comparison
    return (
      compareCards(proposedCombo[0], currentWinningCombo[0], trumpInfo) > 0
    );
  }

  return false;
}

/**
 * Calculate relative strength for AI decision making
 * This function handles cross-suit comparisons safely for trick context
 */
function calculateComboStrength(
  proposedCombo: Card[],
  currentWinningCombo: Card[],
  trumpInfo: TrumpInfo,
): number {
  const proposedSuit = proposedCombo[0]?.suit;
  const winningSuit = currentWinningCombo[0]?.suit;

  const proposedIsTrump = proposedCombo.every((card) =>
    isTrump(card, trumpInfo),
  );
  const winningIsTrump = currentWinningCombo.every((card) =>
    isTrump(card, trumpInfo),
  );

  // For cross-suit trick comparisons, use trump-aware strength calculation
  if (proposedSuit !== winningSuit && !proposedIsTrump && !winningIsTrump) {
    // Different non-trump suits - cannot beat, assign low strength
    return 25;
  }

  // Same suit or trump involved - safe to use compareCards
  const comparison = compareCards(
    proposedCombo[0],
    currentWinningCombo[0],
    trumpInfo,
  );

  // Normalize to 0-100 scale for AI use
  if (comparison > 0) return 75 + Math.min(comparison * 5, 25); // 75-100 for winning
  if (comparison === 0) return 50; // 50 for equal
  return Math.max(25 + comparison * 5, 0); // 0-25 for losing
}

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

// Rank values for consistent card evaluation across the codebase
const RANK_VALUES: Record<Rank, number> = {
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

/**
 * Get trump hierarchy base value for trump suit cards
 * Used consistently across conservation and strategic modes
 */
const getTrumpSuitBaseValue = (rank: Rank): number => {
  switch (rank) {
    case Rank.Ace:
      return 60;
    case Rank.King:
      return 55;
    case Rank.Queen:
      return 50;
    case Rank.Jack:
      return 45;
    case Rank.Ten:
      return 40;
    case Rank.Nine:
      return 35;
    case Rank.Eight:
      return 30;
    case Rank.Seven:
      return 25;
    case Rank.Six:
      return 20;
    case Rank.Five:
      return 15;
    case Rank.Four:
      return 10;
    case Rank.Three:
      return 5;
    default:
      return 0;
  }
};

/**
 * Calculate strategic value of a card considering multiple factors
 * Used for intelligent card selection, sorting, and AI decision-making
 *
 * @param card The card to evaluate
 * @param trumpInfo Current trump information
 * @param mode Evaluation mode: 'combo' (for combo comparison), 'conservation' (for AI conservation), 'strategic' (for mixed combinations)
 * @returns Numerical value representing card's strategic importance
 */
export const calculateCardStrategicValue = (
  card: Card,
  trumpInfo: TrumpInfo,
  mode: "combo" | "conservation" | "strategic" = "combo",
): number => {
  // Handle jokers first
  if (card.joker) {
    if (mode === "combo") return card.joker === JokerType.Big ? 1000 : 999;
    if (mode === "conservation") return card.joker === JokerType.Big ? 100 : 90;
    if (mode === "strategic") return card.joker === JokerType.Big ? 1200 : 1190; // Trump bonus + conservation
  }

  let value = 0;

  // Mode-specific value calculation
  if (mode === "strategic") {
    // Strategic mode: Trump cards ALWAYS rank higher than non-trump cards for disposal

    // Trump cards get minimum base value to ensure they rank above all non-trump cards
    if (isTrump(card, trumpInfo)) {
      value += 200; // Base trump value ensures trump > non-trump

      // Use conservation hierarchy for trump cards to maintain proper trump priority
      if (card.rank === trumpInfo.trumpRank) {
        value += card.suit === trumpInfo.trumpSuit ? 80 : 70; // Trump rank priority
      } else if (card.suit === trumpInfo.trumpSuit) {
        // Trump suit cards get graduated bonuses based on conservation hierarchy
        value += getTrumpSuitBaseValue(card.rank!);
      }
    } else {
      // Non-trump cards: point cards and Aces are valuable but always < trump
      if (card.points && card.points > 0) {
        value += card.points * 10; // 5s = 50, 10s/Kings = 100
      }

      // Aces are valuable for non-trump cards
      if (card.rank === Rank.Ace) {
        value += 50;
      }

      // Base rank value for non-trump cards
      value += RANK_VALUES[card.rank!] || 0;
    }
  } else if (mode === "conservation") {
    // Conservation mode: Trump hierarchy for AI strategic decisions

    // Trump rank cards
    if (card.rank === trumpInfo.trumpRank) {
      value = card.suit === trumpInfo.trumpSuit ? 80 : 70; // Trump rank in trump suit vs off-suits
    }
    // Trump suit cards (non-rank)
    else if (card.suit === trumpInfo.trumpSuit) {
      value = getTrumpSuitBaseValue(card.rank!);
    }
    // Non-trump cards
    else {
      value = RANK_VALUES[card.rank!] || 0;
    }
  } else {
    // Combo mode: Basic trump hierarchy for combination comparison
    value = RANK_VALUES[card.rank!] || 0;

    // Trump cards have higher value
    if (isTrump(card, trumpInfo)) {
      value += 100;

      // Trump suit is higher than trump rank of other suits
      if (card.suit === trumpInfo.trumpSuit) {
        value += 50;
      }
    }
  }

  return value;
};

// Legacy function for backward compatibility
const getCardValue = (card: Card, trumpInfo: TrumpInfo): number => {
  return calculateCardStrategicValue(card, trumpInfo, "combo");
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

  // Find consecutive pairs to form tractors of any length
  for (let startIdx = 0; startIdx < pairs.length; startIdx++) {
    // Build the longest possible tractor starting from this position
    const tractorPairs = [pairs[startIdx]];
    let currentIdx = startIdx;

    // Keep adding consecutive pairs
    while (currentIdx + 1 < pairs.length) {
      const currentRankValue = getRankValue(pairs[currentIdx].rank);
      const nextRankValue = getRankValue(pairs[currentIdx + 1].rank);

      // Check if next pair is consecutive
      if (nextRankValue - currentRankValue === 1) {
        tractorPairs.push(pairs[currentIdx + 1]);
        currentIdx++;
      } else {
        break; // No more consecutive pairs
      }
    }

    // Only add tractor if it has at least 2 pairs (4 cards)
    if (tractorPairs.length >= 2) {
      const tractorCards = tractorPairs.flatMap((pair) => pair.cards);

      // Calculate value based on the highest rank in the tractor
      const value = Math.max(
        ...tractorPairs.map((pair) => getCardValue(pair.cards[0], trumpInfo)),
      );

      combos.push({
        type: ComboType.Tractor,
        cards: tractorCards,
        value: value,
      });
    }
  }
};

/**
 * Check if same-suit pairs are preserved when following combinations
 * Issue #126 Fix: Enforce that pairs from the same suit as led cannot be broken
 */
const checkSameSuitPairPreservation = (
  playedCards: Card[],
  leadingCombo: Card[],
  playerHand: Card[],
  trumpInfo: TrumpInfo,
): boolean => {
  const leadingSuit = getLeadingSuit(leadingCombo);
  const isLeadingTrump = leadingCombo.some((card) => isTrump(card, trumpInfo));

  // Get all cards of the leading suit/trump in player's hand
  const relevantCards = isLeadingTrump
    ? playerHand.filter((card) => isTrump(card, trumpInfo))
    : playerHand.filter(
        (card) => card.suit === leadingSuit && !isTrump(card, trumpInfo),
      );

  // Identify pairs in the relevant cards (same suit as led)
  const relevantPairs = identifyCombos(relevantCards, trumpInfo)
    .filter((combo) => combo.type === ComboType.Pair)
    .map((combo) => combo.cards);

  if (relevantPairs.length === 0) {
    return true; // No same-suit pairs to preserve
  }

  // Check each same-suit pair - if any card from a pair is played, the whole pair must be played
  for (const pair of relevantPairs) {
    const cardsFromPairPlayed = pair.filter((pairCard) =>
      playedCards.some((played) => played.id === pairCard.id),
    );

    // If some but not all cards from a pair are played, this violates pair preservation
    if (
      cardsFromPairPlayed.length > 0 &&
      cardsFromPairPlayed.length < pair.length
    ) {
      return false; // Same-suit pair broken
    }
  }

  return true; // All same-suit pairs preserved
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
export const getComboType = (
  cards: Card[],
  trumpInfo?: TrumpInfo,
): ComboType => {
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
    // Use trump-aware grouping similar to auto-selection logic
    if (trumpInfo) {
      // Group cards by rank and trump-aware suit categories
      const cardsByRankSuit = new Map<string, Card[]>();
      cards.forEach((card) => {
        if (card.rank && card.suit) {
          let suitKey: string = card.suit;

          if (card.rank === trumpInfo.trumpRank) {
            // Trump rank cards get compound key with trump indicator and suit
            suitKey = `trump_${card.suit}`;
          } else if (isTrump(card, trumpInfo)) {
            // Trump suit (non-trump rank) cards grouped separately
            suitKey = "trump_suit";
          }

          const key = `${card.rank}-${suitKey}`;
          if (!cardsByRankSuit.has(key)) {
            cardsByRankSuit.set(key, []);
          }
          cardsByRankSuit.get(key)!.push(card);
        }
      });

      // Check if all cards form pairs within trump-aware groups
      const pairs = Array.from(cardsByRankSuit.entries()).filter(
        ([_, groupCards]) => groupCards.length === 2,
      );

      // Must have exactly cards.length / 2 pairs
      const expectedPairs = cards.length / 2;
      if (pairs.length === expectedPairs) {
        // Extract ranks and check if they're from the same trump category
        const pairData = pairs.map(([key, groupCards]) => {
          const [rank, suitKey] = key.split("-");
          return { rank: rank as Rank, suitKey, groupCards };
        });

        // All pairs must be in the same trump category (same suitKey pattern)
        const firstSuitKey = pairData[0].suitKey;
        const sameTrumpCategory = pairData.every(
          (pair) => pair.suitKey === firstSuitKey,
        );

        if (sameTrumpCategory) {
          // Get the rank values of the pairs
          const pairRanks = pairData.map((pair) => getRankValue(pair.rank));
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
    } else {
      // Fallback to simple suit checking when no trump info provided
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

  // Add points from all plays (including leader at plays[0])
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
  if (!currentTrick || !currentTrick.plays[0]?.cards) {
    return identifyCombos(playerHand, trumpInfo);
  }

  // Get all possible combinations from player's hand
  const allCombos = identifyCombos(playerHand, trumpInfo);
  const leadingCards = currentTrick.plays[0].cards;
  const leadingLength = leadingCards.length;

  // ISSUE #104 PROPER FIX: Context-aware combo filtering
  const leadingSuit = getLeadingSuit(leadingCards);
  const isLeadingTrump = leadingCards.some((card) => isTrump(card, trumpInfo));
  const leadingComboType = getComboType(leadingCards);

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

    return isValidPlay(combo.cards, leadingCards, playerHand, trumpInfo);
  });

  // Generate mixed combinations as additional strategic options ONLY if needed
  const mixedCombos =
    validCombos.length > 0
      ? []
      : generateMixedCombinations(playerHand, leadingCards, trumpInfo);

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
const generateMixedCombinations = (
  playerHand: Card[],
  leadingCards: Card[],
  trumpInfo: TrumpInfo,
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
      return generateStrategicSample(cards, length, MAX_COMBINATIONS);
    }

    // For smaller hands, use optimized iterative generation
    return generateIterativeCombinations(cards, length, MAX_COMBINATIONS);
  };

  // Strategic sampling for large hands - focus on trump conservation hierarchy
  const generateStrategicSample = (
    cards: Card[],
    length: number,
    maxCombos: number,
  ): Card[][] => {
    const combinations: Card[][] = [];

    // Sort cards by trump conservation hierarchy (weakest first)
    const sortedCards = [...cards].sort((a, b) => {
      const valueA = calculateCardStrategicValue(a, trumpInfo, "conservation");
      const valueB = calculateCardStrategicValue(b, trumpInfo, "conservation");
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

    // Strategy 3: Mixed trump/non-trump when possible
    const trumpCards = sortedCards.filter((card) => isTrump(card, trumpInfo));
    const nonTrumpCards = sortedCards.filter(
      (card) => !isTrump(card, trumpInfo),
    );

    if (trumpCards.length > 0 && nonTrumpCards.length > 0 && length >= 2) {
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
      // Sort by trump conservation hierarchy (weakest first)
      const sortedByConservation = requiredSuitCards.sort((a, b) => {
        const valueA = calculateCardStrategicValue(
          a,
          trumpInfo,
          "conservation",
        );
        const valueB = calculateCardStrategicValue(
          b,
          trumpInfo,
          "conservation",
        );
        return valueA - valueB; // Weakest first for disposal
      });
      return sortedByConservation.slice(0, leadingLength);
    }

    // Step 2: Partial suit following - use ALL required suit cards + others
    if (requiredSuitCards.length > 0) {
      combo.push(...requiredSuitCards);

      // Get remaining cards sorted by strategic value (weakest first)
      const remainingCards = playerHand
        .filter((card) => !combo.some((c) => c.id === card.id))
        .sort((a, b) => {
          const valueA = calculateCardStrategicValue(a, trumpInfo, "strategic");
          const valueB = calculateCardStrategicValue(b, trumpInfo, "strategic");
          return valueA - valueB; // Weakest first
        });

      const remaining = leadingLength - combo.length;
      combo.push(...remainingCards.slice(0, remaining));

      return combo.length === leadingLength ? combo : null;
    }

    // Step 3: No required suit cards - choose weakest cards overall
    const allCardsSorted = playerHand.sort((a, b) => {
      const valueA = calculateCardStrategicValue(a, trumpInfo, "strategic");
      const valueB = calculateCardStrategicValue(b, trumpInfo, "strategic");
      return valueA - valueB; // Weakest first
    });

    return allCardsSorted.slice(0, leadingLength);
  };

  // Try optimal construction first - with validation retry
  const optimalCombo = constructOptimalCombination();
  if (optimalCombo) {
    if (isValidPlay(optimalCombo, leadingCards, playerHand, trumpInfo)) {
      validMixedCombos.push({
        type: ComboType.Single,
        cards: optimalCombo,
        value: calculateCardStrategicValue(optimalCombo[0], trumpInfo, "combo"),
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
          const valueA = calculateCardStrategicValue(
            a,
            trumpInfo,
            "conservation",
          );
          const valueB = calculateCardStrategicValue(
            b,
            trumpInfo,
            "conservation",
          );
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
        isValidPlay(simpleCombo, leadingCards, playerHand, trumpInfo)
      ) {
        validMixedCombos.push({
          type: ComboType.Single,
          cards: simpleCombo,
          value: calculateCardStrategicValue(
            simpleCombo[0],
            trumpInfo,
            "combo",
          ),
        });
      }
    }
  }

  // PRIORITY 2: Generate additional valid options for AI strategy choice
  const allCombinations = generateSmartCombinations(playerHand, leadingLength);

  // Sort combinations by strategic value (weakest combinations first for better disposal)
  const sortedCombinations = allCombinations
    .filter((cards) => isValidPlay(cards, leadingCards, playerHand, trumpInfo))
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
        value: calculateCardStrategicValue(cards[0], trumpInfo, "combo"),
      });
    }
  }

  // CRITICAL SAFETY: Ensure we always return at least one valid combination
  if (validMixedCombos.length === 0) {
    console.warn(
      "No valid mixed combinations found, entering fallback logic:",
      {
        playerHandSize: playerHand.length,
        leadingCards: leadingCards.map((c) => c.joker || `${c.rank}${c.suit}`),
        leadingSuit,
        isLeadingTrump,
        spadesInHand: playerHand
          .filter((c) => c.suit === "Spades")
          .map((c) => `${c.rank}${c.suit}`),
      },
    );
    // Guaranteed fallback: Find any valid combination through systematic search
    const guaranteedCombo = findGuaranteedValidCombination(
      playerHand,
      leadingCards,
      trumpInfo,
      leadingLength,
    );

    if (guaranteedCombo.length === leadingLength) {
      validMixedCombos.push({
        type: ComboType.Single,
        cards: guaranteedCombo,
        value: 1,
      });
    } else {
      // Last resort emergency fallback - should be extremely rare
      const emergencyCombo = playerHand.slice(0, leadingLength);
      console.error(
        "CRITICAL: Emergency fallback in generateMixedCombinations",
        {
          playerHand: playerHand.map((c) => c.joker || `${c.rank}${c.suit}`),
          leadingCards: leadingCards.map(
            (c) => c.joker || `${c.rank}${c.suit}`,
          ),
          trumpInfo,
          leadingSuit,
          isLeadingTrump,
          leadingLength,
          guaranteedComboLength: guaranteedCombo.length,
        },
      );

      validMixedCombos.push({
        type: ComboType.Single,
        cards: emergencyCombo,
        value: 1,
      });
    }
  }

  // Helper function for guaranteed valid combination discovery
  function findGuaranteedValidCombination(
    hand: Card[],
    leading: Card[],
    trump: TrumpInfo,
    length: number,
  ): Card[] {
    // Strategy 1: Try all cards of leading suit/trump first
    const leadingSuitCards = isLeadingTrump
      ? hand.filter((card) => isTrump(card, trump))
      : hand.filter(
          (card) => card.suit === leadingSuit && !isTrump(card, trump),
        );

    if (leadingSuitCards.length >= length) {
      const combo = leadingSuitCards.slice(0, length);
      if (isValidPlay(combo, leading, hand, trump)) {
        return combo;
      }
    }

    // Strategy 2: Mixed combinations with required suit cards
    if (leadingSuitCards.length > 0 && leadingSuitCards.length < length) {
      const otherCards = hand
        .filter((card) => !leadingSuitCards.some((lsc) => lsc.id === card.id))
        .slice(0, length - leadingSuitCards.length);

      const combo = [...leadingSuitCards, ...otherCards];
      if (combo.length === length && isValidPlay(combo, leading, hand, trump)) {
        return combo;
      }
    }

    // Strategy 3: Brute force - try different combinations until we find valid one
    for (let startIndex = 0; startIndex <= hand.length - length; startIndex++) {
      const combo = hand.slice(startIndex, startIndex + length);
      if (isValidPlay(combo, leading, hand, trump)) {
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

      if (combo.length === length && isValidPlay(combo, leading, hand, trump)) {
        return combo;
      }
    }

    // Return empty array if no valid combination found (very rare edge case)
    return [];
  }

  return validMixedCombos;
};
