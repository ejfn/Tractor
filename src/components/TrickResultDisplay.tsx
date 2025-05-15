import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface TrickResultDisplayProps {
  visible: boolean;
  winnerName: string;
  points: number;
}

/**
 * Displays the trick winner and points earned
 */
const TrickResultDisplay: React.FC<TrickResultDisplayProps> = ({
  visible,
  winnerName,
  points
}) => {
  // Just use the visible prop directly - simpler code
  if (!visible) return null;
  
  return (
    <View style={styles.container}>
      <Text style={styles.winnerText}>
        {winnerName === "You" ? "You win!" : `${winnerName} wins!`}
      </Text>
      {points > 0 && (
        <Text style={styles.pointsText}>
          +{points} pts
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFC107', // Gold background
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1000,
    minWidth: 100,
    borderWidth: 1,
    borderColor: '#D4B82F', // Darker gold border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4,
  },
  winnerText: {
    color: '#212121', // Dark text for contrast
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 2,
  },
  pointsText: {
    color: '#D32F2F', // Red for points for contrast
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default TrickResultDisplay;