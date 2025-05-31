import { Card, GameState, Player, Rank, Suit, Team, Trick, PlayerId, PlayerName, GamePhase, TeamId } from "../../src/types";
import { isValidPlay, identifyCombos } from '../../src/game/gameLogic';

describe('Pair Follow With Singles', () => {
  let mockState: GameState;
  let humanPlayer: Player;
  let cardId = 0;
  
  const createCard = (suit: Suit, rank: Rank): Card => ({
    id: `card-${cardId++}`,
    suit,
    rank,
    points: rank === Rank.King || rank === Rank.Ten ? 10 : rank === Rank.Five ? 5 : 0
  });
  
  beforeEach(() => {
    cardId = 0;
    
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
      gamePhase: GamePhase.Playing
    };
  });
  
  test('player can select two different cards of same suit when following a pair', () => {
    // AI leads with a pair of hearts
    const leadingPair: Card[] = [
      createCard(Suit.Hearts, Rank.King),
      createCard(Suit.Hearts, Rank.King)
    ];
    
    mockState.currentTrick = {
      leadingCombo: leadingPair,
      plays: [],
      leadingPlayerId: PlayerId.Bot1,
      winningPlayerId: PlayerId.Bot1,
      points: 20  // Two kings = 20 points
    };
    
    // Human has two different hearts (not a pair)
    const heartQueen = createCard(Suit.Hearts, Rank.Queen);
    const heartJack = createCard(Suit.Hearts, Rank.Jack);
    const spadeAce = createCard(Suit.Spades, Rank.Ace);
    
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
  
  test('player must play all hearts when they have some but not enough for pair', () => {
    // AI leads with a pair of hearts
    const leadingPair: Card[] = [
      createCard(Suit.Hearts, Rank.King),
      createCard(Suit.Hearts, Rank.King)
    ];
    
    mockState.currentTrick = {
      leadingCombo: leadingPair,
      plays: [],
      leadingPlayerId: PlayerId.Bot1,
      winningPlayerId: PlayerId.Bot1,
      points: 20  // Two kings = 20 points
    };
    
    // Human has only one heart
    const heartQueen = createCard(Suit.Hearts, Rank.Queen);
    const spadeAce = createCard(Suit.Spades, Rank.Ace);
    const clubKing = createCard(Suit.Clubs, Rank.King);
    
    humanPlayer.hand = [heartQueen, spadeAce, clubKing];
    
    // Must play the heart plus any other card
    const validPlay = [heartQueen, spadeAce];
    const invalidPlay = [spadeAce, clubKing]; // Not playing the heart
    
    const validResult = isValidPlay(
      validPlay,
      leadingPair,
      humanPlayer.hand,
      mockState.trumpInfo
    );
    
    const invalidResult = isValidPlay(
      invalidPlay,
      leadingPair,
      humanPlayer.hand,
      mockState.trumpInfo
    );
    
    expect(validResult).toBe(true);
    expect(invalidResult).toBe(false);
  });
  
  test('identifies available plays correctly when following pair', () => {
    // Human has various cards including some hearts
    const heartQueen = createCard(Suit.Hearts, Rank.Queen);
    const heartJack = createCard(Suit.Hearts, Rank.Jack);
    const heart10 = createCard(Suit.Hearts, Rank.Ten);
    const spadeAce = createCard(Suit.Spades, Rank.Ace);
    
    humanPlayer.hand = [heartQueen, heartJack, heart10, spadeAce];
    
    // Identify combos in hand
    const combos = identifyCombos(humanPlayer.hand, mockState.trumpInfo);
    
    console.log('Available combos:', combos.map(c => ({
      type: c.type,
      suit: c.cards[0].suit,
      ranks: c.cards.map(card => card.rank)
    })));
    
    // Should identify singles but no pairs in hearts
    const heartCombos = combos.filter(c => c.cards[0].suit === Suit.Hearts);
    const heartPairs = heartCombos.filter(c => c.type === 'Pair');
    
    expect(heartPairs.length).toBe(0); // No pairs in hearts
  });
});