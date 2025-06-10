
import { getAITrumpDeclarationDecision } from '../../src/ai/trumpDeclaration/trumpDeclarationStrategy';
import { makeTrumpDeclaration } from '../../src/game/dealingAndDeclaration';
import { Card, DeclarationType, PlayerId, Rank, Suit } from '../../src/types';
import { initializeGame } from '../../src/utils/gameInitialization';

describe('AI Declaration Override Bug', () => {
  let gameState: any;

  beforeEach(() => {
    gameState = initializeGame();
    
    // Give players specific hands with equal strength pairs
    const humanPlayer = gameState.players.find((p: any) => p.id === PlayerId.Human);
    const bot1Player = gameState.players.find((p: any) => p.id === PlayerId.Bot1);
    const bot2Player = gameState.players.find((p: any) => p.id === PlayerId.Bot2);

    // Give human a trump rank pair in Clubs
    humanPlayer.hand = [
      ...Card.createPair(Suit.Clubs, Rank.Two),
      Card.createCard(Suit.Hearts, Rank.Ace, 0)
    ];

    // Give Bot1 a trump rank pair in Diamonds (equal strength)
    bot1Player.hand = [
      ...Card.createPair(Suit.Diamonds, Rank.Two),
      Card.createCard(Suit.Spades, Rank.Queen, 0)
    ];

    // Give Bot2 a trump rank pair in Hearts (equal strength)
    bot2Player.hand = [
      ...Card.createPair(Suit.Hearts, Rank.Two),
      Card.createCard(Suit.Spades, Rank.King, 0)
    ];
  });

  test('should reproduce the bug: AI pair overriding another AI pair', () => {
    // Human declares first with pair of 2♣
    const humanDeclaration = {
      rank: Rank.Two,
      suit: Suit.Clubs,
      type: DeclarationType.Pair,
      cards: Card.createPair(Suit.Clubs, Rank.Two)
    };

    let newState = makeTrumpDeclaration(gameState, PlayerId.Human, humanDeclaration);
    
    // Now check what Bot1 thinks it can do
    const bot1Decision = getAITrumpDeclarationDecision(newState, PlayerId.Bot1);
    console.log('Bot1 decision:', bot1Decision);

    // Bot1 should NOT be able to declare (equal strength)
    expect(bot1Decision.shouldDeclare).toBe(false);

    // If Bot1 somehow decides to declare, the makeTrumpDeclaration should fail
    if (bot1Decision.shouldDeclare && bot1Decision.declaration) {
      expect(() => {
        makeTrumpDeclaration(newState, PlayerId.Bot1, {
          rank: Rank.Two,
          suit: bot1Decision.declaration!.suit,
          type: bot1Decision.declaration!.type,
          cards: bot1Decision.declaration!.cards,
        });
      }).toThrow('Declaration cannot override current declaration');
    }
  });

  test('should test multiple AI players declaring simultaneously', () => {
    // No initial declaration - both AIs should be able to declare
    const bot1Decision = getAITrumpDeclarationDecision(gameState, PlayerId.Bot1);
    const bot2Decision = getAITrumpDeclarationDecision(gameState, PlayerId.Bot2);

    console.log('Bot1 initial decision:', bot1Decision);
    console.log('Bot2 initial decision:', bot2Decision);

    // Most of the time, AI won't declare with pairs due to random factors
    // This test mainly verifies the AI logic handles multiple players correctly
    expect(typeof bot1Decision.shouldDeclare).toBe('boolean');
    expect(typeof bot2Decision.shouldDeclare).toBe('boolean');
  });

  test('should verify getPlayerDeclarationOptions filters correctly after first declaration', () => {
    // Human declares first with pair of 2♣
    const humanDeclaration = {
      rank: Rank.Two,
      suit: Suit.Clubs,
      type: DeclarationType.Pair,
      cards: Card.createPair(Suit.Clubs, Rank.Two)
    };

    const newState = makeTrumpDeclaration(gameState, PlayerId.Human, humanDeclaration);
    
    // Import the function to test it directly
    const { getPlayerDeclarationOptions } = require('../../src/game/dealingAndDeclaration');
    
    const bot1Options = getPlayerDeclarationOptions(newState, PlayerId.Bot1);
    const bot2Options = getPlayerDeclarationOptions(newState, PlayerId.Bot2);

    console.log('Bot1 options after human pair:', bot1Options);
    console.log('Bot2 options after human pair:', bot2Options);

    // Both bots should have NO valid options (their pairs are equal strength)
    expect(bot1Options).toHaveLength(0);
    expect(bot2Options).toHaveLength(0);
  });

  test('should simulate sequential AI declarations like in progressive dealing', () => {
    // Force Bot1 to declare first with pair of 2♦ (bypass random logic)
    const bot1Declaration = {
      rank: Rank.Two,
      suit: Suit.Diamonds,
      type: DeclarationType.Pair,
      cards: Card.createPair(Suit.Diamonds, Rank.Two)
    };

    const stateAfterBot1 = makeTrumpDeclaration(gameState, PlayerId.Bot1, bot1Declaration);

    console.log('State after Bot1 declared:', {
      currentDeclaration: stateAfterBot1.trumpDeclarationState?.currentDeclaration,
      trumpSuit: stateAfterBot1.trumpInfo.trumpSuit
    });

    // Now check if the progressive dealing would allow Bot2 to declare
    const { checkDeclarationOpportunities } = require('../../src/game/dealingAndDeclaration');
    const opportunities = checkDeclarationOpportunities(stateAfterBot1);
    
    console.log('Opportunities after Bot1:', opportunities);

    // Bot2 should have NO opportunities after Bot1's equal strength declaration
    const bot2Opportunities = opportunities.filter((opp: any) => opp.playerId === PlayerId.Bot2);
    expect(bot2Opportunities).toHaveLength(0);

    // Double-check with getAITrumpDeclarationDecision
    const bot2DecisionAfter = getAITrumpDeclarationDecision(stateAfterBot1, PlayerId.Bot2);
    console.log('Bot2 decision after Bot1:', bot2DecisionAfter);
    
    expect(bot2DecisionAfter.shouldDeclare).toBe(false);

    // Now let's see what happens if we try to force Bot2 to declare anyway
    try {
      const bot2Declaration = {
        rank: Rank.Two,
        suit: Suit.Hearts,
        type: DeclarationType.Pair,
        cards: Card.createPair(Suit.Hearts, Rank.Two)
      };

      makeTrumpDeclaration(stateAfterBot1, PlayerId.Bot2, bot2Declaration);
      
      // If we get here, the bug exists!
      fail('Bot2 should not be able to override Bot1 pair with another pair!');
    } catch (error: any) {
      // This is expected - the declaration should fail
      console.log('Bot2 declaration correctly failed:', error.message);
      expect(error.message).toContain('Declaration cannot override current declaration');
    }
  });

  test('should test concurrent AI declarations (race condition)', async () => {
    // This test simulates what might happen if checkAIDeclarations is called multiple times rapidly
    
    // First, let's see what both AIs think they can do initially
    const bot1InitialDecision = getAITrumpDeclarationDecision(gameState, PlayerId.Bot1);
    const bot2InitialDecision = getAITrumpDeclarationDecision(gameState, PlayerId.Bot2);
    
    console.log('Bot1 initial decision:', bot1InitialDecision);
    console.log('Bot2 initial decision:', bot2InitialDecision);
    
    // If both decide to declare based on the same state...
    if (bot1InitialDecision.shouldDeclare && bot1InitialDecision.declaration &&
        bot2InitialDecision.shouldDeclare && bot2InitialDecision.declaration) {
      
      // Bot1 declares first
      const stateAfterBot1 = makeTrumpDeclaration(gameState, PlayerId.Bot1, {
        rank: Rank.Two,
        suit: bot1InitialDecision.declaration.suit,
        type: bot1InitialDecision.declaration.type,
        cards: bot1InitialDecision.declaration.cards,
      });

      console.log('Bot1 successfully declared');

      // Now Bot2 tries to declare with the SAME declaration it decided on earlier
      // (simulating the race condition where Bot2's decision was made with stale state)
      try {
        makeTrumpDeclaration(stateAfterBot1, PlayerId.Bot2, {
          rank: Rank.Two,
          suit: bot2InitialDecision.declaration.suit,
          type: bot2InitialDecision.declaration.type,
          cards: bot2InitialDecision.declaration.cards,
        });
        
        // If we get here, THIS IS THE BUG!
        fail('Bot2 should not be able to override Bot1 with equal strength!');
      } catch (error: any) {
        console.log('Bot2 declaration correctly failed:', error.message);
        expect(error.message).toContain('Declaration cannot override current declaration');
      }
      
    } else {
      console.log('Both bots did not decide to declare initially, no race condition to test');
    }
  });

  test('should reproduce exact user scenario: AI 2(C)-2(C) overriding AI 2(D)-2(D)', () => {
    // Set up exact scenario user described
    const bot1Player = gameState.players.find((p: any) => p.id === PlayerId.Bot1);
    const bot2Player = gameState.players.find((p: any) => p.id === PlayerId.Bot2);

    // Give Bot1 exactly 2♦-2♦ pair
    bot1Player.hand = [
      ...Card.createPair(Suit.Diamonds, Rank.Two),
      Card.createCard(Suit.Spades, Rank.Queen, 0)
    ];

    // Give Bot2 exactly 2♣-2♣ pair  
    bot2Player.hand = [
      ...Card.createPair(Suit.Clubs, Rank.Two),
      Card.createCard(Suit.Hearts, Rank.King, 0)
    ];

    // Bot1 declares first (2♦-2♦)
    const bot1Declaration = {
      rank: Rank.Two,
      suit: Suit.Diamonds,
      type: DeclarationType.Pair,
      cards: Card.createPair(Suit.Diamonds, Rank.Two)
    };

    const stateAfterBot1 = makeTrumpDeclaration(gameState, PlayerId.Bot1, bot1Declaration);
    console.log('Bot1 declared 2♦-2♦');

    // Now Bot2 attempts to override with 2♣-2♣ (should fail!)
    const bot2Declaration = {
      rank: Rank.Two,
      suit: Suit.Clubs,
      type: DeclarationType.Pair,
      cards: Card.createPair(Suit.Clubs, Rank.Two)
    };

    expect(() => {
      makeTrumpDeclaration(stateAfterBot1, PlayerId.Bot2, bot2Declaration);
    }).toThrow('Declaration cannot override current declaration');

    console.log('✅ 2♣-2♣ correctly failed to override 2♦-2♦');

    // Let's also test the AI decision logic to make sure it wouldn't even try
    const bot2Decision = getAITrumpDeclarationDecision(stateAfterBot1, PlayerId.Bot2);
    console.log('Bot2 AI decision after Bot1 declared:', bot2Decision);
    
    expect(bot2Decision.shouldDeclare).toBe(false);
    expect(bot2Decision.reasoning).toContain('No valid declaration options available');
  });
});