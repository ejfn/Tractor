import {
  initializeGame,
  initializeTrumpDeclarationState,
} from "../utils/gameInitialization";
import { GamePhase, GameState, Rank, RoundResult, TeamId } from "../types";

/**
 * Prepares the game state for the next round using round result information
 * @param state Current game state
 * @param roundResult Result from endRound() containing computed changes to apply
 * @returns Updated game state ready for the next round
 */
export function prepareNextRound(
  state: GameState,
  roundResult: RoundResult,
): GameState {
  const newState = { ...state };

  newState.roundNumber++;
  newState.gamePhase = GamePhase.Dealing;

  // Apply computed changes from round result

  // Apply rank changes
  Object.entries(roundResult.rankChanges).forEach(([teamId, newRank]) => {
    const team = newState.teams.find((t) => t.id === (teamId as TeamId));
    if (team) {
      team.currentRank = newRank;
    }
  });

  // Handle team role switching if attacking team won
  if (roundResult.attackingTeamWon) {
    const defendingTeam = newState.teams.find((t) => t.isDefending);
    const attackingTeam = newState.teams.find((t) => !t.isDefending);

    if (defendingTeam && attackingTeam) {
      defendingTeam.isDefending = false;
      attackingTeam.isDefending = true;
    }
  }

  // Reset team points for next round
  newState.teams.forEach((team) => {
    team.points = 0;
  });

  // Clear kitty info for next round
  newState.roundEndKittyInfo = undefined;

  // Set trump rank to defending team's rank (after potential role switch)
  const newDefendingTeam = newState.teams.find((t) => t.isDefending);
  if (newDefendingTeam) {
    newState.trumpInfo.trumpRank = newDefendingTeam.currentRank;
    newState.trumpInfo.trumpSuit = undefined; // No trump declared yet
  }

  // Create and shuffle a new deck
  const deck = initializeGame().deck;

  newState.deck = deck;

  // Clear player hands for progressive dealing
  newState.players.forEach((player) => {
    player.hand = [];
  });

  // Clear kitty cards for progressive dealing
  newState.kittyCards = [];

  // Reset trick history
  newState.tricks = [];
  newState.currentTrick = null;

  // Note: lastRoundStartingPlayerIndex is now saved when transitioning to Playing phase
  // in declareTrumpSuit to avoid issues with AI rotation during declaring phase

  // Determine first player for the round based on rules:
  // First round: Trump declarer goes first (their team becomes defending)
  // Subsequent rounds:
  //   - If defending team successfully defended, the OTHER player on the defending team goes first
  //   - If attacking team won, the next player counter-clockwise (from the attacking team) goes first

  // Get the defending team
  const defendingTeam = newDefendingTeam;

  // Get the player IDs from each team
  const defendingPlayers = newState.players.filter(
    (p) => p.team === defendingTeam?.id,
  );

  // Determine who should start the new round based on game rules
  let nextRoundStartingPlayerIndex: number;

  // For subsequent rounds (round 2+), use round outcome rules
  if (newState.roundNumber > 1) {
    // Rule:
    // - If defending team successfully defended, the OTHER player on defending team goes first
    // - If attacking team won, next player counter-clockwise goes first

    // Get the player who started the previous round
    const lastRoundStarter =
      newState.players[newState.roundStartingPlayerIndex];

    // Validate that we have a valid last round starter
    if (!lastRoundStarter) {
      // Fallback: Use first defending player if no valid last starter
      nextRoundStartingPlayerIndex = newState.players.indexOf(
        defendingPlayers[0],
      );
    } else {
      // Check if this player is on the current defending team
      const isLastStarterOnCurrentDefendingTeam =
        lastRoundStarter.team === defendingTeam?.id;

      // If the last starter is NOT on the current defending team, it means teams switched
      // This happens when the attacking team wins
      const didAttackingTeamWin = !isLastStarterOnCurrentDefendingTeam;

      if (didAttackingTeamWin) {
        // Attacking team won (teams switched roles)
        // Next player counter-clockwise from the last round starter goes first
        nextRoundStartingPlayerIndex =
          (newState.roundStartingPlayerIndex + 1) % newState.players.length;
      } else {
        // Defending team successfully defended
        // The other player on defending team should start

        // Find which player on the defending team played first last round
        const defendingTeamLastRoundStarter = defendingPlayers.find(
          (p) =>
            newState.players.indexOf(p) === newState.roundStartingPlayerIndex,
        );

        if (defendingTeamLastRoundStarter) {
          // The other player on the defending team goes first
          const otherPlayer = defendingPlayers.find(
            (p) => p.id !== defendingTeamLastRoundStarter.id,
          );

          if (otherPlayer) {
            nextRoundStartingPlayerIndex =
              newState.players.indexOf(otherPlayer);
          } else {
            // Fallback
            nextRoundStartingPlayerIndex = newState.players.indexOf(
              defendingPlayers[0],
            );
          }
        } else {
          // If we can't determine who played first last round
          nextRoundStartingPlayerIndex = newState.players.indexOf(
            defendingPlayers[0],
          );
        }
      }
    }
  } else {
    // Round 1: Check if there's already a trump declaration, otherwise Human starts by default
    if (newState.trumpDeclarationState?.currentDeclaration?.playerId) {
      // Trump declarer starts the first round
      const declarerId =
        newState.trumpDeclarationState.currentDeclaration.playerId;
      const declarerIndex = newState.players.findIndex(
        (p) => p.id === declarerId,
      );
      nextRoundStartingPlayerIndex = declarerIndex >= 0 ? declarerIndex : 0;
    } else {
      // No trump declaration yet, Human starts by default (can be updated during dealing)
      nextRoundStartingPlayerIndex = 0; // Human (index 0)
    }
  }

  // Set the round starting player (this may be updated during trump declarations in round 1)
  newState.roundStartingPlayerIndex = nextRoundStartingPlayerIndex;

  // currentPlayerIndex will be set to roundStartingPlayerIndex when transitioning to playing phase
  // For now, set it for dealing phase to start dealing from the correct player
  newState.currentPlayerIndex = nextRoundStartingPlayerIndex;

  // Reset trump declaration state for new round (AFTER we've used it to determine starting player)
  newState.trumpDeclarationState = initializeTrumpDeclarationState();

  // Reset dealing state for progressive dealing
  newState.dealingState = undefined;

  // Set phase to dealing for progressive dealing system
  newState.gamePhase = GamePhase.Dealing;

  return newState;
}

