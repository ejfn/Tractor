import {
  Card,
  GameState,
  Player,
  Combo,
  AIDifficulty,
  TrumpInfo
} from '../types/game';
import { 
  identifyCombos, 
  isValidPlay,
  isTrump,
  compareCards
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

// Easy AI strategy - plays randomly
class EasyAIStrategy implements AIStrategy {
  makePlay(
    gameState: GameState, 
    player: Player, 
    validCombos: Combo[]
  ): Card[] {
    // Randomly select a valid combo
    const randomIndex = Math.floor(Math.random() * validCombos.length);
    return validCombos[randomIndex].cards;
  }
  
  declareTrumpSuit(gameState: GameState, player: Player): boolean {
    // Easy AI has 20% chance of declaring trump if it has a trump card
    const hasTrumpRank = player.hand.some(
      card => card.rank === gameState.trumpInfo.trumpRank
    );
    
    if (hasTrumpRank && Math.random() < 0.2) {
      return true;
    }
    
    return false;
  }
}

// Medium AI strategy - slightly smarter play
class MediumAIStrategy implements AIStrategy {
  makePlay(
    gameState: GameState, 
    player: Player, 
    validCombos: Combo[]
  ): Card[] {
    const { currentTrick, trumpInfo } = gameState;
    
    // If leading, play lowest non-trump if possible
    if (!currentTrick || !currentTrick.leadingCombo) {
      // Sort combos by value (ascending)
      const sortedCombos = [...validCombos].sort((a, b) => a.value - b.value);
      
      // Find the lowest non-trump combo if possible
      const nonTrumpCombo = sortedCombos.find(
        combo => !combo.cards.some(card => isTrump(card, trumpInfo))
      );
      
      return nonTrumpCombo ? nonTrumpCombo.cards : sortedCombos[0].cards;
    }
    
    // If following, try to win the trick if it has points
    const trickHasPoints = currentTrick.plays.some(
      play => play.cards.some(card => card.points > 0)
    );
    
    if (trickHasPoints) {
      // Sort by value (descending) to find the strongest play
      const sortedCombos = [...validCombos].sort((a, b) => b.value - a.value);
      return sortedCombos[0].cards;
    }
    
    // If no points, play the lowest valued combo
    const sortedCombos = [...validCombos].sort((a, b) => a.value - b.value);
    return sortedCombos[0].cards;
  }
  
  declareTrumpSuit(gameState: GameState, player: Player): boolean {
    // Medium AI has 50% chance of declaring trump if it has 2+ trump cards
    const trumpCards = player.hand.filter(
      card => card.rank === gameState.trumpInfo.trumpRank
    );
    
    if (trumpCards.length >= 2 && Math.random() < 0.5) {
      return true;
    }
    
    return false;
  }
}

// Hard AI strategy - more advanced play
class HardAIStrategy implements AIStrategy {
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

// Factory to create AI strategy based on difficulty
export const createAIStrategy = (difficulty: AIDifficulty): AIStrategy => {
  switch (difficulty) {
    case AIDifficulty.Easy:
      return new EasyAIStrategy();
    case AIDifficulty.Medium:
      return new MediumAIStrategy();
    case AIDifficulty.Hard:
      return new HardAIStrategy();
    default:
      return new MediumAIStrategy();
  }
};

// Main AI player logic
export const getAIMove = (
  gameState: GameState,
  playerId: string,
  difficulty: AIDifficulty
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
    // Filter to combos that match the leading combo's length
    const leadingLength = gameState.currentTrick.leadingCombo.length;
    validCombos = allCombos.filter(combo => 
      combo.cards.length === leadingLength &&
      isValidPlay(
        combo.cards, 
        gameState.currentTrick!.leadingCombo, 
        player.hand, 
        gameState.trumpInfo
      )
    );
  }
  
  // If no valid combos, find partial matches (this handles the case where
  // player doesn't have enough cards of the leading suit)
  if (validCombos.length === 0 && gameState.currentTrick) {
    const leadingLength = gameState.currentTrick.leadingCombo.length;
    
    // Create a combo of right length with whatever cards we have
    const availableCards = [...player.hand].sort((a, b) => 
      compareCards(a, b, gameState.trumpInfo)
    );
    
    // Take the lowest cards up to the required length
    const forcedPlay = availableCards.slice(0, leadingLength);
    
    return forcedPlay;
  }
  
  // Use appropriate strategy to select cards to play
  const strategy = createAIStrategy(difficulty);
  return strategy.makePlay(gameState, player, validCombos);
};

// AI trump declaration decision
export const shouldAIDeclare = (
  gameState: GameState,
  playerId: string,
  difficulty: AIDifficulty
): boolean => {
  const player = gameState.players.find(p => p.id === playerId);
  if (!player) {
    throw new Error(`AI player with ID ${playerId} not found`);
  }
  
  const strategy = createAIStrategy(difficulty);
  return strategy.declareTrumpSuit(gameState, player);
};