import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { GameState, PlayerId, DeclarationType } from "../types";
import { getTrumpDeclarationStatus } from "../game/trumpDeclarationManager";

interface TrumpDeclarationNotificationProps {
  gameState: GameState;
  onAnimationComplete?: () => void;
}

interface NotificationData {
  playerId: PlayerId;
  type: DeclarationType;
  suit: any;
  timestamp: number;
}

export function TrumpDeclarationNotification({
  gameState,
  onAnimationComplete,
}: TrumpDeclarationNotificationProps) {
  const [notification, setNotification] = useState<NotificationData | null>(
    null,
  );
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-100));

  // Monitor declaration status changes
  useEffect(() => {
    const declarationStatus = getTrumpDeclarationStatus(gameState);

    if (declarationStatus.hasDeclaration && declarationStatus.declarer) {
      // Check if this is a new declaration
      const lastDeclaration =
        gameState.trumpDeclarationState?.declarationHistory.slice(-1)[0];

      if (
        lastDeclaration &&
        (!notification || lastDeclaration.timestamp !== notification.timestamp)
      ) {
        const newNotification: NotificationData = {
          playerId: lastDeclaration.playerId,
          type: lastDeclaration.type,
          suit: lastDeclaration.suit,
          timestamp: lastDeclaration.timestamp,
        };

        setNotification(newNotification);
        showNotification();
      }
    }
  }, [gameState.trumpDeclarationState?.declarationHistory]);

  const showNotification = () => {
    // Reset animations
    fadeAnim.setValue(0);
    slideAnim.setValue(-100);

    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Hold for 2 seconds, then animate out
      setTimeout(() => {
        hideNotification();
      }, 2000);
    });
  };

  const hideNotification = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setNotification(null);
      onAnimationComplete?.();
    });
  };

  if (!notification) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.notification}>
        <Text style={styles.icon}>🃏</Text>
        <View style={styles.content}>
          <Text style={styles.title}>Trump Declared!</Text>
          <Text style={styles.details}>
            {getPlayerDisplayName(notification.playerId)} declared{" "}
            {getDeclarationTypeDisplay(notification.type)} in{" "}
            {notification.suit}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

function getPlayerDisplayName(playerId: PlayerId): string {
  switch (playerId) {
    case PlayerId.Human:
      return "You";
    case PlayerId.Bot1:
      return "Bot 1";
    case PlayerId.Bot2:
      return "Bot 2";
    case PlayerId.Bot3:
      return "Bot 3";
    default:
      return playerId;
  }
}

function getDeclarationTypeDisplay(type: DeclarationType): string {
  switch (type) {
    case DeclarationType.Single:
      return "a single trump";
    case DeclarationType.Pair:
      return "a trump pair";
    case DeclarationType.JokerPair:
      return "joker pair";
    default:
      return type;
  }
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  notification: {
    backgroundColor: "rgba(255, 215, 0, 0.95)",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  icon: {
    fontSize: 32,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 4,
  },
  details: {
    fontSize: 14,
    color: "#333",
  },
});
