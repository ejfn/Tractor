import {
  Card,
  GameState,
  Player,
  Combo,
  TrumpInfo
} from '../types/game';
import {
  identifyCombos,
  isValidPlay,
  isTrump,
  compareCards,
  getLeadingSuit
} from './gameLogic';

// Base AI strategy interface
interface AIStrategy {
  makePlay(
    gameState: GameState, 
    player: Player, 
    validCombos: Combo[]
  ): Card[];
  
  declareTrumpSuit(gameState: GameState, player: Player): boolean;
}

// Single AI strategy - always uses hard/expert level AI

// AI strategy implementation
class AIStrategy implements AIStrategy {
  makePlay(
    gameState: GameState, 
    player: Player, 
    validCombos: Combo[]
  ): Card[] {
    const { currentTrick, trumpInfo, players, currentPlayerIndex } = gameState;
    
    // If leading, consider several factors
    if (!currentTrick || !currentTrick.leadingCombo) {
      // Check if we should lead with trump
      const shouldLeadTrump = this.shouldLeadWithTrump(gameState, player);
      
      if (shouldLeadTrump) {
        // Find the strongest trump combo
        const trumpCombos = validCombos.filter(
          combo => combo.cards.some(card => isTrump(card, trumpInfo))
        );
        
        if (trumpCombos.length > 0) {
          const sortedTrumpCombos = [...trumpCombos].sort((a, b) => b.value - a.value);
          return sortedTrumpCombos[0].cards;
        }
      }
      
      // Otherwise, lead with a good non-trump combo
      return this.selectLeadingCombo(validCombos, trumpInfo);
    }
    
    // If following, use more complex logic
    // Check if partner is winning the trick
    const partnerIndex = (currentPlayerIndex + 2) % 4;
    const partnerInTrick = currentTrick.plays.some(
      play => play.playerId === players[partnerIndex].id
    );
    
    const currentWinner = this.getCurrentTrickWinner(gameState);
    const partnerWinning = partnerInTrick && currentWinner === players[partnerIndex].id;
    
    // Check if trick has significant points
    const trickPoints = currentTrick.plays.reduce((sum, play) => 
      sum + play.cards.reduce((cardSum, card) => cardSum + card.points, 0), 0
    );
    
    // Strategy based on trick state
    if (partnerWinning) {
      // Partner is winning, play our lowest cards
      const sortedCombos = [...validCombos].sort((a, b) => a.value - b.value);
      return sortedCombos[0].cards;
    } else if (trickPoints >= 15) {
      // High points at stake, try to win with strongest combo
      const sortedCombos = [...validCombos].sort((a, b) => b.value - a.value);
      return sortedCombos[0].cards;
    } else {
      // Balance between conserving strong cards and winning modest points
      return this.selectBalancedFollowCombo(validCombos, trickPoints);
    }
  }
  
  declareTrumpSuit(gameState: GameState, player: Player): boolean {
    // Hard AI uses more strategic logic to decide when to declare
    const trumpRankCards = player.hand.filter(
      card => card.rank === gameState.trumpInfo.trumpRank
    );
    
    // Count cards by suit to find most common suit
    const suitCounts = player.hand.reduce((counts, card) => {
      if (card.suit) {
        counts[card.suit] = (counts[card.suit] || 0) + 1;
      }
      return counts;
    }, {} as Record<string, number>);
    
    // Find suit with most cards
    let mostCommonSuit = '';
    let maxCount = 0;
    
    Object.entries(suitCounts).forEach(([suit, count]) => {
      if (count > maxCount) {
        mostCommonSuit = suit;
        maxCount = count;
      }
    });
    
    // Declare if we have multiple trump rank cards AND they match our most common suit
    const trumpOfMostCommonSuit = trumpRankCards.filter(
      card => card.suit === mostCommonSuit
    );
    
    if (trumpRankCards.length >= 2 && trumpOfMostCommonSuit.length > 0) {
      return true;
    }
    
    // Also declare if we have many cards of the same suit (8+)
    if (maxCount >= 8) {
      return true;
    }
    
    return false;
  }
  
  // Helper methods for the Hard AI
  private shouldLeadWithTrump(gameState: GameState, player: Player): boolean {
    // Count remaining trump cards in hand
    const { trumpInfo } = gameState;
    const trumpCards = player.hand.filter(card => isTrump(card, trumpInfo));
    
    // Lead with trump if we have many trump cards or it's late in the round
    const isLateInRound = player.hand.length < 10;
    return trumpCards.length > 5 || isLateInRound;
  }
  
