import React, { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

interface GameTableProps {
  topPlayer: ReactNode;
  leftPlayer: ReactNode;
  rightPlayer: ReactNode;
  bottomPlayer: ReactNode;
  centerContent: ReactNode;
  trickResult?: ReactNode;
}

/**
 * Component that renders the main game table with positioned players
 */
const GameTable: React.FC<GameTableProps> = ({
  topPlayer,
  leftPlayer,
  rightPlayer,
  bottomPlayer,
  centerContent,
  trickResult
}) => {
  return (
    <View style={styles.gameTable}>
      {/* Trick winner notification */}
      {trickResult}
      
      {/* Top player (Bot 2 - plays 3rd in counter-clockwise order) */}
      <View style={styles.topArea}>
        {topPlayer}
      </View>

      {/* Middle row */}
      <View style={styles.middleRow}>
        {/* Left player (Bot 3 - plays 4th in counter-clockwise order) */}
        <View style={styles.leftArea}>
          {leftPlayer}
        </View>

        {/* Center play area */}
        <View style={styles.centerArea}>
          {centerContent}
        </View>

        {/* Right player (Bot 1 - plays 2nd in counter-clockwise order) */}
        <View style={styles.rightArea}>
          {rightPlayer}
        </View>
      </View>

      {/* Bottom area - human player's hand (plays 1st) */}
      <View style={styles.bottomArea}>
        {bottomPlayer}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  gameTable: {
    flex: 1,
    backgroundColor: '#0B4619', // Rich green card table
    borderRadius: 16,
    borderWidth: 4,
    borderColor: '#1B651E',
    overflow: 'hidden',
    marginLeft: 10,
    marginRight: 10,
    marginTop: 5,
    marginBottom: 0,
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: 10,
    paddingBottom: 20,
  },
  // Top player - centered at the top of the table
  topArea: {
    width: '100%',
    height: 120,
    marginTop: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Middle row container
  middleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 200,
    width: '100%',
  },
  // Left player - along the left edge of the table at middle height
  leftArea: {
    width: 100,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Center play area - in the middle of the table
  centerArea: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10, // Higher than side players
  },
  // Right player - along the right edge of the table at middle height
  rightArea: {
    width: 100,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Bottom player - centered at the bottom of the table
  bottomArea: {
    width: '100%',
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default GameTable;