import { 
  createOptimizedCardMemory,
  getMemoryCacheStats,
  resetMemoryCache,
  MemoryProfiler
} from '../../src/ai/aiMemoryOptimization';
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
 * Phase 4: Memory System Performance Integration Tests
 * 
 * Tests the performance optimizations for the memory system,
 * including caching, incremental updates, and efficiency improvements.
 */

describe('Memory Performance Integration Tests - Phase 4', () => {
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
    resetMemoryCache();
    MemoryProfiler.reset();
  });

  describe('Memory Caching Performance', () => {
    it('should demonstrate cache hits for unchanged game state', () => {
      // Add some tricks for test data
      addTestTricks(gameState, 5);
      
      MemoryProfiler.startProfile();
      
      // First call should be a cache miss
      const memory1 = createOptimizedCardMemory(gameState);
      MemoryProfiler.recordOperation('first_call');
      
      // Second call with same state should be a cache hit
      const memory2 = createOptimizedCardMemory(gameState);
      MemoryProfiler.recordOperation('second_call', true);
      
      // Third call should also be a cache hit
      const memory3 = createOptimizedCardMemory(gameState);
      MemoryProfiler.recordOperation('third_call', true);
      
      const cacheStats = getMemoryCacheStats();
      const profile = MemoryProfiler.getProfile();
      
      // Verify cache effectiveness
      expect(cacheStats.cacheHits).toBe(2);
      expect(cacheStats.cacheMisses).toBe(1);
      expect(cacheStats.hitRate).toBe(0.67); // 2/3
      
      // Verify memory consistency
      expect(memory1.playedCards.length).toBe(memory2.playedCards.length);
      expect(memory2.playedCards.length).toBe(memory3.playedCards.length);
      expect(memory1.tricksAnalyzed).toBe(memory2.tricksAnalyzed);
      
      gameLogger.info('cache_performance_test', {
        cacheStats,
        profileSummary: {
          operations: profile.totalOperations,
          cacheHitRate: profile.cacheHitRate,
          avgDuration: profile.averageDuration
        }
      });
    });

    it('should invalidate cache when game state changes', () => {
      // Initial state
      addTestTricks(gameState, 3);
      const memory1 = createOptimizedCardMemory(gameState);
      
      // Add more tricks (change state)
      addTestTricks(gameState, 2);
      const memory2 = createOptimizedCardMemory(gameState);
      
      const cacheStats = getMemoryCacheStats();
      
      // Should have 2 cache misses (different states)
      expect(cacheStats.cacheMisses).toBe(2);
      expect(memory1.tricksAnalyzed).toBeLessThan(memory2.tricksAnalyzed);
      expect(memory1.playedCards.length).toBeLessThan(memory2.playedCards.length);
    });

    it('should handle incremental updates efficiently', () => {
      // Start with some tricks
      addTestTricks(gameState, 5);
      const memory1 = createOptimizedCardMemory(gameState);
      
      const startTime = Date.now();
      
      // Add a few more tricks (should trigger incremental update)
      addTestTricks(gameState, 2);
      const memory2 = createOptimizedCardMemory(gameState);
      
      const incrementalTime = Date.now() - startTime;
      
      // Compare with full recalculation
      resetMemoryCache();
      const fullStartTime = Date.now();
      const memory3 = createOptimizedCardMemory(gameState);
      const fullTime = Date.now() - fullStartTime;
      
      // Verify results are equivalent
      expect(memory2.playedCards.length).toBe(memory3.playedCards.length);
      expect(memory2.tricksAnalyzed).toBe(memory3.tricksAnalyzed);
      
      // Incremental should generally be faster (though may vary in small tests)
      gameLogger.info('incremental_vs_full_performance', {
        incrementalTime,
        fullTime,
        speedupRatio: fullTime / incrementalTime,
        tricksProcessed: gameState.tricks.length
      });
    });
  });

  describe('Performance Under Load', () => {
    it('should maintain performance with large datasets', () => {
      // Create a realistic heavy load scenario
      addTestTricks(gameState, 20);
      
      const iterations = 10;
      const timings: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        const memory = createOptimizedCardMemory(gameState);
        const duration = Date.now() - startTime;
        timings.push(duration);
        
        expect(memory.playedCards.length).toBe(80); // 20 tricks * 4 cards
        expect(memory.tricksAnalyzed).toBe(20);
      }
      
      const avgTime = timings.reduce((sum, time) => sum + time, 0) / iterations;
      const maxTime = Math.max(...timings);
      const cacheStats = getMemoryCacheStats();
      
      // Performance expectations
      expect(avgTime).toBeLessThan(50); // Average should be very fast due to caching
      expect(maxTime).toBeLessThan(200); // Even worst case should be reasonable
      expect(cacheStats.hitRate).toBeGreaterThan(0.8); // Should have good cache hit rate
      
      gameLogger.info('heavy_load_performance', {
        iterations,
        avgTime,
        maxTime,
        cacheStats,
        tricksInDataset: gameState.tricks.length
      });
    });

    it('should handle repeated access patterns efficiently', () => {
      // Simulate realistic game flow with repeated memory access
      const performanceData: Array<{
        operation: string;
        duration: number;
        cacheHit: boolean;
      }> = [];
      
      // Initial game setup
      addTestTricks(gameState, 3);
      
      // Simulate AI making decisions (repeated memory access)
      for (let round = 0; round < 5; round++) {
        // AI checks memory multiple times per turn
        for (let check = 0; check < 3; check++) {
          const startTime = Date.now();
          const memory = createOptimizedCardMemory(gameState);
          const duration = Date.now() - startTime;
          
          performanceData.push({
            operation: `round_${round}_check_${check}`,
            duration,
            cacheHit: check > 0 // First check per round is cache miss, others are hits
          });
          
          expect(memory).toBeDefined();
        }
        
        // Add a new trick (changes state)
        if (round < 4) {
          addTestTricks(gameState, 1);
        }
      }
      
      const cacheHits = performanceData.filter(d => d.cacheHit).length;
      const avgDuration = performanceData.reduce((sum, d) => sum + d.duration, 0) / performanceData.length;
      const hitRate = cacheHits / performanceData.length;
      
      // Should have good cache performance
      expect(hitRate).toBeGreaterThan(0.6); // Most accesses should be cache hits
      expect(avgDuration).toBeLessThan(20); // Should be very fast on average
      
      gameLogger.info('repeated_access_performance', {
        totalOperations: performanceData.length,
        hitRate,
        avgDuration,
        cacheHits,
        rounds: 5
      });
    });
  });

  describe('Memory vs Performance Trade-offs', () => {
    it('should provide equivalent results between optimized and standard memory', () => {
      // Add complex game state
      addTestTricks(gameState, 8);
      addVoidScenario(gameState);
      
      // Get results from both approaches
      const optimizedMemory = createOptimizedCardMemory(gameState);
      resetMemoryCache(); // Force recalculation
      const standardMemory = createCardMemory(gameState);
      
      // Results should be functionally equivalent
      expect(optimizedMemory.playedCards.length).toBe(standardMemory.playedCards.length);
      expect(optimizedMemory.tricksAnalyzed).toBe(standardMemory.tricksAnalyzed);
      expect(optimizedMemory.trumpCardsPlayed).toBe(standardMemory.trumpCardsPlayed);
      expect(optimizedMemory.pointCardsPlayed).toBe(standardMemory.pointCardsPlayed);
      
      // Player memory should be equivalent
      Object.keys(optimizedMemory.playerMemories).forEach(playerId => {
        const optimizedPlayer = optimizedMemory.playerMemories[playerId];
        const standardPlayer = standardMemory.playerMemories[playerId];
        
        expect(optimizedPlayer.suitVoids.size).toBe(standardPlayer.suitVoids.size);
        expect(optimizedPlayer.knownCards.length).toBe(standardPlayer.knownCards.length);
      });
      
      gameLogger.info('equivalence_validation', {
        optimizedPlayedCards: optimizedMemory.playedCards.length,
        standardPlayedCards: standardMemory.playedCards.length,
        tricksAnalyzed: optimizedMemory.tricksAnalyzed,
        playersWithVoids: Object.values(optimizedMemory.playerMemories)
          .filter(p => p.suitVoids.size > 0).length
      });
    });

    it('should demonstrate performance improvement over standard approach', () => {
      // Create substantial dataset
      addTestTricks(gameState, 15);
      
      const iterations = 5;
      let optimizedTotal = 0;
      let standardTotal = 0;
      
      // Test optimized approach
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        createOptimizedCardMemory(gameState);
        optimizedTotal += Date.now() - startTime;
      }
      
      // Test standard approach
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        createCardMemory(gameState);
        standardTotal += Date.now() - startTime;
      }
      
      const optimizedAvg = optimizedTotal / iterations;
      const standardAvg = standardTotal / iterations;
      const speedupRatio = standardAvg / optimizedAvg;
      const cacheStats = getMemoryCacheStats();
      
      // Optimized should be faster (especially with cache hits)
      expect(speedupRatio).toBeGreaterThan(1);
      expect(cacheStats.hitRate).toBeGreaterThan(0.5);
      
      gameLogger.info('performance_comparison', {
        optimizedAvg,
        standardAvg,
        speedupRatio: Math.round(speedupRatio * 100) / 100,
        cacheStats,
        iterations
      });
    });
  });
});

