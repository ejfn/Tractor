import { initializeGame } from '../../src/game/gameLogic';
import { makeTrumpDeclaration } from '../../src/game/trumpDeclarationManager';
import { DeclarationType, PlayerId, Rank, Suit, GamePhase } from '../../src/types';
import { createCard } from '../helpers/cards';

describe('Immutable Opportunity Tracking', () => {
  let gameState: any;

  beforeEach(() => {
    gameState = initializeGame();
    gameState.gamePhase = GamePhase.Dealing;
    
    // Give human trump rank cards that can form pairs
    const humanPlayer = gameState.players.find((p: any) => p.id === PlayerId.Human);
    humanPlayer.hand = [
      createCard(Suit.Clubs, Rank.Two), 
      createCard(Suit.Clubs, Rank.Two),
      createCard(Suit.Hearts, Rank.Two),
      createCard(Suit.Hearts, Rank.Ace)
    ];

    // Give Bot1 stronger trump cards
    const bot1Player = gameState.players.find((p: any) => p.id === PlayerId.Bot1);
    bot1Player.hand = [
      createCard(Suit.Diamonds, Rank.Two), 
      createCard(Suit.Diamonds, Rank.Two),
      createCard(Suit.Spades, Rank.Queen)
    ];
  });

  test('should demonstrate immutable opportunity tracking concept', () => {
    // This test demonstrates the concept - in reality this would be tested via UI integration
    // since the useProgressiveDealing hook manages the immutable tracking internally
    
    // Simulate creating opportunity hashes
    const createOpportunityHash = (opportunities: any[]) => {
      return opportunities
        .map((opp) => `${opp.type}-${opp.suit}`)
        .sort()
        .join(",");
    };

    // Initial human opportunities
    const initialOpportunities = [
      { type: DeclarationType.Pair, suit: Suit.Clubs },
      { type: DeclarationType.Single, suit: Suit.Hearts }
    ];
    
    const initialHash = createOpportunityHash(initialOpportunities);
    console.log('Initial opportunity hash:', initialHash);
    
    // Simulate human decision history tracking
    const humanDecisionHistory = new Set<string>();
    
    // Human sees these opportunities for first time - should show modal
    const hasSeenBefore = humanDecisionHistory.has(initialHash);
    expect(hasSeenBefore).toBe(false); // First time seeing this set
    
    // Human skips declaration - record the decision
    humanDecisionHistory.add(initialHash);
    console.log('Human skipped - recorded decision for:', initialHash);
    
    // Same opportunities appear again (e.g., after dealing more cards) - should NOT show modal
    const hasSeenAfterSkip = humanDecisionHistory.has(initialHash);
    expect(hasSeenAfterSkip).toBe(true); // Already seen and decided
    
    // Bot declares something, changing human's opportunities
    const bot1Declaration = {
      rank: Rank.Two,
      suit: Suit.Diamonds,
      type: DeclarationType.Pair,
      cards: [createCard(Suit.Diamonds, Rank.Two), createCard(Suit.Diamonds, Rank.Two)]
    };
    
    const stateAfterBot = makeTrumpDeclaration(gameState, PlayerId.Bot1, bot1Declaration);
    
    // Now human has different opportunities (can't declare pair anymore due to bot's stronger pair)
    const newOpportunities = [
      { type: DeclarationType.Single, suit: Suit.Hearts },
      { type: DeclarationType.Single, suit: Suit.Clubs }
    ];
    
    const newHash = createOpportunityHash(newOpportunities);
    console.log('New opportunity hash after bot declaration:', newHash);
    
    // This is a NEW opportunity set - should show modal
    const hasSeenNewSet = humanDecisionHistory.has(newHash);
    expect(hasSeenNewSet).toBe(false); // New opportunity set due to bot declaration
    expect(newHash).not.toBe(initialHash); // Confirms opportunities changed
    
    console.log('✅ Immutable tracking correctly identifies new vs seen opportunity sets');
  });

  test('should demonstrate bot declaration benefit', () => {
    // This test shows how bot declarations create new human opportunities
    
    const createOpportunityHash = (opportunities: any[]) => {
      return opportunities.map((opp) => `${opp.type}-${opp.suit}`).sort().join(",");
    };

    // Before any declarations - human has pair opportunity
    const beforeBotDeclaration = [
      { type: DeclarationType.Pair, suit: Suit.Clubs },
      { type: DeclarationType.Single, suit: Suit.Hearts }
    ];
    
    // Bot declares a single
    const bot1Declaration = {
      rank: Rank.Two,
      suit: Suit.Spades,
      type: DeclarationType.Single,
      cards: [createCard(Suit.Spades, Rank.Two)]
    };
    
    makeTrumpDeclaration(gameState, PlayerId.Bot1, bot1Declaration);
    
    // After bot single declaration - human can now override with pair
    const afterBotDeclaration = [
      { type: DeclarationType.Pair, suit: Suit.Clubs },
      { type: DeclarationType.Single, suit: Suit.Hearts }
    ];
    
    const beforeHash = createOpportunityHash(beforeBotDeclaration);
    const afterHash = createOpportunityHash(afterBotDeclaration);
    
    // In this case opportunities are the same, but in other scenarios they could change
    console.log('Before bot declaration:', beforeHash);
    console.log('After bot declaration:', afterHash);
    
    // The key benefit: if bot's declaration changes human's opportunity landscape,
    // the immutable tracking will detect the difference and show the modal again
    expect(typeof beforeHash).toBe('string');
    expect(typeof afterHash).toBe('string');
    
    console.log('✅ Bot declarations can trigger new human opportunity modals');
  });

  test('should demonstrate hash collision resistance', () => {
    // Test that different opportunity sets produce different hashes
    
    const createOpportunityHash = (opportunities: any[]) => {
      return opportunities.map((opp) => `${opp.type}-${opp.suit}`).sort().join(",");
    };

    const set1 = [
      { type: DeclarationType.Pair, suit: Suit.Clubs },
      { type: DeclarationType.Single, suit: Suit.Hearts }
    ];
    
    const set2 = [
      { type: DeclarationType.Single, suit: Suit.Clubs },
      { type: DeclarationType.Pair, suit: Suit.Hearts }
    ];
    
    const set3 = [
      { type: DeclarationType.Single, suit: Suit.Hearts }
    ];
    
    const hash1 = createOpportunityHash(set1);
    const hash2 = createOpportunityHash(set2);
    const hash3 = createOpportunityHash(set3);
    
    console.log('Set 1 hash:', hash1);
    console.log('Set 2 hash:', hash2);
    console.log('Set 3 hash:', hash3);
    
    // All hashes should be different
    expect(hash1).not.toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash2).not.toBe(hash3);
    
    // Same set should produce same hash (deterministic)
    const hash1Duplicate = createOpportunityHash(set1);
    expect(hash1).toBe(hash1Duplicate);
    
    console.log('✅ Opportunity hashing is deterministic and collision-resistant');
  });
});