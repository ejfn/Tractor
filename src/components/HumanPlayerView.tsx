import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Card, Player, TrumpInfo } from '../types/game';
import HumanHandAnimated from './HumanHandAnimated';
import ThinkingIndicator from './ThinkingIndicator';
import { sharedStyles } from '../styles/sharedStyles';

interface HumanPlayerViewProps {
  player: Player;
  isCurrentPlayer: boolean;
  isDefending: boolean;
  selectedCards: Card[];
  onCardSelect: (card: Card) => void;
  onPlayCards: () => void;
  canPlay: boolean;
  trumpInfo: TrumpInfo;
  showTrickResult?: boolean;
  lastCompletedTrick?: any;
  thinkingDots: {
    dot1: Animated.Value;
    dot2: Animated.Value;
    dot3: Animated.Value;
  };
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
  trumpInfo,
  showTrickResult = false,
  lastCompletedTrick = null,
  thinkingDots
}) => {
  return (
    <View style={styles.container}>
      <View style={[
        sharedStyles.labelContainer,
        isDefending ? sharedStyles.teamALabel : sharedStyles.teamBLabel
      ]}>
        <Text style={sharedStyles.playerLabel}>You</Text>
        {isCurrentPlayer && !showTrickResult && !lastCompletedTrick && (
          <ThinkingIndicator
            visible={true}
            dots={thinkingDots}
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
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...sharedStyles.playerViewContainer,
    width: '100%',
    height: '100%',
    paddingTop: 12,
  },
});

export default HumanPlayerView;