import { useState, useEffect, useCallback, useRef } from "react";
import { GameState, PlayerId } from "../types";
import {
  makeTrumpDeclaration,
  getPlayerDeclarationOptions,
} from "../game/trumpDeclarationManager";
import { getAITrumpDeclarationDecision } from "../ai/aiTrumpDeclarationStrategy";
import { isDealingComplete } from "../game/gameLogic";

interface UseTrumpDeclarationsProps {
  gameState: GameState | null;
  setGameState: (state: GameState) => void;
  pauseDealing: () => void;
  resumeDealing: (stateOverride?: GameState) => void;
}

export function useTrumpDeclarations({
  gameState,
  setGameState,
  pauseDealing,
  resumeDealing,
}: UseTrumpDeclarationsProps) {
  const [showDeclarationModal, setShowDeclarationModal] = useState(false);
  const [availableDeclarations, setAvailableDeclarations] = useState<any[]>([]);
  const [currentOpportunitiesHash, setCurrentOpportunitiesHash] =
    useState<string>("");

  // Use refs to store the functions to avoid dependency issues
  const pauseDealingRef = useRef(pauseDealing);
  const resumeDealingRef = useRef(resumeDealing);

  // Update refs when functions change
  useEffect(() => {
    pauseDealingRef.current = pauseDealing;
    resumeDealingRef.current = resumeDealing;
  }, [pauseDealing, resumeDealing]);

  const checkAIDeclarations = useCallback(() => {
    if (!gameState) return;

    const aiPlayers = [PlayerId.Bot1, PlayerId.Bot2, PlayerId.Bot3];

    for (const playerId of aiPlayers) {
      const decision = getAITrumpDeclarationDecision(gameState, playerId);
      if (decision.shouldDeclare && decision.declaration) {
        // PAUSE dealing when AI wants to declare
        pauseDealingRef.current();

        // AI wants to declare
        const newState = makeTrumpDeclaration(gameState, playerId, {
          rank: gameState.trumpInfo.trumpRank,
          suit: decision.declaration.suit,
          type: decision.declaration.type,
          cards: decision.declaration.cards,
        });
        setGameState(newState);

        // RESUME dealing after declaration and brief pause
        setTimeout(() => {
          resumeDealingRef.current(newState);
        }, 500);

        return; // Only one declaration at a time
      }
    }
  }, [gameState, setGameState]);

  // Create hash of opportunities to detect changes
  const createOpportunityHash = (opportunities: any[]) => {
    return opportunities
      .map((opp) => `${opp.type}-${opp.suit}`)
      .sort()
      .join(",");
  };

  // Check for trump declaration opportunities after each card
  const handLength = gameState?.players?.[0]?.hand?.length;
  useEffect(() => {
    if (!gameState || gameState.gamePhase !== "dealing") return;

    // Check if dealing is complete - show final modal
    if (isDealingComplete(gameState)) {
      setShowDeclarationModal(true);
      return;
    }

    // Check human opportunities
    const humanOptions = getPlayerDeclarationOptions(gameState, PlayerId.Human);
    const newHash = createOpportunityHash(humanOptions);

    if (humanOptions.length > 0 && newHash !== currentOpportunitiesHash) {
      // Only pause for NEW opportunities
      setCurrentOpportunitiesHash(newHash);
      pauseDealingRef.current();
      setAvailableDeclarations(humanOptions);
      setShowDeclarationModal(true);
      return; // Don't check AI if human has opportunities
    }

    // Check AI opportunities
    checkAIDeclarations();
  }, [gameState, handLength, checkAIDeclarations, currentOpportunitiesHash]);

  const handleHumanDeclaration = (declaration: any) => {
    if (!gameState) return;

    const newState = makeTrumpDeclaration(gameState, PlayerId.Human, {
      rank: gameState.trumpInfo.trumpRank,
      suit: declaration.suit,
      type: declaration.type,
      cards: declaration.cards,
    });

    setGameState(newState);
    setShowDeclarationModal(false);

    // RESUME dealing after human declaration
    setTimeout(() => {
      resumeDealingRef.current(newState);
    }, 500);
  };

  const handleSkipDeclaration = () => {
    setShowDeclarationModal(false);
    // RESUME dealing after human skips - just force it to resume
    if (gameState) {
      resumeDealingRef.current(gameState);
    }
  };

  const handleManualPause = () => {
    if (!gameState || gameState.gamePhase !== "dealing") return;

    // PAUSE dealing when manually paused
    pauseDealingRef.current();

    // Get human's declaration options
    const humanOptions = getPlayerDeclarationOptions(gameState, PlayerId.Human);
    setAvailableDeclarations(humanOptions);
    setShowDeclarationModal(true);
  };

  return {
    showDeclarationModal,
    availableDeclarations,
    handleHumanDeclaration,
    handleSkipDeclaration,
    handleManualPause,
  };
}
