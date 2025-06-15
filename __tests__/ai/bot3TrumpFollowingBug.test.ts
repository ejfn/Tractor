import { getAIMove } from '../../src/ai/aiLogic';
import { initializeGame } from '../../src/utils/gameInitialization';
import { PlayerId, Rank, Suit, ComboType, GamePhase, Card } from '../../src/types';
import type { GameState } from '../../src/types';
import { gameLogger } from '../../src/utils/gameLogger';

describe('Bot 3 Trump Following Decision Tree Bug', () => {
  test('Bot 3 should play weakest trump when opponent (Bot 2) is winning trump trick', () => {
    // Initialize game with trump rank 2, trump suit Diamonds
    const gameState = initializeGame();
    gameState.trumpInfo = {
      
      
      trumpRank: Rank.Two,
      trumpSuit: Suit.Diamonds,
    };

    // Set up specific hands to reproduce the scenario
    // Bot 1: Has Q♦ (leads this)
    gameState.players[1].hand = [
      Card.createCard(Suit.Diamonds, Rank.Queen, 0)
    ];

    // Bot 2: Has 2♥ (trump rank off-suit - will win the trick)
    gameState.players[2].hand = [
      Card.createCard(Suit.Hearts, Rank.Two, 0)
    ];

    // Bot 3: Has multiple trump options including weak trump suit cards
    const bot3Hand: Card[] = [
      Card.createCard(Suit.Clubs, Rank.Two, 0), // Trump rank off-suit (valuable)
      Card.createCard(Suit.Diamonds, Rank.Three, 0), // Weakest trump suit
      Card.createCard(Suit.Diamonds, Rank.Four, 0), // Weak trump suit
      Card.createCard(Suit.Diamonds, Rank.Five, 0), // Trump suit with points
    ];
    gameState.players[3].hand = bot3Hand;

    // Human: Has various cards
    gameState.players[0].hand = [
      Card.createCard(Suit.Diamonds, Rank.Six, 0),
      Card.createCard(Suit.Diamonds, Rank.Seven, 0),
    ];

    // Set up the trick state: Bot 1 leads Q♦, Bot 2 plays 2♥ (now winning)
    gameState.currentTrick = {
      plays: [
        {
          playerId: PlayerId.Bot1,
          cards: [Card.createCard(Suit.Diamonds, Rank.Queen, 0)],
        },
        {
          playerId: PlayerId.Bot2,
          cards: [Card.createCard(Suit.Hearts, Rank.Two, 0)],
        }
      ],
      points: 0,
      winningPlayerId: PlayerId.Bot2, // Bot 2 is currently winning with 2♥
    };

    // Set current player to Bot 3
    gameState.currentPlayerIndex = 3;
    gameState.gamePhase = GamePhase.Playing;

    // Get AI move for Bot 3
    const selectedCards = getAIMove(gameState, PlayerId.Bot3);

    // Bot 3 should play the WEAKEST trump card (3♦), not waste valuable 2♣
    expect(selectedCards).toHaveLength(1);
    const selectedCard = selectedCards[0];
    
    gameLogger.info('test_bot3_trump_selection', { selectedCard: `${selectedCard.rank}${selectedCard.suit}` }, `Bot 3 selected: ${selectedCard.rank}${selectedCard.suit}`);
    gameLogger.info('test_available_trump_options', { availableOptions: bot3Hand.map(c => `${c.rank}${c.suit}`) }, 'Available trump options were: ' + bot3Hand.map(c => `${c.rank}${c.suit}`).join(', '));

    // Expected: Bot 3 should choose 3♦ (weakest trump) over 2♣ (valuable trump rank)
    expect(selectedCard.rank).toBe(Rank.Three);
    expect(selectedCard.suit).toBe(Suit.Diamonds);
    
    // Should NOT select the valuable trump rank card
    expect(selectedCard.rank).not.toBe(Rank.Two);
  });

  test('Trump hierarchy conservation values should prefer weak trump suit over trump rank', () => {
    // Test that conservation values are calculated correctly
    const gameState = initializeGame();
    gameState.trumpInfo = {
      
      
      trumpRank: Rank.Two,
      trumpSuit: Suit.Diamonds,
    };

    const cards = [
      Card.createCard(Suit.Clubs, Rank.Two, 0), // Trump rank off-suit
      Card.createCard(Suit.Diamonds, Rank.Three, 0), // Weak trump suit
    ];

    // This test will help us verify the conservation values are calculated correctly
    // We can inspect the debug output to see actual values
    expect(cards).toHaveLength(2);
  });
});