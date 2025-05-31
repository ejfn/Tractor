import { initializeGame } from '../../src/game/gameLogic';
import {
  makeTrumpDeclaration,
  getPlayerDeclarationOptions,
  getTrumpDeclarationStatus,
  areDeclarationsAllowed,
  finalizeTrumpDeclaration
} from '../../src/game/trumpDeclarationManager';
import { DeclarationType, PlayerId, Rank, Suit } from '../../src/types';
import { createCard } from '../helpers/cards';

describe('Trump Declaration Manager', () => {
  let gameState: any;

  beforeEach(() => {
    gameState = initializeGame();
    
    // Give players specific hands for testing
    const humanPlayer = gameState.players.find((p: any) => p.id === PlayerId.Human);
    const bot1Player = gameState.players.find((p: any) => p.id === PlayerId.Bot1);

    // Give human a trump rank single
    humanPlayer.hand = [
      createCard(Suit.Spades, Rank.Two), // Trump rank
      createCard(Suit.Hearts, Rank.Ace),
      createCard(Suit.Clubs, Rank.King)
    ];

    // Give Bot1 a trump rank pair
    bot1Player.hand = [
      createCard(Suit.Hearts, Rank.Two), // Trump rank
      createCard(Suit.Hearts, Rank.Two), // Trump rank pair
      createCard(Suit.Spades, Rank.Queen)
    ];
  });

  describe('Trump Declaration State Initialization', () => {
    test('should initialize with trump declaration state', () => {
      expect(gameState.trumpDeclarationState).toBeDefined();
      expect(gameState.trumpDeclarationState.currentDeclaration).toBeUndefined();
      expect(gameState.trumpDeclarationState.declarationHistory).toHaveLength(0);
      expect(gameState.trumpDeclarationState.declarationWindow).toBe(true);
    });

    test('should allow declarations initially', () => {
      expect(areDeclarationsAllowed(gameState)).toBe(true);
    });
  });

  describe('Making Declarations', () => {
    test('should allow valid trump declaration', () => {
      const declaration = {
        rank: Rank.Two,
        suit: Suit.Spades,
        type: DeclarationType.Single,
        cards: [createCard(Suit.Spades, Rank.Two)]
      };

      const newState = makeTrumpDeclaration(gameState, PlayerId.Human, declaration);

      expect(newState.trumpDeclarationState?.currentDeclaration).toBeDefined();
      expect(newState.trumpDeclarationState?.currentDeclaration?.playerId).toBe(PlayerId.Human);
      expect(newState.trumpDeclarationState?.currentDeclaration?.type).toBe(DeclarationType.Single);
      expect(newState.trumpInfo.trumpSuit).toBe(Suit.Spades);
    });

    test('should reject invalid declaration cards', () => {
      const invalidDeclaration = {
        rank: Rank.Two,
        suit: Suit.Spades,
        type: DeclarationType.Single,
        cards: [createCard(Suit.Spades, Rank.Ace)] // Wrong rank
      };

      expect(() => {
        makeTrumpDeclaration(gameState, PlayerId.Human, invalidDeclaration);
      }).toThrow('Invalid declaration cards');
    });

    test('should allow override with stronger combination', () => {
      // First declaration: Human plays single
      const singleDeclaration = {
        rank: Rank.Two,
        suit: Suit.Spades,
        type: DeclarationType.Single,
        cards: [createCard(Suit.Spades, Rank.Two)]
      };

      let newState = makeTrumpDeclaration(gameState, PlayerId.Human, singleDeclaration);

      // Override with pair from Bot1
      const pairDeclaration = {
        rank: Rank.Two,
        suit: Suit.Hearts,
        type: DeclarationType.Pair,
        cards: [createCard(Suit.Hearts, Rank.Two), createCard(Suit.Hearts, Rank.Two)]
      };

      newState = makeTrumpDeclaration(newState, PlayerId.Bot1, pairDeclaration);

      expect(newState.trumpDeclarationState?.currentDeclaration?.playerId).toBe(PlayerId.Bot1);
      expect(newState.trumpDeclarationState?.currentDeclaration?.type).toBe(DeclarationType.Pair);
      expect(newState.trumpInfo.trumpSuit).toBe(Suit.Hearts);
      expect(newState.trumpDeclarationState?.declarationHistory).toHaveLength(2);
    });

    test('should reject weaker override attempt', () => {
      // First declaration: Bot1 plays pair
      const pairDeclaration = {
        rank: Rank.Two,
        suit: Suit.Hearts,
        type: DeclarationType.Pair,
        cards: [createCard(Suit.Hearts, Rank.Two), createCard(Suit.Hearts, Rank.Two)]
      };

      const newState = makeTrumpDeclaration(gameState, PlayerId.Bot1, pairDeclaration);

      // Try to override with weaker single
      const weakerDeclaration = {
        rank: Rank.Two,
        suit: Suit.Spades,
        type: DeclarationType.Single,
        cards: [createCard(Suit.Spades, Rank.Two)]
      };

      expect(() => {
        makeTrumpDeclaration(newState, PlayerId.Human, weakerDeclaration);
      }).toThrow('Declaration cannot override current declaration');
    });

    test('should reject equal strength override attempt (pair vs pair)', () => {
      // First declaration: Human plays pair of 2♣
      const firstPairDeclaration = {
        rank: Rank.Two,
        suit: Suit.Clubs,
        type: DeclarationType.Pair,
        cards: [createCard(Suit.Clubs, Rank.Two), createCard(Suit.Clubs, Rank.Two)]
      };

      const newState = makeTrumpDeclaration(gameState, PlayerId.Human, firstPairDeclaration);

      // Try to override with equal strength pair of 2♦ (should fail)
      const equalStrengthPairDeclaration = {
        rank: Rank.Two,
        suit: Suit.Diamonds,
        type: DeclarationType.Pair,
        cards: [createCard(Suit.Diamonds, Rank.Two), createCard(Suit.Diamonds, Rank.Two)]
      };

      expect(() => {
        makeTrumpDeclaration(newState, PlayerId.Bot1, equalStrengthPairDeclaration);
      }).toThrow('Declaration cannot override current declaration');
    });

    test('getPlayerDeclarationOptions should filter out equal strength declarations', () => {
      // Setup: Give Bot1 a pair of 2♦ 
      const bot1Player = gameState.players.find((p: any) => p.id === PlayerId.Bot1);
      bot1Player.hand = [
        createCard(Suit.Diamonds, Rank.Two), 
        createCard(Suit.Diamonds, Rank.Two), 
        createCard(Suit.Spades, Rank.Queen)
      ];

      // First declaration: Human plays pair of 2♣
      const firstPairDeclaration = {
        rank: Rank.Two,
        suit: Suit.Clubs,
        type: DeclarationType.Pair,
        cards: [createCard(Suit.Clubs, Rank.Two), createCard(Suit.Clubs, Rank.Two)]
      };

      const newState = makeTrumpDeclaration(gameState, PlayerId.Human, firstPairDeclaration);

      // Bot1 should have NO valid declaration options (their pair is equal strength)
      const bot1Options = getPlayerDeclarationOptions(newState, PlayerId.Bot1);
      expect(bot1Options).toHaveLength(0);
    });
  });

  describe('Declaration Options', () => {
    test('should detect available declaration options for player', () => {
      const humanOptions = getPlayerDeclarationOptions(gameState, PlayerId.Human);
      const bot1Options = getPlayerDeclarationOptions(gameState, PlayerId.Bot1);

      // Human has single 2♠
      expect(humanOptions).toHaveLength(1);
      expect(humanOptions[0].type).toBe(DeclarationType.Single);
      expect(humanOptions[0].suit).toBe(Suit.Spades);

      // Bot1 has pair 2♥
      expect(bot1Options).toHaveLength(1);
      expect(bot1Options[0].type).toBe(DeclarationType.Pair);
      expect(bot1Options[0].suit).toBe(Suit.Hearts);
    });

    test('should filter out invalid override options', () => {
      // Bot1 makes a pair declaration first
      const pairDeclaration = {
        rank: Rank.Two,
        suit: Suit.Hearts,
        type: DeclarationType.Pair,
        cards: [createCard(Suit.Hearts, Rank.Two), createCard(Suit.Hearts, Rank.Two)]
      };

      const newState = makeTrumpDeclaration(gameState, PlayerId.Bot1, pairDeclaration);

      // Human should have no valid options (only has single, which is weaker)
      const humanOptions = getPlayerDeclarationOptions(newState, PlayerId.Human);
      expect(humanOptions).toHaveLength(0);
    });
  });

  describe('Declaration Status', () => {
    test('should return correct status when no declaration exists', () => {
      const status = getTrumpDeclarationStatus(gameState);

      expect(status.hasDeclaration).toBe(false);
      expect(status.declarationCount).toBe(0);
    });

    test('should return correct status when declaration exists', () => {
      const declaration = {
        rank: Rank.Two,
        suit: Suit.Spades,
        type: DeclarationType.Single,
        cards: [createCard(Suit.Spades, Rank.Two)]
      };

      const newState = makeTrumpDeclaration(gameState, PlayerId.Human, declaration);
      const status = getTrumpDeclarationStatus(newState);

      expect(status.hasDeclaration).toBe(true);
      expect(status.declarer).toBe(PlayerId.Human);
      expect(status.type).toBe(DeclarationType.Single);
      expect(status.suit).toBe(Suit.Spades);
      expect(status.declarationCount).toBe(1);
    });
  });

  describe('Finalization', () => {
    test('should finalize trump declaration and close window', () => {
      const declaration = {
        rank: Rank.Two,
        suit: Suit.Spades,
        type: DeclarationType.Single,
        cards: [createCard(Suit.Spades, Rank.Two)]
      };

      let newState = makeTrumpDeclaration(gameState, PlayerId.Human, declaration);
      newState = finalizeTrumpDeclaration(newState);

      expect(newState.trumpInfo.trumpSuit).toBe(Suit.Spades);
      expect(areDeclarationsAllowed(newState)).toBe(false);
    });
  });
});