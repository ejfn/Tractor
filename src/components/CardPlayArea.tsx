import React from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import AnimatedCard from './AnimatedCard';
import { Card as CardType, Player, Trick, TrumpInfo } from '../types/game'; // Using Card as CardType to avoid naming conflict
import { isTrump } from '../utils/gameLogic';

// Highlight winning cards with a border style instead of shadows

interface CardPlayAreaProps {
  currentTrick: Trick | null;
  players: Player[];
  trumpInfo: TrumpInfo;
  winningPlayerId?: string;
}

const CardPlayArea: React.FC<CardPlayAreaProps> = ({
  currentTrick,
  players,
  trumpInfo,
  winningPlayerId
}) => {
  if (!currentTrick) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Waiting for first play...</Text>
        </View>
      </View>
    );
  }

  // Check if a player is winning
  const isWinning = (playerId: string) => {
    return playerId === winningPlayerId;
  };

  // Find player positions by ID
  const getPlayerPosition = (playerId: string): 'top' | 'left' | 'right' | 'bottom' => {
    // This mapping assumes players are in a fixed order:
    // ai1 = left, ai2 = top, ai3 = right, human = bottom
    if (playerId === 'ai1') return 'left';
    if (playerId === 'ai2') return 'top';
    if (playerId === 'ai3') return 'right';
    return 'bottom'; // human player or unknown
  };

  // Add sequence information to cards
  type CardWithSequence = CardType & { playSequence: number };

  // Get all cards played by position with sequence information
  const topCards: CardWithSequence[] = [];
  const leftCards: CardWithSequence[] = [];
  const rightCards: CardWithSequence[] = [];
  const bottomCards: CardWithSequence[] = [];

  // Check if the leading player has already played (to avoid duplication)
  const leadingPlayerHasPlayed = currentTrick.plays.some(play =>
    play.playerId === currentTrick.leadingPlayerId
  );

  // If the leading player has not already played a card in the plays array,
  // then use the leadingCombo to show their cards
  if (!leadingPlayerHasPlayed) {
    const leadingPos = getPlayerPosition(currentTrick.leadingPlayerId);
    currentTrick.leadingCombo.forEach(card => {
      const cardWithSequence = { ...card, playSequence: 0 };
      if (leadingPos === 'top') topCards.push(cardWithSequence);
      if (leadingPos === 'left') leftCards.push(cardWithSequence);
      if (leadingPos === 'right') rightCards.push(cardWithSequence);
      if (leadingPos === 'bottom') bottomCards.push(cardWithSequence);
    });
  }

  // Add all plays with increasing sequence numbers
  currentTrick.plays.forEach((play, playIndex) => {
    const pos = getPlayerPosition(play.playerId);
    // Sequence starts at 1 and goes up for each play
    const sequence = playIndex + 1;

    play.cards.forEach(card => {
      const cardWithSequence = { ...card, playSequence: sequence };
      if (pos === 'top') topCards.push(cardWithSequence);
      if (pos === 'left') leftCards.push(cardWithSequence);
      if (pos === 'right') rightCards.push(cardWithSequence);
      if (pos === 'bottom') bottomCards.push(cardWithSequence);
    });
  });

  // Sort cards by play sequence to ensure proper z-index rendering
  topCards.sort((a, b) => a.playSequence - b.playSequence);
  leftCards.sort((a, b) => a.playSequence - b.playSequence);
  rightCards.sort((a, b) => a.playSequence - b.playSequence);
  bottomCards.sort((a, b) => a.playSequence - b.playSequence);

  return (
    <View style={styles.container}>
      {/* Top player's cards */}
      <View style={styles.topPlayArea}>
        {topCards.length > 0 && (
          <View style={[
            styles.playedCardsContainer,
            // Ensure proper stacking order - adjust base z-index by play order
            {
              zIndex: 90 // High base z-index for the top player
            }
          ]}>
            {topCards.map((card, index) => (
              <AnimatedCard
                key={`top-${card.id}-${index}`}
                card={card}
                isPlayed={true}
                isTrump={isTrump(card, trumpInfo)}
                delay={index * 100}
                scale={0.75} // Smaller played cards
                style={{
                  // Position relative for regular stacking
                  position: 'relative',
                  // Horizontal overlapping like human's hand
                  marginLeft: index > 0 ? -45 : 0, // Increased overlap for tighter stack
                  // Set z-index based on play sequence for stacking within a player's cards
                  zIndex: 10 + card.playSequence, // This creates proper stacking within each player's cards
                  // Special Android centering - shift cards slightly if not first
                  ...(Platform.OS === 'android' && index === 0 && topCards.length > 1 && {
                    marginLeft: 15, // Smaller shift for tighter centering
                  }),
                  // Simple border for winning cards (works on Android)
                  ...(isWinning(players.find(p => p.id === 'ai2')?.id || '') && {
                    borderWidth: 2,
                    borderColor: '#FFC107',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  }),
                }}
              />
            ))}
          </View>
        )}
      </View>

      {/* Middle row with left and right player cards */}
      <View style={styles.middleRow}>
        {/* Left player's cards */}
        <View style={styles.leftPlayArea}>
          {leftCards.length > 0 && (
            <View style={[
              styles.playedCardsContainer,
              // Ensure proper stacking order - adjust base z-index by play order
              {
                zIndex: 80 // High base z-index for the left player
              }
            ]}>
              {leftCards.map((card, index) => (
                <AnimatedCard
                  key={`left-${card.id}-${index}`}
                  card={card}
                  isPlayed={true}
                  isTrump={isTrump(card, trumpInfo)}
                  delay={index * 100}
                  scale={0.75} // Smaller played cards
                  style={{
                    // Position relative for regular stacking
                    position: 'relative',
                    // Horizontal overlapping like human's hand
                    marginLeft: index > 0 ? -45 : 0, // Increased overlap for tighter stack
                    // Set z-index based on play sequence for stacking within a player's cards
                    zIndex: 10 + card.playSequence, // This creates proper stacking within each player's cards
                    // Special Android centering - shift cards slightly if not first
                    ...(Platform.OS === 'android' && index === 0 && leftCards.length > 1 && {
                      marginLeft: 15, // Smaller shift for tighter centering
                    }),
                    // Simple border for winning cards (works on Android)
                    ...(isWinning(players.find(p => p.id === 'ai1')?.id || '') && {
                      borderWidth: 2,
                      borderColor: '#FFC107',
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    }),
                  }}
                />
              ))}
            </View>
          )}
        </View>

        {/* Center area - points display removed during active play */}
        <View style={styles.centerDisplay}>
          {/* Points only shown after trick is completed, which is handled by the trick result notification */}
        </View>

        {/* Right player's cards */}
        <View style={styles.rightPlayArea}>
          {rightCards.length > 0 && (
            <View style={[
              styles.playedCardsContainer,
              // Ensure proper stacking order - adjust base z-index by play order
              {
                zIndex: 70 // High base z-index for the right player
              }
            ]}>
              {rightCards.map((card, index) => (
                <AnimatedCard
                  key={`right-${card.id}-${index}`}
                  card={card}
                  isPlayed={true}
                  isTrump={isTrump(card, trumpInfo)}
                  delay={index * 100}
                  scale={0.75} // Smaller played cards
                  style={{
                    // Position relative for regular stacking
                    position: 'relative',
                    // Horizontal overlapping like human's hand
                    marginLeft: index > 0 ? -45 : 0, // Increased overlap for tighter stack
                    // Set z-index based on play sequence for stacking within a player's cards
                    zIndex: 10 + card.playSequence, // This creates proper stacking within each player's cards
                    // Special Android centering - shift cards slightly if not first
                    ...(Platform.OS === 'android' && index === 0 && rightCards.length > 1 && {
                      marginLeft: 15, // Smaller shift for tighter centering
                    }),
                    // Simple border for winning cards (works on Android)
                    ...(isWinning(players.find(p => p.id === 'ai3')?.id || '') && {
                      borderWidth: 2,
                      borderColor: '#FFC107',
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    }),
                  }}
                />
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Bottom player's cards */}
      <View style={styles.bottomPlayArea}>
        {bottomCards.length > 0 && (
          <View style={[
            styles.playedCardsContainer,
            // Ensure proper stacking order - adjust base z-index by play order
            {
              zIndex: 60 // High base z-index for the bottom player
            }
          ]}>
            {bottomCards.map((card, index) => (
              <AnimatedCard
                key={`bottom-${card.id}-${index}`}
                card={card}
                isPlayed={true}
                isTrump={isTrump(card, trumpInfo)}
                delay={index * 100}
                scale={0.75} // Smaller played cards
                style={{
                  // Position relative for regular stacking
                  position: 'relative',
                  // Horizontal overlapping like human's hand
                  marginLeft: index > 0 ? -45 : 0, // Increased overlap for tighter stack
                  // Set z-index based on play sequence for stacking within a player's cards
                  zIndex: 10 + card.playSequence, // This creates proper stacking within each player's cards
                  // Special Android centering - shift cards slightly if not first
                  ...(Platform.OS === 'android' && index === 0 && bottomCards.length > 1 && {
                    marginLeft: 15, // Smaller shift for tighter centering
                  }),
                  // Simple border for winning cards (works on Android)
                  ...(isWinning(players.find(p => p.isHuman)?.id || '') && {
                    borderWidth: 2,
                    borderColor: '#FFC107',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  }),
                }}
              />
            ))}
          </View>
        )}
      </View>

      {/* Empty state message - moved to center */}
      {!topCards.length && !leftCards.length && !rightCards.length && !bottomCards.length && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Waiting for first play...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    position: 'relative',
    justifyContent: 'space-between',
    height: '100%',
  },
  // Winning cards now use inline styling directly on the AnimatedCard
  // Layout areas for each player's cards - centered for each player
  topPlayArea: {
    width: '100%',
    height: 120, // Increased height for cards
    alignItems: 'center', // Center horizontally
    justifyContent: 'center', // Center vertically
    position: 'relative',
    marginBottom: 5,
    marginTop: 5, // Added margin for spacing
    // Force center alignment for mobile
    display: 'flex',
    flexDirection: 'row',
    // Special Android centering fixes
    ...(Platform.OS === 'android' && {
      left: 0,
      right: 0,
      alignSelf: 'center',
    }),
  },
  middleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
    // Special Android layout fixes
    ...(Platform.OS === 'android' && {
      width: '100%',
      paddingLeft: 0,
      paddingRight: 0,
    }),
  },
  leftPlayArea: {
    width: 120, // Increased width for cards
    height: 120, // Set height to match width
    justifyContent: 'center', // Center vertically
    alignItems: 'center', // Center horizontally
    position: 'relative', // For absolute positioning of cards
    marginRight: 5, // Small margin
  },
  rightPlayArea: {
    width: 120, // Increased width for cards
    height: 120, // Set height to match width
    justifyContent: 'center', // Center vertically
    alignItems: 'center', // Center horizontally
    position: 'relative', // For absolute positioning of cards
    marginLeft: 5, // Small margin
  },
  centerDisplay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomPlayArea: {
    width: '100%',
    height: 120, // Increased height for cards
    alignItems: 'center', // Center horizontally
    justifyContent: 'center', // Center vertically
    position: 'relative',
    marginTop: 5, // Reduced margin for better spacing
    // Force center alignment for mobile
    display: 'flex',
    flexDirection: 'row',
    // Special Android centering fixes
    ...(Platform.OS === 'android' && {
      left: 0,
      right: 0,
      alignSelf: 'center',
    }),
  },
  // Containers for played cards
  playedCardsContainer: {
    // Removed background and border
    backgroundColor: 'transparent',
    // Flex row for horizontal card stacking
    flexDirection: 'row',
    // Height for cards
    height: 100,
    // Horizontal centering
    alignItems: 'center',
    justifyContent: 'center',
    // Position relative to allow z-index to work on children
    position: 'relative',
    // Center horizontally in parent
    alignSelf: 'center',
    // Android-specific centering fixes
    left: 0,
    right: 0,
    width: '100%',
  },
  // Winning play highlight - now completely invisible
  winningPlay: {
    // Completely transparent with no effects
    backgroundColor: 'transparent',
    shadowColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  // Empty state
  emptyContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontStyle: 'italic',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    fontSize: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  // Points display
  pointsDisplay: {
    padding: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  pointsText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.9)',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});

export default CardPlayArea;