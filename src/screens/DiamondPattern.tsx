import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

/**
 * A diamond pattern card back design
 */
const renderCardBack = (isSelectable = false, id = '') => {
  return (
    <TouchableOpacity
      key={id || 'card-back'}
      style={styles.card}
      onPress={isSelectable ? () => {} : undefined} // Only make it pressable if selectable
    >
      {/* Card back main container */}
      <View style={styles.diamondBackPattern}>
        {/* Border frame */}
        <View style={styles.diamondBackBorder} />
        
        {/* Diamond pattern grid */}
        <View style={styles.diamondPatternContainer}>
          {/* Generate a 4x5 grid of diamonds */}
          {Array(5).fill(0).map((_, row) => (
            Array(4).fill(0).map((_, col) => (
              <View 
                key={`diamond-${row}-${col}`} 
                style={[
                  styles.diamondShape,
                  { 
                    top: row * 18 + 8,
                    left: col * 18 + 6,
                  }
                ]}
              />
            ))
          ))}
          
          {/* Smaller diamonds in between */}
          {Array(4).fill(0).map((_, row) => (
            Array(3).fill(0).map((_, col) => (
              <View 
                key={`small-diamond-${row}-${col}`} 
                style={[
                  styles.smallDiamondShape,
                  { 
                    top: row * 18 + 17,
                    left: col * 18 + 15,
                  }
                ]}
              />
            ))
          ))}
        </View>
        
        {/* Center emblem */}
        <View style={styles.diamondCenterEmblem}>
          <Text style={styles.diamondCenterText}>T</Text>
        </View>
        
        {/* Top-left corner logo */}
        <View style={styles.cardBackCorner}>
          <Text style={styles.cardBackLogo}>T</Text>
        </View>

        {/* Bottom-right corner logo (inverted) */}
        <View style={[styles.cardBackCorner, styles.cardBackCornerInverted]}>
          <Text style={styles.cardBackLogo}>T</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 75,
    height: 105,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    margin: 4,
    padding: 5,
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
    overflow: 'hidden',
  },
  diamondBackPattern: {
    flex: 1,
    backgroundColor: '#1A237E', // Deep indigo blue for diamond pattern
    borderRadius: 6,
    padding: 3,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  diamondBackBorder: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
  },
  diamondPatternContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  diamondShape: {
    position: 'absolute',
    width: 14,
    height: 14,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    transform: [{ rotate: '45deg' }],
  },
  smallDiamondShape: {
    position: 'absolute',
    width: 8,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    transform: [{ rotate: '45deg' }],
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  diamondCenterEmblem: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'white',
    marginTop: -18,
    marginLeft: -18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#C5CAE9',
    zIndex: 10,
  },
  diamondCenterText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  cardBackCorner: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 22, 
    height: 22,
    backgroundColor: '#FFFFFF',
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 1.5,
    elevation: 2,
    zIndex: 10,
    borderWidth: 0.5,
    borderColor: '#C5CAE9',
  },
  cardBackCornerInverted: {
    top: 'auto',
    left: 'auto',
    bottom: 4,
    right: 4,
    transform: [{ rotate: '180deg' }],
  },
  cardBackLogo: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A237E',
  },
});

export default renderCardBack;