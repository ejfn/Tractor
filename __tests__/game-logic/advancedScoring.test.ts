import { endRound } from '../../src/utils/gameRoundManager';
import { GameState, Team, Player, Rank } from '../../src/types/game';
import { GameStateUtils } from '../../src/utils/gameStateUtils';
import { createTestGameState, createTestCard, createTest } from '../helpers/testUtils';

describe('Advanced Scoring Rules', () => {
  const createMockGameState = (
    defendingTeam: Team,
    attackingTeam: Team
  ): GameState => ({
    players: {},
    teams: { 'A': defendingTeam, 'B': attackingTeam },
    deck: [],
    trumpInfo: {
      trumpRank: Rank.Two,
      trumpSuit: undefined,
      declared: false
    },
    currentTrick: null,
    gamePhase: 'playing',
    tricks: [],
    roundNumber: 1,
    kittyCards: [],
    currentPlayerId: 'player',
    selectedCards: []
  });

  describe('Defending Team Successfully Defends', () => {
    it('should advance defending team by 1 rank when attackers get 40-79 points', () => {
      const defendingTeam: Team = {
        id: 'A',
        isDefending: true,
        
        currentRank: Rank.Two,
        points: 0
      };
      const attackingTeam: Team = {
        id: 'B',
        isDefending: false,
        
        currentRank: Rank.Two,
        points: 65
      };

      const gameState = createMockGameState(defendingTeam, attackingTeam);
      const result = endRound(gameState);

      expect(result.newState.teams['A'].currentRank).toBe(Rank.Three);
      expect(result.newState.teams['A'].isDefending).toBe(true);
      expect(result.roundCompleteMessage).toContain('65/80 points');
      expect(result.roundCompleteMessage).toContain('advances 1 rank to 3');
    });

    it('should advance defending team by 2 ranks when attackers get < 40 points', () => {
      const defendingTeam: Team = {
        id: 'A',
        isDefending: true,
        
        currentRank: Rank.Two,
        points: 0
      };
      const attackingTeam: Team = {
        id: 'B',
        isDefending: false,
        
        currentRank: Rank.Two,
        points: 25
      };

      const gameState = createMockGameState(defendingTeam, attackingTeam);
      const result = endRound(gameState);

      expect(result.newState.teams['A'].currentRank).toBe(Rank.Four);
      expect(result.newState.teams['A'].isDefending).toBe(true);
      expect(result.roundCompleteMessage).toContain('held attackers to only 25 points');
      expect(result.roundCompleteMessage).toContain('advances 2 ranks to 4');
    });

    it('should advance defending team by 3 ranks when attackers get 0 points', () => {
      const defendingTeam: Team = {
        id: 'A',
        isDefending: true,
        
        currentRank: Rank.Two,
        points: 0
      };
      const attackingTeam: Team = {
        id: 'B',
        isDefending: false,
        
        currentRank: Rank.Two,
        points: 0
      };

      const gameState = createMockGameState(defendingTeam, attackingTeam);
      const result = endRound(gameState);

      expect(result.newState.teams['A'].currentRank).toBe(Rank.Five);
      expect(result.newState.teams['A'].isDefending).toBe(true);
      expect(result.roundCompleteMessage).toContain('shut out the attackers');
      expect(result.roundCompleteMessage).toContain('advances 3 ranks to 5');
    });

    it('should win the game when defending team reaches Ace', () => {
      const defendingTeam: Team = {
        id: 'A',
        isDefending: true,
        
        currentRank: Rank.Jack,
        points: 0
      };
      const attackingTeam: Team = {
        id: 'B',
        isDefending: false,
        
        currentRank: Rank.Two,
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
        id: 'A',
        isDefending: true,
        
        currentRank: Rank.Two,
        points: 0
      };
      const attackingTeam: Team = {
        id: 'B',
        isDefending: false,
        
        currentRank: Rank.Two,
        points: 100
      };

      const gameState = createMockGameState(defendingTeam, attackingTeam);
      const result = endRound(gameState);

      expect(result.newState.teams['B'].currentRank).toBe(Rank.Two); // No rank change
      expect(result.newState.teams['B'].isDefending).toBe(true); // Now defending
      expect(result.newState.teams['A'].isDefending).toBe(false); // Now attacking
      expect(result.roundCompleteMessage).toContain('won with 100 points');
      expect(result.roundCompleteMessage).toContain('will defend at rank 2');
    });

    it('should advance attacking team by 1 rank when they get 120-159 points', () => {
      const defendingTeam: Team = {
        id: 'A',
        isDefending: true,
        
        currentRank: Rank.Two,
        points: 0
      };
      const attackingTeam: Team = {
        id: 'B',
        isDefending: false,
        
        currentRank: Rank.Two,
        points: 140
      };

      const gameState = createMockGameState(defendingTeam, attackingTeam);
      const result = endRound(gameState);

      expect(result.newState.teams['B'].currentRank).toBe(Rank.Three);
      expect(result.newState.teams['B'].isDefending).toBe(true);
      expect(result.roundCompleteMessage).toContain('won with 140 points');
      expect(result.roundCompleteMessage).toContain('advances 1 rank to 3');
    });

    it('should advance attacking team by 2 ranks when they get 160-199 points', () => {
      const defendingTeam: Team = {
        id: 'A',
        isDefending: true,
        
        currentRank: Rank.Two,
        points: 0
      };
      const attackingTeam: Team = {
        id: 'B',
        isDefending: false,
        
        currentRank: Rank.Two,
        points: 180
      };

      const gameState = createMockGameState(defendingTeam, attackingTeam);
      const result = endRound(gameState);

      expect(result.newState.teams['B'].currentRank).toBe(Rank.Four);
      expect(result.newState.teams['B'].isDefending).toBe(true);
      expect(result.roundCompleteMessage).toContain('won with 180 points');
      expect(result.roundCompleteMessage).toContain('advances 2 ranks to 4');
    });

    it('should advance attacking team by 3 ranks when they get 200+ points', () => {
      const defendingTeam: Team = {
        id: 'A',
        isDefending: true,
        
        currentRank: Rank.Two,
        points: 0
      };
      const attackingTeam: Team = {
        id: 'B',
        isDefending: false,
        
        currentRank: Rank.Two,
        points: 220
      };

      const gameState = createMockGameState(defendingTeam, attackingTeam);
      const result = endRound(gameState);

      expect(result.newState.teams['B'].currentRank).toBe(Rank.Five);
      expect(result.newState.teams['B'].isDefending).toBe(true);
      expect(result.roundCompleteMessage).toContain('won with 220 points');
      expect(result.roundCompleteMessage).toContain('advances 3 ranks to 5');
    });

    it('should win the game when attacking team reaches Ace', () => {
      const defendingTeam: Team = {
        id: 'A',
        isDefending: true,
        
        currentRank: Rank.Two,
        points: 0
      };
      const attackingTeam: Team = {
        id: 'B',
        isDefending: false,
        
        currentRank: Rank.Queen,
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
        { id: 'A', isDefending: true,  currentRank: Rank.Ace,
        points: 0 },
        { id: 'B', isDefending: false,  currentRank: Rank.Two,
        points: 0 }
      );
      const resultDefending = endRound(defendingAtAce);
      expect(resultDefending.gameOver).toBe(true);
      expect(resultDefending.winner).toBe('A');
      expect(resultDefending.roundCompleteMessage).toBe('');

      // Test attacking team at King winning with high points (would go beyond Ace)
      const attackingAtKing = createMockGameState(
        { id: 'A', isDefending: true,  currentRank: Rank.Two,
        points: 0 },
        { id: 'B', isDefending: false,  currentRank: Rank.King,
        points: 160 }
      );
      const resultAttacking = endRound(attackingAtKing);
      expect(resultAttacking.gameOver).toBe(true);
      expect(resultAttacking.winner).toBe('B');
      expect(resultAttacking.roundCompleteMessage).toBe('');

      // Test attacking team at Queen winning with very high points (would go 2 ranks beyond Ace)
      const attackingAtQueen = createMockGameState(
        { id: 'A', isDefending: true,  currentRank: Rank.Two,
        points: 0 },
        { id: 'B', isDefending: false,  currentRank: Rank.Queen,
        points: 200 }
      );
      const resultAttackingQueen = endRound(attackingAtQueen);
      expect(resultAttackingQueen.gameOver).toBe(true);
      expect(resultAttackingQueen.winner).toBe('B');
      expect(resultAttackingQueen.roundCompleteMessage).toBe('');

      // Test defending team at King defending against 0 points (would advance 3 ranks beyond Ace)
      const defendingAtKing = createMockGameState(
        { id: 'A', isDefending: true,  currentRank: Rank.King,
        points: 0 },
        { id: 'B', isDefending: false,  currentRank: Rank.Two,
        points: 0 }
      );
      const resultDefendingKing = endRound(defendingAtKing);
      expect(resultDefendingKing.gameOver).toBe(true);
      expect(resultDefendingKing.winner).toBe('A');
      expect(resultDefendingKing.roundCompleteMessage).toBe('');

      // Test defending team at Queen defending with <40 points (would advance 2 ranks beyond Ace)
      const defendingAtQueen = createMockGameState(
        { id: 'A', isDefending: true,  currentRank: Rank.Queen,
        points: 0 },
        { id: 'B', isDefending: false,  currentRank: Rank.Two,
        points: 30 }
      );
      const resultDefendingQueen = endRound(defendingAtQueen);
      expect(resultDefendingQueen.gameOver).toBe(true);
      expect(resultDefendingQueen.winner).toBe('A');
      expect(resultDefendingQueen.roundCompleteMessage).toBe('');

      // Test defending team at Ten defending with <40 points (advances to Ace exactly)
      const defendingAtTen = createMockGameState(
        { id: 'A', isDefending: true,  currentRank: Rank.Ten,
        points: 0 },
        { id: 'B', isDefending: false,  currentRank: Rank.Two,
        points: 30 }
      );
      const resultDefendingTen = endRound(defendingAtTen);
      expect(resultDefendingTen.gameOver).toBe(false);
      expect(resultDefendingTen.winner).toBe(null);
      expect(resultDefendingTen.newState.teams['A'].currentRank).toBe(Rank.Queen);
      expect(resultDefendingTen.roundCompleteMessage).toContain('advances 2 ranks to Q');
    });

    it('should handle exact point boundaries correctly', () => {
      // Test 40 points (should be 1 rank advancement)
      const gameState40 = createMockGameState(
        { id: 'A', isDefending: true,  currentRank: Rank.Two,
        points: 0 },
        { id: 'B', isDefending: false,  currentRank: Rank.Two,
        points: 40 }
      );
      const result40 = endRound(gameState40);
      expect(result40.newState.teams['A'].currentRank).toBe(Rank.Three);

      // Test 80 points (attacking team wins, no advancement)
      const gameState80 = createMockGameState(
        { id: 'A', isDefending: true,  currentRank: Rank.Two,
        points: 0 },
        { id: 'B', isDefending: false,  currentRank: Rank.Two,
        points: 80 }
      );
      const result80 = endRound(gameState80);
      expect(result80.newState.teams['B'].currentRank).toBe(Rank.Two);
      expect(result80.newState.teams['B'].isDefending).toBe(true);

      // Test 120 points (attacking team wins, 1 rank advancement)
      const gameState120 = createMockGameState(
        { id: 'A', isDefending: true,  currentRank: Rank.Two,
        points: 0 },
        { id: 'B', isDefending: false,  currentRank: Rank.Two,
        points: 120 }
      );
      const result120 = endRound(gameState120);
      expect(result120.newState.teams['B'].currentRank).toBe(Rank.Three);
    });

    it('should reset team points for the next round', () => {
      const gameState = createMockGameState(
        { id: 'A', isDefending: true,  currentRank: Rank.Two,
        points: 25 },
        { id: 'B', isDefending: false,  currentRank: Rank.Two,
        points: 65 }
      );
      const result = endRound(gameState);

      expect(result.newState.teams['A'].points).toBe(0);
      expect(result.newState.teams['B'].points).toBe(0);
    });
  });
});
