import React from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Card, Player, TrumpInfo, GamePhase, Trick } from "../types";
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
  lastCompletedTrick?: Trick;
  thinkingDots: {
    dot1: Animated.Value;
    dot2: Animated.Value;
    dot3: Animated.Value;
  };
  currentPlayerIndex?: number;
  currentTrick?: Trick;
  isRoundStartingPlayer?: boolean;
  gamePhase?: GamePhase;
  onKittySwap?: () => void;
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
  currentPlayerIndex,
  currentTrick,
  isRoundStartingPlayer = false,
  gamePhase,
  onKittySwap,
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
            <ThinkingIndicator
              visible={true}
              dots={thinkingDots}
              testID="thinking-indicator-visible"
            />
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
        showTrickResult={showTrickResult}
        lastCompletedTrick={lastCompletedTrick || undefined}
        gamePhase={gamePhase}
        onKittySwap={onKittySwap}
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
