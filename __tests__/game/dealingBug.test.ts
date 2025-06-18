import { Card } from "../../src/types";
import { createDeck, initializeGame } from "../../src/utils/gameInitialization";
import { gameLogger } from "../../src/utils/gameLogger";

describe('Card Dealing Bug Test', () => {
  test('Check initial card distribution', () => {
    // Create multiple games to check consistency
    for (let i = 0; i < 5; i++) {
      gameLogger.info('test_game_iteration', { gameNumber: i + 1 }, `\n=== Game ${i + 1} ===`);
      const gameState = initializeGame();
      
      gameLogger.info('test_initial_card_counts', {}, 'Initial card counts:');
      gameState.players.forEach((player, idx) => {
        gameLogger.info('test_player_card_count', { playerIndex: idx, playerName: player.id, cardCount: player.hand.length }, `  Player ${idx} (${player.id}): ${player.hand.length} cards`);
      });
      
      // Check that all players have the same number of cards
      const cardCounts = gameState.players.map(p => p.hand.length);
      const uniqueCounts = new Set(cardCounts);
      
      if (uniqueCounts.size > 1) {
        gameLogger.error('test_card_count_mismatch', { cardCounts }, 'ERROR: Players have different initial card counts!');
        gameLogger.error('test_card_count_details', { cardCounts }, `Counts: ${cardCounts.join(', ')}`);
      }
      
      expect(uniqueCounts.size).toBe(1);
    }
  });
  
  test('Check the deck distribution math', () => {
    const deck = createDeck();
    gameLogger.info('test_deck_size', { deckSize: deck.length }, `Total cards in deck: ${deck.length}`);
    
    const kittySize = 8;
    const numPlayers = 4;
    const cardsForPlayers = deck.length - kittySize;
    const cardsPerPlayer = Math.floor(cardsForPlayers / numPlayers);
    const remainder = cardsForPlayers % numPlayers;
    
    gameLogger.info('test_distribution_math', { cardsForPlayers, cardsPerPlayer, remainder }, `Cards for players: ${cardsForPlayers}`);
    gameLogger.info('test_cards_per_player', { cardsPerPlayer }, `Cards per player (floor): ${cardsPerPlayer}`);
    gameLogger.info('test_remainder', { remainder }, `Remainder: ${remainder}`);
    
    // Check if the dealing logic distributes cards correctly
    const playerCards = [];
    for (let i = 0; i < numPlayers; i++) {
      const startIdx = i * cardsPerPlayer;
      const endIdx = startIdx + cardsPerPlayer;
      playerCards.push(endIdx - startIdx);
    }
    
    gameLogger.info('test_cards_distributed', { playerCards }, `Cards distributed: ${playerCards.join(', ')}`);
    gameLogger.info('test_total_distributed', { totalDistributed: playerCards.reduce((sum, n) => sum + n, 0) }, `Total distributed: ${playerCards.reduce((sum, n) => sum + n, 0)}`);
    
    // The last player might get fewer cards due to slicing
    const lastPlayerStartIdx = (numPlayers - 1) * cardsPerPlayer;
    const lastPlayerEndIdx = lastPlayerStartIdx + cardsPerPlayer;
    
    gameLogger.info('test_last_player_indices', { lastPlayerStartIdx, lastPlayerEndIdx }, `Last player (Bot 3) indices: ${lastPlayerStartIdx} to ${lastPlayerEndIdx}`);
    gameLogger.info('test_deck_minus_kitty', { deckSizeMinusKitty: deck.length - kittySize }, `Deck length minus kitty: ${deck.length - kittySize}`);
    
    if (lastPlayerEndIdx > cardsForPlayers) {
      gameLogger.error('test_index_overflow', { lastPlayerEndIdx, cardsForPlayers }, `ERROR: Last player end index (${lastPlayerEndIdx}) exceeds available cards (${cardsForPlayers})`);
    }
  });
  
  test('Simulate the exact dealing logic', () => {
    const deck = createDeck();
    const shuffledDeck = [...deck]; // Simulate shuffling
    const players = [
      { name: 'Human', hand: [] as Card[] },
      { name: 'Bot 1', hand: [] as Card[] },
      { name: 'Bot 2', hand: [] as Card[] },
      { name: 'Bot 3', hand: [] as Card[] }
    ];
    
    const cardsPerPlayer = Math.floor((shuffledDeck.length - 8) / players.length);
    
    gameLogger.info('test_dealing_simulation', { cardsPerPlayer, deckSize: shuffledDeck.length }, `\nDealing ${cardsPerPlayer} cards to each player from deck of ${shuffledDeck.length}`);
    
    players.forEach((player, index) => {
      const startIdx = index * cardsPerPlayer;
      const endIdx = startIdx + cardsPerPlayer;
      player.hand = shuffledDeck.slice(startIdx, endIdx);
      gameLogger.info('test_player_dealing', { playerIndex: index, playerName: player.name, startIdx, endIdx, cardsReceived: player.hand.length }, `Player ${index} (${player.name}): indices ${startIdx}-${endIdx}, got ${player.hand.length} cards`);
    });
    
    const kittyStart = shuffledDeck.length - 8;
    const kitty = shuffledDeck.slice(kittyStart);
    gameLogger.info('test_kitty_dealing', { kittyStart, deckLength: shuffledDeck.length, kittySize: kitty.length }, `Kitty: indices ${kittyStart}-${shuffledDeck.length}, got ${kitty.length} cards`);
    
    // Verify all cards are accounted for
    const totalCardsDealt = players.reduce((sum, p) => sum + p.hand.length, 0) + kitty.length;
    gameLogger.info('test_total_cards_verification', { totalCardsDealt, expectedTotal: shuffledDeck.length }, `\nTotal cards dealt: ${totalCardsDealt} (should be ${shuffledDeck.length})`);
    
    // Check for overlapping or missing cards
    const allIndices = new Set<number>();
    players.forEach((player, playerIdx) => {
      const startIdx = playerIdx * cardsPerPlayer;
      for (let i = 0; i < player.hand.length; i++) {
        allIndices.add(startIdx + i);
      }
    });
    
    for (let i = kittyStart; i < shuffledDeck.length; i++) {
      allIndices.add(i);
    }
    
    if (allIndices.size !== shuffledDeck.length) {
      gameLogger.error('test_index_verification_failure', { uniqueIndicesUsed: allIndices.size, totalCards: shuffledDeck.length }, `ERROR: Only ${allIndices.size} unique indices used out of ${shuffledDeck.length} cards`);
      
      // Find which cards were missed
      for (let i = 0; i < shuffledDeck.length; i++) {
        if (!allIndices.has(i)) {
          gameLogger.error('test_missed_card', { cardIndex: i }, `  Card at index ${i} was not dealt to anyone!`);
        }
      }
    }
  });
});