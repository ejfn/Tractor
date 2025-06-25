import { endRound, prepareNextRound } from "../../src/game/gameRoundManager";
import { processPlay } from "../../src/game/playProcessing";
import {
  Card,
  GameState,
  Team,
  Rank,
  TeamId,
  PlayerId,
  Suit,
  GamePhase,
  TrumpInfo,
} from "../../src/types";
import {
  createScoringGameState,
  createGameState,
  givePlayerCards,
} from "../helpers";

describe("Advanced Scoring Rules", () => {
  const createMockGameState = (
    defendingTeam: Team,
    attackingTeam: Team,
  ): GameState => {
    const state = createScoringGameState();
    state.teams = [defendingTeam, attackingTeam];
    return state;
  };

  describe("Defending Team Successfully Defends", () => {
    it("should advance defending team by 1 rank when attackers get 40-79 points", () => {
      const defendingTeam: Team = {
        id: TeamId.A,
        currentRank: Rank.Three,
        isDefending: true,
        points: 0,
      };
      const attackingTeam: Team = {
        id: TeamId.B,
        currentRank: Rank.Five,
        isDefending: false,
        points: 65,
      };

      const gameState = createMockGameState(defendingTeam, attackingTeam);
      const result = endRound(gameState);

      expect(result.rankChanges[TeamId.A]).toBe(Rank.Four);
      expect(result.attackingTeamWon).toBe(false);
      expect(result.winningTeam).toBe(TeamId.A);
      expect(result.finalPoints).toBe(65);
      expect(result.rankAdvancement).toBe(1);
    });

    it("should advance defending team by 2 ranks when attackers get < 40 points", () => {
      const defendingTeam: Team = {
        id: TeamId.A,
        currentRank: Rank.Three,
        isDefending: true,
        points: 0,
      };
      const attackingTeam: Team = {
        id: TeamId.B,
        currentRank: Rank.Five,
        isDefending: false,
        points: 25,
      };

      const gameState = createMockGameState(defendingTeam, attackingTeam);
      const result = endRound(gameState);

      expect(result.rankChanges[TeamId.A]).toBe(Rank.Five);
      expect(result.attackingTeamWon).toBe(false);
    });

    it("should advance defending team by 3 ranks when attackers get 0 points", () => {
      const defendingTeam: Team = {
        id: TeamId.A,
        currentRank: Rank.Three,
        isDefending: true,
        points: 0,
      };
      const attackingTeam: Team = {
        id: TeamId.B,
        currentRank: Rank.Five,
        isDefending: false,
        points: 0,
      };

      const gameState = createMockGameState(defendingTeam, attackingTeam);
      const result = endRound(gameState);

      expect(result.rankChanges[TeamId.A]).toBe(Rank.Six);
      expect(result.attackingTeamWon).toBe(false);
    });

    it("should advance defending team to Ace and continue game", () => {
      const defendingTeam: Team = {
        id: TeamId.A,
        currentRank: Rank.King,
        isDefending: true,
        points: 0,
      };
      const attackingTeam: Team = {
        id: TeamId.B,
        currentRank: Rank.Five,
        isDefending: false,
        points: 50, // 1 rank advancement: King -> Ace
      };

      const gameState = createMockGameState(defendingTeam, attackingTeam);
      const result = endRound(gameState);

      expect(result.gameOver).toBe(false);
      expect(result.rankChanges[TeamId.A]).toBe(Rank.Ace);
    });

    it("should cap defending team at Ace when would advance beyond", () => {
      const defendingTeam: Team = {
        id: TeamId.A,
        currentRank: Rank.King,
        isDefending: true,
        points: 0,
      };
      const attackingTeam: Team = {
        id: TeamId.B,
        currentRank: Rank.Five,
        isDefending: false,
        points: 0, // 3 rank advancement: King -> capped at Ace
      };

      const gameState = createMockGameState(defendingTeam, attackingTeam);
      const result = endRound(gameState);

      expect(result.gameOver).toBe(false);
      expect(result.rankChanges[TeamId.A]).toBe(Rank.Ace);
    });
  });

  describe("Attacking Team Wins", () => {
    it("should switch roles without rank advancement when attackers get 80-119 points", () => {
      const defendingTeam: Team = {
        id: TeamId.A,
        currentRank: Rank.Three,
        isDefending: true,
        points: 0,
      };
      const attackingTeam: Team = {
        id: TeamId.B,
        currentRank: Rank.Five,
        isDefending: false,
        points: 100,
      };

      const gameState = createMockGameState(defendingTeam, attackingTeam);
      const result = endRound(gameState);

      expect(result.rankChanges[TeamId.B]).toBe(Rank.Five); // No rank change
      expect(result.attackingTeamWon).toBe(true); // Attacking team won, so roles will switch
    });

    it("should advance attacking team by 1 rank when they get 120-159 points", () => {
      const defendingTeam: Team = {
        id: TeamId.A,
        currentRank: Rank.Three,
        isDefending: true,
        points: 0,
      };
      const attackingTeam: Team = {
        id: TeamId.B,
        currentRank: Rank.Five,
        isDefending: false,
        points: 140,
      };

      const gameState = createMockGameState(defendingTeam, attackingTeam);
      const result = endRound(gameState);

      expect(result.rankChanges[TeamId.B]).toBe(Rank.Six);
      expect(result.attackingTeamWon).toBe(true);
    });

    it("should advance attacking team by 2 ranks when they get 160-199 points", () => {
      const defendingTeam: Team = {
        id: TeamId.A,
        currentRank: Rank.Three,
        isDefending: true,
        points: 0,
      };
      const attackingTeam: Team = {
        id: TeamId.B,
        currentRank: Rank.Five,
        isDefending: false,
        points: 180,
      };

      const gameState = createMockGameState(defendingTeam, attackingTeam);
      const result = endRound(gameState);

      expect(result.rankChanges[TeamId.B]).toBe(Rank.Seven);
      expect(result.attackingTeamWon).toBe(true);
    });

    it("should advance attacking team by 3 ranks when they get 200+ points", () => {
      const defendingTeam: Team = {
        id: TeamId.A,
        currentRank: Rank.Three,
        isDefending: true,
        points: 0,
      };
      const attackingTeam: Team = {
        id: TeamId.B,
        currentRank: Rank.Five,
        isDefending: false,
        points: 220,
      };

      const gameState = createMockGameState(defendingTeam, attackingTeam);
      const result = endRound(gameState);

      expect(result.rankChanges[TeamId.B]).toBe(Rank.Eight);
      expect(result.attackingTeamWon).toBe(true);
    });

    it("should advance attacking team to Ace and continue game", () => {
      const defendingTeam: Team = {
        id: TeamId.A,
        currentRank: Rank.Three,
        isDefending: true,
        points: 0,
      };
      const attackingTeam: Team = {
        id: TeamId.B,
        currentRank: Rank.King,
        isDefending: false,
        points: 120, // 1 rank advancement: King -> Ace
      };

      const gameState = createMockGameState(defendingTeam, attackingTeam);
      const result = endRound(gameState);

      expect(result.gameOver).toBe(false);
      expect(result.rankChanges[TeamId.B]).toBe(Rank.Ace);
    });

    it("should cap attacking team at Ace when would advance beyond", () => {
      const defendingTeam: Team = {
        id: TeamId.A,
        currentRank: Rank.Three,
        isDefending: true,
        points: 0,
      };
      const attackingTeam: Team = {
        id: TeamId.B,
        currentRank: Rank.King,
        isDefending: false,
        points: 160, // 2 rank advancement: King -> capped at Ace
      };

      const gameState = createMockGameState(defendingTeam, attackingTeam);
      const result = endRound(gameState);

      expect(result.gameOver).toBe(false);
      expect(result.rankChanges[TeamId.B]).toBe(Rank.Ace);
    });
  });

  describe("Edge Cases", () => {
    it("should end game when team at Ace would advance further", () => {
      // Test defending team at Ace winning
      const defendingAtAce = createMockGameState(
        { id: TeamId.A, currentRank: Rank.Ace, isDefending: true, points: 0 },
        { id: TeamId.B, currentRank: Rank.Five, isDefending: false, points: 0 },
      );
      const resultDefending = endRound(defendingAtAce);
      expect(resultDefending.gameOver).toBe(true);
      expect(resultDefending.gameWinner).toBe(TeamId.A);

      // Test attacking team at King advancing to Ace (should continue game)
      const attackingAtKing = createMockGameState(
        { id: TeamId.A, currentRank: Rank.Three, isDefending: true, points: 0 },
        {
          id: TeamId.B,
          currentRank: Rank.King,
          isDefending: false,
          points: 120,
        },
      );
      const resultAttacking = endRound(attackingAtKing);
      expect(resultAttacking.gameOver).toBe(false);
      expect(resultAttacking.rankChanges[TeamId.B]).toBe(Rank.Ace);

      // Test attacking team at Ace winning (should continue game - attacking teams never trigger game over)
      const attackingAtAce = createMockGameState(
        { id: TeamId.A, currentRank: Rank.Three, isDefending: true, points: 0 },
        {
          id: TeamId.B,
          currentRank: Rank.Ace,
          isDefending: false,
          points: 120,
        },
      );
      const resultAttackingAce = endRound(attackingAtAce);
      expect(resultAttackingAce.gameOver).toBe(false);
      expect(resultAttackingAce.rankChanges[TeamId.B]).toBe(Rank.Ace); // Stays at Ace

      // Test attacking team at Queen advancing to Ace (should continue game)
      const attackingAtQueen = createMockGameState(
        { id: TeamId.A, currentRank: Rank.Three, isDefending: true, points: 0 },
        {
          id: TeamId.B,
          currentRank: Rank.Queen,
          isDefending: false,
          points: 160,
        },
      );
      const resultAttackingQueen = endRound(attackingAtQueen);
      expect(resultAttackingQueen.gameOver).toBe(false);
      expect(resultAttackingQueen.rankChanges[TeamId.B]).toBe(Rank.Ace);

      // Test defending team at King defending against 0 points (3 ranks = capped at Ace)
      const defendingAtKing = createMockGameState(
        { id: TeamId.A, currentRank: Rank.King, isDefending: true, points: 0 },
        { id: TeamId.B, currentRank: Rank.Five, isDefending: false, points: 0 },
      );
      const resultDefendingKing = endRound(defendingAtKing);
      expect(resultDefendingKing.gameOver).toBe(false);
      expect(resultDefendingKing.rankChanges[TeamId.A]).toBe(Rank.Ace);

      // Test defending team at Queen advancing to Ace (should continue game)
      const defendingAtQueen = createMockGameState(
        { id: TeamId.A, currentRank: Rank.Queen, isDefending: true, points: 0 },
        {
          id: TeamId.B,
          currentRank: Rank.Five,
          isDefending: false,
          points: 30,
        },
      );
      const resultDefendingQueen = endRound(defendingAtQueen);
      expect(resultDefendingQueen.gameOver).toBe(false);
      expect(resultDefendingQueen.rankChanges[TeamId.A]).toBe(Rank.Ace);

      // Test defending team at Ten defending with <40 points (advances to Ace exactly)
      const defendingAtTen = createMockGameState(
        { id: TeamId.A, currentRank: Rank.Ten, isDefending: true, points: 0 },
        {
          id: TeamId.B,
          currentRank: Rank.Five,
          isDefending: false,
          points: 30,
        },
      );
      const resultDefendingTen = endRound(defendingAtTen);
      expect(resultDefendingTen.gameOver).toBe(false);
      expect(resultDefendingTen.gameWinner).toBe(undefined);
      expect(resultDefendingTen.rankChanges[TeamId.A]).toBe(Rank.Queen);
    });

    it("should handle exact point boundaries correctly", () => {
      // Test 40 points (should be 1 rank advancement)
      const gameState40 = createMockGameState(
        { id: TeamId.A, currentRank: Rank.Three, isDefending: true, points: 0 },
        {
          id: TeamId.B,
          currentRank: Rank.Five,
          isDefending: false,
          points: 40,
        },
      );
      const result40 = endRound(gameState40);
      expect(result40.rankChanges[TeamId.A]).toBe(Rank.Four);

      // Test 80 points (attacking team wins, no advancement)
      const gameState80 = createMockGameState(
        { id: TeamId.A, currentRank: Rank.Three, isDefending: true, points: 0 },
        {
          id: TeamId.B,
          currentRank: Rank.Five,
          isDefending: false,
          points: 80,
        },
      );
      const result80 = endRound(gameState80);
      expect(result80.rankChanges[TeamId.B]).toBe(Rank.Five);
      expect(result80.attackingTeamWon).toBe(true);

      // Test 120 points (attacking team wins, 1 rank advancement)
      const gameState120 = createMockGameState(
        { id: TeamId.A, currentRank: Rank.Three, isDefending: true, points: 0 },
        {
          id: TeamId.B,
          currentRank: Rank.Five,
          isDefending: false,
          points: 120,
        },
      );
      const result120 = endRound(gameState120);
      expect(result120.rankChanges[TeamId.B]).toBe(Rank.Six);
    });

    it("should reset team points for the next round", () => {
      const gameState = createMockGameState(
        {
          id: TeamId.A,
          currentRank: Rank.Three,
          isDefending: true,
          points: 50,
        },
        {
          id: TeamId.B,
          currentRank: Rank.Five,
          isDefending: false,
          points: 100,
        },
      );
      const result = endRound(gameState);
      const newState = prepareNextRound(gameState, result);

      expect(newState.teams[0].points).toBe(0);
      expect(newState.teams[1].points).toBe(0);
    });
  });

  describe("Multi-Combo Point Collection Bug #272", () => {
    let trumpInfo: TrumpInfo;
    let gameState: GameState;

    beforeEach(() => {
      trumpInfo = { trumpRank: Rank.Two, trumpSuit: Suit.Hearts };

      // Create a game state in playing phase
      gameState = createGameState({
        gamePhase: GamePhase.Playing,
        trumpInfo,
        currentPlayerIndex: 0, // Human leads
      });

      // Reset team points
      gameState.teams[0].points = 0; // Team A (Human + Bot2) - DEFENDING
      gameState.teams[1].points = 0; // Team B (Bot1 + Bot3) - ATTACKING
    });

    it("should collect points when attacking team wins multi-combo leading trick", () => {
      // Setup: Bot1 (attacking team) leads multi-combo with point cards
      // Multi-combo: A♠ + K♠ + Q♠ (single + single + single from Spades)
      // Point values: K♠ = 10pts, A♠ = 0pts, Q♠ = 0pts → Plus points from other players

      gameState.currentPlayerIndex = 1; // Bot1 leads

      const multiComboCards = [
        Card.createCard(Suit.Spades, Rank.Ace, 0), // 0 points (highest)
        Card.createCard(Suit.Spades, Rank.King, 0), // 10 points
        Card.createCard(Suit.Spades, Rank.Queen, 0), // 0 points
      ];

      // Give Bot1 (attacking team) the multi-combo cards
      gameState = givePlayerCards(gameState, 1, multiComboCards);

      // Give other players lower cards so Bot1 wins
      gameState = givePlayerCards(gameState, 0, [
        // Human (defending)
        Card.createCard(Suit.Spades, Rank.Nine, 0),
        Card.createCard(Suit.Spades, Rank.Eight, 0),
        Card.createCard(Suit.Spades, Rank.Seven, 0),
      ]);
      gameState = givePlayerCards(gameState, 2, [
        // Bot2 (defending)
        Card.createCard(Suit.Spades, Rank.Six, 0),
        Card.createCard(Suit.Spades, Rank.Five, 0), // 5 points
        Card.createCard(Suit.Spades, Rank.Four, 0),
      ]);
      gameState = givePlayerCards(gameState, 3, [
        // Bot3 (attacking)
        Card.createCard(Suit.Spades, Rank.Three, 0),
        Card.createCard(Suit.Spades, Rank.Ten, 0), // 10 points
        Card.createCard(Suit.Clubs, Rank.Two, 0), // Cross-suit (not trump rank since not Hearts)
      ]);

      const initialAttackingTeamPoints = gameState.teams[1].points; // Team B (attacking)

      // Bot1 leads multi-combo
      const result1 = processPlay(gameState, multiComboCards);
      expect(result1.trickComplete).toBe(false);
      gameState = result1.newState;

      // Human follows (defending team)
      const humanCards = [
        Card.createCard(Suit.Spades, Rank.Nine, 0),
        Card.createCard(Suit.Spades, Rank.Eight, 0),
        Card.createCard(Suit.Spades, Rank.Seven, 0),
      ];
      const result2 = processPlay(gameState, humanCards);
      expect(result2.trickComplete).toBe(false);
      gameState = result2.newState;

      // Bot2 follows (defending team)
      const bot2Cards = [
        Card.createCard(Suit.Spades, Rank.Six, 0),
        Card.createCard(Suit.Spades, Rank.Five, 0),
        Card.createCard(Suit.Spades, Rank.Four, 0),
      ];
      const result3 = processPlay(gameState, bot2Cards);
      expect(result3.trickComplete).toBe(false);
      gameState = result3.newState;

      // Bot3 follows (attacking team, last player)
      const bot3Cards = [
        Card.createCard(Suit.Spades, Rank.Three, 0),
        Card.createCard(Suit.Spades, Rank.Ten, 0),
        Card.createCard(Suit.Clubs, Rank.Two, 0),
      ];
      const result4 = processPlay(gameState, bot3Cards);

      // Trick should be complete with Bot1 (attacking team) winning
      expect(result4.trickComplete).toBe(true);
      expect(result4.trickWinnerId).toBe(PlayerId.Bot1);

      // CRITICAL TEST: Points should be collected
      // Total points in trick: K♠(10) + 5♠(5) + 10♠(10) = 25 points
      const expectedPoints = 25;
      expect(result4.trickPoints).toBe(expectedPoints);

      // Team B (Bot1 + Bot3) - ATTACKING TEAM should have gained the points
      const finalAttackingTeamPoints = result4.newState.teams[1].points;
      expect(finalAttackingTeamPoints).toBe(
        initialAttackingTeamPoints + expectedPoints,
      );
    });

    it("should collect points when attacking team wins with trump multi-combo response", () => {
      // Setup: Human (defending) leads multi-combo, Bot3 (attacking) responds with trump multi-combo to win
      // Leading: 9♠ + 8♠ + 7♠ (3 singles from Spades)
      // Trump response: A♥ + K♥ + Q♥ (3 trump singles, K♥ = 10 points)
      // Bot3 must be void in Spades to play trump

      gameState.currentPlayerIndex = 0; // Human leads (defending team)

      const leadingCards = [
        Card.createCard(Suit.Spades, Rank.Nine, 0), // 0 points
        Card.createCard(Suit.Spades, Rank.Eight, 0), // 0 points
        Card.createCard(Suit.Spades, Rank.Seven, 0), // 0 points
      ];

      const trumpResponseCards = [
        Card.createCard(Suit.Hearts, Rank.Ace, 0), // Trump suit, 0 points
        Card.createCard(Suit.Hearts, Rank.King, 0), // Trump suit, 10 points
        Card.createCard(Suit.Hearts, Rank.Queen, 0), // Trump suit, 0 points
      ];

      // Give players their cards
      gameState = givePlayerCards(gameState, 0, leadingCards); // Human leads (defending)
      gameState = givePlayerCards(gameState, 1, [
        // Bot1 follows (attacking)
        Card.createCard(Suit.Spades, Rank.Six, 0),
        Card.createCard(Suit.Spades, Rank.Five, 0), // 5 points
        Card.createCard(Suit.Spades, Rank.Four, 0),
      ]);
      gameState = givePlayerCards(gameState, 2, [
        // Bot2 follows (defending)
        Card.createCard(Suit.Spades, Rank.Three, 0),
        Card.createCard(Suit.Spades, Rank.Ten, 0), // 10 points
        Card.createCard(Suit.Spades, Rank.Two, 1), // Trump rank in Spades (still follows suit)
      ]);
      gameState = givePlayerCards(gameState, 3, trumpResponseCards); // Bot3 follows (attacking, void in Spades)

      const initialAttackingTeamPoints = gameState.teams[1].points; // Team B (attacking)

      // Human leads multi-combo (defending team)
      const result1 = processPlay(gameState, leadingCards);
      expect(result1.trickComplete).toBe(false);
      gameState = result1.newState;

      // Bot1 follows (attacking team) with Spades
      const bot1Cards = [
        Card.createCard(Suit.Spades, Rank.Six, 0),
        Card.createCard(Suit.Spades, Rank.Five, 0),
        Card.createCard(Suit.Spades, Rank.Four, 0),
      ];
      const result2 = processPlay(gameState, bot1Cards);
      expect(result2.trickComplete).toBe(false);
      gameState = result2.newState;

      // Bot2 follows (defending team) with Spades
      const bot2Cards = [
        Card.createCard(Suit.Spades, Rank.Three, 0),
        Card.createCard(Suit.Spades, Rank.Ten, 0),
        Card.createCard(Suit.Spades, Rank.Two, 1),
      ];
      const result3 = processPlay(gameState, bot2Cards);
      expect(result3.trickComplete).toBe(false);
      gameState = result3.newState;

      // Bot3 responds with trump multi-combo (attacking team, void in Spades)
      const result4 = processPlay(gameState, trumpResponseCards);

      // Trick should be complete with Bot3 (attacking team) winning (trump beats non-trump)
      expect(result4.trickComplete).toBe(true);
      expect(result4.trickWinnerId).toBe(PlayerId.Bot3);

      // CRITICAL TEST: Points should be collected
      // Total points in trick: 5♠(5) + 10♠(10) + K♥(10) = 25 points
      const expectedPoints = 25;
      expect(result4.trickPoints).toBe(expectedPoints);

      // Team B (Bot1 + Bot3) - ATTACKING TEAM should have gained the points
      const finalAttackingTeamPoints = result4.newState.teams[1].points;
      expect(finalAttackingTeamPoints).toBe(
        initialAttackingTeamPoints + expectedPoints,
      );
    });
  });
});
