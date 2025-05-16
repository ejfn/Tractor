import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import PlayerHandAnimated from './PlayerHandAnimated';
import ThinkingIndicator from './ThinkingIndicator';
import { Player, Card, TrumpInfo } from '../types/game';

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
    <View style={styles.bottomArea}>
      <View style={[
        styles.labelContainer,
        isDefending ? styles.teamALabel : styles.teamBLabel
      ]}>
        <Text style={styles.playerLabel}>You</Text>
        {isCurrentPlayer && !showTrickResult && !lastCompletedTrick && (
          <ThinkingIndicator
            visible={true}
            dots={thinkingDots}
          />
        )}
      </View>
      <PlayerHandAnimated
        player={player}
        isCurrentPlayer={isCurrentPlayer}
        selectedCards={selectedCards}
        onCardSelect={onCardSelect}
        onPlayCards={onPlayCards}
        showCards={true}
        trumpInfo={trumpInfo}
        canPlay={canPlay}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  bottomArea: {
    width: '100%',
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 0,
    paddingBottom: 35,
    marginBottom: 2,
  },
  labelContainer: {
    height: 26,
    minWidth: 75,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 3,
    paddingHorizontal: 14,
    borderWidth: 0.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    position: 'relative',
  },
  teamALabel: {
    backgroundColor: 'rgba(46, 125, 50, 0.75)',
    borderColor: '#E8F5E9',
  },
  teamBLabel: {
    backgroundColor: 'rgba(198, 40, 40, 0.75)',
    borderColor: '#FFEBEE',
  },
  playerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
});

export default HumanPlayerView;