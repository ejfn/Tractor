import { Rank } from '../../src/types/game';
import { initializeGame, createDeck } from '../../src/utils/gameLogic';

describe('Card Dealing Bug Test', () => {
  test('Check initial card distribution', () => {
    // Create multiple games to check consistency
    for (let i = 0; i < 5; i++) {
      console.log(`\n=== Game ${i + 1} ===`);
      const gameState = initializeGame();
      
      console.log('Initial card counts:');
      gameState.players.forEach((player, idx) => {
        console.log(`  Player ${idx} (${player.name}): ${player.hand.length} cards`);
      });
      
      // Check that all players have the same number of cards
      const cardCounts = gameState.players.map(p => p.hand.length);
      const uniqueCounts = new Set(cardCounts);
      
      if (uniqueCounts.size > 1) {
        console.error('ERROR: Players have different initial card counts!');
        console.error(`Counts: ${cardCounts.join(', ')}`);
      }
      
      expect(uniqueCounts.size).toBe(1);
    }
  });
  
  test('Check the deck distribution math', () => {
    const deck = createDeck();
    console.log(`Total cards in deck: ${deck.length}`);
    
    const kittySize = 8;
    const numPlayers = 4;
    const cardsForPlayers = deck.length - kittySize;
    const cardsPerPlayer = Math.floor(cardsForPlayers / numPlayers);
    const remainder = cardsForPlayers % numPlayers;
    
    console.log(`Cards for players: ${cardsForPlayers}`);
    console.log(`Cards per player (floor): ${cardsPerPlayer}`);
    console.log(`Remainder: ${remainder}`);
    
    // Check if the dealing logic distributes cards correctly
    const playerCards = [];
    for (let i = 0; i < numPlayers; i++) {
      const startIdx = i * cardsPerPlayer;
      const endIdx = startIdx + cardsPerPlayer;
      playerCards.push(endIdx - startIdx);
    }
    
    console.log(`Cards distributed: ${playerCards.join(', ')}`);
    console.log(`Total distributed: ${playerCards.reduce((sum, n) => sum + n, 0)}`);
    
    // The last player might get fewer cards due to slicing
    const lastPlayerStartIdx = (numPlayers - 1) * cardsPerPlayer;
    const lastPlayerEndIdx = lastPlayerStartIdx + cardsPerPlayer;
    
    console.log(`Last player (Bot 3) indices: ${lastPlayerStartIdx} to ${lastPlayerEndIdx}`);
    console.log(`Deck length minus kitty: ${deck.length - kittySize}`);
    
    if (lastPlayerEndIdx > cardsForPlayers) {
      console.error(`ERROR: Last player end index (${lastPlayerEndIdx}) exceeds available cards (${cardsForPlayers})`);
    }
  });
  
  test('Simulate the exact dealing logic', () => {
    const deck = createDeck();
    const shuffledDeck = [...deck]; // Simulate shuffling
    const players = [
      { name: 'Human', hand: [] as any[] },
      { name: 'Bot 1', hand: [] as any[] },
      { name: 'Bot 2', hand: [] as any[] },
      { name: 'Bot 3', hand: [] as any[] }
    ];
    
    const cardsPerPlayer = Math.floor((shuffledDeck.length - 8) / players.length);
    
    console.log(`\nDealing ${cardsPerPlayer} cards to each player from deck of ${shuffledDeck.length}`);
    
    players.forEach((player, index) => {
      const startIdx = index * cardsPerPlayer;
      const endIdx = startIdx + cardsPerPlayer;
      player.hand = shuffledDeck.slice(startIdx, endIdx);
      console.log(`Player ${index} (${player.name}): indices ${startIdx}-${endIdx}, got ${player.hand.length} cards`);
    });
    
    const kittyStart = shuffledDeck.length - 8;
    const kitty = shuffledDeck.slice(kittyStart);
    console.log(`Kitty: indices ${kittyStart}-${shuffledDeck.length}, got ${kitty.length} cards`);
    
    // Verify all cards are accounted for
    const totalCardsDealt = players.reduce((sum, p) => sum + p.hand.length, 0) + kitty.length;
    console.log(`\nTotal cards dealt: ${totalCardsDealt} (should be ${shuffledDeck.length})`);
    
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
      console.error(`ERROR: Only ${allIndices.size} unique indices used out of ${shuffledDeck.length} cards`);
      
      // Find which cards were missed
      for (let i = 0; i < shuffledDeck.length; i++) {
        if (!allIndices.has(i)) {
          console.error(`  Card at index ${i} was not dealt to anyone!`);
        }
      }
    }
  });
});