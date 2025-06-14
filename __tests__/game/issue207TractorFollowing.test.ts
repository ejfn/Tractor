import { isValidPlay } from '../../src/game/playValidation';
import { Card, Suit, Rank, TrumpInfo } from '../../src/types';

describe('Issue 207: Tractor Following Validation', () => {
  let trumpInfo: TrumpInfo;

  beforeEach(() => {
    trumpInfo = {
      trumpRank: Rank.Five,
      trumpSuit: Suit.Hearts,
    };
  });

  it('should reject invalid tractor following when pairs are available but not used', () => {
    // Scenario from issue 207:
    // Trump: 5♥
    // Bot2 leads: 3♦3♦-4♦4♦ (Diamond tractor - 2 pairs)
    // Human has: A♦A♦ (pair), 8♦, 7♦, 6♦ (singles)
    // Human attempts: 8♦7♦7♦6♦ - should be INVALID

    const leadingCombo = [
      Card.createCard(Suit.Diamonds, Rank.Three, 0),
      Card.createCard(Suit.Diamonds, Rank.Three, 1),
      Card.createCard(Suit.Diamonds, Rank.Four, 0),
      Card.createCard(Suit.Diamonds, Rank.Four, 1)
    ];

    const playerHand = [
      // A♦ pair available
      Card.createCard(Suit.Diamonds, Rank.Ace, 0),
      Card.createCard(Suit.Diamonds, Rank.Ace, 1),
      // Singles
      Card.createCard(Suit.Diamonds, Rank.Eight, 0),
      Card.createCard(Suit.Diamonds, Rank.Seven, 0),
      Card.createCard(Suit.Diamonds, Rank.Seven, 1), // Second 7♦ to form potential pair
      Card.createCard(Suit.Diamonds, Rank.Six, 0),
      // Other cards
      Card.createCard(Suit.Clubs, Rank.Two, 0)
    ];

    // Human attempts to play: 8♦7♦7♦6♦ (mixed: singles + pair)
    const attemptedPlay = [
      Card.createCard(Suit.Diamonds, Rank.Eight, 0),
      Card.createCard(Suit.Diamonds, Rank.Seven, 0),
      Card.createCard(Suit.Diamonds, Rank.Seven, 1),
      Card.createCard(Suit.Diamonds, Rank.Six, 0)
    ];

    console.log('=== Issue 207 Test Scenario ===');
    console.log('Leading combo: 3♦3♦-4♦4♦ (tractor with 2 pairs)');
    console.log('Player hand: A♦A♦, 8♦, 7♦, 7♦, 6♦, 2♣');
    console.log('Player attempts: 8♦7♦7♦6♦ (mixed: singles + one pair)');
    console.log('Available A♦A♦ pair not used');
    console.log('Expected: INVALID - must use ALL available pairs before singles');

    const isValid = isValidPlay(attemptedPlay, leadingCombo, playerHand, trumpInfo);

    console.log('Validation result:', isValid ? 'VALID' : 'INVALID');

    if (isValid) {
      console.log('❌ BUG CONFIRMED: Allows invalid tractor following');
      console.log('Should reject play that mixes singles+pairs when more pairs available');
    } else {
      console.log('✅ CORRECT: Properly rejects invalid tractor following');
    }

    // Should be INVALID because player has A♦A♦ pair available but used mixed singles+pairs instead
    expect(isValid).toBe(false);
  });

  it('should accept valid tractor following using all available pairs first', () => {
    // Same scenario but player uses proper tractor following rules
    
    const leadingCombo = [
      Card.createCard(Suit.Diamonds, Rank.Three, 0),
      Card.createCard(Suit.Diamonds, Rank.Three, 1),
      Card.createCard(Suit.Diamonds, Rank.Four, 0),
      Card.createCard(Suit.Diamonds, Rank.Four, 1)
    ];

    const playerHand = [
      // Available pairs
      Card.createCard(Suit.Diamonds, Rank.Ace, 0),
      Card.createCard(Suit.Diamonds, Rank.Ace, 1),
      Card.createCard(Suit.Diamonds, Rank.Seven, 0),
      Card.createCard(Suit.Diamonds, Rank.Seven, 1),
      // Singles
      Card.createCard(Suit.Diamonds, Rank.Eight, 0),
      Card.createCard(Suit.Diamonds, Rank.Six, 0),
      Card.createCard(Suit.Clubs, Rank.Two, 0)
    ];

    // Valid play: A♦A♦7♦7♦ (all pairs used first)
    const validPlay = [
      Card.createCard(Suit.Diamonds, Rank.Ace, 0),
      Card.createCard(Suit.Diamonds, Rank.Ace, 1),
      Card.createCard(Suit.Diamonds, Rank.Seven, 0),
      Card.createCard(Suit.Diamonds, Rank.Seven, 1)
    ];

    console.log('\n=== Valid Tractor Following ===');
    console.log('Player uses: A♦A♦7♦7♦ (all available pairs)');
    console.log('Expected: VALID - proper tractor following with pairs');

    const isValid = isValidPlay(validPlay, leadingCombo, playerHand, trumpInfo);

    console.log('Validation result:', isValid ? 'VALID' : 'INVALID');

    // Should be VALID because player uses all available pairs
    expect(isValid).toBe(true);
  });

  it('should accept mixed play when insufficient pairs for full tractor', () => {
    // Player has only 1 pair but tractor requires 2 pairs
    
    const leadingCombo = [
      Card.createCard(Suit.Diamonds, Rank.Three, 0),
      Card.createCard(Suit.Diamonds, Rank.Three, 1),
      Card.createCard(Suit.Diamonds, Rank.Four, 0),
      Card.createCard(Suit.Diamonds, Rank.Four, 1)
    ];

    const playerHand = [
      // Only 1 pair available  
      Card.createCard(Suit.Diamonds, Rank.Ace, 0),
      Card.createCard(Suit.Diamonds, Rank.Ace, 1),
      // Singles
      Card.createCard(Suit.Diamonds, Rank.Eight, 0),
      Card.createCard(Suit.Diamonds, Rank.Six, 0),
      Card.createCard(Suit.Clubs, Rank.Two, 0)
    ];

    // Valid play: A♦A♦8♦6♦ (use available pair + singles)
    const validPlay = [
      Card.createCard(Suit.Diamonds, Rank.Ace, 0),
      Card.createCard(Suit.Diamonds, Rank.Ace, 1),
      Card.createCard(Suit.Diamonds, Rank.Eight, 0),
      Card.createCard(Suit.Diamonds, Rank.Six, 0)
    ];

    console.log('\n=== Insufficient Pairs Scenario ===');
    console.log('Player has only 1 pair A♦A♦ for 4-card tractor lead');
    console.log('Player uses: A♦A♦8♦6♦ (available pair + singles)');
    console.log('Expected: VALID - uses all available pairs');

    const isValid = isValidPlay(validPlay, leadingCombo, playerHand, trumpInfo);

    console.log('Validation result:', isValid ? 'VALID' : 'INVALID');

    // Should be VALID because player uses their only available pair
    expect(isValid).toBe(true);
  });
});