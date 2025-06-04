import { identifyCombos } from '../../src/game/gameLogic';
import { Suit, Rank, TrumpInfo, ComboType } from '../../src/types';
import { createCard } from '../helpers/cards';

/**
 * Test tractor formation with trump cards to understand current validation behavior
 */
describe('Trump Tractor Formation Validation', () => {
  test('Should form tractor with trump cards when 3(C) is trump', () => {
    // Trump is rank 3 (no trump suit declared)
    const trumpInfo: TrumpInfo = { 
      trumpRank: Rank.Three, 
       
      // No trumpSuit - so only rank 3 cards are trump
    };
    
    // Test cards: 3♣-3♣-4♣-4♣ where 3 is trump rank
    const clubs3_1 = createCard(Suit.Clubs, Rank.Three);  // Trump card
    const clubs3_2 = createCard(Suit.Clubs, Rank.Three);  // Trump card  
    const clubs4_1 = createCard(Suit.Clubs, Rank.Four);   // Regular clubs
    const clubs4_2 = createCard(Suit.Clubs, Rank.Four);   // Regular clubs
    
    const testCards = [clubs3_1, clubs3_2, clubs4_1, clubs4_2];
    
    console.log('\n=== TRUMP TRACTOR FORMATION TEST ===');
    console.log('Trump info:', trumpInfo);
    console.log('Test cards:', testCards.map(c => `${c.suit}-${c.rank}`));
    
    // Identify all possible combos from these cards
    const combos = identifyCombos(testCards, trumpInfo);
    
    console.log('\nIdentified combos:');
    combos.forEach((combo, i) => {
      if (combo.cards.length > 1) { // Only show pairs/tractors
        console.log(`  ${i}: ${combo.type} (${combo.cards.length} cards) - ${combo.cards.map(c => `${c.suit}-${c.rank}`).join(', ')} (value: ${combo.value})`);
      }
    });
    
    // Look for tractor combos specifically
    const tractorCombos = combos.filter(combo => combo.type === ComboType.Tractor);
    const fourCardTractors = tractorCombos.filter(combo => combo.cards.length === 4);
    
    console.log('\nFour-card tractors found:', fourCardTractors.length);
    fourCardTractors.forEach((tractor, i) => {
      console.log(`  Tractor ${i}: ${tractor.cards.map(c => `${c.suit}-${c.rank}`).join(', ')}`);
    });
    
    // Key question: Does 3♣-3♣-4♣-4♣ form a valid tractor?
    // Since 3 is trump rank, the 3♣ cards are trump
    // The 4♣ cards are regular clubs
    // This means we have: trump-trump-clubs-clubs
    // Can trump cards and non-trump cards of the same suit form a tractor?
    
    const expectedTractorExists = fourCardTractors.some(tractor => {
      const cardIds = tractor.cards.map(c => c.id).sort();
      const testCardIds = testCards.map(c => c.id).sort();
      return JSON.stringify(cardIds) === JSON.stringify(testCardIds);
    });
    
    console.log('\nExpected tractor (3♣-3♣-4♣-4♣) exists:', expectedTractorExists);
    
    if (expectedTractorExists) {
      console.log('✅ CURRENT BEHAVIOR: Mixed trump/non-trump cards CAN form tractors');
    } else {
      console.log('❌ CURRENT BEHAVIOR: Mixed trump/non-trump cards CANNOT form tractors');
      
      // Let's see what pairs we do get
      const pairCombos = combos.filter(combo => combo.type === ComboType.Pair);
      console.log('\nPairs found instead:');
      pairCombos.forEach((pair, i) => {
        console.log(`  Pair ${i}: ${pair.cards.map(c => `${c.suit}-${c.rank}`).join(', ')}`);
      });
    }
    
    // This test documents current behavior rather than asserting expected behavior
    // We'll use this to understand how the system currently works
    expect(combos.length).toBeGreaterThan(0); // At least some combos should be found
  });
  
  test('Should form tractor with trump suit cards when Hearts is trump suit', () => {
    // Trump is Hearts suit with rank 2
    const trumpInfo: TrumpInfo = { 
      trumpRank: Rank.Two, 
      
      trumpSuit: Suit.Hearts 
    };
    
    // Test cards: 3♥-3♥-4♥-4♥ where Hearts is trump suit
    const hearts3_1 = createCard(Suit.Hearts, Rank.Three);  // Trump suit
    const hearts3_2 = createCard(Suit.Hearts, Rank.Three);  // Trump suit
    const hearts4_1 = createCard(Suit.Hearts, Rank.Four);   // Trump suit
    const hearts4_2 = createCard(Suit.Hearts, Rank.Four);   // Trump suit
    
    const testCards = [hearts3_1, hearts3_2, hearts4_1, hearts4_2];
    
    console.log('\n=== TRUMP SUIT TRACTOR FORMATION TEST ===');
    console.log('Trump info:', trumpInfo);
    console.log('Test cards:', testCards.map(c => `${c.suit}-${c.rank}`));
    
    const combos = identifyCombos(testCards, trumpInfo);
    
    // Look for tractor combos
    const tractorCombos = combos.filter(combo => combo.type === ComboType.Tractor);
    const fourCardTractors = tractorCombos.filter(combo => combo.cards.length === 4);
    
    console.log('\nFour-card tractors found:', fourCardTractors.length);
    fourCardTractors.forEach((tractor, i) => {
      console.log(`  Tractor ${i}: ${tractor.cards.map(c => `${c.suit}-${c.rank}`).join(', ')}`);
    });
    
    const heartsTractorExists = fourCardTractors.some(tractor => {
      const cardIds = tractor.cards.map(c => c.id).sort();
      const testCardIds = testCards.map(c => c.id).sort();
      return JSON.stringify(cardIds) === JSON.stringify(testCardIds);
    });
    
    console.log('\nExpected Hearts tractor (3♥-3♥-4♥-4♥) exists:', heartsTractorExists);
    
    if (heartsTractorExists) {
      console.log('✅ CURRENT BEHAVIOR: Trump suit cards CAN form tractors');
    } else {
      console.log('❌ CURRENT BEHAVIOR: Trump suit cards CANNOT form tractors');
    }
    
    expect(combos.length).toBeGreaterThan(0);
  });
  
  test('Should form tractor with non-trump cards', () => {
    // Trump is rank 2 with no trump suit
    const trumpInfo: TrumpInfo = { 
      trumpRank: Rank.Two, 
       
    };
    
    // Test cards: 5♠-5♠-6♠-6♠ (all non-trump)
    const spades5_1 = createCard(Suit.Spades, Rank.Five);   // Non-trump
    const spades5_2 = createCard(Suit.Spades, Rank.Five);   // Non-trump
    const spades6_1 = createCard(Suit.Spades, Rank.Six);    // Non-trump
    const spades6_2 = createCard(Suit.Spades, Rank.Six);    // Non-trump
    
    const testCards = [spades5_1, spades5_2, spades6_1, spades6_2];
    
    console.log('\n=== NON-TRUMP TRACTOR FORMATION TEST ===');
    console.log('Trump info:', trumpInfo);
    console.log('Test cards:', testCards.map(c => `${c.suit}-${c.rank}`));
    
    const combos = identifyCombos(testCards, trumpInfo);
    
    const tractorCombos = combos.filter(combo => combo.type === ComboType.Tractor);
    const fourCardTractors = tractorCombos.filter(combo => combo.cards.length === 4);
    
    console.log('\nFour-card tractors found:', fourCardTractors.length);
    
    const spadesTractorExists = fourCardTractors.some(tractor => {
      const cardIds = tractor.cards.map(c => c.id).sort();
      const testCardIds = testCards.map(c => c.id).sort();
      return JSON.stringify(cardIds) === JSON.stringify(testCardIds);
    });
    
    console.log('Non-trump tractor (5♠-5♠-6♠-6♠) exists:', spadesTractorExists);
    
    // This should definitely work - non-trump cards of same suit forming tractor
    expect(spadesTractorExists).toBe(true);
  });
});