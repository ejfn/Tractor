import { getAIMove } from '../../src/ai/aiLogic';
import { processPlay, clearCompletedTrick } from '../../src/game/playProcessing';
import { createCardMemory } from '../../src/ai/aiCardMemory';
import {
  Card,
  GameState,
  PlayerId,
  Rank,
  Suit,
  GamePhase,
  TrumpInfo,
} from '../../src/types';
import { initializeGame } from '../../src/utils/gameInitialization';
import { gameLogger } from '../../src/utils/gameLogger';

/**
 * Phase 4: Memory Persistence and Strategy Evolution Integration Tests
 * 
 * Tests memory system persistence across multiple tricks and rounds,
 * validating that strategic knowledge accumulates and influences
 * future AI decisions appropriately.
 */

describe('Memory Persistence Integration Tests - Phase 4', () => {
  let gameState: GameState;
  let trumpInfo: TrumpInfo;

  beforeEach(() => {
    gameState = initializeGame();
    trumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Hearts,
    };
    gameState.trumpInfo = trumpInfo;
    gameState.gamePhase = GamePhase.Playing;
  });

  describe('Cross-Trick Memory Accumulation', () => {
    it('should accumulate void knowledge across multiple tricks', async () => {
      // Setup initial hands with known voids to create
      setupVoidCreationScenario(gameState);
      
      let memorySnapshots: any[] = [];
      
      // Play several tricks and track void detection
      for (let trickNum = 0; trickNum < 5; trickNum++) {
        // Set up a trick that will reveal voids
        setupTrickWithVoidRevelation(gameState, trickNum);
        
        // Create memory snapshot
        const cardMemory = createCardMemory(gameState);
        memorySnapshots.push({
          trickNumber: trickNum,
          totalVoids: Array.from(Object.values(cardMemory.playerMemories))
            .reduce((total, memory) => total + memory.suitVoids.size, 0),
          bot1Voids: cardMemory.playerMemories[PlayerId.Bot1].suitVoids.size,
          playedCards: cardMemory.playedCards.length
        });
        
        // Simulate completing the trick
        completeCurrentTrick(gameState);
      }
      
      // Verify void knowledge accumulates over time
      expect(memorySnapshots[0].totalVoids).toBeLessThanOrEqual(memorySnapshots[4].totalVoids);
      expect(memorySnapshots[4].totalVoids).toBeGreaterThan(0);
      
      // Log progression for analysis
      gameLogger.info('void_accumulation_progression', {
        snapshots: memorySnapshots,
        finalVoidCount: memorySnapshots[4].totalVoids
      });
    });

    it('should maintain card counting accuracy across full trick sequence', async () => {
      // Simulate a realistic sequence of tricks
      const initialPlayerCards = gameState.players.map(p => p.hand.length);
      
      let cardCountingHistory: any[] = [];
      
      // Play 10 tricks with full AI participation
      for (let trickNum = 0; trickNum < 10; trickNum++) {
        // Setup realistic trick
        setupRealisticTrick(gameState, trickNum);
        
        // Get AI decisions and process plays
        const aiDecision = getAIMove(gameState, PlayerId.Bot1);
        expect(aiDecision).toBeDefined();
        
        // Create memory and validate counting
        const cardMemory = createCardMemory(gameState);
        const currentPlayerCards = gameState.players.map(p => p.hand.length);
        const totalPlayedThisTrick = 4; // Each trick has 4 plays
        
        cardCountingHistory.push({
          trickNumber: trickNum,
          playedCards: cardMemory.playedCards.length,
          estimatedRemaining: Object.values(cardMemory.playerMemories)
            .reduce((sum, memory) => sum + memory.estimatedHandSize, 0),
          actualRemaining: currentPlayerCards.reduce((sum, count) => sum + count, 0)
        });
        
        // Complete the trick
        completeCurrentTrick(gameState);
        
        // Update player hands (simulate cards being played)
        gameState.players.forEach((player, index) => {
          if (player.hand.length > 0) {
            player.hand = player.hand.slice(1); // Remove one card per trick
          }
        });
      }
      
      // Verify counting accuracy maintains throughout
      const finalHistory = cardCountingHistory[cardCountingHistory.length - 1];
      const countingError = Math.abs(finalHistory.estimatedRemaining - finalHistory.actualRemaining);
      
      expect(countingError).toBeLessThan(5); // Allow small variance for estimation
      expect(finalHistory.playedCards).toBe(cardCountingHistory.length * 4); // 4 cards per trick
      
      gameLogger.info('card_counting_accuracy_history', {
        history: cardCountingHistory,
        finalError: countingError,
        accuracy: ((1 - countingError / finalHistory.actualRemaining) * 100).toFixed(2) + '%'
      });
    });
  });

  describe('Strategic Decision Evolution', () => {
    it('should show improved decision making as memory accumulates', async () => {
      // Track AI decision quality over time
      let decisionHistory: any[] = [];
      
      // Setup scenario where memory provides increasing advantage
      setupMemoryAdvantageEvolutionScenario(gameState);
      
      for (let round = 0; round < 5; round++) {
        // Add more memory data each round
        addMemoryDataForRound(gameState, round);
        
        // Get AI decision
        const aiDecision = getAIMove(gameState, PlayerId.Bot1);
        
        // Analyze decision quality with current memory
        const cardMemory = createCardMemory(gameState);
        const decisionQuality = analyzeDecisionQuality(
          aiDecision, 
          gameState, 
          cardMemory
        );
        
        decisionHistory.push({
          round,
          memoryDataPoints: cardMemory.playedCards.length,
          voidKnowledge: cardMemory.playerMemories[PlayerId.Bot1].suitVoids.size,
          decisionQuality: decisionQuality.score,
          reasoning: decisionQuality.reasoning
        });
      }
      
      // Verify decision quality improves with more memory
      const firstRoundQuality = decisionHistory[0].decisionQuality;
      const lastRoundQuality = decisionHistory[4].decisionQuality;
      
      expect(lastRoundQuality).toBeGreaterThanOrEqual(firstRoundQuality);
      expect(decisionHistory[4].memoryDataPoints).toBeGreaterThan(decisionHistory[0].memoryDataPoints);
      
      gameLogger.info('decision_evolution_analysis', {
        decisionHistory,
        qualityImprovement: lastRoundQuality - firstRoundQuality
      });
    });

    it('should demonstrate context-aware memory usage in different game phases', async () => {
      const phaseAnalysis: any[] = [];
      
      // Test memory usage in early, mid, and late game phases
      const phases = [
        { name: 'early', tricksPlayed: 2, cardsRemaining: 20 },
        { name: 'mid', tricksPlayed: 8, cardsRemaining: 12 },
        { name: 'late', tricksPlayed: 15, cardsRemaining: 5 }
      ];
      
      for (const phase of phases) {
        // Setup game state for this phase
        setupGamePhase(gameState, phase.tricksPlayed, phase.cardsRemaining);
        
        // Analyze memory system behavior
        const cardMemory = createCardMemory(gameState);
        const aiDecision = getAIMove(gameState, PlayerId.Bot1);
        
        phaseAnalysis.push({
          phase: phase.name,
          tricksPlayed: phase.tricksPlayed,
          cardsRemaining: phase.cardsRemaining,
          memoryUtilization: {
            voidDetections: Object.values(cardMemory.playerMemories)
              .reduce((total, memory) => total + memory.suitVoids.size, 0),
            cardsCounted: cardMemory.playedCards.length,
            trumpExhaustion: cardMemory.trumpCardsPlayed
          },
          decisionType: categorizeAIDecision(aiDecision, gameState)
        });
      }
      
      // Verify memory system adapts to game phase
      expect(phaseAnalysis[2].memoryUtilization.voidDetections)
        .toBeGreaterThanOrEqual(phaseAnalysis[0].memoryUtilization.voidDetections);
      expect(phaseAnalysis[2].memoryUtilization.cardsCounted)
        .toBeGreaterThan(phaseAnalysis[0].memoryUtilization.cardsCounted);
      
      gameLogger.info('phase_aware_memory_analysis', { phaseAnalysis });
    });
  });

  describe('Memory System Reliability Under Stress', () => {
    it('should maintain consistency during rapid trick succession', async () => {
      // Simulate rapid gameplay with quick trick succession
      const rapidTrickSequence = [];
      
      for (let i = 0; i < 15; i++) {
        // Setup and process trick rapidly
        setupQuickTrick(gameState, i);
        
        const cardMemory = createCardMemory(gameState);
        const consistencyCheck = validateMemoryConsistency(cardMemory);
        
        rapidTrickSequence.push({
          trickIndex: i,
          isConsistent: consistencyCheck.isValid,
          issues: consistencyCheck.issues,
          dataIntegrity: consistencyCheck.dataIntegrity
        });
        
        completeCurrentTrick(gameState);
      }
      
      // All memory states should be consistent
      const consistentTricks = rapidTrickSequence.filter(t => t.isConsistent).length;
      expect(consistentTricks).toBe(rapidTrickSequence.length);
      
      gameLogger.info('rapid_succession_consistency', {
        totalTricks: rapidTrickSequence.length,
        consistentTricks,
        consistencyRate: (consistentTricks / rapidTrickSequence.length * 100).toFixed(2) + '%'
      });
    });

    it('should handle edge cases in memory data gracefully', async () => {
      // Test various edge cases
      const edgeCases = [
        'all_trump_cards_played',
        'player_with_empty_hand',
        'invalid_suit_combinations',
        'corrupted_trick_data'
      ];
      
      for (const edgeCase of edgeCases) {
        // Setup the specific edge case
        setupEdgeCase(gameState, edgeCase);
        
        // Memory system should handle gracefully
        expect(() => {
          const cardMemory = createCardMemory(gameState);
          const aiDecision = getAIMove(gameState, PlayerId.Bot1);
          
          // Basic validations should still pass
          expect(cardMemory).toBeDefined();
          expect(aiDecision).toBeDefined();
        }).not.toThrow();
        
        gameLogger.info('edge_case_handled', { edgeCase, status: 'success' });
      }
    });
  });
});