  private selectLeadingCombo(combos: Combo[], trumpInfo: TrumpInfo): Card[] {
    // Sort non-trump combos by value
    const nonTrumpCombos = combos.filter(
      combo => !combo.cards.some(card => isTrump(card, trumpInfo))
    );
    
    // If we have non-trump combos, use them
    if (nonTrumpCombos.length > 0) {
      // Prefer combos without point cards first
      const nonPointCombos = nonTrumpCombos.filter(
        combo => !combo.cards.some(card => card.points > 0)
      );
      
      if (nonPointCombos.length > 0) {
        // Lead with a moderate-value non-point combo
        const sortedNonPointCombos = [...nonPointCombos].sort((a, b) => a.value - b.value);
        const middleIndex = Math.floor(sortedNonPointCombos.length / 2);
        return sortedNonPointCombos[middleIndex].cards;
      }
      
      // If all have points, use the lowest value combo
      const sortedNonTrumpCombos = [...nonTrumpCombos].sort((a, b) => a.value - b.value);
      return sortedNonTrumpCombos[0].cards;
    }
    
    // If we only have trump combos, play the lowest
    const sortedCombos = [...combos].sort((a, b) => a.value - b.value);
    return sortedCombos[0].cards;
  }
  
  private getCurrentTrickWinner(gameState: GameState): string {
    const { currentTrick, trumpInfo } = gameState;
    if (!currentTrick || currentTrick.plays.length === 0) {
      return '';
    }
    
    let winningPlayerId = currentTrick.leadingPlayerId;
    let winningCards = currentTrick.leadingCombo;
    
    currentTrick.plays.forEach(play => {
      // Skip the leading play
      if (play.playerId === currentTrick.leadingPlayerId) return;
      
      // Compare played cards to current winner
      const isStronger = this.isStrongerCombo(play.cards, winningCards, trumpInfo);
      
      if (isStronger) {
        winningPlayerId = play.playerId;
        winningCards = play.cards;
      }
    });
    
    return winningPlayerId;
  }
  
  private isStrongerCombo(combo1: Card[], combo2: Card[], trumpInfo: TrumpInfo): boolean {
    // Simple comparison for now - would need more complex logic for actual game
    // In general, a combo with a trump beats a non-trump combo
    const combo1HasTrump = combo1.some(card => isTrump(card, trumpInfo));
    const combo2HasTrump = combo2.some(card => isTrump(card, trumpInfo));
    
    if (combo1HasTrump && !combo2HasTrump) return true;
    if (!combo1HasTrump && combo2HasTrump) return false;
    
    // If both have trump or neither has trump, compare highest cards
    const highCard1 = this.getHighestCard(combo1, trumpInfo);
    const highCard2 = this.getHighestCard(combo2, trumpInfo);
    
    return compareCards(highCard1, highCard2, trumpInfo) > 0;
  }
  
  private getHighestCard(cards: Card[], trumpInfo: TrumpInfo): Card {
    return cards.reduce((highest, card) => 
      compareCards(highest, card, trumpInfo) > 0 ? highest : card, 
      cards[0]
    );
  }
  
  private selectBalancedFollowCombo(combos: Combo[], trickPoints: number): Card[] {
    // Balance between saving strong cards and winning points
    const sortedCombos = [...combos].sort((a, b) => a.value - b.value);
    
    // If trick has some points but not a lot, use a medium-strength combo
    if (trickPoints > 5 && trickPoints < 15) {
      const middleIndex = Math.floor(sortedCombos.length / 2);
      return sortedCombos[middleIndex].cards;
    }
    
    // Otherwise use our weakest combo
    return sortedCombos[0].cards;
  }
}

// Create AI strategy (there's only one level now)
export const createAIStrategy = (): AIStrategy => {
  return new AIStrategy();
};

