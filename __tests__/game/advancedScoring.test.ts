import { endRound, prepareNextRound } from '../../src/game/gameRoundManager';
import { GameState, Team, Player, Rank, TeamId } from "../../src/types";
import { createScoringGameState } from "../helpers";

describe('Advanced Scoring Rules', () => {
  const createMockGameState = (
    defendingTeam: Team,
    attackingTeam: Team
  ): GameState => {
    const state = createScoringGameState();
    state.teams = [defendingTeam, attackingTeam];
    return state;
  };

  describe('Defending Team Successfully Defends', () => {
    it('should advance defending team by 1 rank when attackers get 40-79 points', () => {
      const defendingTeam: Team = {
        id: TeamId.A,
        currentRank: Rank.Three,
        isDefending: true,
        points: 0
      };
      const attackingTeam: Team = {
        id: TeamId.B,
        currentRank: Rank.Five,
        isDefending: false,
        points: 65
      };

      const gameState = createMockGameState(defendingTeam, attackingTeam);
      const result = endRound(gameState);
      const newState = prepareNextRound(gameState, result);

      expect(result.rankChanges[TeamId.A]).toBe(Rank.Four);
      expect(result.attackingTeamWon).toBe(false);
      expect(result.roundCompleteMessage).toContain('65/80 points');
      expect(result.roundCompleteMessage).toContain('advances 1 rank to 4');
    });

    it('should advance defending team by 2 ranks when attackers get < 40 points', () => {
      const defendingTeam: Team = {
        id: TeamId.A,
        currentRank: Rank.Three,
        isDefending: true,
        points: 0
      };
      const attackingTeam: Team = {
        id: TeamId.B,
        currentRank: Rank.Five,
        isDefending: false,
        points: 25
      };

      const gameState = createMockGameState(defendingTeam, attackingTeam);
      const result = endRound(gameState);
      const newState = prepareNextRound(gameState, result);

      expect(result.rankChanges[TeamId.A]).toBe(Rank.Five);
      expect(result.attackingTeamWon).toBe(false);
      expect(result.roundCompleteMessage).toContain('held attackers to only 25 points');
      expect(result.roundCompleteMessage).toContain('advances 2 ranks to 5');
    });

    it('should advance defending team by 3 ranks when attackers get 0 points', () => {
      const defendingTeam: Team = {
        id: TeamId.A,
        currentRank: Rank.Three,
        isDefending: true,
        points: 0
      };
      const attackingTeam: Team = {
        id: TeamId.B,
        currentRank: Rank.Five,
        isDefending: false,
        points: 0
      };

      const gameState = createMockGameState(defendingTeam, attackingTeam);
      const result = endRound(gameState);
      const newState = prepareNextRound(gameState, result);

      expect(result.rankChanges[TeamId.A]).toBe(Rank.Six);
      expect(result.attackingTeamWon).toBe(false);
      expect(result.roundCompleteMessage).toContain('shut out the attackers');
      expect(result.roundCompleteMessage).toContain('advances 3 ranks to 6');
    });

    it('should advance defending team to Ace and continue game', () => {
      const defendingTeam: Team = {
        id: TeamId.A,
        currentRank: Rank.King,
        isDefending: true,
        points: 0
      };
      const attackingTeam: Team = {
        id: TeamId.B,
        currentRank: Rank.Five,
        isDefending: false,
        points: 50  // 1 rank advancement: King -> Ace
      };

      const gameState = createMockGameState(defendingTeam, attackingTeam);
      const result = endRound(gameState);

      expect(result.gameOver).toBe(false);
      expect(result.rankChanges[TeamId.A]).toBe(Rank.Ace);
    });

    it('should cap defending team at Ace when would advance beyond', () => {
      const defendingTeam: Team = {
        id: TeamId.A,
        currentRank: Rank.King,
        isDefending: true,
        points: 0
      };
      const attackingTeam: Team = {
        id: TeamId.B,
        currentRank: Rank.Five,
        isDefending: false,
        points: 0  // 3 rank advancement: King -> capped at Ace
      };

      const gameState = createMockGameState(defendingTeam, attackingTeam);
      const result = endRound(gameState);

      expect(result.gameOver).toBe(false);
      expect(result.rankChanges[TeamId.A]).toBe(Rank.Ace);
      expect(result.roundCompleteMessage).toContain('reached Ace! They must now defend Ace to win');
    });
  });

  describe('Attacking Team Wins', () => {
    it('should switch roles without rank advancement when attackers get 80-119 points', () => {
      const defendingTeam: Team = {
        id: TeamId.A,
        currentRank: Rank.Three,
        isDefending: true,
        points: 0
      };
      const attackingTeam: Team = {
        id: TeamId.B,
        currentRank: Rank.Five,
        isDefending: false,
        points: 100
      };

      const gameState = createMockGameState(defendingTeam, attackingTeam);
      const result = endRound(gameState);
      const newState = prepareNextRound(gameState, result);

      expect(result.rankChanges[TeamId.B]).toBe(Rank.Five); // No rank change
      expect(result.attackingTeamWon).toBe(true); // Attacking team won, so roles will switch
      expect(result.roundCompleteMessage).toContain('won with 100 points');
      expect(result.roundCompleteMessage).toContain('will defend next round at rank 5');
    });

    it('should advance attacking team by 1 rank when they get 120-159 points', () => {
      const defendingTeam: Team = {
        id: TeamId.A,
        currentRank: Rank.Three,
        isDefending: true,
        points: 0
      };
      const attackingTeam: Team = {
        id: TeamId.B,
        currentRank: Rank.Five,
        isDefending: false,
        points: 140
      };

      const gameState = createMockGameState(defendingTeam, attackingTeam);
      const result = endRound(gameState);
      const newState = prepareNextRound(gameState, result);

      expect(result.rankChanges[TeamId.B]).toBe(Rank.Six);
      expect(result.attackingTeamWon).toBe(true);
      expect(result.roundCompleteMessage).toContain('won with 140 points');
      expect(result.roundCompleteMessage).toContain('advanced 1 rank to 6');
    });

    it('should advance attacking team by 2 ranks when they get 160-199 points', () => {
      const defendingTeam: Team = {
        id: TeamId.A,
        currentRank: Rank.Three,
        isDefending: true,
        points: 0
      };
      const attackingTeam: Team = {
        id: TeamId.B,
        currentRank: Rank.Five,
        isDefending: false,
        points: 180
      };

      const gameState = createMockGameState(defendingTeam, attackingTeam);
      const result = endRound(gameState);
      const newState = prepareNextRound(gameState, result);

      expect(result.rankChanges[TeamId.B]).toBe(Rank.Seven);
      expect(result.attackingTeamWon).toBe(true);
      expect(result.roundCompleteMessage).toContain('won with 180 points');
      expect(result.roundCompleteMessage).toContain('advanced 2 ranks to 7');
    });

    it('should advance attacking team by 3 ranks when they get 200+ points', () => {
      const defendingTeam: Team = {
        id: TeamId.A,
        currentRank: Rank.Three,
        isDefending: true,
        points: 0
      };
      const attackingTeam: Team = {
        id: TeamId.B,
        currentRank: Rank.Five,
        isDefending: false,
        points: 220
      };

      const gameState = createMockGameState(defendingTeam, attackingTeam);
      const result = endRound(gameState);
      const newState = prepareNextRound(gameState, result);

      expect(result.rankChanges[TeamId.B]).toBe(Rank.Eight);
      expect(result.attackingTeamWon).toBe(true);
      expect(result.roundCompleteMessage).toContain('won with 220 points');
      expect(result.roundCompleteMessage).toContain('advanced 3 ranks to 8');
    });

    it('should advance attacking team to Ace and continue game', () => {
      const defendingTeam: Team = {
        id: TeamId.A,
        currentRank: Rank.Three,
        isDefending: true,
        points: 0
      };
      const attackingTeam: Team = {
        id: TeamId.B,
        currentRank: Rank.King,
        isDefending: false,
        points: 120  // 1 rank advancement: King -> Ace
      };

      const gameState = createMockGameState(defendingTeam, attackingTeam);
      const result = endRound(gameState);

      expect(result.gameOver).toBe(false);
      expect(result.rankChanges[TeamId.B]).toBe(Rank.Ace);
    });

    it('should cap attacking team at Ace when would advance beyond', () => {
      const defendingTeam: Team = {
        id: TeamId.A,
        currentRank: Rank.Three,
        isDefending: true,
        points: 0
      };
      const attackingTeam: Team = {
        id: TeamId.B,
        currentRank: Rank.King,
        isDefending: false,
        points: 160  // 2 rank advancement: King -> capped at Ace
      };

      const gameState = createMockGameState(defendingTeam, attackingTeam);
      const result = endRound(gameState);

      expect(result.gameOver).toBe(false);
      expect(result.rankChanges[TeamId.B]).toBe(Rank.Ace);
      expect(result.roundCompleteMessage).toContain('reached Ace! They must now defend Ace to win');
    });
  });

  describe('Edge Cases', () => {
    it('should end game when team at Ace would advance further', () => {
      // Test defending team at Ace winning
      const defendingAtAce = createMockGameState(
        { id: TeamId.A, currentRank: Rank.Ace, isDefending: true, points: 0 },
        { id: TeamId.B, currentRank: Rank.Five, isDefending: false, points: 0 }
      );
      const resultDefending = endRound(defendingAtAce);
      expect(resultDefending.gameOver).toBe(true);
      expect(resultDefending.gameWinner).toBe(TeamId.A);
      expect(resultDefending.roundCompleteMessage).toContain('wins the game by successfully defending Ace!');

      // Test attacking team at King advancing to Ace (should continue game)
      const attackingAtKing = createMockGameState(
        { id: TeamId.A, currentRank: Rank.Three, isDefending: true, points: 0 },
        { id: TeamId.B, currentRank: Rank.King, isDefending: false, points: 120 }
      );
      const resultAttacking = endRound(attackingAtKing);
      expect(resultAttacking.gameOver).toBe(false);
      expect(resultAttacking.rankChanges[TeamId.B]).toBe(Rank.Ace);

      // Test attacking team at Ace winning (should continue game - attacking teams never trigger game over)
      const attackingAtAce = createMockGameState(
        { id: TeamId.A, currentRank: Rank.Three, isDefending: true, points: 0 },
        { id: TeamId.B, currentRank: Rank.Ace, isDefending: false, points: 120 }
      );
      const resultAttackingAce = endRound(attackingAtAce);
      expect(resultAttackingAce.gameOver).toBe(false);
      expect(resultAttackingAce.rankChanges[TeamId.B]).toBe(Rank.Ace); // Stays at Ace

      // Test attacking team at Queen advancing to Ace (should continue game)  
      const attackingAtQueen = createMockGameState(
        { id: TeamId.A, currentRank: Rank.Three, isDefending: true, points: 0 },
        { id: TeamId.B, currentRank: Rank.Queen, isDefending: false, points: 160 }
      );
      const resultAttackingQueen = endRound(attackingAtQueen);
      expect(resultAttackingQueen.gameOver).toBe(false);
      expect(resultAttackingQueen.rankChanges[TeamId.B]).toBe(Rank.Ace);
      expect(resultAttackingQueen.roundCompleteMessage).toContain('reached Ace! They must now defend Ace to win');

      // Test defending team at King defending against 0 points (3 ranks = capped at Ace)
      const defendingAtKing = createMockGameState(
        { id: TeamId.A, currentRank: Rank.King, isDefending: true, points: 0 },
        { id: TeamId.B, currentRank: Rank.Five, isDefending: false, points: 0 }
      );
      const resultDefendingKing = endRound(defendingAtKing);
      expect(resultDefendingKing.gameOver).toBe(false);
      expect(resultDefendingKing.rankChanges[TeamId.A]).toBe(Rank.Ace);
      expect(resultDefendingKing.roundCompleteMessage).toContain('reached Ace! They must now defend Ace to win');

      // Test defending team at Queen advancing to Ace (should continue game)
      const defendingAtQueen = createMockGameState(
        { id: TeamId.A, currentRank: Rank.Queen, isDefending: true, points: 0 },
        { id: TeamId.B, currentRank: Rank.Five, isDefending: false, points: 30 }
      );
      const resultDefendingQueen = endRound(defendingAtQueen);
      expect(resultDefendingQueen.gameOver).toBe(false);
      expect(resultDefendingQueen.rankChanges[TeamId.A]).toBe(Rank.Ace);
      expect(resultDefendingQueen.roundCompleteMessage).toContain('reached Ace! They must now defend Ace to win');

      // Test defending team at Ten defending with <40 points (advances to Ace exactly)
      const defendingAtTen = createMockGameState(
        { id: TeamId.A, currentRank: Rank.Ten, isDefending: true, points: 0 },
        { id: TeamId.B, currentRank: Rank.Five, isDefending: false, points: 30 }
      );
      const resultDefendingTen = endRound(defendingAtTen);
      expect(resultDefendingTen.gameOver).toBe(false);
      expect(resultDefendingTen.gameWinner).toBe(undefined);
      expect(resultDefendingTen.rankChanges[TeamId.A]).toBe(Rank.Queen);
      expect(resultDefendingTen.roundCompleteMessage).toContain('advances 2 ranks to Q');
    });

    it('should handle exact point boundaries correctly', () => {
      // Test 40 points (should be 1 rank advancement)
      const gameState40 = createMockGameState(
        { id: TeamId.A, currentRank: Rank.Three, isDefending: true, points: 0 },
        { id: TeamId.B, currentRank: Rank.Five, isDefending: false, points: 40 }
      );
      const result40 = endRound(gameState40);
      expect(result40.rankChanges[TeamId.A]).toBe(Rank.Four);

      // Test 80 points (attacking team wins, no advancement)
      const gameState80 = createMockGameState(
        { id: TeamId.A, currentRank: Rank.Three, isDefending: true, points: 0 },
        { id: TeamId.B, currentRank: Rank.Five, isDefending: false, points: 80 }
      );
      const result80 = endRound(gameState80);
      expect(result80.rankChanges[TeamId.B]).toBe(Rank.Five);
      expect(result80.attackingTeamWon).toBe(true);

      // Test 120 points (attacking team wins, 1 rank advancement)
      const gameState120 = createMockGameState(
        { id: TeamId.A, currentRank: Rank.Three, isDefending: true, points: 0 },
        { id: TeamId.B, currentRank: Rank.Five, isDefending: false, points: 120 }
      );
      const result120 = endRound(gameState120);
      expect(result120.rankChanges[TeamId.B]).toBe(Rank.Six);
    });

    it('should reset team points for the next round', () => {
      const gameState = createMockGameState(
        { id: TeamId.A, currentRank: Rank.Three, isDefending: true, points: 50 },
        { id: TeamId.B, currentRank: Rank.Five, isDefending: false, points: 100 }
      );
      const result = endRound(gameState);
      const newState = prepareNextRound(gameState, result);

      expect(newState.teams[0].points).toBe(0);
      expect(newState.teams[1].points).toBe(0);
    });
  });
});