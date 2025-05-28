import { GameState, Card, PlayerId, Suit, Rank, TrumpInfo, PlayerName, TeamId } from '../../src/types';
import { getAIMove } from '../../src/ai/aiLogic';
import { getValidCombinations, isValidPlay, isTrump } from '../../src/game/gameLogic';
import { createCard, createGameState, createTrumpInfo } from '../helpers';

describe('AI Rule Violation Bug - Issue #95', () => {
  test('AI should not play random singles when it cannot form a pair from leading suit', () => {
    // Create a game state where AI must follow a pair but cannot form one from leading suit
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Two,
      declared: true,
      trumpSuit: Suit.Spades
    };

    // Create leading combo: pair of Hearts (non-trump)
    const leadingCombo = [
      createCard(Suit.Hearts, Rank.Five, 'h5_1'),
      createCard(Suit.Hearts, Rank.Five, 'h5_2')
    ];

    // Create AI hand that has some Hearts but cannot form a pair
    const aiHand = [
      createCard(Suit.Hearts, Rank.Three, 'h3_1'),    // One Heart (must play)
      createCard(Suit.Clubs, Rank.Four, 'c4_1'),      // Non-trump, non-Hearts
      createCard(Suit.Clubs, Rank.Six, 'c6_1'),       // Non-trump, non-Hearts  
      createCard(Suit.Diamonds, Rank.Seven, 'd7_1'),  // Non-trump, non-Hearts
      createCard(Suit.Diamonds, Rank.Eight, 'd8_1')   // Non-trump, non-Hearts
    ];

    const gameState: GameState = createGameState({
      trumpInfo,
      currentTrick: {
        leadingCombo,
        leadingPlayerId: PlayerId.Human,
        plays: [],
        winningPlayerId: PlayerId.Human,
        points: 10
      },
      players: [
        { id: PlayerId.Bot1, name: PlayerName.Bot1, team: TeamId.B, hand: aiHand, isHuman: false }
      ]
    });

    // Get AI move
    const aiMove = getAIMove(gameState, PlayerId.Bot1);

    // Verify the move follows game rules
    expect(aiMove).toHaveLength(2); // Must play 2 cards to match leading combo

    // The AI must play the Hearts card (H3) as it's the only Hearts card available
    const heartsCard = aiMove.find(card => card.suit === Suit.Hearts);
    expect(heartsCard).toBeDefined();
    expect(heartsCard?.rank).toBe(Rank.Three);

    // Verify the move is actually valid according to game rules
    const isValid = isValidPlay(aiMove, leadingCombo, aiHand, trumpInfo);
    expect(isValid).toBe(true);

    // Get all valid combinations and ensure the AI picked one of them
    const validCombos = getValidCombinations(aiHand, gameState);
    expect(validCombos.length).toBeGreaterThan(0);
    
    // Verify AI picked a valid combination
    const aiMoveIsValid = validCombos.some(combo => 
      combo.cards.length === aiMove.length &&
      combo.cards.every(card => 
        aiMove.some(playedCard => playedCard.id === card.id)
      )
    );
    expect(aiMoveIsValid).toBe(true);
  });

  test('AI should not violate suit following when no cards of leading suit', () => {
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Two,
      declared: true,
      trumpSuit: Suit.Spades
    };

    // Leading combo: pair of Hearts
    const leadingCombo = [
      createCard(Suit.Hearts, Rank.Five, 'h5_1'),
      createCard(Suit.Hearts, Rank.Five, 'h5_2')
    ];

    // AI has no Hearts at all - can play any cards
    const aiHand = [
      createCard(Suit.Clubs, Rank.Four, 'c4_1'),
      createCard(Suit.Clubs, Rank.Four, 'c4_2'),      // Valid pair option
      createCard(Suit.Diamonds, Rank.Seven, 'd7_1'),
      createCard(Suit.Diamonds, Rank.Eight, 'd8_1')
    ];

    const gameState: GameState = createGameState({
      trumpInfo,
      currentTrick: {
        leadingCombo,
        leadingPlayerId: PlayerId.Human,
        plays: [],
        winningPlayerId: PlayerId.Human,
        points: 10
      },
      players: [
        { id: PlayerId.Bot1, name: PlayerName.Bot1, team: TeamId.B, hand: aiHand, isHuman: false }
      ]
    });

    const aiMove = getAIMove(gameState, PlayerId.Bot1);
    
    // Verify move follows rules
    expect(aiMove).toHaveLength(2);
    const isValid = isValidPlay(aiMove, leadingCombo, aiHand, trumpInfo);
    expect(isValid).toBe(true);
  });

  test('AI should play all cards of leading suit when insufficient for combo', () => {
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Two, 
      declared: true,
      trumpSuit: Suit.Spades
    };

    // Leading combo: pair of Hearts
    const leadingCombo = [
      createCard(Suit.Hearts, Rank.Five, 'h5_1'),
      createCard(Suit.Hearts, Rank.Five, 'h5_2')
    ];

    // AI has exactly one Hearts card - must play it plus one other
    const aiHand = [
      createCard(Suit.Hearts, Rank.Three, 'h3_1'),    // Must play this
      createCard(Suit.Clubs, Rank.Four, 'c4_1'),      // Can play this as second card
      createCard(Suit.Diamonds, Rank.Seven, 'd7_1')
    ];

    const gameState: GameState = createGameState({
      trumpInfo,
      currentTrick: {
        leadingCombo,
        leadingPlayerId: PlayerId.Human,
        plays: [],
        winningPlayerId: PlayerId.Human,  
        points: 10
      },
      players: [
        { id: PlayerId.Bot1, name: PlayerName.Bot1, team: TeamId.B, hand: aiHand, isHuman: false }
      ]
    });

    const aiMove = getAIMove(gameState, PlayerId.Bot1);
    
    // Must play exactly 2 cards
    expect(aiMove).toHaveLength(2);
    
    // Must include the Hearts card
    const includesHeartsCard = aiMove.some(card => 
      card.suit === Suit.Hearts && card.rank === Rank.Three
    );
    expect(includesHeartsCard).toBe(true);
    
    // Verify it's a valid play
    const isValid = isValidPlay(aiMove, leadingCombo, aiHand, trumpInfo);
    expect(isValid).toBe(true);
  });

  test('AI should never generate invalid combinations through emergency fallback', () => {
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Two,
      declared: true,
      trumpSuit: Suit.Spades
    };

    // Leading combo: tractor in Hearts (requires complex following)
    const leadingCombo = [
      createCard(Suit.Hearts, Rank.Five, 'h5_1'),
      createCard(Suit.Hearts, Rank.Five, 'h5_2'),
      createCard(Suit.Hearts, Rank.Six, 'h6_1'),
      createCard(Suit.Hearts, Rank.Six, 'h6_2')
    ];

    // AI has partial Hearts but cannot form tractor - should play all Hearts + other cards
    const aiHand = [
      createCard(Suit.Hearts, Rank.Three, 'h3_1'),    // Must play
      createCard(Suit.Hearts, Rank.Seven, 'h7_1'),    // Must play  
      createCard(Suit.Clubs, Rank.Four, 'c4_1'),      // Can play as 3rd card
      createCard(Suit.Diamonds, Rank.Eight, 'd8_1'),  // Can play as 4th card
      createCard(Suit.Diamonds, Rank.Nine, 'd9_1')    // Extra card
    ];

    const gameState: GameState = createGameState({
      trumpInfo,
      currentTrick: {
        leadingCombo,
        leadingPlayerId: PlayerId.Human,
        plays: [],
        winningPlayerId: PlayerId.Human,
        points: 20
      },
      players: [
        { id: PlayerId.Bot1, name: PlayerName.Bot1, team: TeamId.B, hand: aiHand, isHuman: false }
      ]
    });

    // This should not throw an error and should return valid moves
    expect(() => {
      const aiMove = getAIMove(gameState, PlayerId.Bot1);
      
      // Verify move is correct length
      expect(aiMove).toHaveLength(4);
      
      // Verify move is actually valid
      const isValid = isValidPlay(aiMove, leadingCombo, aiHand, trumpInfo);
      expect(isValid).toBe(true);
      
      // Verify it includes both Hearts cards (rule requirement)
      const heartsCardsPlayed = aiMove.filter(card => 
        card.suit === Suit.Hearts && !isTrump(card, trumpInfo)
      );
      expect(heartsCardsPlayed).toHaveLength(2);
      
    }).not.toThrow();
  });

  test('AI should handle complex scenarios without falling back to invalid moves', () => {
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Ace,
      declared: true,
      trumpSuit: Suit.Hearts
    };

    // Leading combo: trump pair
    const leadingCombo = [
      createCard(Suit.Hearts, Rank.King, 'hk_1'),
      createCard(Suit.Hearts, Rank.King, 'hk_2')
    ];

    // AI has some trump but cannot form pair - complex scenario
    const aiHand = [
      createCard(Suit.Hearts, Rank.Three, 'h3_1'),    // Trump card (must play)
      createCard(Suit.Clubs, Rank.Ace, 'ca_1'),       // Trump rank in non-trump suit
      createCard(Suit.Diamonds, Rank.Four, 'd4_1'),   // Non-trump
      createCard(Suit.Diamonds, Rank.Five, 'd5_1')    // Non-trump
    ];

    const gameState: GameState = createGameState({
      trumpInfo,
      currentTrick: {
        leadingCombo,
        leadingPlayerId: PlayerId.Human,
        plays: [],
        winningPlayerId: PlayerId.Human,
        points: 20
      },
      players: [
        { id: PlayerId.Bot1, name: PlayerName.Bot1, team: TeamId.B, hand: aiHand, isHuman: false }
      ]
    });

    expect(() => {
      const aiMove = getAIMove(gameState, PlayerId.Bot1);
      expect(aiMove).toHaveLength(2);
      
      // Must be valid according to game rules
      const isValid = isValidPlay(aiMove, leadingCombo, aiHand, trumpInfo);
      expect(isValid).toBe(true);
      
    }).not.toThrow();
  });
});