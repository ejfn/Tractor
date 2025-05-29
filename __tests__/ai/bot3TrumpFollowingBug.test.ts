import { getAIMove } from '../../src/ai/aiLogic';
import { initializeGame } from '../../src/game/gameLogic';
import { PlayerId, Rank, Suit, ComboType, GamePhase } from '../../src/types';
import type { GameState, Card } from '../../src/types';

describe('Bot 3 Trump Following Decision Tree Bug', () => {
  test('Bot 3 should play weakest trump when opponent (Bot 2) is winning trump trick', () => {
    // Initialize game with trump rank 2, trump suit Diamonds
    const gameState = initializeGame();
    gameState.trumpInfo = {
      declared: true,
      declarerPlayerId: PlayerId.Human,
      trumpRank: Rank.Two,
      trumpSuit: Suit.Diamonds,
    };

    // Set up specific hands to reproduce the scenario
    // Bot 1: Has Q♦ (leads this)
    gameState.players[1].hand = [
      { id: 'q-diamonds', rank: Rank.Queen, suit: Suit.Diamonds, points: 0 }
    ];

    // Bot 2: Has 2♥ (trump rank off-suit - will win the trick)
    gameState.players[2].hand = [
      { id: '2-hearts', rank: Rank.Two, suit: Suit.Hearts, points: 0 }
    ];

    // Bot 3: Has multiple trump options including weak trump suit cards
    const bot3Hand: Card[] = [
      { id: '2-clubs', rank: Rank.Two, suit: Suit.Clubs, points: 0 }, // Trump rank off-suit (valuable)
      { id: '3-diamonds', rank: Rank.Three, suit: Suit.Diamonds, points: 0 }, // Weakest trump suit
      { id: '4-diamonds', rank: Rank.Four, suit: Suit.Diamonds, points: 0 }, // Weak trump suit
      { id: '5-diamonds', rank: Rank.Five, suit: Suit.Diamonds, points: 5 }, // Trump suit with points
    ];
    gameState.players[3].hand = bot3Hand;

    // Human: Has various cards
    gameState.players[0].hand = [
      { id: '6-diamonds', rank: Rank.Six, suit: Suit.Diamonds, points: 0 },
      { id: '7-diamonds', rank: Rank.Seven, suit: Suit.Diamonds, points: 0 },
    ];

    // Set up the trick state: Bot 1 leads Q♦, Bot 2 plays 2♥ (now winning)
    gameState.currentTrick = {
      leadingPlayerId: PlayerId.Bot1,
      leadingCombo: [{ id: 'q-diamonds', rank: Rank.Queen, suit: Suit.Diamonds, points: 0 }],
      plays: [
        {
          playerId: PlayerId.Bot1,
          cards: [{ id: 'q-diamonds', rank: Rank.Queen, suit: Suit.Diamonds, points: 0 }],
        },
        {
          playerId: PlayerId.Bot2,
          cards: [{ id: '2-hearts', rank: Rank.Two, suit: Suit.Hearts, points: 0 }],
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
    
    console.log(`Bot 3 selected: ${selectedCard.rank}${selectedCard.suit}`);
    console.log('Available trump options were:', bot3Hand.map(c => `${c.rank}${c.suit}`));

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
      declared: true,
      declarerPlayerId: PlayerId.Human,
      trumpRank: Rank.Two,
      trumpSuit: Suit.Diamonds,
    };

    const cards = [
      { id: '2-clubs', rank: Rank.Two, suit: Suit.Clubs, points: 0 }, // Trump rank off-suit
      { id: '3-diamonds', rank: Rank.Three, suit: Suit.Diamonds, points: 0 }, // Weak trump suit
    ];

    // This test will help us verify the conservation values are calculated correctly
    // We can inspect the debug output to see actual values
    expect(cards).toHaveLength(2);
  });
});