// Helper functions for test scenarios

function setupVoidCreationScenario(gameState: GameState): void {
  // Setup hands that will naturally create voids
  gameState.players[1].hand = [
    // Bot1 has no Spades (will create void when Spades led)
    Card.createCard(Suit.Hearts, Rank.Three, 0),
    Card.createCard(Suit.Clubs, Rank.Seven, 0),
    Card.createCard(Suit.Diamonds, Rank.Eight, 0),
  ];
}

function setupTrickWithVoidRevelation(gameState: GameState, trickNum: number): void {
  const suits = [Suit.Spades, Suit.Clubs, Suit.Diamonds, Suit.Hearts];
  const leadSuit = suits[trickNum % suits.length];
  
  // Human leads with a specific suit
  gameState.currentTrick = {
    plays: [
      {
        playerId: PlayerId.Human,
        cards: [Card.createCard(leadSuit, Rank.King, 0)]
      }
    ],
    winningPlayerId: PlayerId.Human,
    points: 10
  };
  
  // If Bot1 doesn't have this suit, they'll trump (revealing void)
  if (leadSuit === Suit.Spades && trickNum === 0) {
    gameState.currentTrick.plays.push({
      playerId: PlayerId.Bot1,
      cards: [Card.createCard(Suit.Hearts, Rank.Four, 0)] // Trump = void
    });
  }
}

