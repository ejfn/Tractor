import React from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Animated,
} from 'react-native';
import { Suit, TrumpInfo } from '../types/game';

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
  scaleAnim
}) => {
  if (!visible) return null;
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
    >
      <View style={styles.modalContainer}>
        <Animated.View 
          style={[
            styles.modalContent,
            {
              transform: [{ scale: scaleAnim }],
              opacity: fadeAnim
            }
          ]}
        >
          <Text style={styles.modalTitle}>Declare Trump Suit?</Text>
          <Text style={styles.modalText}>
            You have a {trumpInfo.trumpRank} in your hand.
            Would you like to declare a trump suit?
          </Text>
          
          <View style={styles.suitButtons}>
            {Object.values(Suit).map(suit => {
              // Determine suit colors
              let suitColor = '#000';
              let bgColor = '#F5F5F5';
              
              switch(suit) {
                case Suit.Hearts:
                case Suit.Diamonds:
                  suitColor = '#D32F2F';
                  bgColor = '#FFEBEE';
                  break;
                case Suit.Clubs:
                case Suit.Spades:
                  suitColor = '#212121';
                  bgColor = '#ECEFF1';
                  break;
              }
              
              return (
                <TouchableOpacity
                  key={suit}
                  style={[styles.suitButton, { backgroundColor: bgColor }]}
                  onPress={() => onDeclareSuit(suit)}
                >
                  <Text style={[styles.suitSymbol, { color: suitColor }]}>
                    {suit === Suit.Hearts ? '♥' : 
                     suit === Suit.Diamonds ? '♦' : 
                     suit === Suit.Clubs ? '♣' : '♠'}
                  </Text>
                  <Text style={[styles.suitText, { color: suitColor }]}>{suit}</Text>
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
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#333',
  },
  modalText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  suitButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 15,
  },
  suitButton: {
    padding: 15,
    margin: 5,
    borderRadius: 10,
    width: '45%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  suitSymbol: {
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  suitText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  skipButton: {
    backgroundColor: '#90A4AE',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginTop: 5,
    width: '100%',
    alignItems: 'center',
  },
  skipText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default TrumpDeclarationModal;