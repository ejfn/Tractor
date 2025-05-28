import { endRound } from '../../src/game/gameRoundManager';
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

      expect(result.newState.teams[0].currentRank).toBe(Rank.Four);
      expect(result.newState.teams[0].isDefending).toBe(true);
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

      expect(result.newState.teams[0].currentRank).toBe(Rank.Five);
      expect(result.newState.teams[0].isDefending).toBe(true);
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

      expect(result.newState.teams[0].currentRank).toBe(Rank.Six);
      expect(result.newState.teams[0].isDefending).toBe(true);
      expect(result.roundCompleteMessage).toContain('shut out the attackers');
      expect(result.roundCompleteMessage).toContain('advances 3 ranks to 6');
    });

    it('should win the game when defending team reaches Ace', () => {
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
        points: 0
      };

      const gameState = createMockGameState(defendingTeam, attackingTeam);
      const result = endRound(gameState);

      expect(result.gameOver).toBe(true);
      expect(result.winner).toBe('A');
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

      expect(result.newState.teams[1].currentRank).toBe(Rank.Five); // No rank change
      expect(result.newState.teams[1].isDefending).toBe(true); // Now defending
      expect(result.newState.teams[0].isDefending).toBe(false); // Now attacking
      expect(result.roundCompleteMessage).toContain('won with 100 points');
      expect(result.roundCompleteMessage).toContain('will defend at rank 5');
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

      expect(result.newState.teams[1].currentRank).toBe(Rank.Six);
      expect(result.newState.teams[1].isDefending).toBe(true);
      expect(result.roundCompleteMessage).toContain('won with 140 points');
      expect(result.roundCompleteMessage).toContain('advances 1 rank to 6');
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

      expect(result.newState.teams[1].currentRank).toBe(Rank.Seven);
      expect(result.newState.teams[1].isDefending).toBe(true);
      expect(result.roundCompleteMessage).toContain('won with 180 points');
      expect(result.roundCompleteMessage).toContain('advances 2 ranks to 7');
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

      expect(result.newState.teams[1].currentRank).toBe(Rank.Eight);
      expect(result.newState.teams[1].isDefending).toBe(true);
      expect(result.roundCompleteMessage).toContain('won with 220 points');
      expect(result.roundCompleteMessage).toContain('advances 3 ranks to 8');
    });

    it('should win the game when attacking team reaches Ace', () => {
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
        points: 160
      };

      const gameState = createMockGameState(defendingTeam, attackingTeam);
      const result = endRound(gameState);

      expect(result.gameOver).toBe(true);
      expect(result.winner).toBe('B');
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
      expect(resultDefending.winner).toBe('A');
      expect(resultDefending.roundCompleteMessage).toBe('');

      // Test attacking team at King winning with high points (would go beyond Ace)
      const attackingAtKing = createMockGameState(
        { id: TeamId.A, currentRank: Rank.Three, isDefending: true, points: 0 },
        { id: TeamId.B, currentRank: Rank.King, isDefending: false, points: 120 }
      );
      const resultAttacking = endRound(attackingAtKing);
      expect(resultAttacking.gameOver).toBe(true);
      expect(resultAttacking.winner).toBe('B');
      expect(resultAttacking.roundCompleteMessage).toBe('');

      // Test attacking team at Queen winning with very high points (would go 2 ranks beyond Ace)
      const attackingAtQueen = createMockGameState(
        { id: TeamId.A, currentRank: Rank.Three, isDefending: true, points: 0 },
        { id: TeamId.B, currentRank: Rank.Queen, isDefending: false, points: 160 }
      );
      const resultAttackingQueen = endRound(attackingAtQueen);
      expect(resultAttackingQueen.gameOver).toBe(true);
      expect(resultAttackingQueen.winner).toBe('B');
      expect(resultAttackingQueen.roundCompleteMessage).toBe('');

      // Test defending team at King defending against 0 points (would advance 3 ranks beyond Ace)
      const defendingAtKing = createMockGameState(
        { id: TeamId.A, currentRank: Rank.King, isDefending: true, points: 0 },
        { id: TeamId.B, currentRank: Rank.Five, isDefending: false, points: 0 }
      );
      const resultDefendingKing = endRound(defendingAtKing);
      expect(resultDefendingKing.gameOver).toBe(true);
      expect(resultDefendingKing.winner).toBe('A');
      expect(resultDefendingKing.roundCompleteMessage).toBe('');

      // Test defending team at Queen defending with <40 points (would advance 2 ranks beyond Ace)
      const defendingAtQueen = createMockGameState(
        { id: TeamId.A, currentRank: Rank.Queen, isDefending: true, points: 0 },
        { id: TeamId.B, currentRank: Rank.Five, isDefending: false, points: 30 }
      );
      const resultDefendingQueen = endRound(defendingAtQueen);
      expect(resultDefendingQueen.gameOver).toBe(true);
      expect(resultDefendingQueen.winner).toBe('A');
      expect(resultDefendingQueen.roundCompleteMessage).toBe('');

      // Test defending team at Ten defending with <40 points (advances to Ace exactly)
      const defendingAtTen = createMockGameState(
        { id: TeamId.A, currentRank: Rank.Ten, isDefending: true, points: 0 },
        { id: TeamId.B, currentRank: Rank.Five, isDefending: false, points: 30 }
      );
      const resultDefendingTen = endRound(defendingAtTen);
      expect(resultDefendingTen.gameOver).toBe(false);
      expect(resultDefendingTen.winner).toBe(null);
      expect(resultDefendingTen.newState.teams[0].currentRank).toBe(Rank.Queen);
      expect(resultDefendingTen.roundCompleteMessage).toContain('advances 2 ranks to Q');
    });

    it('should handle exact point boundaries correctly', () => {
      // Test 40 points (should be 1 rank advancement)
      const gameState40 = createMockGameState(
        { id: TeamId.A, currentRank: Rank.Three, isDefending: true, points: 0 },
        { id: TeamId.B, currentRank: Rank.Five, isDefending: false, points: 40 }
      );
      const result40 = endRound(gameState40);
      expect(result40.newState.teams[0].currentRank).toBe(Rank.Four);

      // Test 80 points (attacking team wins, no advancement)
      const gameState80 = createMockGameState(
        { id: TeamId.A, currentRank: Rank.Three, isDefending: true, points: 0 },
        { id: TeamId.B, currentRank: Rank.Five, isDefending: false, points: 80 }
      );
      const result80 = endRound(gameState80);
      expect(result80.newState.teams[1].currentRank).toBe(Rank.Five);
      expect(result80.newState.teams[1].isDefending).toBe(true);

      // Test 120 points (attacking team wins, 1 rank advancement)
      const gameState120 = createMockGameState(
        { id: TeamId.A, currentRank: Rank.Three, isDefending: true, points: 0 },
        { id: TeamId.B, currentRank: Rank.Five, isDefending: false, points: 120 }
      );
      const result120 = endRound(gameState120);
      expect(result120.newState.teams[1].currentRank).toBe(Rank.Six);
    });

    it('should reset team points for the next round', () => {
      const gameState = createMockGameState(
        { id: TeamId.A, currentRank: Rank.Three, isDefending: true, points: 50 },
        { id: TeamId.B, currentRank: Rank.Five, isDefending: false, points: 100 }
      );
      const result = endRound(gameState);

      expect(result.newState.teams[0].points).toBe(0);
      expect(result.newState.teams[1].points).toBe(0);
    });
  });
});