function setupRealisticTrick(gameState: GameState, trickNum: number): void {
  const suits = [Suit.Spades, Suit.Clubs, Suit.Diamonds];
  const ranks = [Rank.Seven, Rank.Eight, Rank.Nine, Rank.Ten, Rank.Jack, Rank.Queen, Rank.King, Rank.Ace];
  
  const leadSuit = suits[trickNum % suits.length];
  const leadRank = ranks[trickNum % ranks.length];
  
  gameState.currentTrick = {
    plays: [
      {
        playerId: PlayerId.Human,
        cards: [Card.createCard(leadSuit, leadRank, 0)]
      }
    ],
    winningPlayerId: PlayerId.Human,
    points: leadRank === Rank.Ten || leadRank === Rank.King ? 10 : 0
  };
  
  // Set current player to Bot1 for AI decision
  gameState.currentPlayerIndex = 1;
}

function setupMemoryAdvantageEvolutionScenario(gameState: GameState): void {
  // Setup scenario where memory advantage grows over time
  gameState.players[1].hand = [
    Card.createCard(Suit.Spades, Rank.King, 0),
    Card.createCard(Suit.Clubs, Rank.Queen, 0),
    Card.createCard(Suit.Hearts, Rank.Five, 0),
    Card.createCard(Suit.Diamonds, Rank.Jack, 0),
  ];
  gameState.currentPlayerIndex = 1;
}

