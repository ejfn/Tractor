import { identifyCombos } from '../../src/game/gameLogic';
import { validatePlay } from '../../src/game/gamePlayManager';
import { createFullGameStateWithTricks } from '../helpers';
import { Rank, Suit, ComboType, TrumpInfo } from '../../src/types';

describe('Tractor Length Bug Fix', () => {
  const createDiamondCards = (ranks: Rank[]) => {
    return ranks.flatMap(rank => [
      { id: `${rank}_${Suit.Diamonds}_1`, rank, suit: Suit.Diamonds, points: 0 },
      { id: `${rank}_${Suit.Diamonds}_2`, rank, suit: Suit.Diamonds, points: 0 }
    ]);
  };

  const trumpInfo: TrumpInfo = {
    trumpRank: Rank.Two,
    trumpSuit: Suit.Spades, // Diamonds is NOT trump
  };

  it('should identify 66-77-88 diamond tractor (3 pairs) when diamonds is non-trump', () => {
    const tractorCards = createDiamondCards([Rank.Six, Rank.Seven, Rank.Eight]);
    
    const combos = identifyCombos(tractorCards, trumpInfo);
    const tractors = combos.filter(combo => combo.type === ComboType.Tractor);
    
    // Should find multiple overlapping tractors (66-77, 77-88, 66-77-88)
    expect(tractors.length).toBeGreaterThanOrEqual(1);
    
    // Should include the full 3-pair tractor
    const fullTractor = tractors.find(t => t.cards.length === 6);
    expect(fullTractor).toBeDefined();
    expect(fullTractor!.cards).toHaveLength(6);
    
    // Should contain all 6 cards of the right ranks
    expect(fullTractor!.cards.every(card => 
      card.suit === Suit.Diamonds && 
      [Rank.Six, Rank.Seven, Rank.Eight].includes(card.rank!)
    )).toBe(true);
  });

  it('should validate 66-77-88 diamond tractor as valid leading play', () => {
    const gameState = createFullGameStateWithTricks();
    gameState.trumpInfo = trumpInfo;
    gameState.currentTrick = null; // Leading player
    
    const tractorCards = createDiamondCards([Rank.Six, Rank.Seven, Rank.Eight]);
    gameState.players[0].hand = tractorCards;
    
    // Should be valid when leading
    const isValid = validatePlay(gameState, tractorCards);
    expect(isValid).toBe(true);
  });

  it('should identify longer tractors like 55-66-77-88-99 (5 pairs)', () => {
    const longTractorCards = createDiamondCards([
      Rank.Five, Rank.Six, Rank.Seven, Rank.Eight, Rank.Nine
    ]);
    
    const combos = identifyCombos(longTractorCards, trumpInfo);
    const tractors = combos.filter(combo => combo.type === ComboType.Tractor);
    
    // Should find multiple tractors of different lengths
    expect(tractors.length).toBeGreaterThan(1);
    
    // Should include the full 5-pair tractor
    const fullTractor = tractors.find(t => t.cards.length === 10);
    expect(fullTractor).toBeDefined();
    expect(fullTractor!.cards).toHaveLength(10);
  });

  it('should identify multiple shorter tractors within a longer sequence', () => {
    const cards = createDiamondCards([
      Rank.Five, Rank.Six, Rank.Seven, Rank.Eight, Rank.Nine
    ]);
    
    const combos = identifyCombos(cards, trumpInfo);
    const tractors = combos.filter(combo => combo.type === ComboType.Tractor);
    
    // Should find multiple tractors of different lengths starting from different positions
    expect(tractors.length).toBeGreaterThanOrEqual(4);
    
    // Should include the longest tractor (10 cards)
    const longestTractor = tractors.reduce((longest, current) => 
      current.cards.length > longest.cards.length ? current : longest
    );
    expect(longestTractor.cards).toHaveLength(10);
    
    // Should include shorter tractors
    const tractorLengths = tractors.map(t => t.cards.length).sort();
    expect(tractorLengths).toContain(4); // At least one 2-pair tractor
    expect(tractorLengths).toContain(10); // The full 5-pair tractor
  });
});