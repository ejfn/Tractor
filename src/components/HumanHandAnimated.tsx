import React, { useEffect, useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { isTrump } from "../game/gameHelpers";
import {
  Card as CardType,
  GamePhase,
  Player,
  Trick,
  TrumpInfo,
} from "../types";
import { sortCards } from "../utils/cardSorting";
import AnimatedCardComponent from "./AnimatedCard";
import {
  useCommonTranslation,
  useGameTranslation,
} from "../hooks/useTranslation";

interface HumanHandAnimatedProps {
  player: Player;
  isCurrentPlayer: boolean;
  selectedCards: CardType[];
  onCardSelect?: (card: CardType) => void;
  onPlayCards?: () => void;
  trumpInfo: TrumpInfo;
  canPlay?: boolean;
  isValidPlay?: boolean;
  showTrickResult?: boolean;
  lastCompletedTrick?: Trick;
  gamePhase?: GamePhase;
  onKittySwap?: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const HumanHandAnimated: React.FC<HumanHandAnimatedProps> = ({
  player,
  isCurrentPlayer,
  selectedCards,
  onCardSelect,
  onPlayCards,
  trumpInfo,
  canPlay = false,
  isValidPlay = true,
  showTrickResult = false,
  lastCompletedTrick = null,
  gamePhase,
  onKittySwap,
}) => {
  const { t: tCommon } = useCommonTranslation();
  const { t: tGame } = useGameTranslation();
  // Local state to track if user has interacted with kitty cards
  const [hasInteractedWithKitty, setHasInteractedWithKitty] = useState(false);

  // Reset interaction state when entering KittySwap phase
  useEffect(() => {
    if (gamePhase === GamePhase.KittySwap && isCurrentPlayer) {
      setHasInteractedWithKitty(false);
    }
  }, [gamePhase, isCurrentPlayer]);

  // Enhanced card selection handler that tracks interaction
  const handleCardSelect = (card: CardType) => {
    if (gamePhase === GamePhase.KittySwap && !hasInteractedWithKitty) {
      setHasInteractedWithKitty(true);
    }
    onCardSelect?.(card);
  };
  // Sort cards by suit and rank for better display
  const sortedHand = sortCards(player.hand, trumpInfo);

  const isCardSelected = (card: CardType) => {
    return selectedCards.some((c) => c.id === card.id);
  };

  // Show full hand
  const displayHand = sortedHand;

  // Determine if player can interact with cards and buttons
  const canInteract = canPlay && isValidPlay;

  // Constants for card layout
  const cardWidth = 65;
  const cardOverlap = 40;
  const visibleCardWidth = cardWidth - cardOverlap;

  // Calculate total width and scrolling needs
  const totalCardsWidth =
    cardWidth + (displayHand.length - 1) * visibleCardWidth;
  const availableWidth = SCREEN_WIDTH - 40;
  const needsScrolling = totalCardsWidth > availableWidth;

  return (
    <View style={styles.container} testID="player-hand-animated">
      <View style={styles.handContainer}>
        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          style={styles.scrollViewStyle}
          contentContainerStyle={[
            styles.scrollViewContent,
            {
              alignItems: "center",
              justifyContent: needsScrolling ? "flex-start" : "center",
            },
          ]}
          scrollEnabled={true}
        >
          <View style={styles.cardRow}>
            {displayHand.map((card, index) => (
              <View
                key={card.id}
                style={[
                  styles.cardWrapper,
                  {
                    marginLeft: index === 0 ? 0 : -cardOverlap,
                    zIndex: index,
                  },
                ]}
                pointerEvents="box-none"
              >
                <AnimatedCardComponent
                  card={card}
                  onSelect={
                    (isCurrentPlayer &&
                      !showTrickResult &&
                      !lastCompletedTrick) ||
                    (gamePhase === GamePhase.KittySwap && isCurrentPlayer)
                      ? handleCardSelect
                      : undefined
                  }
                  selected={isCardSelected(card)}
                  faceDown={false}
                  isTrump={isTrump(card, trumpInfo)}
                  delay={index * 30}
                />
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {canPlay && selectedCards.length > 0 && (
        <View style={styles.playButtonContainer}>
          {gamePhase === GamePhase.KittySwap && onKittySwap ? (
            // Kitty swap mode
            <TouchableOpacity
              style={[
                styles.playButton,
                styles.kittySwapButton,
                (!hasInteractedWithKitty || selectedCards.length !== 8) &&
                  styles.disabledButton,
              ]}
              onPress={onKittySwap}
              disabled={!hasInteractedWithKitty || selectedCards.length !== 8}
              hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
            >
              <Text
                style={[
                  styles.playButtonText,
                  (!hasInteractedWithKitty || selectedCards.length !== 8) &&
                    styles.disabledButtonText,
                ]}
              >
                {!hasInteractedWithKitty
                  ? tGame("actions.selectCardsToSwap")
                  : selectedCards.length === 8
                    ? tGame("actions.swapKittyCards")
                    : tCommon("buttons.selectMore", {
                        count: 8 - selectedCards.length,
                      })}
              </Text>
            </TouchableOpacity>
          ) : (
            // Normal play mode
            onPlayCards && (
              <TouchableOpacity
                style={[
                  styles.playButton,
                  !canInteract && styles.disabledButton,
                ]}
                onPress={onPlayCards}
                disabled={!canInteract}
                hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
              >
                <Text
                  style={[
                    styles.playButtonText,
                    !canInteract && styles.disabledButtonText,
                  ]}
                >
                  {tCommon("buttons.playCards", {
                    count: selectedCards.length,
                  })}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
    flexDirection: "column",
    justifyContent: "flex-start",
    backgroundColor: "transparent",
  },
  handContainer: {
    height: 140,
    width: "100%",
    paddingHorizontal: 4,
    marginTop: 10,
  },
  scrollViewStyle: {
    width: "100%",
    height: 140,
    backgroundColor: "transparent",
  },
  scrollViewContent: {
    minWidth: "100%",
    paddingTop: 35,
    paddingBottom: 20,
    paddingHorizontal: 10,
    flexDirection: "row",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  cardWrapper: {
    height: 95,
    width: 65,
  },
  playButtonContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    zIndex: 100,
  },
  playButton: {
    backgroundColor: "#C62828",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
    minWidth: 130,
    maxWidth: 200,
    height: 36,
    marginBottom: 5,
  },
  kittySwapButton: {
    backgroundColor: "#2E7D32",
    borderColor: "rgba(76, 175, 80, 0.6)",
    minWidth: 150,
    maxWidth: 220,
  },
  playButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    flexShrink: 1,
  },
  disabledButton: {
    backgroundColor: "rgba(128, 128, 128, 0.4)",
    borderColor: "rgba(255, 255, 255, 0.1)",
    opacity: 0.6,
  },
  disabledButtonText: {
    color: "rgba(255, 255, 255, 0.5)",
  },
});

export default HumanHandAnimated;
