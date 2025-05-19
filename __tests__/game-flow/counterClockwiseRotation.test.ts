import { processPlay } from '../../src/utils/gamePlayManager';
import { GameState, Player, Rank, Suit, Card, Team } from '../../src/types/game';

describe('Counter-clockwise rotation', () => {
  const createCard = (suit: Suit, rank: Rank, id: string): Card => ({
    suit,
    rank,
    id,
    points: 0
  });

  const createMockGameState = (): GameState => {
    const players: Player[] = [
      {
        id: 'player',
        name: 'Human',
        isHuman: true,
        hand: [],
        currentRank: Rank.Two,
        team: 'A'
      },
      {
        id: 'ai3',
        name: 'Bot 3',
        isHuman: false,
        hand: [],
        currentRank: Rank.Two,
        team: 'B'
      },
      {
        id: 'ai2',
        name: 'Bot 2',
        isHuman: false,
        hand: [],
        currentRank: Rank.Two,
        team: 'A'
      },
      {
        id: 'ai1',
        name: 'Bot 1',
        isHuman: false,
        hand: [],
        currentRank: Rank.Two,
        team: 'B'
      }
    ];

    const teams: [Team, Team] = [
      {
        id: 'A',
        players: ['player', 'ai2'],
        currentRank: Rank.Two,
        points: 0,
        isDefending: true
      },
      {
        id: 'B',
        players: ['ai3', 'ai1'],
        currentRank: Rank.Two,
        points: 0,
        isDefending: false
      }
    ];

    return {
      players,
      teams,
      deck: [],
      kittyCards: [],
      currentTrick: null,
      trumpInfo: {
        trumpRank: Rank.Two,
        trumpSuit: Suit.Hearts,
        declared: true
      },
      tricks: [],
      roundNumber: 1,
      currentPlayerIndex: 0,
      gamePhase: 'playing'
    };
  };

  test('Players should rotate counter-clockwise', () => {
    const gameState = createMockGameState();
    
    // Give players cards
    gameState.players[0].hand = [createCard(Suit.Hearts, Rank.Ace, 'h_a_1')];
    gameState.players[1].hand = [createCard(Suit.Hearts, Rank.King, 'h_k_1')];
    gameState.players[2].hand = [createCard(Suit.Hearts, Rank.Queen, 'h_q_1')];
    gameState.players[3].hand = [createCard(Suit.Hearts, Rank.Jack, 'h_j_1')];
    
    // Human (index 0) plays first
    const result1 = processPlay(gameState, [gameState.players[0].hand[0]]);
    expect(result1.newState.currentPlayerIndex).toBe(1); // Bot 3
    
    // Bot 3 (index 1) plays
    const result2 = processPlay(result1.newState, [result1.newState.players[1].hand[0]]);
    expect(result2.newState.currentPlayerIndex).toBe(2); // Bot 2
    
    // Bot 2 (index 2) plays
    const result3 = processPlay(result2.newState, [result2.newState.players[2].hand[0]]);
    expect(result3.newState.currentPlayerIndex).toBe(3); // Bot 1
    
    // Bot 1 (index 3) plays - completes trick
    const result4 = processPlay(result3.newState, [result3.newState.players[3].hand[0]]);
    
    // After trick completion, winner (Human with Ace) should be next
    expect(result4.trickComplete).toBe(true);
    expect(result4.trickWinner).toBe('Human');
    expect(result4.newState.currentPlayerIndex).toBe(0); // Human won
  });

  test('Counter-clockwise rotation matches traditional Tractor order', () => {
    const gameState = createMockGameState();
    
    // Verify player order matches counter-clockwise layout
    expect(gameState.players[0].name).toBe('Human');  // Bottom
    expect(gameState.players[1].name).toBe('Bot 3');  // Left (was right)
    expect(gameState.players[2].name).toBe('Bot 2');  // Top
    expect(gameState.players[3].name).toBe('Bot 1');  // Right (was left)
    
    // Verify team assignments remain correct
    expect(gameState.players[0].team).toBe('A'); // Human - Team A
    expect(gameState.players[1].team).toBe('B'); // Bot 3 - Team B
    expect(gameState.players[2].team).toBe('A'); // Bot 2 - Team A
    expect(gameState.players[3].team).toBe('B'); // Bot 1 - Team B
  });
});