import { getAIMove } from '../../src/ai/aiLogic';
import { initializeGame } from '../../src/utils/gameInitialization';
import { Card, Suit, Rank, PlayerId, TrumpInfo, GameState } from '../../src/types';

describe('Issue 204: AI Pair Selection Bug', () => {
  let gameState: GameState;
  let trumpInfo: TrumpInfo;

  beforeEach(() => {
    gameState = initializeGame();
    trumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Hearts,
    };
    gameState.trumpInfo = trumpInfo;
  });

  it('should prefer lower value pairs when opponent is winning (9-pair over 10-pair)', () => {
    // Human leads Ace pair, Bot1 King pair, Bot2 small pair, Human wins
    const humanAcePair = [
      Card.createCard(Suit.Spades, Rank.Ace, 0),
      Card.createCard(Suit.Spades, Rank.Ace, 1)
    ];

    const bot1KingPair = [
      Card.createCard(Suit.Spades, Rank.King, 0),
      Card.createCard(Suit.Spades, Rank.King, 1)
    ];

    const bot2SmallPair = [
      Card.createCard(Suit.Spades, Rank.Seven, 0),
      Card.createCard(Suit.Spades, Rank.Seven, 1)
    ];

    // Set up current trick: Human Ace pair wins
    gameState.currentTrick = {
      plays: [
        { playerId: PlayerId.Human, cards: humanAcePair },    // Human leads A♠ pair and wins
        { playerId: PlayerId.Bot1, cards: bot1KingPair },     // Bot1 (teammate) plays K♠ pair
        { playerId: PlayerId.Bot2, cards: bot2SmallPair }     // Bot2 (opponent) plays 7♠ pair
      ],
      winningPlayerId: PlayerId.Human, // Human is winning
      points: 0
    };

    // Set current player to Bot 3 (4th player)
    gameState.currentPlayerIndex = 3;
    const fourthPlayerId = PlayerId.Bot3;

    // Give Bot3 hand with both 9-pair and 10-pair options
    const bot3Hand = [
      // 9-pair (should be preferred when opponent winning - lower value disposal)
      Card.createCard(Suit.Spades, Rank.Nine, 0),
      Card.createCard(Suit.Spades, Rank.Nine, 1),
      // 10-pair (higher value - should avoid giving to opponent)
      Card.createCard(Suit.Spades, Rank.Ten, 0),
      Card.createCard(Suit.Spades, Rank.Ten, 1),
      // Other cards
      Card.createCard(Suit.Clubs, Rank.Six, 0)
    ];

    gameState.players[3].hand = bot3Hand;

    console.log('=== Issue 204 Test Scenario ===');
    console.log('Human leads A♠ pair and wins');
    console.log('Bot1 (teammate) follows with K♠ pair');
    console.log('Bot2 (opponent) follows with 7♠ pair');
    console.log('Bot3 (4th player) has both 9♠ pair and 10♠ pair available');
    console.log('Expected: Bot3 should play 9♠ pair (0 points) since Human (opponent) is winning');
    console.log('Issue: Bot3 should NOT play 10♠ pair (20 points) - giving points to opponent');

    // Get AI move for 4th player
    const aiMove = getAIMove(gameState, fourthPlayerId);

    console.log('AI selected:', aiMove.map(c => `${c.rank}${c.suit}`));

    // Verify AI move
    expect(aiMove).toHaveLength(2); // Should play a pair

    // Check if AI selected the non-point pair (9s) vs point pair (10s)
    const selectedRanks = aiMove.map(c => c.rank);
    const isNinePair = selectedRanks.every(rank => rank === Rank.Nine);
    const isTenPair = selectedRanks.every(rank => rank === Rank.Ten);

    if (isNinePair) {
      console.log('✅ CORRECT: AI selected 9♠ pair (0 points - avoiding point contribution to opponent)');
    } else if (isTenPair) {
      console.log('❌ BUG: AI selected 10♠ pair (20 points - giving points to opponent!)');
    } else {
      console.log('❓ UNEXPECTED: AI selected neither pair option');
    }

    // The AI should prefer the non-point pair (9s) when opponent is winning
    // This avoids giving point cards to the opponent
    expect(isNinePair).toBe(true);
    expect(isTenPair).toBe(false);
  });

  it('should prefer point cards when teammate is winning (10-pair over 9-pair)', () => {
    // Create trick scenario where teammate (Bot1) is winning with Ace pair
    const humanCards = [
      Card.createCard(Suit.Spades, Rank.Seven, 0),
      Card.createCard(Suit.Spades, Rank.Seven, 1)
    ];

    const bot1AcePair = [
      Card.createCard(Suit.Spades, Rank.Ace, 0),
      Card.createCard(Suit.Spades, Rank.Ace, 1) // Bot1 (teammate) wins with A♠ pair
    ];

    const bot2Cards = [
      Card.createCard(Suit.Spades, Rank.Eight, 0),
      Card.createCard(Suit.Spades, Rank.Eight, 1)
    ];

    // Set up current trick with teammate winning
    gameState.currentTrick = {
      plays: [
        { playerId: PlayerId.Human, cards: humanCards },     // Human plays lower pair
        { playerId: PlayerId.Bot1, cards: bot1AcePair },     // Bot1 (teammate) wins with A♠ pair
        { playerId: PlayerId.Bot2, cards: bot2Cards }        // Bot2 plays middle pair
      ],
      winningPlayerId: PlayerId.Bot1, // Bot1 (teammate) is winning
      points: 0
    };

    // Set current player to Bot 3 (4th player)
    gameState.currentPlayerIndex = 3;
    const fourthPlayerId = PlayerId.Bot3;

    // Give Bot3 hand with both 9-pair and 10-pair options
    const bot3Hand = [
      // 9-pair
      Card.createCard(Suit.Spades, Rank.Nine, 0),
      Card.createCard(Suit.Spades, Rank.Nine, 1),
      // 10-pair (should be preferred when teammate winning - contribute higher value)
      Card.createCard(Suit.Spades, Rank.Ten, 0),
      Card.createCard(Suit.Spades, Rank.Ten, 1),
      // Other cards
      Card.createCard(Suit.Clubs, Rank.Six, 0)
    ];

    gameState.players[3].hand = bot3Hand;

    console.log('=== Teammate Winning Scenario ===');
    console.log('Bot1 (teammate) wins with A♠ pair');
    console.log('Expected: Bot3 should play 10♠ pair (20 points contribution to teammate)');

    // Get AI move for 4th player
    const aiMove = getAIMove(gameState, fourthPlayerId);

    console.log('AI selected:', aiMove.map(c => `${c.rank}${c.suit}`));

    // Verify AI move
    expect(aiMove).toHaveLength(2); // Should play a pair

    // Check if AI selected the point pair (10s) when teammate is winning
    const selectedRanks = aiMove.map(c => c.rank);
    const isNinePair = selectedRanks.every(rank => rank === Rank.Nine);
    const isTenPair = selectedRanks.every(rank => rank === Rank.Ten);

    if (isTenPair) {
      console.log('✅ CORRECT: AI selected 10♠ pair (20 points contribution when teammate winning)');
    } else if (isNinePair) {
      console.log('⚠️ SUBOPTIMAL: AI selected 9♠ pair (missing opportunity to contribute points)');
    }

    // When teammate is winning, AI should contribute point cards
    expect(isTenPair).toBe(true);
    expect(isNinePair).toBe(false);
  });
});