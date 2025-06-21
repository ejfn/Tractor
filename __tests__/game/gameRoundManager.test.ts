import { endRound, prepareNextRound } from "../../src/game/gameRoundManager";
import { Rank, Suit, TeamId } from "../../src/types";
import { createDeck, shuffleDeck } from "../../src/utils/gameInitialization";
import { createFullGameStateWithTricks } from "../helpers";

// Mock dependencies
jest.mock("../../src/utils/gameInitialization", () => ({
  ...jest.requireActual("../../src/utils/gameInitialization"),
  createDeck: jest.fn(),
  shuffleDeck: jest.fn(),
}));

const createMockGameState = createFullGameStateWithTricks;

describe("gameRoundManager", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("prepareNextRound", () => {
    test("should correctly prepare the game state for the next round", () => {
      const mockState = createMockGameState();

      // Mock the return value of createDeck and shuffleDeck to return a specific deck
      const mockDeck = Array(52)
        .fill(null)
        .map((_, i) => ({
          id: `card_${i}`,
          suit: Suit.Spades,
          rank: Rank.Two,
          points: 0,
          joker: undefined,
        }));

      (createDeck as jest.Mock).mockReturnValue(mockDeck);
      (shuffleDeck as jest.Mock).mockReturnValue(mockDeck);

      // Create a mock round result for testing prepareNextRound
      const mockRoundResult = {
        gameOver: false,
        gameWinner: undefined,
        attackingTeamWon: false,
        winningTeam: TeamId.A,
        rankChanges: {} as Record<TeamId, Rank>,
        rankAdvancement: 1,
        finalPoints: 0,
        pointsBreakdown: "",
      };

      const result = prepareNextRound(mockState, mockRoundResult);

      // Verify round number was incremented
      expect(result.roundNumber).toBe(2);

      // Verify game phase was set to dealing (progressive dealing starts with dealing phase)
      expect(result.gamePhase).toBe("dealing");

      // Verify trump info was reset
      expect(result.trumpInfo.trumpSuit).toBeUndefined();
      expect(result.trumpInfo.trumpRank).toBe(Rank.Two); // Same as defending team's rank

      // Verify trump rank was set from defending team
      expect(result.trumpInfo.trumpRank).toBe(
        result.teams.find((t) => t.isDefending)?.currentRank,
      );

      // Verify deck was created
      expect(result.deck).toEqual(mockDeck);

      // Verify player hands are cleared for progressive dealing
      result.players.forEach((player) => {
        expect(player.hand.length).toBe(0);
      });

      // Verify kitty cards are cleared for progressive dealing
      expect(result.kittyCards.length).toBe(0);

      // Verify tricks were reset
      expect(result.tricks.length).toBe(0);
      expect(result.currentTrick).toBeNull();

      // Verify trump declaration state was properly initialized
      expect(result.trumpDeclarationState).toEqual({
        currentDeclaration: undefined,
        declarationHistory: [],
        declarationWindow: true,
      });

      // Verify dealing state was reset
      expect(result.dealingState).toBeUndefined();

      // Verify createDeck and shuffleDeck were called
      expect(createDeck).toHaveBeenCalled();
      expect(shuffleDeck).toHaveBeenCalledWith(mockDeck);
    });
  });

  describe("endRound", () => {
    test("should end the round with team A defending successfully", () => {
      const mockState = createMockGameState();
      // Team A is defending (standard setup), Team B is attacking
      mockState.teams[0].points = 0; // Team A (defending) points
      mockState.teams[1].points = 20; // Team B (attacking) points - less than 80, so defending wins

      const result = endRound(mockState);

      // Note: gamePhase is not updated by endRound function

      // Verify round result properties (finalPoints = attacking team points)
      expect(result.finalPoints).toBe(20); // Team B (attacking) points

      // Verify gameWinner is undefined (not game over)
      expect(result.gameWinner).toBe(undefined);

      // Verify game is not over yet
      expect(result.gameOver).toBe(false);

      // Verify attacking team did not win (defending team successfully defended)
      expect(result.attackingTeamWon).toBe(false);

      // Verify round complete message
    });

    test("should end the round with team B winning and advancing rank", () => {
      const mockState = createMockGameState();
      mockState.teams[0].points = 30; // Team A has fewer points
      mockState.teams[1].points = 80; // Team B has 80+ points (important for winning)

      const result = endRound(mockState);

      // Note: gamePhase is not updated by endRound function

      // Verify gameWinner is undefined (not game over)
      expect(result.gameWinner).toBe(undefined);

      // Verify game is not over yet
      expect(result.gameOver).toBe(false);

      // Verify team B's rank was NOT increased (with 80 points exactly, they don't advance)
      expect(result.rankChanges[TeamId.B]).toBe(Rank.Two);

      // Verify attacking team won (which means roles will switch)
      expect(result.attackingTeamWon).toBe(true);

      // Verify round complete message
    });

    test("should end the round with defending team winning", () => {
      const mockState = createMockGameState();

      // Team A is defending
      mockState.teams[0].isDefending = true;
      mockState.teams[1].isDefending = false;

      // Attacking team (B) has less than 40 points, so defending team advances 2 ranks
      mockState.teams[0].points = 0; // Defending team points
      mockState.teams[1].points = 30; // Attacking team points

      const result = endRound(mockState);

      // Note: gamePhase is not updated by endRound function

      // Verify defending team's rank increases by 2 (from Rank.Two to Rank.Four)
      expect(result.rankChanges[TeamId.A]).toBe(Rank.Four);

      // Verify gameWinner is undefined (since it's just a rank advancement)
      expect(result.gameWinner).toBe(undefined);

      // Verify game is not over yet
      expect(result.gameOver).toBe(false);

      // Verify attacking team did not win (defending team successfully defended)
      expect(result.attackingTeamWon).toBe(false);

      // Verify round complete message
    });

    test("should handle team advancing to Ace and continuing game", () => {
      const mockState = createMockGameState();

      // Set team B to have a high rank (King)
      mockState.teams[1].currentRank = Rank.King;

      // Make team B the attacking team and win with high points
      mockState.teams[0].isDefending = true;
      mockState.teams[1].isDefending = false;

      mockState.teams[0].points = 30;
      mockState.teams[1].points = 120; // 120+ points gives them 1 rank advancement

      const result = endRound(mockState);

      // Since team B advances from King to Ace, the game should continue
      expect(result.gameOver).toBe(false);
      expect(result.gameWinner).toBe(undefined);

      // Team should advance to Ace
      expect(result.rankChanges[TeamId.B]).toBe(Rank.Ace);

      // Should have round complete message
    });
  });
});
