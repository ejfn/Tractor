import { describe, it, expect, beforeEach } from '@jest/globals';
import { analyzeVoidExploitation } from '../../src/ai/analysis/voidExploitation';
import { createCardMemory } from '../../src/ai/aiCardMemory';
import { createGameContext } from '../../src/ai/aiGameContext';
import { initializeGame } from '../../src/utils/gameInitialization';
import { Card } from '../../src/types/card';
import { GameState, PlayerId, Suit, Rank, TrickPosition } from '../../src/types';

describe('Smart Teammate Void Strategy', () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = initializeGame();
  });

  describe('Teammate Void Point Collection', () => {
    it('should lead teammate void when opponents have many points', () => {
      const cardMemory = createCardMemory(gameState);
      
      // Bot2 (our teammate) is void in Hearts
      cardMemory.playerMemories[PlayerId.Bot2].suitVoids.add(Suit.Hearts);
      
      // Simulate that opponents still have point cards in Hearts
      // (We don't add them to played cards, so they're still "out there")
      
      // Give human good Hearts cards to lead
      gameState.players[0].hand = [
        Card.createCard(Suit.Hearts, Rank.King, 0),  // K♥ (10 points)
        Card.createCard(Suit.Hearts, Rank.Ten, 0),   // 10♥ (10 points)
        Card.createCard(Suit.Hearts, Rank.Ace, 0),   // A♥ (non-point but high)
        Card.createCard(Suit.Spades, Rank.Seven, 0),
      ];
      
      const context = createGameContext(gameState, PlayerId.Human);
      context.trickPosition = TrickPosition.First; // Human is leading
      if (context.memoryContext) {
        context.memoryContext.cardMemory = cardMemory;
      }
      
      const voidAnalysis = analyzeVoidExploitation(
        cardMemory,
        gameState,
        context,
        gameState.trumpInfo,
        PlayerId.Human,
      );

      // Should find teammate void exploitation opportunity
      expect(voidAnalysis.exploitableVoids.length).toBeGreaterThan(0);
      
      const teammateVoidOpportunity = voidAnalysis.exploitableVoids.find(
        opp => opp.targetPlayer === PlayerId.Bot2 && opp.voidSuit === Suit.Hearts
      );
      
      expect(teammateVoidOpportunity).toBeDefined();
      expect(teammateVoidOpportunity?.exploitationType).toMatch(/point_collection|setup_teammate/);
      expect(teammateVoidOpportunity?.expectedOutcome).toContain('points for team');
      expect(teammateVoidOpportunity?.successProbability).toBeGreaterThan(0.5);
    });

    it('should generate void-based lead for teammate setup', () => {
      const cardMemory = createCardMemory(gameState);
      
      // Bot2 (our teammate) is void in Clubs
      cardMemory.playerMemories[PlayerId.Bot2].suitVoids.add(Suit.Clubs);
      
      // Human has good Clubs including points
      gameState.players[0].hand = [
        Card.createCard(Suit.Clubs, Rank.King, 0),   // K♣ (10 points)
        Card.createCard(Suit.Clubs, Rank.Five, 0),   // 5♣ (5 points)
        Card.createCard(Suit.Spades, Rank.Eight, 0),
      ];
      
      const context = createGameContext(gameState, PlayerId.Human);
      context.trickPosition = TrickPosition.First;
      if (context.memoryContext) {
        context.memoryContext.cardMemory = cardMemory;
      }
      
      const voidAnalysis = analyzeVoidExploitation(
        cardMemory,
        gameState,
        context,
        gameState.trumpInfo,
        PlayerId.Human,
      );

      expect(voidAnalysis.voidBasedLeadRecommendations.length).toBeGreaterThan(0);
      
      const teammateSetupLead = voidAnalysis.voidBasedLeadRecommendations.find(
        lead => lead.strategicGoal === 'setup_teammate' || lead.strategicGoal === 'collect_points'
      );
      
      expect(teammateSetupLead).toBeDefined();
      expect(teammateSetupLead?.leadCard.suit).toBe(Suit.Clubs);
      expect(teammateSetupLead?.targetVoids).toContain(PlayerId.Bot2);
      expect(teammateSetupLead?.expectedResponse[PlayerId.Bot2]).toContain('Trump');
    });

    it('should avoid leading teammate void when few points available', () => {
      const cardMemory = createCardMemory(gameState);
      
      // Bot2 (our teammate) is void in Diamonds
      cardMemory.playerMemories[PlayerId.Bot2].suitVoids.add(Suit.Diamonds);
      
      // Simulate many Diamond point cards already played (few left)
      cardMemory.playedCards.push(
        Card.createCard(Suit.Diamonds, Rank.King, 0),
        Card.createCard(Suit.Diamonds, Rank.King, 1),
        Card.createCard(Suit.Diamonds, Rank.Ten, 0),
        Card.createCard(Suit.Diamonds, Rank.Five, 0),
        Card.createCard(Suit.Diamonds, Rank.Five, 1),
      );
      
      // Human has low Diamonds (non-points)
      gameState.players[0].hand = [
        Card.createCard(Suit.Diamonds, Rank.Seven, 0),
        Card.createCard(Suit.Diamonds, Rank.Eight, 0),
        Card.createCard(Suit.Spades, Rank.Nine, 0),
      ];
      
      const context = createGameContext(gameState, PlayerId.Human);
      context.trickPosition = TrickPosition.First;
      if (context.memoryContext) {
        context.memoryContext.cardMemory = cardMemory;
      }
      
      const voidAnalysis = analyzeVoidExploitation(
        cardMemory,
        gameState,
        context,
        gameState.trumpInfo,
        PlayerId.Human,
      );

      // Should NOT find teammate void opportunity (low points available)
      const teammateVoidOpportunity = voidAnalysis.exploitableVoids.find(
        opp => opp.targetPlayer === PlayerId.Bot2 && opp.voidSuit === Suit.Diamonds
      );
      
      // Either no opportunity, or if found, should have low strategic value
      if (teammateVoidOpportunity) {
        expect(teammateVoidOpportunity.strategicValue).toBeLessThan(30);
      }
      
      // Should prioritize other strategies over teammate void
      expect(voidAnalysis.voidAdvantageScore).toBeLessThan(0.5);
    });
  });

  describe('Opponent vs Teammate Void Differentiation', () => {
    it('should treat opponent voids aggressively', () => {
      const cardMemory = createCardMemory(gameState);
      
      // Bot1 (opponent) is void in Hearts
      cardMemory.playerMemories[PlayerId.Bot1].suitVoids.add(Suit.Hearts);
      
      gameState.players[0].hand = [
        Card.createCard(Suit.Hearts, Rank.King, 0),
        Card.createCard(Suit.Hearts, Rank.Ace, 0),
      ];
      
      const context = createGameContext(gameState, PlayerId.Human);
      context.trickPosition = TrickPosition.First;
      if (context.memoryContext) {
        context.memoryContext.cardMemory = cardMemory;
      }
      
      const voidAnalysis = analyzeVoidExploitation(
        cardMemory,
        gameState,
        context,
        gameState.trumpInfo,
        PlayerId.Human,
      );

      const opponentVoidOpportunity = voidAnalysis.exploitableVoids.find(
        opp => opp.targetPlayer === PlayerId.Bot1
      );
      
      expect(opponentVoidOpportunity).toBeDefined();
      expect(opponentVoidOpportunity?.exploitationType).toBe('force_trump');
      expect(opponentVoidOpportunity?.expectedOutcome).toContain('Force');
      expect(opponentVoidOpportunity?.successProbability).toBeGreaterThan(0.9);
    });

    it('should handle mixed void scenarios correctly', () => {
      const cardMemory = createCardMemory(gameState);
      
      // Bot1 (opponent) void in Hearts, Bot2 (teammate) void in Clubs
      cardMemory.playerMemories[PlayerId.Bot1].suitVoids.add(Suit.Hearts);
      cardMemory.playerMemories[PlayerId.Bot2].suitVoids.add(Suit.Clubs);
      
      gameState.players[0].hand = [
        Card.createCard(Suit.Hearts, Rank.King, 0),   // Can exploit opponent
        Card.createCard(Suit.Clubs, Rank.Ten, 0),    // Can setup teammate
        Card.createCard(Suit.Spades, Rank.Seven, 0),
      ];
      
      const context = createGameContext(gameState, PlayerId.Human);
      context.trickPosition = TrickPosition.First;
      if (context.memoryContext) {
        context.memoryContext.cardMemory = cardMemory;
      }
      
      const voidAnalysis = analyzeVoidExploitation(
        cardMemory,
        gameState,
        context,
        gameState.trumpInfo,
        PlayerId.Human,
      );

      expect(voidAnalysis.exploitableVoids.length).toBeGreaterThanOrEqual(2);
      
      const opponentVoid = voidAnalysis.exploitableVoids.find(
        opp => opp.targetPlayer === PlayerId.Bot1
      );
      const teammateVoid = voidAnalysis.exploitableVoids.find(
        opp => opp.targetPlayer === PlayerId.Bot2
      );
      
      expect(opponentVoid?.exploitationType).toBe('force_trump');
      expect(teammateVoid?.exploitationType).toMatch(/point_collection|setup_teammate/);
      
      // Verify different expected outcomes
      expect(opponentVoid?.expectedOutcome).toContain('Force');
      expect(teammateVoid?.expectedOutcome).toContain('team');
    });
  });

  describe('Strategic Decision Making', () => {
    it('should recommend optimal void exploitation sequence', () => {
      const cardMemory = createCardMemory(gameState);
      
      // Multiple void scenarios
      cardMemory.playerMemories[PlayerId.Bot1].suitVoids.add(Suit.Hearts); // Opponent
      cardMemory.playerMemories[PlayerId.Bot2].suitVoids.add(Suit.Clubs);  // Teammate
      
      gameState.players[0].hand = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0),
        Card.createCard(Suit.Clubs, Rank.King, 0),   // 10 points for teammate
        Card.createCard(Suit.Spades, Rank.Nine, 0),
      ];
      
      const context = createGameContext(gameState, PlayerId.Human);
      context.trickPosition = TrickPosition.First;
      if (context.memoryContext) {
        context.memoryContext.cardMemory = cardMemory;
      }
      
      const voidAnalysis = analyzeVoidExploitation(
        cardMemory,
        gameState,
        context,
        gameState.trumpInfo,
        PlayerId.Human,
      );

      expect(voidAnalysis.voidTimingRecommendations).toBeDefined();
      expect(voidAnalysis.voidTimingRecommendations.immediateOpportunities.length).toBeGreaterThan(0);
      
      // Should have clear optimal move
      expect(voidAnalysis.optimalVoidExploitationMove).not.toBeNull();
      
      if (voidAnalysis.optimalVoidExploitationMove) {
        const optimalCard = voidAnalysis.optimalVoidExploitationMove.cards[0];
        // Should prioritize high-value opportunities
        expect([Suit.Hearts, Suit.Clubs]).toContain(optimalCard.suit);
      }
    });
  });
});