import { selectMultiComboFollowingPlay } from "./src/ai/following/multiComboFollowingStrategy";
import { Card, GameState, JokerType, PlayerId, Rank, Suit, TrumpInfo } from "./src/types";
import { initializeGame } from "./src/utils/gameInitialization";

// Reproduce the exact scenario from the logs
function debugDuplicateCards() {
  const trumpInfo: TrumpInfo = { trumpRank: Rank.Two, trumpSuit: Suit.Hearts };
  const gameState = initializeGame();
  gameState.trumpInfo = trumpInfo;

  // Leading multi-combo: A♦ + 7♦7♦ + 6♦6♦ (single + pair + pair, 5 cards)
  gameState.currentTrick = {
    plays: [
      {
        playerId: PlayerId.Human,
        cards: [
          Card.createCard(Suit.Diamonds, Rank.Ace, 0),
          Card.createCard(Suit.Diamonds, Rank.Seven, 0),
          Card.createCard(Suit.Diamonds, Rank.Seven, 1),
          Card.createCard(Suit.Diamonds, Rank.Six, 0),
          Card.createCard(Suit.Diamonds, Rank.Six, 1),
        ],
      },
    ],
    winningPlayerId: PlayerId.Human,
    points: 0,
    isFinalTrick: false,
  };

  // Bot1's hand from logs (exact reproduction)
  const playerHand = [
    Card.createJoker(JokerType.Big, 0), // "BJ"
    Card.createCard(Suit.Clubs, Rank.Ten, 0),     // "10♣"
    Card.createCard(Suit.Clubs, Rank.Four, 0),    // "4♣"
    Card.createCard(Suit.Clubs, Rank.Six, 0),     // "6♣"
    Card.createCard(Suit.Clubs, Rank.Nine, 0),    // "9♣"
    Card.createCard(Suit.Clubs, Rank.Ace, 0),     // "A♣"
    Card.createCard(Suit.Diamonds, Rank.Ten, 0),  // "10♦"
    Card.createCard(Suit.Diamonds, Rank.Two, 0),  // "2♦" - first copy
    Card.createCard(Suit.Diamonds, Rank.Two, 1),  // "2♦" - second copy
    Card.createCard(Suit.Diamonds, Rank.Three, 0), // "3♦"
    Card.createCard(Suit.Diamonds, Rank.Jack, 0), // "J♦"
    Card.createCard(Suit.Diamonds, Rank.King, 0), // "K♦"
    Card.createCard(Suit.Diamonds, Rank.Queen, 0), // "Q♦"
    Card.createCard(Suit.Hearts, Rank.Two, 0),    // "2♥" - first copy
    Card.createCard(Suit.Hearts, Rank.Two, 1),    // "2♥" - second copy
    Card.createCard(Suit.Hearts, Rank.Eight, 0),  // "8♥"
    Card.createCard(Suit.Hearts, Rank.Nine, 0),   // "9♥" - first copy
    Card.createCard(Suit.Hearts, Rank.Nine, 1),   // "9♥" - second copy
    Card.createCard(Suit.Hearts, Rank.King, 0),   // "K♥"
    Card.createCard(Suit.Spades, Rank.Two, 0),    // "2♠"
    Card.createCard(Suit.Spades, Rank.Seven, 0),  // "7♠"
    Card.createCard(Suit.Spades, Rank.Ace, 0),    // "A♠"
    Card.createCard(Suit.Spades, Rank.King, 0),   // "K♠" - first copy
    Card.createCard(Suit.Spades, Rank.King, 1),   // "K♠" - second copy
    Card.createCard(Suit.Spades, Rank.Queen, 0),  // "Q♠"
  ];

  console.log("Player hand:");
  playerHand.forEach((card, i) => {
    console.log(`  ${i}: ${card.rank}${card.suit} (id: ${card.id}, commonId: ${card.commonId})`);
  });

  console.log("\nDiamonds cards in hand:");
  const diamondsCards = playerHand.filter(card => card.suit === Suit.Diamonds);
  diamondsCards.forEach((card, i) => {
    console.log(`  ${i}: ${card.rank}${card.suit} (id: ${card.id}, commonId: ${card.commonId})`);
  });

  const validCombos: never[] = []; // Will be generated internally

  try {
    const result = selectMultiComboFollowingPlay(
      playerHand,
      gameState,
      PlayerId.Bot1,
      validCombos,
    );

    console.log("\nAI Result:");
    console.log("Strategy:", result?.strategy);
    console.log("Can Beat:", result?.canBeat);
    console.log("Reasoning:", result?.reasoning);
    console.log("Selected Cards:");
    result?.cards.forEach((card, i) => {
      console.log(`  ${i}: ${card.rank}${card.suit} (id: ${card.id}, commonId: ${card.commonId})`);
    });

    // Check for duplicates
    const cardIds = result?.cards.map(c => c.id) || [];
    const uniqueIds = new Set(cardIds);
    if (cardIds.length !== uniqueIds.size) {
      console.log("\n🚨 DUPLICATE CARDS DETECTED!");
      console.log("Card IDs:", cardIds);
      console.log("Unique IDs:", Array.from(uniqueIds));
      
      // Find which IDs are duplicated
      const duplicates = cardIds.filter((id, index) => cardIds.indexOf(id) !== index);
      console.log("Duplicated IDs:", duplicates);
    }

  } catch (error) {
    console.error("Error:", error);
  }
}

debugDuplicateCards();