function addMemoryDataForRound(gameState: GameState, round: number): void {
  // Add progressively more memory data each round
  for (let i = 0; i <= round; i++) {
    const trick = {
      plays: [
        { playerId: PlayerId.Human, cards: [Card.createCard(Suit.Spades, Rank.Seven + i, 0)] },
        { playerId: PlayerId.Bot1, cards: [Card.createCard(Suit.Spades, Rank.Eight + i, 0)] },
        { playerId: PlayerId.Bot2, cards: [Card.createCard(Suit.Spades, Rank.Nine + i, 0)] },
        { playerId: PlayerId.Bot3, cards: [Card.createCard(Suit.Hearts, Rank.Three + i, 0)] }
      ],
      winningPlayerId: PlayerId.Bot3,
      points: 10
    };
    
    if (!gameState.tricks.find(t => 
      t.plays[0].cards[0].rank === trick.plays[0].cards[0].rank)) {
      gameState.tricks.push(trick);
    }
  }
}

function analyzeDecisionQuality(aiDecision: Card[], gameState: GameState, cardMemory: any): { score: number, reasoning: string } {
  // Simple decision quality metric based on:
  // - Card value conservation
  // - Memory utilization
  // - Strategic positioning
  
  let score = 50; // Base score
  let reasoning = [];
  
  // Bonus for trump conservation
  const isTrumpPlay = aiDecision.some(card => 
    card.suit === gameState.trumpInfo.trumpSuit || 
    card.rank === gameState.trumpInfo.trumpRank
  );
  
  if (!isTrumpPlay && cardMemory.trumpCardsPlayed < 10) {
    score += 10;
    reasoning.push('trump_conservation');
  }
  
  // Bonus for utilizing void knowledge
  const voidCount = Object.values(cardMemory.playerMemories)
    .reduce((total: number, memory: any) => total + memory.suitVoids.size, 0);
  
  if (voidCount > 2) {
    score += 15;
    reasoning.push('void_exploitation');
  }
  
  // Bonus for memory data utilization
  if (cardMemory.playedCards.length > 20) {
    score += 10;
    reasoning.push('rich_memory_context');
  }
  
  return { score, reasoning: reasoning.join(', ') };
}

function setupGamePhase(gameState: GameState, tricksPlayed: number, cardsRemaining: number): void {
  // Clear existing tricks and setup for specific phase
  gameState.tricks = [];
  
  // Add the specified number of completed tricks
  for (let i = 0; i < tricksPlayed; i++) {
    const trick = {
      plays: [
        { playerId: PlayerId.Human, cards: [Card.createCard(Suit.Clubs, Rank.Seven + (i % 7), 0)] },
        { playerId: PlayerId.Bot1, cards: [Card.createCard(Suit.Clubs, Rank.Eight + (i % 7), 0)] },
        { playerId: PlayerId.Bot2, cards: [Card.createCard(Suit.Clubs, Rank.Nine + (i % 7), 0)] },
        { playerId: PlayerId.Bot3, cards: [Card.createCard(Suit.Clubs, Rank.Ten + (i % 7), 0)] }
      ],
      winningPlayerId: PlayerId.Bot3,
      points: i % 3 === 0 ? 10 : 0
    };
    gameState.tricks.push(trick);
  }
  
  // Adjust player hand sizes
  gameState.players.forEach(player => {
    player.hand = player.hand.slice(0, cardsRemaining);
  });
}

