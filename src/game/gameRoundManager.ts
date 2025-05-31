import { GameState, Rank, GamePhase } from "../types";
import { initializeGame } from "./gameLogic";
import { initializeTrumpDeclarationState } from "./trumpDeclarationManager";

/**
 * Prepares the game state for the next round
 * @param state Current game state
 * @returns Updated game state ready for the next round
 */
export function prepareNextRound(state: GameState): GameState {
  const newState = { ...state };

  newState.roundNumber++;
  newState.gamePhase = GamePhase.Dealing;

  // Set trump rank to defending team's rank
  const newDefendingTeam = newState.teams.find((t) => t.isDefending);
  if (newDefendingTeam) {
    newState.trumpInfo.trumpRank = newDefendingTeam.currentRank;
    newState.trumpInfo.trumpSuit = undefined;
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
 * Processes the end of a round and determines outcomes
 * @param state Current game state
 * @returns Object containing updated state, game over flag, winner, and result message
 */
export function endRound(state: GameState): {
  newState: GameState;
  gameOver: boolean;
  winner: "A" | "B" | null;
  roundCompleteMessage: string;
} {
  const newState = { ...state };
  let gameOver = false;
  let winner: "A" | "B" | null = null;
  let roundCompleteMessage = "";

  // Calculate scores and determine if a team levels up
  const defendingTeam = newState.teams.find((t) => t.isDefending);
  const attackingTeam = newState.teams.find((t) => !t.isDefending);

  if (defendingTeam && attackingTeam) {
    const rankOrder = Object.values(Rank);
    const points = attackingTeam.points;

    // Attacking team needs 80+ points to win
    if (points >= 80) {
      // Attacking team wins and becomes new defending team
      let rankAdvancement = 0;

      // Calculate rank advancement based on points
      // For every 40 points above 80, advance one additional rank
      if (points >= 120) {
        rankAdvancement = Math.floor((points - 80) / 40);
      }

      // Update attacking team's rank
      const currentRankIndex = rankOrder.indexOf(attackingTeam.currentRank);
      const newRankIndex = Math.min(
        currentRankIndex + rankAdvancement,
        rankOrder.length - 1,
      );

      if (newRankIndex < rankOrder.length - 1) {
        attackingTeam.currentRank = rankOrder[newRankIndex];

        // Switch defending/attacking roles
        defendingTeam.isDefending = false;
        attackingTeam.isDefending = true;

        // Create round result message
        if (rankAdvancement === 0) {
          roundCompleteMessage = `Team ${attackingTeam.id} won with ${points} points and will defend at rank ${attackingTeam.currentRank}!`;
        } else {
          roundCompleteMessage = `Team ${attackingTeam.id} won with ${points} points and advances ${rankAdvancement} rank${rankAdvancement > 1 ? "s" : ""} to ${attackingTeam.currentRank}!`;
        }
      } else {
        // Game over - attacking team reached Ace and won
        gameOver = true;
        winner = attackingTeam.id;
      }
    } else {
      // Defending team successfully defended
      let rankAdvancement = 1; // Default advancement

      // Calculate rank advancement based on attacker's points
      if (points < 40) {
        rankAdvancement = 2;
      }
      if (points === 0) {
        rankAdvancement = 3;
      }

      // Update defending team's rank
      const currentRankIndex = rankOrder.indexOf(defendingTeam.currentRank);
      const newRankIndex = Math.min(
        currentRankIndex + rankAdvancement,
        rankOrder.length - 1,
      );

      if (newRankIndex < rankOrder.length - 1) {
        defendingTeam.currentRank = rankOrder[newRankIndex];

        // Create round result message
        let pointMessage = "";
        if (points === 0) {
          pointMessage = "shut out the attackers (0 points)";
        } else if (points < 40) {
          pointMessage = `held attackers to only ${points} points`;
        } else {
          pointMessage = `defended with attackers getting ${points}/80 points`;
        }

        roundCompleteMessage = `Team ${defendingTeam.id} ${pointMessage} and advances ${rankAdvancement} rank${rankAdvancement > 1 ? "s" : ""} to ${defendingTeam.currentRank}!`;
      } else {
        // Game over - defending team reached Ace and won
        gameOver = true;
        winner = defendingTeam.id;
      }
    }

    // Reset points for next round
    defendingTeam.points = 0;
    attackingTeam.points = 0;
  }

  return {
    newState,
    gameOver,
    winner,
    roundCompleteMessage,
  };
}
