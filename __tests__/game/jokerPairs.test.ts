import { getComboType, identifyCombos } from "../../src/game/comboDetection";
import {
  Card,
  ComboType,
  JokerType,
  Rank,
  Suit
} from "../../src/types";

// Test data using Card class convenience methods
const [smallJoker1, smallJoker2] = Card.createJokerPair(JokerType.Small);
const [bigJoker1, bigJoker2] = Card.createJokerPair(JokerType.Big);
const [aceHearts1, aceHearts2] = Card.createPair(Suit.Hearts, Rank.Ace);

describe('Joker Pair Tests', () => {
  const trumpInfo = {
    trumpRank: Rank.Two,
    trumpSuit: Suit.Spades
  };

  test('Small Joker Pair is recognized as a Pair', () => {
    const result = getComboType([smallJoker1, smallJoker2], trumpInfo);
    expect(result).toBe(ComboType.Pair);
  });

  test('Big Joker Pair is recognized as a Pair', () => {
    const result = getComboType([bigJoker1, bigJoker2], trumpInfo);
    expect(result).toBe(ComboType.Pair);
  });

  test('Small and Big Joker is NOT a Pair', () => {
    const result = getComboType([smallJoker1, bigJoker1], trumpInfo);
    expect(result).not.toBe(ComboType.Pair);
  });

  test('SJ-SJ-BJ-BJ is recognized as a Tractor', () => {
    // This is the special high-level tractor combination
    const result = getComboType([smallJoker1, smallJoker2, bigJoker1, bigJoker2], trumpInfo);
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