import { 
  Card, 
  Suit, 
  Rank, 
  JokerType, 
  GameState, 
  Player, 
  Combo, 
  ComboType,
  Trick,
  TrumpInfo
} from '../types/game';
import { v4 as uuidv4 } from 'uuid';

// Create a new deck of cards (2 decks for Shengji)
export const createDeck = (): Card[] => {
  const deck: Card[] = [];
  
  // Create 2 decks with all suits and ranks
  for (let deckNum = 0; deckNum < 2; deckNum++) {
    // Regular cards
    Object.values(Suit).forEach(suit => {
      Object.values(Rank).forEach(rank => {
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
          points
        });
      });
    });
    
    // Add jokers
    deck.push({
      joker: JokerType.Small,
      id: `Small_Joker_${deckNum}`,
      points: 0
    });
    
    deck.push({
      joker: JokerType.Big,
      id: `Big_Joker_${deckNum}`,
      points: 0
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
  newState.gamePhase = 'declaring';
  
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

// Compare two cards based on trump rules
export const compareCards = (cardA: Card, cardB: Card, trumpInfo: TrumpInfo): number => {
  // Check if cards are trump
  const aIsTrump = isTrump(cardA, trumpInfo);
  const bIsTrump = isTrump(cardB, trumpInfo);
  
  // If only one is trump, it wins
  if (aIsTrump && !bIsTrump) return 1;
  if (!aIsTrump && bIsTrump) return -1;
  
  // If both are trump, check specific trump hierarchy
  if (aIsTrump && bIsTrump) {
    // Jokers beat everything else
    if (cardA.joker && !cardB.joker) return 1;
    if (!cardA.joker && cardB.joker) return -1;
    
    // Big joker beats small joker
    if (cardA.joker && cardB.joker) {
      if (cardA.joker === JokerType.Big && cardB.joker === JokerType.Small) return 1;
      if (cardA.joker === JokerType.Small && cardB.joker === JokerType.Big) return -1;
      return 0; // Same joker (shouldn't happen with valid IDs)
    }
    
    // Trump rank with trump suit beats trump rank with other suit
    if (cardA.rank === trumpInfo.trumpRank && cardB.rank === trumpInfo.trumpRank) {
      if (cardA.suit === trumpInfo.trumpSuit && cardB.suit !== trumpInfo.trumpSuit) return 1;
      if (cardA.suit !== trumpInfo.trumpSuit && cardB.suit === trumpInfo.trumpSuit) return -1;
      
      // If both are trump rank, compare suits
      if (cardA.suit && cardB.suit) {
        return compareSuits(cardA.suit, cardB.suit);
      }
    }
    
    // If both are trump suit, compare ranks
    if (cardA.suit === trumpInfo.trumpSuit && cardB.suit === trumpInfo.trumpSuit) {
      return compareRanks(cardA.rank!, cardB.rank!);
    }
  }
  
  // Non-trump comparison
  // If suits are the same, compare ranks
  if (cardA.suit === cardB.suit) {
    return compareRanks(cardA.rank!, cardB.rank!);
  }
  
  // Different suits, and not trumps - first card played wins
  return 0;
};

// Compare suits (arbitrary order, doesn't matter as long as it's consistent)
const compareSuits = (suitA: Suit, suitB: Suit): number => {
  const suitOrder = [Suit.Spades, Suit.Hearts, Suit.Clubs, Suit.Diamonds];
  return suitOrder.indexOf(suitB) - suitOrder.indexOf(suitA);
};

// Compare ranks
const compareRanks = (rankA: Rank, rankB: Rank): number => {
  const rankOrder = [
    Rank.Two, Rank.Three, Rank.Four, Rank.Five, Rank.Six, Rank.Seven, 
    Rank.Eight, Rank.Nine, Rank.Ten, Rank.Jack, Rank.Queen, Rank.King, Rank.Ace
  ];
  return rankOrder.indexOf(rankA) - rankOrder.indexOf(rankB);
};

// Identify valid combinations in a player's hand
export const identifyCombos = (cards: Card[], trumpInfo: TrumpInfo): Combo[] => {
  const combos: Combo[] = [];
  
  // Group cards by suit and rank
  const cardsBySuit = groupCardsBySuit(cards, trumpInfo);
  
  // Look for singles
  cards.forEach(card => {
    combos.push({
      type: ComboType.Single,
      cards: [card],
      value: getCardValue(card, trumpInfo)
    });
  });
  
  // Look for pairs, triplets, and quads
  Object.values(cardsBySuit).forEach(suitCards => {
    const cardsByRank = groupCardsByRank(suitCards);
    
    Object.values(cardsByRank).forEach(rankCards => {
      // Pairs
      if (rankCards.length >= 2) {
        for (let i = 0; i < rankCards.length - 1; i++) {
          combos.push({
            type: ComboType.Pair,
            cards: [rankCards[i], rankCards[i + 1]],
            value: getCardValue(rankCards[i], trumpInfo)
          });
        }
      }
      
      // Triplets
      if (rankCards.length >= 3) {
        for (let i = 0; i < rankCards.length - 2; i++) {
          combos.push({
            type: ComboType.Triplet,
            cards: [rankCards[i], rankCards[i + 1], rankCards[i + 2]],
            value: getCardValue(rankCards[i], trumpInfo)
          });
        }
      }
      
      // Quads
      if (rankCards.length >= 4) {
        for (let i = 0; i < rankCards.length - 3; i++) {
          combos.push({
            type: ComboType.Quad,
            cards: [rankCards[i], rankCards[i + 1], rankCards[i + 2], rankCards[i + 3]],
            value: getCardValue(rankCards[i], trumpInfo)
          });
        }
      }
    });
    
    // Look for straights and tractors within this suit
    findStraights(suitCards, trumpInfo, combos);
    findTractors(suitCards, trumpInfo, combos);
  });
  
  return combos;
};

// Group cards by suit (considering trumps)
const groupCardsBySuit = (cards: Card[], trumpInfo: TrumpInfo): Record<string, Card[]> => {
  const cardsBySuit: Record<string, Card[]> = {};
  
  cards.forEach(card => {
    let suitKey = 'joker';
    
    if (card.suit) {
      // If card is trump rank, group it with trumps
      if (card.rank === trumpInfo.trumpRank) {
        suitKey = 'trump';
      } else if (isTrump(card, trumpInfo)) {
        // If card is trump suit, group it with trumps
        suitKey = 'trump';
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
  
  cards.forEach(card => {
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

// Find straight runs in a suit
const findStraights = (cards: Card[], trumpInfo: TrumpInfo, combos: Combo[]): void => {
  // Implement straight finding logic
  // This is a placeholder - would need complex logic to find all valid straights
};

// Find tractors (consecutive pairs) in a suit
const findTractors = (cards: Card[], trumpInfo: TrumpInfo, combos: Combo[]): void => {
  // Implement tractor finding logic
  // This is a placeholder - would need complex logic to find all valid tractors
};

// Check if a play is valid following Shengji rules
export const isValidPlay = (
  playedCards: Card[], 
  leadingCombo: Card[] | null, 
  playerHand: Card[], 
  trumpInfo: TrumpInfo
): boolean => {
  // If no leading combo, any valid combo is acceptable
  if (!leadingCombo) {
    const combos = identifyCombos(playerHand, trumpInfo);
    return combos.some(combo => 
      combo.cards.length === playedCards.length && 
      combo.cards.every(card => playedCards.some(played => played.id === card.id))
    );
  }
  
  // Check if player has cards to follow suit/combo
  const leadingSuit = getLeadingSuit(leadingCombo);
  const cardsOfLeadingSuit = playerHand.filter(card => 
    card.suit === leadingSuit && card.rank !== trumpInfo.trumpRank
  );
  
  // If player has cards of leading suit, they must play them
  if (cardsOfLeadingSuit.length >= leadingCombo.length) {
    return playedCards.every(card => cardsOfLeadingSuit.some(handCard => handCard.id === card.id));
  }
  
  // Player doesn't have enough cards of leading suit - can play trump or any other cards
  return playedCards.length === leadingCombo.length;
};

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

// Determine the winner of a trick
export const determineTrickWinner = (trick: Trick, trumpInfo: TrumpInfo): string => {
  let winningPlayerId = trick.leadingPlayerId;
  let winningCards = trick.leadingCombo;
  
  trick.plays.forEach(play => {
    // Skip the leading play since it's already set as winning by default
    if (play.playerId === trick.leadingPlayerId) return;
    
    // Compare the played cards to the current winning cards
    const comparison = compareCardCombos(winningCards, play.cards, trumpInfo);
    
    // If the current play is stronger, update the winner
    if (comparison < 0) {
      winningPlayerId = play.playerId;
      winningCards = play.cards;
    }
  });
  
  return winningPlayerId;
};

// Compare two card combinations
const compareCardCombos = (comboA: Card[], comboB: Card[], trumpInfo: TrumpInfo): number => {
  // Check if combos are the same type (singles, pairs, etc.)
  if (comboA.length !== comboB.length) {
    throw new Error('Cannot compare combos of different lengths');
  }
  
  // For singles, directly compare cards
  if (comboA.length === 1) {
    return compareCards(comboA[0], comboB[0], trumpInfo);
  }
  
  // For multi-card combos, it gets more complex
  // In Shengji, the suit of the first card usually determines the suit of the combo
  const suitA = getLeadingSuit(comboA);
  const suitB = getLeadingSuit(comboB);
  
  // If one is trump and the other isn't, trump wins
  const aIsTrump = suitA === trumpInfo.trumpSuit || comboA.some(card => isTrump(card, trumpInfo));
  const bIsTrump = suitB === trumpInfo.trumpSuit || comboB.some(card => isTrump(card, trumpInfo));
  
  if (aIsTrump && !bIsTrump) return 1;
  if (!aIsTrump && bIsTrump) return -1;
  
  // If both are same suit or both are trump, compare the highest card of each
  // (This is simplified - actual Shengji rules for multi-card combos are more complex)
  const maxCardA = comboA.reduce((max, card) => 
    compareCards(max, card, trumpInfo) > 0 ? max : card, comboA[0]
  );
  
  const maxCardB = comboB.reduce((max, card) => 
    compareCards(max, card, trumpInfo) > 0 ? max : card, comboB[0]
  );
  
  return compareCards(maxCardA, maxCardB, trumpInfo);
};

// Calculate points in a trick
export const calculateTrickPoints = (trick: Trick): number => {
  let points = 0;
  
  // Add points from leading combo
  trick.leadingCombo.forEach(card => {
    points += card.points;
  });
  
  // Add points from other plays
  trick.plays.forEach(play => {
    play.cards.forEach(card => {
      points += card.points;
    });
  });
  
  return points;
};

// Initialize a new game
export const initializeGame = (
  playerName: string, 
  teamNames: [string, string], 
  startingRank: Rank
): GameState => {
  // Create players (1 human, 3 AI)
  const players: Player[] = [
    {
      id: 'player',
      name: playerName,
      isHuman: true,
      hand: [],
      currentRank: startingRank,
      team: 'A'
    },
    {
      id: 'ai1',
      name: 'Bot 1',
      isHuman: false,
      hand: [],
      currentRank: startingRank,
      team: 'B'
    },
    {
      id: 'ai2',
      name: 'Bot 2',
      isHuman: false,
      hand: [],
      currentRank: startingRank,
      team: 'A'
    },
    {
      id: 'ai3',
      name: 'Bot 3',
      isHuman: false,
      hand: [],
      currentRank: startingRank,
      team: 'B'
    }
  ];
  
  // Create teams
  const teams: [Team, Team] = [
    {
      id: 'A',
      players: ['player', 'ai2'],
      currentRank: startingRank,
      points: 0,
      isDefending: true // Team A defends first
    },
    {
      id: 'B',
      players: ['ai1', 'ai3'],
      currentRank: startingRank,
      points: 0,
      isDefending: false
    }
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
      trumpRank: startingRank,
      declared: false
    },
    tricks: [],
    roundNumber: 1,
    currentPlayerIndex: 0,
    gamePhase: 'dealing'
  };
  
  // Deal cards to players
  return dealCards(gameState);
};