/**
 * Processes the end of a round and computes outcomes (pure function - no state changes)
 * @param state Current game state
 * @returns RoundResult containing all computed information for modal display and next round preparation
 */
export function endRound(state: GameState): RoundResult {
  let gameOver = false;
  let gameWinner: TeamId | undefined = undefined;
  let roundCompleteMessage = "";
  let attackingTeamWon = false;
  const rankChanges: Record<TeamId, Rank> = {} as Record<TeamId, Rank>;
  let finalPoints = 0;
  let pointsBreakdown = "";

  // Calculate scores and determine if a team levels up
  const defendingTeam = state.teams.find((t) => t.isDefending);
  const attackingTeam = state.teams.find((t) => !t.isDefending);

  if (defendingTeam && attackingTeam) {
    const rankOrder = Object.values(Rank);

    // Calculate trick points before adding kitty bonus
    const kittyInfo = state.roundEndKittyInfo;
    const kittyBonus = kittyInfo?.kittyBonus?.bonusPoints || 0;
    const trickPoints = attackingTeam.points; // Get trick points before bonus

    // Calculate final points (including kitty bonus)
    const points = attackingTeam.points + kittyBonus;
    finalPoints = points;

    if (kittyInfo) {
      pointsBreakdown = kittyInfo.kittyBonus
        ? `\n(${trickPoints} + ${kittyInfo.kittyPoints} × ${kittyInfo.kittyBonus.multiplier} kitty bonus)`
        : ``;
    }

    // Attacking team needs 80+ points to win
    if (points >= 80) {
      attackingTeamWon = true;

      // Calculate rank advancement based on points
      let rankAdvancement = 0;
      if (points >= 120) {
        rankAdvancement = Math.floor((points - 80) / 40);
      }

      // Calculate new rank for attacking team
      const currentRankIndex = rankOrder.indexOf(attackingTeam.currentRank);
      const newRankIndex = Math.min(
        currentRankIndex + rankAdvancement,
        rankOrder.length - 1,
      );
      const newRank = rankOrder[newRankIndex];
      rankChanges[attackingTeam.id] = newRank;

      // Create round result message
      if (rankAdvancement === 0) {
        roundCompleteMessage = `Team ${attackingTeam.id} won with ${points} points and will defend next round at rank ${newRank}!${pointsBreakdown}`;
      } else {
        if (newRank === Rank.Ace) {
          roundCompleteMessage = `Team ${attackingTeam.id} won with ${points} points and reached Ace! They must now defend Ace to win the game!${pointsBreakdown}`;
        } else {
          roundCompleteMessage = `Team ${attackingTeam.id} won with ${points} points and advanced ${rankAdvancement} rank${rankAdvancement > 1 ? "s" : ""} to ${newRank}!${pointsBreakdown}`;
        }
      }
    } else {
      // Defending team successfully defended
      attackingTeamWon = false;

      // Check if defending team is already at Ace
      if (defendingTeam.currentRank === Rank.Ace) {
        // Already at Ace and successfully defended - game over
        gameOver = true;
        gameWinner = defendingTeam.id;

        let pointMessage = "";
        if (points === 0) {
          pointMessage = "shut out the attackers (0 points)";
        } else if (points < 40) {
          pointMessage = `held attackers to only ${points} points`;
        } else {
          pointMessage = `defended with attackers getting ${points}/80 points`;
        }

        roundCompleteMessage = `Team ${defendingTeam.id} ${pointMessage} and wins the game by successfully defending Ace!${pointsBreakdown}`;
      } else {
        // Calculate rank advancement based on attacker's points
        let rankAdvancement = 1; // Default advancement
        if (points < 40) {
          rankAdvancement = 2;
        }
        if (points === 0) {
          rankAdvancement = 3;
        }

        // Calculate new rank for defending team
        const currentRankIndex = rankOrder.indexOf(defendingTeam.currentRank);
        const newRankIndex = Math.min(
          currentRankIndex + rankAdvancement,
          rankOrder.length - 1,
        );
        const newRank = rankOrder[newRankIndex];
        rankChanges[defendingTeam.id] = newRank;

        // Create round result message
        let pointMessage = "";
        if (points === 0) {
          pointMessage = "shut out the attackers (0 points)";
        } else if (points < 40) {
          pointMessage = `held attackers to only ${points} points`;
        } else {
          pointMessage = `defended with attackers getting ${points}/80 points`;
        }

        if (newRank === Rank.Ace) {
          roundCompleteMessage = `Team ${defendingTeam.id} ${pointMessage} and reached Ace! They must now defend Ace to win the game!${pointsBreakdown}`;
        } else {
          roundCompleteMessage = `Team ${defendingTeam.id} ${pointMessage} and advances ${rankAdvancement} rank${rankAdvancement > 1 ? "s" : ""} to ${newRank}!${pointsBreakdown}`;
        }
      }
    }
  }

  return {
    gameOver,
    gameWinner,
    roundCompleteMessage,
    attackingTeamWon,
    rankChanges,
    finalPoints,
    pointsBreakdown,
  };
}
