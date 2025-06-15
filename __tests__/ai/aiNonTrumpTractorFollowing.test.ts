import { getAIMove } from '../../src/ai/aiLogic';
import { initializeGame } from '../../src/utils/gameInitialization';
import { Card, Suit, Rank, PlayerId, GamePhase, TrumpInfo } from '../../src/types';
import { gameLogger } from '../../src/utils/gameLogger';

describe('AI Non-Trump Tractor Following: Pair Priority', () => {
  let gameState: any;
  let trumpInfo: TrumpInfo;

  beforeEach(() => {
    gameState = initializeGame();
    trumpInfo = {
      trumpRank: Rank.Five,
      trumpSuit: Suit.Hearts,
    };
    gameState.trumpInfo = trumpInfo;
    gameState.gamePhase = GamePhase.Playing;
  });

  it('should use ALL available pairs before singles when following non-trump tractor', () => {
    // Issue 207 scenario: AI should follow validation rules for non-trump tractor following
    
    // Bot2 leads Diamond tractor
    const leadingTractor = [
      Card.createCard(Suit.Diamonds, Rank.Three, 0),
      Card.createCard(Suit.Diamonds, Rank.Three, 1),
      Card.createCard(Suit.Diamonds, Rank.Four, 0),
      Card.createCard(Suit.Diamonds, Rank.Four, 1)
    ];

    gameState.currentTrick = {
      plays: [
        { playerId: PlayerId.Bot2, cards: leadingTractor }
      ],
      winningPlayerId: PlayerId.Bot2,
      points: 0
    };

    // Set Bot3 as current player
    gameState.currentPlayerIndex = 3;
    const bot3Player = gameState.players[3];

    // Bot3 has multiple pairs available - should use ALL pairs before any singles
    bot3Player.hand = [
      // Available pairs (should use BOTH)
      Card.createCard(Suit.Diamonds, Rank.Ace, 0),
      Card.createCard(Suit.Diamonds, Rank.Ace, 1),
      Card.createCard(Suit.Diamonds, Rank.Seven, 0),
      Card.createCard(Suit.Diamonds, Rank.Seven, 1),
      // Singles (should NOT use these when pairs available)
      Card.createCard(Suit.Diamonds, Rank.Eight, 0),
      Card.createCard(Suit.Diamonds, Rank.Six, 0),
      Card.createCard(Suit.Clubs, Rank.Two, 0)
    ];

    gameLogger.info('test_non_trump_tractor_setup', { testType: 'pair_priority' }, '=== AI Non-Trump Tractor Following Test ===');
    gameLogger.info('test_leading_cards', { cards: '3♦3♦-4♦4♦', type: 'Diamond tractor' }, 'Leading: 3♦3♦-4♦4♦ (Diamond tractor)');
    gameLogger.info('test_bot_hand', { hand: 'A♦A♦, 7♦7♦, 8♦, 6♦, 2♣' }, 'Bot3 hand: A♦A♦, 7♦7♦, 8♦, 6♦, 2♣');
    gameLogger.info('test_expected_outcome', { expected: 'A♦A♦7♦7♦' }, 'Expected: Bot3 should use A♦A♦7♦7♦ (all available pairs)');

    const aiMove = getAIMove(gameState, PlayerId.Bot3);

    gameLogger.info('test_ai_decision', { selectedCards: aiMove.map(c => `${c.rank}${c.suit}`) }, 'AI selected: ' + aiMove.map(c => `${c.rank}${c.suit}`).join(', '));

    // Verify AI used all available pairs
    expect(aiMove).toHaveLength(4);

    // Count pairs used
    const acePairs = aiMove.filter(c => c.rank === Rank.Ace).length;
    const sevenPairs = aiMove.filter(c => c.rank === Rank.Seven).length;
    const usedSingles = aiMove.filter(c => c.rank === Rank.Eight || c.rank === Rank.Six).length;

    gameLogger.info('test_pair_analysis', { acePairs, sevenPairs, usedSingles }, `Ace pairs used: ${acePairs}, Seven pairs used: ${sevenPairs}, Singles used: ${usedSingles}`);

    // Should use BOTH available pairs (A♦A♦ and 7♦7♦)
    expect(acePairs).toBe(2);
    expect(sevenPairs).toBe(2);
    expect(usedSingles).toBe(0); // Should NOT use singles when pairs available

    gameLogger.info('test_success', { result: 'all_pairs_before_singles' }, '✅ AI correctly uses ALL pairs before singles in non-trump tractor following');
  });

  it('should use all pairs + singles when insufficient pairs for full tractor', () => {
    // Scenario: AI has only one pair but needs 4 cards
    
    const leadingTractor = [
      Card.createCard(Suit.Diamonds, Rank.Three, 0),
      Card.createCard(Suit.Diamonds, Rank.Three, 1),
      Card.createCard(Suit.Diamonds, Rank.Four, 0),
      Card.createCard(Suit.Diamonds, Rank.Four, 1)
    ];

    gameState.currentTrick = {
      plays: [
        { playerId: PlayerId.Bot2, cards: leadingTractor }
      ],
      winningPlayerId: PlayerId.Bot2,
      points: 0
    };

    gameState.currentPlayerIndex = 3;
    const bot3Player = gameState.players[3];

    // Bot3 has only 1 pair available
    bot3Player.hand = [
      // Only 1 pair available
      Card.createCard(Suit.Diamonds, Rank.Ace, 0),
      Card.createCard(Suit.Diamonds, Rank.Ace, 1),
      // Singles to complete
      Card.createCard(Suit.Diamonds, Rank.Eight, 0),
      Card.createCard(Suit.Diamonds, Rank.Six, 0),
      Card.createCard(Suit.Clubs, Rank.Two, 0)
    ];

    gameLogger.info('test_insufficient_pairs_setup', { testType: 'insufficient_pairs' }, '\n=== Insufficient Pairs Scenario ===');
    gameLogger.info('test_bot_constraints', { availablePairs: 1, tractorSize: 4 }, 'Bot3 has only 1 pair A♦A♦ for 4-card tractor');
    gameLogger.info('test_expected_outcome', { expected: 'A♦A♦ + 2 singles (8♦, 6♦)' }, 'Expected: A♦A♦ + 2 singles (8♦, 6♦)');

    const aiMove = getAIMove(gameState, PlayerId.Bot3);

    gameLogger.info('test_ai_decision', { selectedCards: aiMove.map(c => `${c.rank}${c.suit}`) }, 'AI selected: ' + aiMove.map(c => `${c.rank}${c.suit}`).join(', '));

    expect(aiMove).toHaveLength(4);

    // Should use the available pair
    const acePairs = aiMove.filter(c => c.rank === Rank.Ace).length;
    expect(acePairs).toBe(2);

    // Should use singles to complete
    const diamondSingles = aiMove.filter(c => 
      c.suit === Suit.Diamonds && c.rank !== Rank.Ace
    ).length;
    expect(diamondSingles).toBe(2);

    gameLogger.info('test_success', { result: 'pair_plus_singles_when_insufficient' }, '✅ AI correctly uses available pair + singles when insufficient pairs');
  });

  it('should not use valuable pairs when opponent is winning (strategic disposal)', () => {
    // Test that AI applies strategic disposal even when following tractor rules
    
    const leadingTractor = [
      Card.createCard(Suit.Diamonds, Rank.Three, 0),
      Card.createCard(Suit.Diamonds, Rank.Three, 1),
      Card.createCard(Suit.Diamonds, Rank.Four, 0),
      Card.createCard(Suit.Diamonds, Rank.Four, 1)
    ];

    gameState.currentTrick = {
      plays: [
        { playerId: PlayerId.Human, cards: leadingTractor }  // Human (opponent) winning
      ],
      winningPlayerId: PlayerId.Human,
      points: 0
    };

    gameState.currentPlayerIndex = 3;
    const bot3Player = gameState.players[3];

    // Bot3 has valuable vs non-valuable pairs
    bot3Player.hand = [
      // Valuable pairs (should avoid when opponent winning)
      Card.createCard(Suit.Diamonds, Rank.Ace, 0),
      Card.createCard(Suit.Diamonds, Rank.Ace, 1),
      Card.createCard(Suit.Diamonds, Rank.King, 0),
      Card.createCard(Suit.Diamonds, Rank.King, 1),
      // Lower value pairs (should prefer)
      Card.createCard(Suit.Diamonds, Rank.Seven, 0),
      Card.createCard(Suit.Diamonds, Rank.Seven, 1),
      Card.createCard(Suit.Diamonds, Rank.Eight, 0),
      Card.createCard(Suit.Diamonds, Rank.Eight, 1),
      Card.createCard(Suit.Clubs, Rank.Two, 0)
    ];

    gameLogger.info('test_strategic_disposal_setup', { testType: 'strategic_disposal' }, '\n=== Strategic Disposal Test ===');
    gameLogger.info('test_game_state', { opponentWinning: true, valuablePairs: 'A♦A♦, K♦K♦', lowerPairs: '7♦7♦, 8♦8♦' }, 'Opponent winning, Bot3 has valuable pairs (A♦A♦, K♦K♦) and lower pairs (7♦7♦, 8♦8♦)');
    gameLogger.info('test_expected_outcome', { expected: '7♦7♦, 8♦8♦' }, 'Expected: Use lower value pairs (7♦7♦, 8♦8♦) when opponent winning');

    const aiMove = getAIMove(gameState, PlayerId.Bot3);

    gameLogger.info('test_ai_decision', { selectedCards: aiMove.map(c => `${c.rank}${c.suit}`) }, 'AI selected: ' + aiMove.map(c => `${c.rank}${c.suit}`).join(', '));

    expect(aiMove).toHaveLength(4);

    // Should avoid valuable pairs when opponent winning
    const valuablePairs = aiMove.filter(c => c.rank === Rank.Ace || c.rank === Rank.King).length;
    const lowPairs = aiMove.filter(c => c.rank === Rank.Seven || c.rank === Rank.Eight).length;

    expect(valuablePairs).toBe(0); // Should NOT use valuable pairs
    expect(lowPairs).toBe(4); // Should use lower value pairs

    gameLogger.info('test_success', { result: 'avoids_valuable_pairs_when_opponent_winning' }, '✅ AI correctly avoids valuable pairs when opponent winning');
  });
});