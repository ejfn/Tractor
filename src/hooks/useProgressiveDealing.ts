import { useState, useEffect, useRef } from "react";
import { GameState, PlayerId, GamePhase, DeclarationType } from "../types";
import {
  dealNextCard,
  isDealingComplete,
  checkDeclarationOpportunities,
  pauseDealing,
  resumeDealing,
  isDealingPaused,
} from "../game/gameLogic";
import {
  makeTrumpDeclaration,
  getPlayerDeclarationOptions,
} from "../game/trumpDeclarationManager";
import { getAITrumpDeclarationDecision } from "../ai/aiTrumpDeclarationStrategy";

interface UseProgressiveDealingProps {
  gameState: GameState | null;
  setGameState: (state: GameState) => void;
  dealingSpeed?: number; // milliseconds between cards
}

export function useProgressiveDealing({
  gameState,
  setGameState,
  dealingSpeed = 500,
}: UseProgressiveDealingProps) {
  const [isDealingInProgress, setIsDealingInProgress] = useState(false);
  const [showDeclarationModal, setShowDeclarationModal] = useState(false);
  const [availableDeclarations, setAvailableDeclarations] = useState<any[]>([]);
  const [humanSkippedDeclaration, setHumanSkippedDeclaration] = useState(false);
  const dealingIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const declarationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Start progressive dealing when game phase is Dealing
  useEffect(() => {
    if (gameState?.gamePhase === GamePhase.Dealing && !isDealingInProgress) {
      startProgressiveDealing();
    }
  }, [gameState?.gamePhase]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (dealingIntervalRef.current) {
        clearInterval(dealingIntervalRef.current);
      }
      if (declarationTimeoutRef.current) {
        clearTimeout(declarationTimeoutRef.current);
      }
    };
  }, []);

  const startProgressiveDealing = (stateOverride?: GameState) => {
    const currentState = stateOverride || gameState;
    if (!currentState || isDealingInProgress) return;

    setIsDealingInProgress(true);
    setHumanSkippedDeclaration(false); // Reset skip flag when starting new dealing

    const dealNextCardWithDelay = (dealState?: GameState) => {
      // Use passed state or the initial current state
      const stateToUse = dealState || currentState;
      
      if (
        !stateToUse ||
        isDealingComplete(stateToUse) ||
        isDealingPaused(stateToUse)
      ) {
        return;
      }

      // Deal next card
      const newState = dealNextCard(stateToUse);
      setGameState(newState);

      // Reset skip flag when a new card is dealt - allows new declaration opportunities
      setHumanSkippedDeclaration(false);

      // Check for declaration opportunities after dealing card
      checkForDeclarationOpportunities(newState);

      // Continue dealing if not complete and not paused
      if (!isDealingComplete(newState) && !isDealingPaused(newState)) {
        dealingIntervalRef.current = setTimeout(
          () => dealNextCardWithDelay(newState),
          dealingSpeed,
        );
      } else if (isDealingComplete(newState)) {
        setIsDealingInProgress(false);
      }
    };

    // Start the dealing process
    dealingIntervalRef.current = setTimeout(
      () => dealNextCardWithDelay(),
      dealingSpeed,
    );
  };

  const checkForDeclarationOpportunities = (state: GameState) => {
    const opportunities = checkDeclarationOpportunities(state);

    // Check if human player has declaration opportunities
    const humanOpportunities = opportunities.get(PlayerId.Human);
    if (humanOpportunities && humanOpportunities.length > 0 && !humanSkippedDeclaration) {
      // Pause dealing and show declaration modal
      const pausedState = pauseDealing(state, "trump_declaration");
      setGameState(pausedState);
      setAvailableDeclarations(humanOpportunities);
      setShowDeclarationModal(true);

      // Stop dealing timer
      if (dealingIntervalRef.current) {
        clearTimeout(dealingIntervalRef.current);
        dealingIntervalRef.current = null;
      }
    } else {
      // Check AI declarations
      checkAIDeclarations(state);
    }
  };

  const checkAIDeclarations = (state: GameState) => {
    // Check each AI player for declaration opportunities
    const aiPlayers = state.players.filter((p) => !p.isHuman);

    for (const player of aiPlayers) {
      const aiDecision = getAITrumpDeclarationDecision(
        state,
        player.id as PlayerId,
      );

      if (aiDecision.shouldDeclare && aiDecision.declaration) {
        console.log(`AI ${player.id} decision: ${aiDecision.reasoning}`);
        handleAIDeclaration(
          state,
          player.id as PlayerId,
          aiDecision.declaration,
        );
        break; // Only one AI declares at a time
      }
    }
  };

  const handleAIDeclaration = (
    state: GameState,
    playerId: PlayerId,
    declaration: any,
  ) => {
    try {
      const newState = makeTrumpDeclaration(state, playerId, {
        rank: state.trumpInfo.trumpRank,
        suit: declaration.suit,
        type: declaration.type,
        cards: declaration.cards,
      });

      setGameState(newState);

      // Brief pause to show the AI declaration, then resume dealing
      setTimeout(() => {
        const resumedState = resumeDealing(newState);
        setGameState(resumedState);
        setIsDealingInProgress(false);

        // Resume dealing after AI declaration
        if (!isDealingComplete(resumedState)) {
          setTimeout(() => {
            startProgressiveDealing(resumedState);
          }, 100);
        }
      }, 1500);
    } catch (error) {
      console.warn("AI declaration failed:", error);
      // Continue dealing on error
      const resumedState = resumeDealing(state);
      setGameState(resumedState);
      setIsDealingInProgress(false);
      setTimeout(() => {
        startProgressiveDealing(resumedState);
      }, 100);
    }
  };

  const handleHumanDeclaration = (declaration: {
    type: DeclarationType;
    cards: any[];
    suit: any;
  }) => {
    if (!gameState) return;

    try {
      const newState = makeTrumpDeclaration(gameState, PlayerId.Human, {
        rank: gameState.trumpInfo.trumpRank,
        suit: declaration.suit,
        type: declaration.type,
        cards: declaration.cards,
      });

      setGameState(newState);
      setShowDeclarationModal(false);
      setAvailableDeclarations([]);
      setHumanSkippedDeclaration(false); // Reset skip flag after declaration

      // Resume dealing after human declaration
      setTimeout(() => {
        const resumedState = resumeDealing(newState);
        setGameState(resumedState);

        // Force dealing to continue
        setTimeout(() => {
          if (!isDealingComplete(resumedState)) {
            setIsDealingInProgress(true);
            
            const dealNextCardWithDelay = (currentState: GameState) => {
              if (isDealingComplete(currentState) || isDealingPaused(currentState)) {
                setIsDealingInProgress(false);
                return;
              }

              const nextState = dealNextCard(currentState);
              setGameState(nextState);
              
              checkForDeclarationOpportunities(nextState);

              if (!isDealingComplete(nextState) && !isDealingPaused(nextState)) {
                dealingIntervalRef.current = setTimeout(() => {
                  dealNextCardWithDelay(nextState);
                }, dealingSpeed);
              } else if (isDealingComplete(nextState)) {
                setIsDealingInProgress(false);
              }
            };

            dealingIntervalRef.current = setTimeout(() => {
              dealNextCardWithDelay(resumedState);
            }, dealingSpeed);
          }
        }, 100);
      }, 1000);
    } catch (error) {
      console.warn("Human declaration failed:", error);
      // Continue without declaration
      handleSkipDeclaration();
    }
  };

  const handleManualPause = () => {
    if (!gameState || isDealingPaused(gameState)) return;

    // Clear dealing timer
    if (dealingIntervalRef.current) {
      clearTimeout(dealingIntervalRef.current);
      dealingIntervalRef.current = null;
    }

    // Pause dealing and show declaration modal
    const pausedState = pauseDealing(gameState, "trump_declaration");
    setGameState(pausedState);
    
    // Get human's declaration options (even if empty, we want to show the modal)
    const humanOpportunities = checkDeclarationOpportunities(pausedState).get(PlayerId.Human) || [];
    setAvailableDeclarations(humanOpportunities);
    
    // Always show the modal when manually paused, even if no declarations available
    setShowDeclarationModal(true);
    setIsDealingInProgress(false);
  };

  const handleSkipDeclaration = () => {
    if (!gameState) return;

    setShowDeclarationModal(false);
    setAvailableDeclarations([]);
    setHumanSkippedDeclaration(true); // Prevent modal from re-appearing
    
    const resumedState = resumeDealing(gameState);
    setGameState(resumedState);
    
    // Force dealing to continue by using a more direct approach
    setTimeout(() => {
      if (!isDealingComplete(resumedState)) {
        setIsDealingInProgress(true);
        
        const dealNextCardWithDelay = (currentState: GameState) => {
          if (isDealingComplete(currentState) || isDealingPaused(currentState)) {
            setIsDealingInProgress(false);
            return;
          }

          const newState = dealNextCard(currentState);
          setGameState(newState);
          
          checkForDeclarationOpportunities(newState);

          if (!isDealingComplete(newState) && !isDealingPaused(newState)) {
            dealingIntervalRef.current = setTimeout(() => {
              dealNextCardWithDelay(newState);
            }, dealingSpeed);
          } else if (isDealingComplete(newState)) {
            setIsDealingInProgress(false);
          }
        };

        dealingIntervalRef.current = setTimeout(() => {
          dealNextCardWithDelay(resumedState);
        }, dealingSpeed);
      }
    }, 200);
  };

  return {
    isDealingInProgress,
    showDeclarationModal,
    availableDeclarations,
    handleHumanDeclaration,
    handleSkipDeclaration,
    handleManualPause,
  };
}