function categorizeAIDecision(aiDecision: Card[], gameState: GameState): string {
  // Categorize the type of AI decision made
  if (aiDecision.length > 1) return 'combination_play';
  
  const card = aiDecision[0];
  const isTrump = card.suit === gameState.trumpInfo.trumpSuit || card.rank === gameState.trumpInfo.trumpRank;
  
  if (isTrump) return 'trump_play';
  if (card.rank === Rank.King || card.rank === Rank.Ten) return 'point_play';
  if (card.rank === Rank.Ace) return 'high_value_play';
  
  return 'standard_play';
}

function setupQuickTrick(gameState: GameState, index: number): void {
  const suits = [Suit.Spades, Suit.Clubs, Suit.Diamonds];
  const suit = suits[index % suits.length];
  
  gameState.currentTrick = {
    plays: [
      { playerId: PlayerId.Human, cards: [Card.createCard(suit, Rank.Seven + (index % 7), 0)] }
    ],
    winningPlayerId: PlayerId.Human,
    points: 0
  };
}

function validateMemoryConsistency(cardMemory: any): { isValid: boolean, issues: string[], dataIntegrity: number } {
  const issues: string[] = [];
  let integrityScore = 100;
  
  // Check player memory consistency
  Object.values(cardMemory.playerMemories).forEach((memory: any) => {
    if (memory.estimatedHandSize < 0) {
      issues.push('negative_hand_size');
      integrityScore -= 20;
    }
    
    if (!memory.suitVoids || !(memory.suitVoids instanceof Set)) {
      issues.push('invalid_void_data');
      integrityScore -= 15;
    }
  });
  
  // Check played cards consistency
  if (!Array.isArray(cardMemory.playedCards)) {
    issues.push('invalid_played_cards');
    integrityScore -= 25;
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    dataIntegrity: Math.max(0, integrityScore)
  };
}

function setupEdgeCase(gameState: GameState, edgeCase: string): void {
  switch (edgeCase) {
    case 'all_trump_cards_played':
      // Simulate all trump cards being played
      for (let i = 0; i < 20; i++) {
        gameState.tricks.push({
          plays: [
            { playerId: PlayerId.Human, cards: [Card.createCard(Suit.Hearts, Rank.Seven + (i % 7), 0)] }
          ],
          winningPlayerId: PlayerId.Human,
          points: 0
        });
      }
      break;
      
    case 'player_with_empty_hand':
      gameState.players[1].hand = [];
      break;
      
    case 'invalid_suit_combinations':
      // Create trick with unusual card combinations
      gameState.currentTrick = {
        plays: [
          { playerId: PlayerId.Human, cards: [Card.createCard(Suit.Spades, Rank.King, 0)] },
          { playerId: PlayerId.Bot1, cards: [Card.createCard(Suit.Hearts, Rank.Two, 0)] } // Trump rank
        ],
        winningPlayerId: PlayerId.Bot1,
        points: 10
      };
      break;
      
    case 'corrupted_trick_data':
      // Add trick with missing data
      gameState.tricks.push({
        plays: [],
        winningPlayerId: PlayerId.Human,
        points: 0
      });
      break;
  }
}

function completeCurrentTrick(gameState: GameState): void {
  if (gameState.currentTrick && gameState.currentTrick.plays.length > 0) {
    gameState.tricks.push({...gameState.currentTrick});
    gameState.currentTrick = null;
  }
}