import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Card as CardType, Player, PlayerId, Trick, TrumpInfo } from "../types"; // Using Card as CardType to avoid naming conflict
import { isTrump } from "../game/gameHelpers";
import {
  ANIMATION_COMPLETION_DELAY,
  CARD_ANIMATION_FALLBACK,
} from "../utils/gameTimings";
import AnimatedCardComponent from "./AnimatedCard";

interface CardPlayAreaProps {
  currentTrick: Trick | null;
  players: Player[];
  trumpInfo: TrumpInfo;
  winningPlayerId?: string;
  onAnimationComplete?: () => void; // Explicitly typed as function
  lastCompletedTrick?: Trick | null; // Add the lastCompletedTrick prop
}

const CardPlayArea: React.FC<CardPlayAreaProps> = ({
  currentTrick,
  players,
  trumpInfo,
  winningPlayerId,
  onAnimationComplete,
  lastCompletedTrick,
}) => {
  // Track animation states for all cards in the current trick
  const [completedAnimations, setCompletedAnimations] = useState<number>(0);
  const [totalAnimationsNeeded, setTotalAnimationsNeeded] = useState<number>(0);
  const [animationCompleted, setAnimationCompleted] = useState<boolean>(false);

  // Track changes to lastCompletedTrick
  useEffect(() => {
    // Removed debug logging
  }, [lastCompletedTrick]);

  // Handler for individual card animations completing - explicitly typed as a function
  const handleCardAnimationComplete = (): void => {
    // Increment the animation counter
    setCompletedAnimations((prev) => prev + 1);
  };

  // Reset animation tracking when trick changes
  useEffect(() => {
    if (currentTrick) {
      // Reset animation tracking
      setCompletedAnimations(0);
      setAnimationCompleted(false);

      // Count total cards in this trick to track animations
      let totalCards = 0;

      // All players including leader are now in plays array
      // Leader is always at plays[0]

      // Count cards from all plays
      currentTrick.plays.forEach((play) => {
        totalCards += play.cards.length;
      });

      // Ensure we have the right player count
      const playerCount = currentTrick.plays.length;

      // Ensure we have a backup "minimum" card count for safety
      const minExpectedCards = playerCount; // At least 1 card per player
      if (totalCards < minExpectedCards) {
        totalCards = minExpectedCards;
      }

      setTotalAnimationsNeeded(totalCards);

      // Add a fallback timer to complete animations even if callbacks fail
      const fallbackTimer = setTimeout(() => {
        if (!animationCompleted) {
          setCompletedAnimations(totalCards);
        }
      }, CARD_ANIMATION_FALLBACK); // Fallback timer for animation completion

      // Clean up the fallback timer on component unmount or trick change
      return () => clearTimeout(fallbackTimer);
    } else {
      // Reset counters when there's no current trick
      setCompletedAnimations(0);
      setTotalAnimationsNeeded(0);
      setAnimationCompleted(false);
    }
  }, [currentTrick, animationCompleted]);

  // Add sequence information to cards
  type CardWithSequence = CardType & {
    playSequence: number; // The order in which the card was played (0 = first, higher = later)
    cardIndex: number; // Index within player's combo (0 = first card in combo)
    globalPlayOrder: number; // Global counter for absolute play order (for z-index)
  };

  // Cards played by position with sequence information
  const topCards: CardWithSequence[] = [];
  const leftCards: CardWithSequence[] = [];
  const rightCards: CardWithSequence[] = [];
  const bottomCards: CardWithSequence[] = [];

  // Track play sequence for each player's play
  const playerSequenceMap: Record<string, number> = {};

  // Global counter to track absolute play order across all players (for z-index)
  let globalPlayOrder = 0;

  // Use a ref to track if we've called the callback for this trick
  const callbackCalledRef = React.useRef(false);

  // Extract complex expression for dependency array
  const leadingPlayerId = currentTrick?.plays?.[0]?.playerId;

  // Reset the ref when the trick changes
  useEffect(() => {
    if (currentTrick) {
      callbackCalledRef.current = false;
    }
  }, [currentTrick, leadingPlayerId]); // Only reset when a new trick starts

  // Check if all animations are complete
  useEffect(() => {
    if (
      completedAnimations >= totalAnimationsNeeded &&
      totalAnimationsNeeded > 0 &&
      !animationCompleted &&
      !callbackCalledRef.current
    ) {
      // Only trigger if we haven't already called the callback

      // Mark as complete to prevent multiple callbacks
      setAnimationCompleted(true);
      callbackCalledRef.current = true; // Mark that we've called the callback

      // All animations complete - trigger callback

      // Add a small delay to ensure all visual animations are complete
      setTimeout(() => {
        if (typeof onAnimationComplete === "function") {
          onAnimationComplete();
        }
      }, ANIMATION_COMPLETION_DELAY); // Delay to ensure cards are rendered properly
    }
  }, [
    completedAnimations,
    totalAnimationsNeeded,
    animationCompleted,
    onAnimationComplete,
  ]);

  // Animation handling managed by completion callbacks

  // Check if a player is winning
  const isWinning = (playerId: string) => {
    return playerId === winningPlayerId;
  };

  // Early return for empty trick, but keep showing if we have a completed trick
  if (!currentTrick && !lastCompletedTrick) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Waiting for first play...</Text>
        </View>
      </View>
    );
  }

  // Select which trick to display
  // Show the lastCompletedTrick if available, otherwise show the currentTrick
  const workingTrick = lastCompletedTrick || currentTrick;

  // Find player positions by ID
  const getPlayerPosition = (
    playerId: string,
  ): "top" | "left" | "right" | "bottom" => {
    // This mapping assumes players are in a fixed order:
    // ai3 = left, ai2 = top, ai1 = right, human = bottom
    // This creates counter-clockwise rotation when viewed from human's perspective
    if (playerId === PlayerId.Bot3) {
      return "left";
    }
    if (playerId === PlayerId.Bot2) {
      return "top";
    }
    if (playerId === PlayerId.Bot1) {
      return "right";
    }
    return "bottom"; // human player or unknown
  };

  // Only process if we have a working trick
  if (workingTrick) {
    // All players including leader are now in plays array
    // Leader is always at plays[0]

    // Add all plays with sequence numbers starting from 0
    workingTrick.plays.forEach((play, playIndex) => {
      const pos = getPlayerPosition(play.playerId);
      const sequence = playIndex; // Sequence starts at 0 for leader and increases for each play

      // Record this player's sequence in the map
      playerSequenceMap[play.playerId] = sequence;

      play.cards.forEach((card, idx) => {
        // Each card gets a unique global play order number
        const cardWithSequence = Object.assign(card, {
          playSequence: sequence,
          cardIndex: idx, // Index within this player's combo
          globalPlayOrder: globalPlayOrder++, // Increment for each card played
        });

        if (pos === "top") topCards.push(cardWithSequence);
        if (pos === "left") leftCards.push(cardWithSequence);
        if (pos === "right") rightCards.push(cardWithSequence);
        if (pos === "bottom") bottomCards.push(cardWithSequence);
      });
    });
  }

  // Sort cards by cardIndex to ensure proper display order within each player's area
  topCards.sort((a, b) => a.cardIndex - b.cardIndex);
  leftCards.sort((a, b) => a.cardIndex - b.cardIndex);
  rightCards.sort((a, b) => a.cardIndex - b.cardIndex);
  bottomCards.sort((a, b) => a.cardIndex - b.cardIndex);

  return (
    <View style={styles.container}>
      {/* Top player's cards */}
      <View style={styles.topPlayArea}>
        {topCards.length > 0 && (
          <View style={[styles.playedCardsContainer]}>
            {topCards.map((card, index) => (
              <AnimatedCardComponent
                key={`top-${card.id}-${index}`}
                card={card}
                isPlayed={true}
                isTrump={isTrump(card, trumpInfo)}
                delay={index * 100}
                scale={0.75} // Smaller played cards
                onAnimationComplete={handleCardAnimationComplete}
                style={{
                  // Position relative for regular stacking
                  position: "relative",
                  // Horizontal overlapping like human's hand
                  marginLeft: index > 0 ? -45 : 0, // Increased overlap for tighter stack
                  // Use global play order for z-index, ensuring proper stacking
                  zIndex: 100 + card.globalPlayOrder, // Higher values appear on top
                  // Special Android centering - shift cards slightly if not first
                  ...(Platform.OS === "android" &&
                    index === 0 &&
                    topCards.length > 1 && {
                      marginLeft: 15, // Smaller shift for tighter centering
                    }),
                  // Simple border for winning cards (works on Android)
                  ...(isWinning(
                    players.find((p) => p.id === PlayerId.Bot2)?.id || "",
                  ) && {
                    borderWidth: 2,
                    borderColor: "#FFC107",
                    backgroundColor: "rgba(255, 255, 255, 0.9)",
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
            <View style={[styles.playedCardsContainer]}>
              {leftCards.map((card, index) => (
                <AnimatedCardComponent
                  key={`left-${card.id}-${index}`}
                  card={card}
                  isPlayed={true}
                  isTrump={isTrump(card, trumpInfo)}
                  delay={index * 100}
                  scale={0.75} // Smaller played cards
                  onAnimationComplete={handleCardAnimationComplete}
                  style={{
                    // Position relative for regular stacking
                    position: "relative",
                    // Horizontal overlapping like human's hand
                    marginLeft: index > 0 ? -45 : 0, // Increased overlap for tighter stack
                    // Use global play order for z-index, ensuring proper stacking
                    zIndex: 100 + card.globalPlayOrder, // Higher values appear on top
                    // Special Android centering - shift cards slightly if not first
                    ...(Platform.OS === "android" &&
                      index === 0 &&
                      leftCards.length > 1 && {
                        marginLeft: 15, // Smaller shift for tighter centering
                      }),
                    // Simple border for winning cards (works on Android)
                    ...(isWinning(
                      players.find((p) => p.id === PlayerId.Bot3)?.id || "",
                    ) && {
                      borderWidth: 2,
                      borderColor: "#FFC107",
                      backgroundColor: "rgba(255, 255, 255, 0.9)",
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
            <View style={[styles.playedCardsContainer]}>
              {rightCards.map((card, index) => (
                <AnimatedCardComponent
                  key={`right-${card.id}-${index}`}
                  card={card}
                  isPlayed={true}
                  isTrump={isTrump(card, trumpInfo)}
                  delay={index * 100}
                  scale={0.75} // Smaller played cards
                  onAnimationComplete={handleCardAnimationComplete}
                  style={{
                    // Position relative for regular stacking
                    position: "relative",
                    // Horizontal overlapping like human's hand
                    marginLeft: index > 0 ? -45 : 0, // Increased overlap for tighter stack
                    // Use global play order for z-index, ensuring proper stacking
                    zIndex: 100 + card.globalPlayOrder, // Higher values appear on top
                    // Special Android centering - shift cards slightly if not first
                    ...(Platform.OS === "android" &&
                      index === 0 &&
                      rightCards.length > 1 && {
                        marginLeft: 15, // Smaller shift for tighter centering
                      }),
                    // Simple border for winning cards (works on Android)
                    ...(isWinning(
                      players.find((p) => p.id === PlayerId.Bot1)?.id || "",
                    ) && {
                      borderWidth: 2,
                      borderColor: "#FFC107",
                      backgroundColor: "rgba(255, 255, 255, 0.9)",
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
          <View style={[styles.playedCardsContainer]}>
            {bottomCards.map((card, index) => (
              <AnimatedCardComponent
                key={`bottom-${card.id}-${index}`}
                card={card}
                isPlayed={true}
                isTrump={isTrump(card, trumpInfo)}
                delay={index * 100}
                scale={0.75} // Smaller played cards
                onAnimationComplete={handleCardAnimationComplete}
                style={{
                  // Position relative for regular stacking
                  position: "relative",
                  // Horizontal overlapping like human's hand
                  marginLeft: index > 0 ? -45 : 0, // Increased overlap for tighter stack
                  // Use global play order for z-index, ensuring proper stacking
                  zIndex: 100 + card.globalPlayOrder, // Higher values appear on top
                  // Special Android centering - shift cards slightly if not first
                  ...(Platform.OS === "android" &&
                    index === 0 &&
                    bottomCards.length > 1 && {
                      marginLeft: 15, // Smaller shift for tighter centering
                    }),
                  // Simple border for winning cards (works on Android)
                  ...(isWinning(players.find((p) => p.isHuman)?.id || "") && {
                    borderWidth: 2,
                    borderColor: "#FFC107",
                    backgroundColor: "rgba(255, 255, 255, 0.9)",
                  }),
                }}
              />
            ))}
          </View>
        )}
      </View>

      {/* Empty state message - moved to center */}
      {!topCards.length &&
        !leftCards.length &&
        !rightCards.length &&
        !bottomCards.length && (
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
    backgroundColor: "transparent",
    position: "relative",
    justifyContent: "space-between",
    height: "100%",
    zIndex: 50, // Higher than all player hands (which are at z-index 5)
  },
  // Layout areas for each player's cards - centered for each player
  topPlayArea: {
    width: "100%",
    height: 120, // Increased height for cards
    alignItems: "center", // Center horizontally
    justifyContent: "center", // Center vertically
    position: "relative",
    marginBottom: 5,
    marginTop: 5, // Added margin for spacing
    // Force center alignment for mobile
    display: "flex",
    flexDirection: "row",
    // Special Android centering fixes
    ...(Platform.OS === "android" && {
      left: 0,
      right: 0,
      alignSelf: "center",
    }),
  },
  middleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flex: 1,
    // Special Android layout fixes
    ...(Platform.OS === "android" && {
      width: "100%",
      paddingLeft: 0,
      paddingRight: 0,
    }),
  },
  leftPlayArea: {
    width: 120, // Increased width for cards
    height: 120, // Set height to match width
    justifyContent: "center", // Center vertically
    alignItems: "center", // Center horizontally
    position: "relative", // For absolute positioning of cards
    marginRight: 5, // Small margin
  },
  rightPlayArea: {
    width: 120, // Increased width for cards
    height: 120, // Set height to match width
    justifyContent: "center", // Center vertically
    alignItems: "center", // Center horizontally
    position: "relative", // For absolute positioning of cards
    marginLeft: 5, // Small margin
  },
  centerDisplay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  bottomPlayArea: {
    width: "100%",
    height: 120, // Increased height for cards
    alignItems: "center", // Center horizontally
    justifyContent: "center", // Center vertically
    position: "relative",
    marginTop: 5, // Reduced margin for better spacing
    // Force center alignment for mobile
    display: "flex",
    flexDirection: "row",
    // Special Android centering fixes
    ...(Platform.OS === "android" && {
      left: 0,
      right: 0,
      alignSelf: "center",
    }),
  },
  // Containers for played cards
  playedCardsContainer: {
    // Removed background and border
    backgroundColor: "transparent",
    // Flex row for horizontal card stacking
    flexDirection: "row",
    // Height for cards
    height: 100,
    // Horizontal centering
    alignItems: "center",
    justifyContent: "center",
    // Position relative to allow z-index to work on children
    position: "relative",
    // Center horizontally in parent
    alignSelf: "center",
    // Android-specific centering fixes
    left: 0,
    right: 0,
    width: "100%",
  },
  // Empty state
  emptyContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontStyle: "italic",
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    fontSize: 16,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  // Points display
  pointsDisplay: {
    padding: 6,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  pointsText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "rgba(255, 255, 255, 0.9)",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});

export default CardPlayArea;
