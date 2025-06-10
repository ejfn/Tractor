import { getAIMove } from '../../src/ai/aiLogic';
import { isValidPlay } from '../../src/game/playValidation';
import { initializeGame } from '../../src/utils/gameInitialization';
import { Card, Suit, Rank, ComboType, TrumpInfo, PlayerId, JokerType, GamePhase } from '../../src/types';

describe('AI Trump Following Behavior', () => {
  it('should show AI correctly choosing trump singles when trump pairs are led', () => {
    const gameState = initializeGame();
    
    // Set up trump info: Spades trump, rank 2
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Spades,
      
      
    };
    gameState.trumpInfo = trumpInfo;
    
    // Leading trump pair (6♠-6♠)
    const leadingTrumpPair: Card[] = Card.createPair(Suit.Spades, Rank.Six);
    
    // Set up leading combo
    gameState.currentTrick = {
      plays: [
        { playerId: PlayerId.Human, cards: leadingTrumpPair }
      ],
      winningPlayerId: PlayerId.Human,
      points: 0
    };
    
    // Bot 1 hand: trump singles + attractive non-trump pair
    const bot1Index = 1;
    gameState.currentPlayerIndex = bot1Index;
    
    const bot1Hand: Card[] = [
      // Trump singles (Spades) - cannot form pairs
      Card.createCard(Suit.Spades, Rank.Three, 0),
      Card.createCard(Suit.Spades, Rank.Four, 0),
      // Attractive non-trump pair (Aces)
      ...Card.createPair(Suit.Hearts, Rank.Ace),
      // Other cards
      Card.createCard(Suit.Clubs, Rank.Seven, 0),
      Card.createCard(Suit.Diamonds, Rank.Eight, 0)
    ];
    
    gameState.players[bot1Index].hand = bot1Hand;
    
    // Get AI move
    const aiMove = getAIMove(gameState, PlayerId.Bot1);
    
    // Check what AI chose
    const aiChoseTrumpSingles = aiMove.every(card => card.suit === Suit.Spades);
    const aiChoseNonTrumpPair = aiMove.length === 2 && 
      aiMove.every(card => card.suit === Suit.Hearts && card.rank === Rank.Ace);
    
    expect(aiChoseTrumpSingles).toBe(true); // AI should choose trump singles
    expect(aiChoseNonTrumpPair).toBe(false); // AI should NOT choose non-trump pair
  });

  it('should handle trump pairs when AI has sufficient trump cards', () => {
    const gameState = initializeGame();
    
    // Set up trump info: Hearts trump, rank 2
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Hearts,
      
      
    };
    gameState.trumpInfo = trumpInfo;
    
    // Leading trump pair (3♥-3♥)
    const leadingTrumpPair: Card[] = Card.createPair(Suit.Hearts, Rank.Three);
    
    // Set up leading combo
    gameState.currentTrick = {
      plays: [
        { playerId: PlayerId.Human, cards: leadingTrumpPair }
      ],
      winningPlayerId: PlayerId.Human,
      points: 0
    };
    
    // Create AI player hand with both trump cards and non-trump pairs
    const aiPlayerIndex = 1; // Bot 1
    const aiPlayerId = PlayerId.Bot1;
    gameState.currentPlayerIndex = aiPlayerIndex;
    
    const aiHand: Card[] = [
      // Trump cards (Hearts) - has trump pairs available
      ...Card.createPair(Suit.Hearts, Rank.Four),
      Card.createCard(Suit.Hearts, Rank.Five, 0),
      // Non-trump pair (Spades) 
      ...Card.createPair(Suit.Spades, Rank.Six),
      // Other cards
      Card.createCard(Suit.Clubs, Rank.Seven, 0)
    ];
    
    gameState.players[aiPlayerIndex].hand = aiHand;
    
    // Test that the non-trump pair would be invalid
    const nonTrumpPair = aiHand.slice(3, 5); // 6♠-6♠
    const isNonTrumpPairValid = isValidPlay(
      nonTrumpPair,
      leadingTrumpPair,
      aiHand,
      trumpInfo
    );
    
    expect(isNonTrumpPairValid).toBe(false); // Should be invalid
    
    // Test that the trump pair would be valid  
    const trumpPair = aiHand.slice(0, 2); // 4♥-4♥
    const isTrumpPairValid = isValidPlay(
      trumpPair,
      leadingTrumpPair, 
      aiHand,
      trumpInfo
    );
    
    expect(isTrumpPairValid).toBe(true); // Should be valid
    
    // Get AI move
    const aiMove = getAIMove(gameState, aiPlayerId);
    
    // AI should select trump cards, not non-trump pair
    const aiMovedTrumpCards = aiMove.every(card => card.suit === Suit.Hearts);
    expect(aiMovedTrumpCards).toBe(true);
    
    // AI move should be valid
    const isAIMoveValid = isValidPlay(
      aiMove,
      leadingTrumpPair,
      aiHand,
      trumpInfo
    );
    
    expect(isAIMoveValid).toBe(true);
    
    // AI should NOT play the non-trump pair
    const playedNonTrumpPair = aiMove.length === 2 && 
      aiMove.every(card => card.suit === Suit.Spades && card.rank === Rank.Six);
    expect(playedNonTrumpPair).toBe(false);
  });

  // Issue #193: Trump Exhaustion Bug Tests
  it('should exhaust all trump cards (jokers + rank) before playing other suits when following trump pairs', () => {
    const gameState = initializeGame();
    
    // Set up trump info: Spades trump, rank 2
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.Two,
      trumpSuit: Suit.Spades,
    };
    gameState.trumpInfo = trumpInfo;
    
    // Leading trump pair (3♠-3♠)
    const leadingTrumpPair: Card[] = Card.createPair(Suit.Spades, Rank.Three);
    
    // Set up current trick with trump pair lead
    gameState.currentTrick = {
      plays: [
        { playerId: PlayerId.Human, cards: leadingTrumpPair }
      ],
      winningPlayerId: PlayerId.Human,
      points: 0
    };
    
    // Set up Bot1 to follow
    const aiPlayerIndex = 1; // Bot 1
    const aiPlayerId = PlayerId.Bot1;
    gameState.currentPlayerIndex = aiPlayerIndex;
    
    // Bot1 hand: Has trump cards (jokers + trump rank) but NO trump suit cards
    const bot1Hand: Card[] = [
      // Trump cards: jokers (always trump)
      Card.createJoker(JokerType.Big, 0),
      Card.createJoker(JokerType.Small, 1),
      // Trump rank cards in off-suits (trump rank = 2)
      Card.createCard(Suit.Hearts, Rank.Two, 0), // 2♥ (trump rank)
      Card.createCard(Suit.Clubs, Rank.Two, 1),  // 2♣ (trump rank)
      // Non-trump cards
      Card.createCard(Suit.Hearts, Rank.Seven, 0),
      Card.createCard(Suit.Clubs, Rank.Eight, 0),
      Card.createCard(Suit.Diamonds, Rank.Nine, 0),
      Card.createCard(Suit.Hearts, Rank.Ten, 0)
    ];
    
    gameState.players[aiPlayerIndex].hand = bot1Hand;
    
    // Get AI move
    const aiMove = getAIMove(gameState, aiPlayerId);
    
    // Verify AI chose trump cards
    const aiChoseTrumpCards = aiMove.every(card => {
      // Check if played card is a trump card
      return card.joker !== undefined || 
             card.rank === trumpInfo.trumpRank || 
             card.suit === trumpInfo.trumpSuit;
    });
    
    // Verify AI did NOT choose non-trump cards
    const aiChoseNonTrumpCards = aiMove.some(card => {
      return card.joker === undefined && 
             card.rank !== trumpInfo.trumpRank && 
             card.suit !== trumpInfo.trumpSuit;
    });
    
    // The bug: AI should exhaust ALL trump cards before playing other suits
    expect(aiChoseTrumpCards).toBe(true);
    expect(aiChoseNonTrumpCards).toBe(false);
    
    // Verify the move is valid
    const isAIMoveValid = isValidPlay(
      aiMove,
      leadingTrumpPair,
      bot1Hand,
      trumpInfo
    );
    expect(isAIMoveValid).toBe(true);
  });

  it('should exhaust trump cards when following trump tractor', () => {
    const gameState = initializeGame();
    
    // Set up trump info: Hearts trump, rank King
    const trumpInfo: TrumpInfo = {
      trumpRank: Rank.King,
      trumpSuit: Suit.Hearts,
    };
    gameState.trumpInfo = trumpInfo;
    
    // Leading trump tractor (3♥3♥-4♥4♥)
    const leadingTrumpTractor: Card[] = [
      ...Card.createPair(Suit.Hearts, Rank.Three),
      ...Card.createPair(Suit.Hearts, Rank.Four)
    ];
    
    // Set up current trick with trump tractor lead
    gameState.currentTrick = {
      plays: [
        { playerId: PlayerId.Human, cards: leadingTrumpTractor }
      ],
      winningPlayerId: PlayerId.Human,
      points: 0
    };
    
    // Set up Bot2 to follow
    const aiPlayerIndex = 2; // Bot 2
    const aiPlayerId = PlayerId.Bot2;
    gameState.currentPlayerIndex = aiPlayerIndex;
    
    // Bot2 hand: Has jokers and trump rank but cannot form proper tractor
    const bot2Hand: Card[] = [
      // Trump cards available
      Card.createJoker(JokerType.Big, 0),   // Big Joker
      Card.createJoker(JokerType.Small, 1), // Small Joker
      Card.createCard(Suit.Spades, Rank.King, 0), // K♠ (trump rank)
      Card.createCard(Suit.Clubs, Rank.King, 1),  // K♣ (trump rank)
      // Non-trump cards
      Card.createCard(Suit.Spades, Rank.Five, 0),
      Card.createCard(Suit.Clubs, Rank.Six, 0),
      Card.createCard(Suit.Diamonds, Rank.Seven, 0),
      Card.createCard(Suit.Spades, Rank.Eight, 0)
    ];
    
    gameState.players[aiPlayerIndex].hand = bot2Hand;
    
    // Get AI move
    const aiMove = getAIMove(gameState, aiPlayerId);
    
    // When following a 4-card tractor, AI must play 4 cards
    expect(aiMove.length).toBe(4);
    
    // AI should prioritize trump cards over non-trump cards
    const trumpCardsPlayed = aiMove.filter(card => {
      return card.joker !== undefined || 
             card.rank === trumpInfo.trumpRank || 
             card.suit === trumpInfo.trumpSuit;
    });
    
    const nonTrumpCardsPlayed = aiMove.filter(card => {
      return card.joker === undefined && 
             card.rank !== trumpInfo.trumpRank && 
             card.suit !== trumpInfo.trumpSuit;
    });
    
    // AI should play ALL available trump cards (4) before any non-trump cards
    expect(trumpCardsPlayed.length).toBe(4);
    expect(nonTrumpCardsPlayed.length).toBe(0);
    
    // Verify the move is valid
    const isAIMoveValid = isValidPlay(
      aiMove,
      leadingTrumpTractor,
      bot2Hand,
      trumpInfo
    );
    expect(isAIMoveValid).toBe(true);
  });

  // Issue #176: AI Trump Pair Disposal Bug Tests
  it('should use all available trump pairs when following trump tractor and cannot form tractor', () => {
    const gameState = initializeGame();
    gameState.gamePhase = GamePhase.Playing;
    gameState.trumpInfo = {
      trumpSuit: Suit.Hearts,
      trumpRank: Rank.Two,
    };

    const bot1Player = gameState.players.find(p => p.id === PlayerId.Bot1)!;
    
    // Bot1 has multiple trump pairs but cannot form a tractor
    // Should use ALL trump pairs starting from weakest when following trump tractor
    bot1Player.hand = [
      // Trump suit pairs (weakest)
      Card.createCard(Suit.Hearts, Rank.Three, 0),
      Card.createCard(Suit.Hearts, Rank.Three, 0),
      Card.createCard(Suit.Hearts, Rank.Five, 0),
      Card.createCard(Suit.Hearts, Rank.Five, 0),
      
      // Trump rank pairs (medium strength)
      Card.createCard(Suit.Spades, Rank.Two, 0),
      Card.createCard(Suit.Spades, Rank.Two, 0),
      
      // Joker pairs (strongest)
      Card.createJoker(JokerType.Small, 0),
      Card.createJoker(JokerType.Small, 0),
      
      // Non-trump card
      Card.createCard(Suit.Clubs, Rank.Ace, 0),
    ];

    // Human leads with a trump tractor requiring 4 cards (2 pairs)
    const leadingTrumpTractor = [
      Card.createCard(Suit.Hearts, Rank.Nine, 0),
      Card.createCard(Suit.Hearts, Rank.Nine, 0),
      Card.createCard(Suit.Hearts, Rank.Ten, 0),
      Card.createCard(Suit.Hearts, Rank.Ten, 0),
    ];

    gameState.currentTrick = {
      plays: [
        { playerId: PlayerId.Human, cards: leadingTrumpTractor }
      ],
      winningPlayerId: PlayerId.Human,
      points: 20
    };
    gameState.currentPlayerIndex = 1; // Bot1 is at index 1

    const aiMove = getAIMove(gameState, PlayerId.Bot1);

    // Verify AI played exactly 4 cards (matching tractor length)
    expect(aiMove.length).toBe(4);

    // Verify all played cards are trump cards
    const allTrump = aiMove.every(card => 
      card.suit === Suit.Hearts || // Trump suit
      card.rank === Rank.Two ||    // Trump rank
      card.joker                   // Jokers
    );
    expect(allTrump).toBe(true);

    // Check which pairs were used
    const used3Hearts = aiMove.filter(card => 
      card.rank === Rank.Three && card.suit === Suit.Hearts
    ).length;
    const used5Hearts = aiMove.filter(card => 
      card.rank === Rank.Five && card.suit === Suit.Hearts
    ).length;

    // Count complete pairs used (each pair = 2 cards)
    const completePairsUsed = Math.floor(used3Hearts / 2) + Math.floor(used5Hearts / 2);

    // AI should use EXACTLY 2 pairs (4 cards) starting from weakest trump pairs
    expect(completePairsUsed).toBe(2); // Should use exactly 2 pairs for 4-card tractor

    // Should start from weakest trump pairs
    expect(used3Hearts).toBe(2); // Should definitely use the weakest trump suit pair

    // The second pair should be the next weakest available
    const usedSecondWeakest = used5Hearts === 2; // Should use 5♥-5♥ as second choice
    expect(usedSecondWeakest).toBe(true);
  });

  it('should use all trump pairs when following trump tractor that requires 6 cards', () => {
    const gameState = initializeGame();
    gameState.gamePhase = GamePhase.Playing;
    gameState.trumpInfo = {
      trumpSuit: Suit.Spades,
      trumpRank: Rank.Ace,
    };

    const bot2Player = gameState.players.find(p => p.id === PlayerId.Bot2)!;
    
    // Bot2 has exactly 3 trump pairs (6 cards) but they're not consecutive (no tractor)
    bot2Player.hand = [
      // Trump suit pairs
      Card.createCard(Suit.Spades, Rank.Three, 0),
      Card.createCard(Suit.Spades, Rank.Three, 0),
      Card.createCard(Suit.Spades, Rank.Seven, 0),
      Card.createCard(Suit.Spades, Rank.Seven, 0),
      
      // Trump rank pair
      Card.createCard(Suit.Hearts, Rank.Ace, 0),
      Card.createCard(Suit.Hearts, Rank.Ace, 0),
      
      // Non-trump filler
      Card.createCard(Suit.Clubs, Rank.King, 0),
    ];

    // Human leads with 3-pair trump tractor (6 cards)
    const leadingTrumpTractor = [
      Card.createCard(Suit.Spades, Rank.Nine, 0),
      Card.createCard(Suit.Spades, Rank.Nine, 0),
      Card.createCard(Suit.Spades, Rank.Ten, 0),
      Card.createCard(Suit.Spades, Rank.Ten, 0),
      Card.createCard(Suit.Spades, Rank.Jack, 0),
      Card.createCard(Suit.Spades, Rank.Jack, 0),
    ];

    gameState.currentTrick = {
      plays: [
        { playerId: PlayerId.Human, cards: leadingTrumpTractor }
      ],
      winningPlayerId: PlayerId.Human,
      points: 20
    };
    gameState.currentPlayerIndex = 2; // Bot2 is at index 2

    const aiMove = getAIMove(gameState, PlayerId.Bot2);

    // Verify AI played exactly 6 cards
    expect(aiMove.length).toBe(6);

    // Verify all played cards are trump cards
    const allTrump = aiMove.every(card => 
      card.suit === Suit.Spades || // Trump suit
      card.rank === Rank.Ace       // Trump rank
    );
    expect(allTrump).toBe(true);

    // Check if all 3 trump pairs were used
    const used3Spades = aiMove.filter(card => 
      card.rank === Rank.Three && card.suit === Suit.Spades
    ).length;
    const used7Spades = aiMove.filter(card => 
      card.rank === Rank.Seven && card.suit === Suit.Spades
    ).length;
    const usedAceHearts = aiMove.filter(card => 
      card.rank === Rank.Ace && card.suit === Suit.Hearts
    ).length;

    // Should use ALL available trump pairs
    expect(used3Spades).toBe(2);
    expect(used7Spades).toBe(2);
    expect(usedAceHearts).toBe(2);
  });

  it('should prioritize trump pairs in conservation order when mixed types available', () => {
    const gameState = initializeGame();
    gameState.gamePhase = GamePhase.Playing;
    gameState.trumpInfo = {
      trumpSuit: Suit.Diamonds,
      trumpRank: Rank.Two,
    };

    const bot3Player = gameState.players.find(p => p.id === PlayerId.Bot3)!;
    
    // Bot3 has multiple trump pair types with clear conservation hierarchy
    bot3Player.hand = [
      // Weakest: Low trump suit pairs
      Card.createCard(Suit.Diamonds, Rank.Three, 0),
      Card.createCard(Suit.Diamonds, Rank.Three, 0),
      Card.createCard(Suit.Diamonds, Rank.Four, 0),
      Card.createCard(Suit.Diamonds, Rank.Four, 0),
      
      // Medium: Trump rank pairs in off-suits  
      Card.createCard(Suit.Hearts, Rank.Two, 0),
      Card.createCard(Suit.Hearts, Rank.Two, 0),
      
      // Strongest: Joker pairs
      Card.createJoker(JokerType.Big, 0),
      Card.createJoker(JokerType.Big, 0),
    ];

    // Human leads with 2-pair trump tractor
    const leadingTrumpTractor = [
      Card.createCard(Suit.Diamonds, Rank.King, 0),
      Card.createCard(Suit.Diamonds, Rank.King, 0),
      Card.createCard(Suit.Diamonds, Rank.Ace, 0),
      Card.createCard(Suit.Diamonds, Rank.Ace, 0),
    ];

    gameState.currentTrick = {
      plays: [
        { playerId: PlayerId.Human, cards: leadingTrumpTractor }
      ],
      winningPlayerId: PlayerId.Human,
      points: 20
    };
    gameState.currentPlayerIndex = 3; // Bot3 is at index 3

    const aiMove = getAIMove(gameState, PlayerId.Bot3);

    // Verify AI played exactly 4 cards
    expect(aiMove.length).toBe(4);

    // Check conservation priority order
    const used3Diamonds = aiMove.filter(card => 
      card.rank === Rank.Three && card.suit === Suit.Diamonds
    ).length;
    const used4Diamonds = aiMove.filter(card => 
      card.rank === Rank.Four && card.suit === Suit.Diamonds
    ).length;
    const used2Hearts = aiMove.filter(card => 
      card.rank === Rank.Two && card.suit === Suit.Hearts
    ).length;
    const usedBigJokers = aiMove.filter(card => 
      card.joker === JokerType.Big
    ).length;

    // Should prioritize weakest pairs first
    // Expected: Use 3♦-3♦ and 4♦-4♦ (two weakest trump suit pairs)
    expect(used3Diamonds).toBe(2); // Must use weakest
    expect(used4Diamonds).toBe(2); // Must use second weakest
    expect(used2Hearts).toBe(0);   // Should NOT use trump rank pairs when trump suit available
    expect(usedBigJokers).toBe(0); // Should NOT use strongest pairs
  });

  it('should use all trump pairs before any trump singles when insufficient pairs available', () => {
    const gameState = initializeGame();
    gameState.gamePhase = GamePhase.Playing;
    gameState.trumpInfo = {
      trumpSuit: Suit.Spades,
      trumpRank: Rank.King,
    };

    const bot2Player = gameState.players.find(p => p.id === PlayerId.Bot2)!;
    
    // Bot2 has trump pairs but also some singles
    // This tests if AI correctly uses ALL pairs before ANY singles
    bot2Player.hand = [
      // Trump suit pairs (should be used first)
      Card.createCard(Suit.Spades, Rank.Three, 0),
      Card.createCard(Suit.Spades, Rank.Three, 0),
      Card.createCard(Suit.Spades, Rank.Four, 0),
      Card.createCard(Suit.Spades, Rank.Four, 0),
      
      // Trump suit singles (should be used to fill remaining slots)
      Card.createCard(Suit.Spades, Rank.Five, 0),
      Card.createCard(Suit.Spades, Rank.Six, 0),
      Card.createCard(Suit.Spades, Rank.Seven, 0),
      
      // Trump rank pairs (should be avoided if trump suit available)
      Card.createCard(Suit.Hearts, Rank.King, 0),
      Card.createCard(Suit.Hearts, Rank.King, 0),
      
      // Non-trump
      Card.createCard(Suit.Clubs, Rank.Ace, 0),
    ];

    // Human leads with 8-card trump tractor (4 pairs) - Bot2 needs 8 cards but only has 2 pairs
    const leadingTrumpTractor = [
      Card.createCard(Suit.Spades, Rank.Eight, 0),
      Card.createCard(Suit.Spades, Rank.Eight, 0),
      Card.createCard(Suit.Spades, Rank.Nine, 0),
      Card.createCard(Suit.Spades, Rank.Nine, 0),
      Card.createCard(Suit.Spades, Rank.Ten, 0),
      Card.createCard(Suit.Spades, Rank.Ten, 0),
      Card.createCard(Suit.Spades, Rank.Jack, 0),
      Card.createCard(Suit.Spades, Rank.Jack, 0),
    ];

    gameState.currentTrick = {
      plays: [
        { playerId: PlayerId.Human, cards: leadingTrumpTractor }
      ],
      winningPlayerId: PlayerId.Human,
      points: 20
    };
    gameState.currentPlayerIndex = 2; // Bot2 is at index 2

    const aiMove = getAIMove(gameState, PlayerId.Bot2);

    // Verify AI played exactly 8 cards
    expect(aiMove.length).toBe(8);

    // Verify all played cards are trump cards
    const allTrump = aiMove.every(card => 
      card.suit === Suit.Spades || // Trump suit
      card.rank === Rank.King      // Trump rank
    );
    expect(allTrump).toBe(true);

    // Count usage of trump suit cards
    const used3Spades = aiMove.filter(card => 
      card.rank === Rank.Three && card.suit === Suit.Spades
    ).length;
    const used4Spades = aiMove.filter(card => 
      card.rank === Rank.Four && card.suit === Suit.Spades
    ).length;
    const used5Spades = aiMove.filter(card => 
      card.rank === Rank.Five && card.suit === Suit.Spades
    ).length;
    const used6Spades = aiMove.filter(card => 
      card.rank === Rank.Six && card.suit === Suit.Spades
    ).length;
    const used7Spades = aiMove.filter(card => 
      card.rank === Rank.Seven && card.suit === Suit.Spades
    ).length;
    const usedKingHearts = aiMove.filter(card => 
      card.rank === Rank.King && card.suit === Suit.Hearts
    ).length;

    // Must use ALL trump pairs before ANY trump singles
    expect(used3Spades).toBe(2); // Must use complete trump suit pair
    expect(used4Spades).toBe(2); // Must use complete trump suit pair  
    expect(usedKingHearts).toBe(2); // Must use complete trump rank pair
    
    // Should use 2 trump singles to complete 8 cards (3 pairs + 2 singles = 8)
    const totalSinglesUsed = used5Spades + used6Spades + used7Spades;
    expect(totalSinglesUsed).toBe(2); // Need 2 more cards after 3 pairs (6 cards)

    // Verify no singles from pairs were broken
    expect(used3Spades % 2).toBe(0); // Should not break 3♠ pair
    expect(used4Spades % 2).toBe(0); // Should not break 4♠ pair
    expect(usedKingHearts % 2).toBe(0); // Should not break K♥ pair
  });
});