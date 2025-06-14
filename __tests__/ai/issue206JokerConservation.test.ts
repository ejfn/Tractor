import { getAIMove } from '../../src/ai/aiLogic';
import { initializeGame } from '../../src/utils/gameInitialization';
import { Card, Suit, Rank, PlayerId, GamePhase, TrumpInfo, JokerType } from '../../src/types';

describe('Issue 206: AI Joker Conservation Strategy', () => {
  let gameState: any;
  let trumpInfo: TrumpInfo;

  beforeEach(() => {
    gameState = initializeGame();
    trumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Hearts,
    };
    gameState.trumpInfo = trumpInfo;
    gameState.gamePhase = GamePhase.Playing;
  });

  it('should NOT waste Small Joker pair when opponent winning with Big Joker pair', () => {
    // Issue 206 scenario: Bot2 should conserve Small Jokers when Bot1 has Big Jokers
    
    // Human leads Diamond 6 pair
    const leadingPair = [
      Card.createCard(Suit.Diamonds, Rank.Six, 0),
      Card.createCard(Suit.Diamonds, Rank.Six, 1)
    ];

    // Bot1 plays Big Joker pair (opponent winning)
    const bot1BigJokers = [
      Card.createJoker(JokerType.Big, 0),
      Card.createJoker(JokerType.Big, 1)
    ];

    gameState.currentTrick = {
      plays: [
        { playerId: PlayerId.Human, cards: leadingPair },
        { playerId: PlayerId.Bot1, cards: bot1BigJokers }
      ],
      winningPlayerId: PlayerId.Bot1, // Bot1 (opponent) is winning
      points: 0
    };

    // Set Bot2 as current player (3rd position)
    gameState.currentPlayerIndex = 2;
    const bot2Player = gameState.players[2];

    // Bot2 is out of Hearts AND Diamonds - must play cross-suit
    bot2Player.hand = [
      // Small Joker pair (valuable trump - should NOT waste)
      Card.createJoker(JokerType.Small, 0),
      Card.createJoker(JokerType.Small, 1),
      // Other cards Bot2 could play instead (NO DIAMONDS)
      Card.createCard(Suit.Clubs, Rank.Three, 0),
      Card.createCard(Suit.Clubs, Rank.Four, 1),
      Card.createCard(Suit.Spades, Rank.Five, 0),
      Card.createCard(Suit.Spades, Rank.Six, 0)
    ];

    console.log('=== Issue 206: Joker Conservation Test ===');
    console.log('Human led: 6♦6♦ (Diamond pair)');
    console.log('Bot1 played: Big Joker pair (opponent winning)');
    console.log('Bot2 hand: Small Joker pair, 3♣, 4♣, 5♠, 6♠ (NO DIAMONDS)');
    console.log('Expected: Bot2 should conserve Small Jokers, play Clubs pair instead');

    const aiMove = getAIMove(gameState, PlayerId.Bot2);

    console.log('AI selected:', aiMove.map(c => c.joker ? `${c.joker}Joker` : `${c.rank}${c.suit}`));

    // Verify AI did NOT waste Small Jokers
    const usedSmallJokers = aiMove.filter(c => c.joker === JokerType.Small).length;
    const usedClubsPair = aiMove.filter(c => 
      c.suit === Suit.Clubs && (c.rank === Rank.Three || c.rank === Rank.Four)
    ).length;

    console.log('Small Jokers used:', usedSmallJokers);
    console.log('Clubs cards used:', usedClubsPair);

    // CRITICAL: Should NOT use Small Jokers when opponent winning with Big Jokers
    expect(usedSmallJokers).toBe(0); // Should not waste Small Jokers
    expect(usedClubsPair).toBe(2); // Should use Clubs pair instead
    expect(aiMove).toHaveLength(2); // Correct response length

    console.log('✅ AI correctly conserves Small Jokers when opponent has Big Jokers');
  });

  it('should conserve Small Jokers even when teammate Bot3 could potentially win', () => {
    // Corrected test: Even when strategic considerations exist, Small Jokers shouldn't be wasted on 0-point tricks
    
    const leadingPair = [
      Card.createCard(Suit.Diamonds, Rank.Six, 0),
      Card.createCard(Suit.Diamonds, Rank.Six, 1)
    ];

    // Bot1 plays weak pair
    const bot1WeakPair = [
      Card.createCard(Suit.Diamonds, Rank.Three, 0),
      Card.createCard(Suit.Diamonds, Rank.Three, 1)
    ];

    gameState.currentTrick = {
      plays: [
        { playerId: PlayerId.Human, cards: leadingPair },
        { playerId: PlayerId.Bot1, cards: bot1WeakPair }
      ],
      winningPlayerId: PlayerId.Human, // Human (opponent) winning
      points: 0 // CRITICAL: No points on the table
    };

    gameState.currentPlayerIndex = 2;
    const bot2Player = gameState.players[2];

    // Same hand as before - out of Diamonds
    bot2Player.hand = [
      Card.createJoker(JokerType.Small, 0),
      Card.createJoker(JokerType.Small, 1),
      Card.createCard(Suit.Clubs, Rank.Three, 0),
      Card.createCard(Suit.Clubs, Rank.Four, 1),
      Card.createCard(Suit.Spades, Rank.Five, 0),
      Card.createCard(Suit.Spades, Rank.Six, 0)
    ];

    console.log('\n=== Corrected Test: 0-Point Trick Conservation ===');
    console.log('0 points on table - should conserve Small Jokers regardless of strategic considerations');

    const aiMove = getAIMove(gameState, PlayerId.Bot2);

    console.log('AI selected:', aiMove.map(c => c.joker ? `${c.joker}Joker` : `${c.rank}${c.suit}`));

    // Should conserve Small Jokers on 0-point tricks
    const usedSmallJokers = aiMove.filter(c => c.joker === JokerType.Small).length;
    
    expect(aiMove).toHaveLength(2);
    expect(usedSmallJokers).toBe(0); // Should NOT waste Small Jokers on 0-point trick
    
    console.log('Small Jokers used:', usedSmallJokers);
    console.log('✅ AI correctly conserves Small Jokers on 0-point tricks');
  });

  it('should conserve Small Jokers when out of trump suit against Big Joker singles', () => {
    // Test single Small Joker conservation against single Big Joker
    
    const leadingSingle = [Card.createCard(Suit.Diamonds, Rank.Six, 0)];
    const bot1BigJoker = [Card.createJoker(JokerType.Big, 0)];

    gameState.currentTrick = {
      plays: [
        { playerId: PlayerId.Human, cards: leadingSingle },
        { playerId: PlayerId.Bot1, cards: bot1BigJoker }
      ],
      winningPlayerId: PlayerId.Bot1, // Bot1 winning with Big Joker
      points: 0
    };

    gameState.currentPlayerIndex = 2;
    const bot2Player = gameState.players[2];

    // Bot2 has Small Joker but should conserve it (out of Diamonds)
    bot2Player.hand = [
      Card.createJoker(JokerType.Small, 0),
      Card.createCard(Suit.Clubs, Rank.Three, 0),
      Card.createCard(Suit.Spades, Rank.Four, 0),
      Card.createCard(Suit.Hearts, Rank.Seven, 0) // Trump suit, but lower than jokers
    ];

    console.log('\n=== Single Card Conservation Test ===');
    console.log('Bot1 winning with Big Joker single, Bot2 should not waste Small Joker');

    const aiMove = getAIMove(gameState, PlayerId.Bot2);

    console.log('AI selected:', aiMove.map(c => c.joker ? `${c.joker}Joker` : `${c.rank}${c.suit}`));

    // Should not use Small Joker against unbeatable Big Joker
    const usedSmallJoker = aiMove.some(c => c.joker === JokerType.Small);
    expect(usedSmallJoker).toBe(false);
    expect(aiMove).toHaveLength(1);

    console.log('✅ AI conserves Single Small Joker against Big Joker');
  });

  it('should recognize trump hierarchy: Big Joker > Small Joker > Trump Rank > Trump Suit', () => {
    // Test AI understanding of complete trump hierarchy for conservation decisions
    
    const leadingSingle = [Card.createCard(Suit.Diamonds, Rank.Six, 0)];

    // Test different trump hierarchy scenarios
    const scenarios = [
      {
        name: 'Big Joker vs Small Joker',
        opponentCard: Card.createJoker(JokerType.Big, 0),
        bot2Trump: Card.createJoker(JokerType.Small, 0),
        shouldConserve: true
      },
      {
        name: 'Small Joker vs Trump Rank',
        opponentCard: Card.createJoker(JokerType.Small, 0),
        bot2Trump: Card.createCard(Suit.Spades, Rank.Two, 0), // Trump rank in non-trump suit
        shouldConserve: true
      },
      {
        name: 'Trump Rank vs Trump Suit',
        opponentCard: Card.createCard(Suit.Clubs, Rank.Two, 0), // Trump rank
        bot2Trump: Card.createCard(Suit.Hearts, Rank.Ace, 0), // Trump suit
        shouldConserve: true
      }
    ];

    scenarios.forEach((scenario, index) => {
      console.log(`\n=== Hierarchy Test ${index + 1}: ${scenario.name} ===`);
      
      const testGameState = { ...gameState };
      testGameState.currentTrick = {
        plays: [
          { playerId: PlayerId.Human, cards: leadingSingle },
          { playerId: PlayerId.Bot1, cards: [scenario.opponentCard] }
        ],
        winningPlayerId: PlayerId.Bot1,
        points: 0
      };

      testGameState.currentPlayerIndex = 2;
      testGameState.players[2].hand = [
        scenario.bot2Trump,
        Card.createCard(Suit.Clubs, Rank.Seven, 0), // Alternative (no Diamonds)
        Card.createCard(Suit.Spades, Rank.Three, 0)
      ];

      const aiMove = getAIMove(testGameState, PlayerId.Bot2);
      const usedTrump = aiMove.some(c => 
        (c.joker && c.joker === scenario.bot2Trump.joker) ||
        (c.rank === scenario.bot2Trump.rank && c.suit === scenario.bot2Trump.suit)
      );

      console.log(`Opponent: ${scenario.opponentCard.joker || `${scenario.opponentCard.rank}${scenario.opponentCard.suit}`}`);
      console.log(`Bot2 trump: ${scenario.bot2Trump.joker || `${scenario.bot2Trump.rank}${scenario.bot2Trump.suit}`}`);
      console.log(`AI selected: ${aiMove.map(c => c.joker || `${c.rank}${c.suit}`).join('')}`);
      console.log(`Should conserve: ${scenario.shouldConserve}, Actually conserved: ${!usedTrump}`);

      if (scenario.shouldConserve) {
        expect(usedTrump).toBe(false); // Should conserve weaker trump
      }
    });

    console.log('✅ AI understands trump hierarchy for conservation decisions');
  });
});