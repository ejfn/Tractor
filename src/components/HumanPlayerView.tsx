import React from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Card, Player, TrumpInfo, GamePhase } from "../types";
import HumanHandAnimated from "./HumanHandAnimated";
import ThinkingIndicator from "./ThinkingIndicator";
import { sharedStyles } from "../styles/sharedStyles";

interface HumanPlayerViewProps {
  player: Player;
  isCurrentPlayer: boolean;
  isDefending: boolean;
  selectedCards: Card[];
  onCardSelect: (card: Card) => void;
  onPlayCards: () => void;
  canPlay: boolean;
  isValidPlay?: boolean;
  trumpInfo: TrumpInfo;
  showTrickResult?: boolean;
  lastCompletedTrick?: any;
  thinkingDots: {
    dot1: Animated.Value;
    dot2: Animated.Value;
    dot3: Animated.Value;
  };
  trumpDeclarationMode?: boolean;
  onSkipTrumpDeclaration?: () => void;
  onConfirmTrumpDeclaration?: () => void;
  currentPlayerIndex?: number;
  currentTrick?: any;
  isRoundStartingPlayer?: boolean;
  gamePhase?: GamePhase;
}

/**
 * Component that renders the human player's hand and controls
 */
const HumanPlayerView: React.FC<HumanPlayerViewProps> = ({
  player,
  isCurrentPlayer,
  isDefending,
  selectedCards,
  onCardSelect,
  onPlayCards,
  canPlay,
  isValidPlay = true,
  trumpInfo,
  showTrickResult = false,
  lastCompletedTrick = null,
  thinkingDots,
  trumpDeclarationMode = false,
  onSkipTrumpDeclaration,
  onConfirmTrumpDeclaration,
  currentPlayerIndex,
  currentTrick,
  isRoundStartingPlayer = false,
  gamePhase,
}) => {
  return (
    <View style={styles.container}>
      <View
        style={[
          sharedStyles.labelContainer,
          isDefending ? sharedStyles.teamALabel : sharedStyles.teamBLabel,
        ]}
      >
        <View style={styles.labelContent}>
          {isRoundStartingPlayer && (
            <Text style={styles.startingPlayerIcon}>👑</Text>
          )}
          <Text style={sharedStyles.playerLabel}>You</Text>
        </View>
        {isCurrentPlayer &&
          gamePhase === GamePhase.Playing &&
          !showTrickResult &&
          !lastCompletedTrick &&
          !(currentTrick?.winningPlayerId === player.id && currentTrick) && (
            <ThinkingIndicator visible={true} dots={thinkingDots} />
          )}
      </View>
      <HumanHandAnimated
        player={player}
        isCurrentPlayer={isCurrentPlayer}
        selectedCards={selectedCards}
        onCardSelect={onCardSelect}
        onPlayCards={onPlayCards}
        trumpInfo={trumpInfo}
        canPlay={canPlay}
        isValidPlay={isValidPlay}
        trumpDeclarationMode={trumpDeclarationMode}
        onSkipTrumpDeclaration={onSkipTrumpDeclaration}
        onConfirmTrumpDeclaration={onConfirmTrumpDeclaration}
        showTrickResult={showTrickResult}
        lastCompletedTrick={lastCompletedTrick}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...sharedStyles.playerViewContainer,
    width: "100%",
    height: "100%",
    paddingTop: 8,
  },
  labelContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  startingPlayerIcon: {
    fontSize: 12,
    marginRight: 4,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
});

export default HumanPlayerView;
