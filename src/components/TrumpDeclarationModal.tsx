import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Suit, TrumpInfo } from "../types";

interface TrumpDeclarationModalProps {
  visible: boolean;
  trumpInfo: TrumpInfo;
  onDeclareSuit: (suit: Suit | null) => void;
  fadeAnim: Animated.Value;
  scaleAnim: Animated.Value;
}

/**
 * Modal component for declaring a trump suit
 */
const TrumpDeclarationModal: React.FC<TrumpDeclarationModalProps> = ({
  visible,
  trumpInfo,
  onDeclareSuit,
  fadeAnim,
  scaleAnim,
}) => {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent={true} animationType="slide">
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.dismissArea}
          activeOpacity={1}
          onPress={() => onDeclareSuit(null)}
        />
        <SafeAreaView style={styles.bottomSheetContainer}>
          <Animated.View
            style={[
              styles.bottomSheet,
              {
                transform: [{ scale: scaleAnim }],
                opacity: fadeAnim,
              },
            ]}
          >
            <Text style={styles.modalTitle}>Declare Trump Suit?</Text>
            <Text style={styles.modalText}>
              You have a {trumpInfo.trumpRank} in your hand. Would you like to
              declare a trump suit?
            </Text>

            <View style={styles.suitButtons}>
              {Object.values(Suit).map((suit) => {
                // Determine suit colors
                let suitColor = "#000";
                let bgColor = "#F5F5F5";

                switch (suit) {
                  case Suit.Hearts:
                  case Suit.Diamonds:
                    suitColor = "#D32F2F";
                    bgColor = "#FFEBEE";
                    break;
                  case Suit.Clubs:
                  case Suit.Spades:
                    suitColor = "#212121";
                    bgColor = "#ECEFF1";
                    break;
                }

                return (
                  <TouchableOpacity
                    key={suit}
                    style={[styles.suitButton, { backgroundColor: bgColor }]}
                    onPress={() => onDeclareSuit(suit)}
                  >
                    <Text style={[styles.suitSymbol, { color: suitColor }]}>
                      {suit === Suit.Hearts
                        ? "♥"
                        : suit === Suit.Diamonds
                          ? "♦"
                          : suit === Suit.Clubs
                            ? "♣"
                            : "♠"}
                    </Text>
                    <Text style={[styles.suitText, { color: suitColor }]}>
                      {suit}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => onDeclareSuit(null)}
            >
              <Text style={styles.skipText}>Don&apos;t Declare</Text>
            </TouchableOpacity>
          </Animated.View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  dismissArea: {
    flex: 1,
  },
  bottomSheetContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomSheet: {
    backgroundColor: "white",
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 30 : 40,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    alignItems: "center",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
    color: "#333",
  },
  modalText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
    color: "#666",
  },
  suitButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 12,
  },
  suitButton: {
    padding: 12,
    margin: 4,
    borderRadius: 10,
    width: "45%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  suitSymbol: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  suitText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  skipButton: {
    backgroundColor: "#90A4AE",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: 8,
    width: "100%",
    alignItems: "center",
  },
  skipText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
});

export default TrumpDeclarationModal;