// Main AI player logic
export const getAIMove = (
  gameState: GameState,
  playerId: string
): Card[] => {
  const player = gameState.players.find(p => p.id === playerId);
  if (!player) {
    throw new Error(`AI player with ID ${playerId} not found`);
  }
  
  // Get all possible card combinations from player's hand
  const allCombos = identifyCombos(player.hand, gameState.trumpInfo);
  
  // Filter to valid plays based on current trick
  let validCombos: Combo[] = [];

  if (!gameState.currentTrick || !gameState.currentTrick.leadingCombo) {
    // Player is leading, any valid combo is fine
    validCombos = allCombos;
  } else {
    // Get the leading combo's type and suit
    const leadingCombo = gameState.currentTrick.leadingCombo;
    const leadingLength = leadingCombo.length;
    const leadingSuit = getLeadingSuit(leadingCombo);
    const isLeadingTrump = leadingCombo.some(card => isTrump(card, gameState.trumpInfo));

    // If leading with trump, prioritize trump combos
    if (isLeadingTrump) {
      // Find trump combos
      const trumpCombos = allCombos.filter(combo =>
        combo.cards.length === leadingLength &&
        combo.cards.some(card => isTrump(card, gameState.trumpInfo))
      );

      if (trumpCombos.length > 0) {
        // Must play trump if you have them
        validCombos = trumpCombos.filter(combo =>
          isValidPlay(
            combo.cards,
            leadingCombo,
            player.hand,
            gameState.trumpInfo
          )
        );
      } else {
        // If no trump combos, can play anything of the right length
        validCombos = allCombos.filter(combo =>
          combo.cards.length === leadingLength &&
          isValidPlay(
            combo.cards,
            leadingCombo,
            player.hand,
            gameState.trumpInfo
          )
        );
      }
    } else if (leadingSuit) {
      // If leading with a specific suit, prioritize that suit
      const suitCombos = allCombos.filter(combo =>
        combo.cards.length === leadingLength &&
        combo.cards.every(card => card.suit === leadingSuit)
      );

      if (suitCombos.length > 0) {
        // Must play the same suit if you have enough cards
        validCombos = suitCombos.filter(combo =>
          isValidPlay(
            combo.cards,
            leadingCombo,
            player.hand,
            gameState.trumpInfo
          )
        );
      } else {
        // If can't follow suit, can play anything of the right length
        validCombos = allCombos.filter(combo =>
          combo.cards.length === leadingLength &&
          isValidPlay(
            combo.cards,
            leadingCombo,
            player.hand,
            gameState.trumpInfo
          )
        );
      }
    } else {
      // For any other case, apply general valid play rules
      validCombos = allCombos.filter(combo =>
        combo.cards.length === leadingLength &&
        isValidPlay(
          combo.cards,
          leadingCombo,
          player.hand,
          gameState.trumpInfo
        )
      );
    }
  }
  
  // If no valid combos, find partial matches (this handles the case where
  // player doesn't have enough cards of the leading suit)
  if (validCombos.length === 0 && gameState.currentTrick) {
    const leadingCombo = gameState.currentTrick.leadingCombo;
    const leadingLength = leadingCombo.length;
    const leadingSuit = getLeadingSuit(leadingCombo);

    // First, check if the player has ANY cards of the leading suit
    const leadingSuitCards = player.hand.filter(card =>
      card.suit === leadingSuit && !isTrump(card, gameState.trumpInfo)
    );

    // If player has cards of the leading suit, they MUST play all of them first
    if (leadingSuitCards.length > 0) {
      if (leadingSuitCards.length >= leadingLength) {
        // This shouldn't happen, as we should have found valid combos earlier
        console.warn("AI has enough leading suit cards but no valid combo found - using all leading suit cards");
        return leadingSuitCards.slice(0, leadingLength);
      } else {
        // Not enough cards of the leading suit, but must use all we have
        // Plus some other cards to reach the required length
        const otherCards = player.hand.filter(card =>
          card.suit !== leadingSuit || isTrump(card, gameState.trumpInfo)
        ).sort((a, b) => compareCards(a, b, gameState.trumpInfo));

        const remainingNeeded = leadingLength - leadingSuitCards.length;
        if (otherCards.length >= remainingNeeded) {
          return [...leadingSuitCards, ...otherCards.slice(0, remainingNeeded)];
        } else {
          // Not enough cards total
          console.warn(`AI player ${playerId} doesn't have enough cards (has: ${player.hand.length}, needs: ${leadingLength})`);
          return [...leadingSuitCards, ...otherCards];
        }
      }
    }

    // If no cards of leading suit, just take lowest value cards
    const availableCards = [...player.hand].sort((a, b) =>
      compareCards(a, b, gameState.trumpInfo)
    );

    // Take the lowest cards up to the required length
    if (availableCards.length < leadingLength) {
      // Emergency handling: if we don't have enough cards, return all we have
      console.warn(`AI player ${playerId} doesn't have enough cards (has: ${availableCards.length}, needs: ${leadingLength})`);
      return availableCards;
    }

    const forcedPlay = availableCards.slice(0, leadingLength);
    return forcedPlay;
  }
  
  // Use the AI strategy to select cards to play
  const strategy = createAIStrategy();
  return strategy.makePlay(gameState, player, validCombos);
};

// AI trump declaration decision
export const shouldAIDeclare = (
  gameState: GameState,
  playerId: string
): boolean => {
  const player = gameState.players.find(p => p.id === playerId);
  if (!player) {
    throw new Error(`AI player with ID ${playerId} not found`);
  }

  const strategy = createAIStrategy();
  return strategy.declareTrumpSuit(gameState, player);
};