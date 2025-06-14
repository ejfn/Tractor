import { isValidPlay } from "../../src/game/playValidation";
import { Card, DeckId, GamePhase, GameState, Player, PlayerId, PlayerName, Rank, Suit, TeamId } from "../../src/types";

describe('FRV-5: Pair Follow With Singles', () => {
  let mockState: GameState;
  let humanPlayer: Player;
  let deckId = 0;
  
  const getNextDeckId = (): 0 | 1 => {
    const id = deckId % 2;
    deckId++;
    return id as DeckId;
  };
  
  beforeEach(() => {
    deckId = 0;
    
    // Create basic game state
    humanPlayer = {
      id: PlayerId.Human,
      name: PlayerName.Human,
      hand: [],
      isHuman: true,
      team: TeamId.A,
    };
    
    const ai1: Player = {
      id: PlayerId.Bot1,
      name: PlayerName.Bot1,
      hand: [],
      isHuman: false,
      team: TeamId.B,
    };
    
    mockState = {
      players: [humanPlayer, ai1],
      teams: [
        { id: TeamId.A, currentRank: Rank.Two, points: 0, isDefending: true },
        { id: TeamId.B, currentRank: Rank.Two, points: 0, isDefending: false }
      ],
      deck: [],
      kittyCards: [],
      currentTrick: null,
      trumpInfo: { trumpRank: Rank.Two,  trumpSuit: Suit.Spades },
      tricks: [],
      roundNumber: 1,
      currentPlayerIndex: 0,
      roundStartingPlayerIndex: 0,
      gamePhase: GamePhase.Playing
    };
  });
  
  test('FRV-5.1: player can select two different cards of same suit when following a pair', () => {
    // AI leads with a pair of hearts
    const leadingPair: Card[] = [
      Card.createCard(Suit.Hearts, Rank.King, 0),
      Card.createCard(Suit.Hearts, Rank.King, 1)
    ];
    
    mockState.currentTrick = {
      plays: [
        { playerId: PlayerId.Bot1, cards: leadingPair }
      ],
      winningPlayerId: PlayerId.Bot1,
      points: 20  // Two kings = 20 points
    };
    
    // Human has two different hearts (not a pair)
    const heartQueen = Card.createCard(Suit.Hearts, Rank.Queen, getNextDeckId());
    const heartJack = Card.createCard(Suit.Hearts, Rank.Jack, getNextDeckId());
    const spadeAce = Card.createCard(Suit.Spades, Rank.Ace, getNextDeckId());
    
    humanPlayer.hand = [heartQueen, heartJack, spadeAce];
    
    // Try to play two different hearts
    const selectedCards = [heartQueen, heartJack];
    
    // This should be valid
    const result = isValidPlay(
      selectedCards,
      leadingPair,
      humanPlayer.hand,
      mockState.trumpInfo
    );
    
    console.log('Play validation result:', result);
    expect(result).toBe(true);
  });
  
  test('FRV-5.2: player must include heart card when available', () => {
    // AI leads with a pair of hearts
    const leadingPair: Card[] = [
      Card.createCard(Suit.Hearts, Rank.King, 0),
      Card.createCard(Suit.Hearts, Rank.King, 1)
    ];
    
    mockState.currentTrick = {
      plays: [
        { playerId: PlayerId.Bot1, cards: leadingPair }
      ],
      winningPlayerId: PlayerId.Bot1,
      points: 20  // Two kings = 20 points
    };
    
    // Human has only one heart
    const heartQueen = Card.createCard(Suit.Hearts, Rank.Queen, getNextDeckId());
    const spadeAce = Card.createCard(Suit.Spades, Rank.Ace, getNextDeckId());
    const clubKing = Card.createCard(Suit.Clubs, Rank.King, getNextDeckId());
    
    humanPlayer.hand = [heartQueen, spadeAce, clubKing];
    
    // Must play the heart plus any other card
    const validPlay = [heartQueen, spadeAce];
    
    const validResult = isValidPlay(
      validPlay,
      leadingPair,
      humanPlayer.hand,
      mockState.trumpInfo
    );
    
    expect(validResult).toBe(true);
  });

  test('FRV-5.3: player cannot skip available heart card', () => {
    // AI leads with a pair of hearts
    const leadingPair: Card[] = [
      Card.createCard(Suit.Hearts, Rank.King, 0),
      Card.createCard(Suit.Hearts, Rank.King, 1)
    ];
    
    mockState.currentTrick = {
      plays: [
        { playerId: PlayerId.Bot1, cards: leadingPair }
      ],
      winningPlayerId: PlayerId.Bot1,
      points: 20  // Two kings = 20 points
    };
    
    // Human has only one heart
    const heartQueen = Card.createCard(Suit.Hearts, Rank.Queen, getNextDeckId());
    const spadeAce = Card.createCard(Suit.Spades, Rank.Ace, getNextDeckId());
    const clubKing = Card.createCard(Suit.Clubs, Rank.King, getNextDeckId());
    
    humanPlayer.hand = [heartQueen, spadeAce, clubKing];
    
    // Cannot skip the heart card
    const invalidPlay = [spadeAce, clubKing]; // Not playing the heart
    
    const invalidResult = isValidPlay(
      invalidPlay,
      leadingPair,
      humanPlayer.hand,
      mockState.trumpInfo
    );
    
    expect(invalidResult).toBe(false);
  });
  
  test('FRV-5.4: should allow mixed cards when no pairs available in leading suit', () => {
    // AI leads with a pair of hearts
    const leadingPair: Card[] = [
      Card.createCard(Suit.Hearts, Rank.King, 0),
      Card.createCard(Suit.Hearts, Rank.King, 1)
    ];
    
    mockState.currentTrick = {
      plays: [
        { playerId: PlayerId.Bot1, cards: leadingPair }
      ],
      winningPlayerId: PlayerId.Bot1,
      points: 20  // Two kings = 20 points
    };
    
    // Human has various cards including some hearts but no heart pairs
    const heartQueen = Card.createCard(Suit.Hearts, Rank.Queen, getNextDeckId());
    const heartJack = Card.createCard(Suit.Hearts, Rank.Jack, getNextDeckId());
    const heart10 = Card.createCard(Suit.Hearts, Rank.Ten, getNextDeckId());
    const spadeAce = Card.createCard(Suit.Spades, Rank.Ace, getNextDeckId());
    
    humanPlayer.hand = [heartQueen, heartJack, heart10, spadeAce];
    
    // Should be valid to play any two hearts when no pairs available
    const mixedHeartsPlay = [heartQueen, heartJack];
    
    const result = isValidPlay(
      mixedHeartsPlay,
      leadingPair,
      humanPlayer.hand,
      mockState.trumpInfo
    );
    
    expect(result).toBe(true); // Valid when no pairs available in leading suit
  });
});