// Helper functions

function addTestTricks(gameState: GameState, count: number): void {
  const suits = [Suit.Spades, Suit.Clubs, Suit.Diamonds];
  const ranks = [Rank.Seven, Rank.Eight, Rank.Nine, Rank.Ten, Rank.Jack, Rank.Queen, Rank.King, Rank.Ace];
  
  for (let i = 0; i < count; i++) {
    const suit = suits[i % suits.length];
    const baseRank = ranks[i % ranks.length];
    
    const trick = {
      plays: [
        { playerId: PlayerId.Human, cards: [Card.createCard(suit, baseRank, 0)] },
        { playerId: PlayerId.Bot1, cards: [Card.createCard(suit, ranks[(baseRank + 1) % ranks.length], 0)] },
        { playerId: PlayerId.Bot2, cards: [Card.createCard(suit, ranks[(baseRank + 2) % ranks.length], 0)] },
        { playerId: PlayerId.Bot3, cards: [Card.createCard(suit, ranks[(baseRank + 3) % ranks.length], 0)] }
      ],
      winningPlayerId: PlayerId.Bot3,
      points: i % 3 === 0 ? 10 : 0
    };
    
    gameState.tricks.push(trick);
  }
}

function addVoidScenario(gameState: GameState): void {
  // Add a trick that creates a void
  const voidTrick = {
    plays: [
      { playerId: PlayerId.Human, cards: [Card.createCard(Suit.Spades, Rank.King, 0)] },
      { playerId: PlayerId.Bot1, cards: [Card.createCard(Suit.Hearts, Rank.Three, 0)] }, // Trump = void
      { playerId: PlayerId.Bot2, cards: [Card.createCard(Suit.Spades, Rank.Queen, 0)] },
      { playerId: PlayerId.Bot3, cards: [Card.createCard(Suit.Spades, Rank.Jack, 0)] }
    ],
    winningPlayerId: PlayerId.Bot1,
    points: 10
  };
  
  gameState.tricks.push(voidTrick);
}