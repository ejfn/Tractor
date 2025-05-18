import { 
  getComboType, 
  identifyCombos, 
  isTrump 
} from '../../src/utils/gameLogic';
import { 
  Card, 
  ComboType, 
  JokerType, 
  Rank, 
  Suit 
} from '../../src/types/game';

// Test data
const smallJoker1: Card = { 
  joker: JokerType.Small, 
  id: 'Small_Joker_1', 
  points: 0 
};

const smallJoker2: Card = { 
  joker: JokerType.Small, 
  id: 'Small_Joker_2', 
  points: 0 
};

const bigJoker1: Card = { 
  joker: JokerType.Big, 
  id: 'Big_Joker_1', 
  points: 0 
};

const bigJoker2: Card = { 
  joker: JokerType.Big, 
  id: 'Big_Joker_2', 
  points: 0 
};

const aceHearts1: Card = { 
  suit: Suit.Hearts, 
  rank: Rank.Ace, 
  id: 'Hearts_A_1', 
  points: 0 
};

const aceHearts2: Card = { 
  suit: Suit.Hearts, 
  rank: Rank.Ace, 
  id: 'Hearts_A_2', 
  points: 0 
};

describe('Joker Pair Tests', () => {
  const trumpInfo = {
    trumpRank: Rank.Two,
    declared: false
  };

  test('Small Joker Pair is recognized as a Pair', () => {
    const result = getComboType([smallJoker1, smallJoker2]);
    expect(result).toBe(ComboType.Pair);
  });

  test('Big Joker Pair is recognized as a Pair', () => {
    const result = getComboType([bigJoker1, bigJoker2]);
    expect(result).toBe(ComboType.Pair);
  });

  test('Small and Big Joker is NOT a Pair', () => {
    const result = getComboType([smallJoker1, bigJoker1]);
    expect(result).not.toBe(ComboType.Pair);
  });

  test('SJ-SJ-BJ-BJ is recognized as a Tractor', () => {
    // This is the special high-level tractor combination
    const result = getComboType([smallJoker1, smallJoker2, bigJoker1, bigJoker2]);
    expect(result).toBe(ComboType.Tractor);
  });

  test('identifyCombos finds Small Joker pairs', () => {
    const hand = [smallJoker1, smallJoker2, aceHearts1];
    const combos = identifyCombos(hand, trumpInfo);
    
    // Check that the pair is identified
    const hasSmallJokerPair = combos.some(combo => 
      combo.type === ComboType.Pair && 
      combo.cards.length === 2 && 
      combo.cards.every(card => card.joker === JokerType.Small)
    );
    
    expect(hasSmallJokerPair).toBeTruthy();
  });

  test('identifyCombos finds Big Joker pairs', () => {
    const hand = [bigJoker1, bigJoker2, aceHearts1];
    const combos = identifyCombos(hand, trumpInfo);
    
    // Check that the pair is identified
    const hasBigJokerPair = combos.some(combo => 
      combo.type === ComboType.Pair && 
      combo.cards.length === 2 && 
      combo.cards.every(card => card.joker === JokerType.Big)
    );
    
    expect(hasBigJokerPair).toBeTruthy();
  });

  test('identifyCombos finds special SJ-SJ-BJ-BJ tractor', () => {
    const hand = [smallJoker1, smallJoker2, bigJoker1, bigJoker2, aceHearts1];
    const combos = identifyCombos(hand, trumpInfo);
    
    // Check that the special tractor is identified
    const hasSpecialTractor = combos.some(combo => 
      combo.type === ComboType.Tractor && 
      combo.cards.length === 4 &&
      combo.cards.filter(card => card.joker === JokerType.Small).length === 2 &&
      combo.cards.filter(card => card.joker === JokerType.Big).length === 2
    );
    
    expect(hasSpecialTractor).toBeTruthy();
  });
});