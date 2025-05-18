import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Modal,
  Animated,
  Dimensions
} from 'react-native';

interface RoundCompleteModalProps {
  visible: boolean;
  message: string;
  onNextRound: () => void;
  fadeAnim?: any;
  scaleAnim?: any;
}

/**
 * Round completion modal displaying the round results and next round button
 */
const RoundCompleteModal: React.FC<RoundCompleteModalProps> = ({
  visible,
  message,
  onNextRound,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (visible) {
      // Reset animations
      scaleAnim.setValue(0);
      bounceAnim.setValue(0);
      fadeAnim.setValue(0);
      
      // Start animations
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);
  
  if (!visible) return null;
  
  const translateY = bounceAnim.interpolate({
    inputRange: [0, 0.5, 0.7, 0.85, 1],
    outputRange: [50, -10, 5, -2, 0],
  });
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onNextRound}
      style={{ zIndex: 9999 }}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View 
          style={[
            styles.modalContent,
            {
              transform: [
                { scale: scaleAnim },
                { translateY: translateY }
              ]
            }
          ]}
        >
          {/* Background effects */}
          <View style={styles.backgroundDeco1} />
          <View style={styles.backgroundDeco2} />
          
          {/* Trophy/Crown emoji for winner */}
          <Text style={styles.trophy}>
            {message.toLowerCase().includes('advance') ? '⚔️' : '🛡️'}
          </Text>
          
          <Text style={styles.title}>Round Complete!</Text>
          <Text style={styles.message}>{message}</Text>
          
          <TouchableOpacity
            style={styles.button}
            onPress={onNextRound}
            activeOpacity={0.8}
          >
            <View style={styles.buttonGradient}>
              <Text style={styles.buttonText}>NEXT ROUND →</Text>
            </View>
          </TouchableOpacity>
          
          {/* Decorative corners */}
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  modalContent: {
    backgroundColor: '#FAFAFA',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 12,
    zIndex: 10000,
    borderWidth: 3,
    borderColor: '#FFD700',
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundDeco1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    backgroundColor: '#FFD700',
    borderRadius: 75,
    opacity: 0.1,
  },
  backgroundDeco2: {
    position: 'absolute',
    bottom: -70,
    left: -70,
    width: 200,
    height: 200,
    backgroundColor: '#3F51B5',
    borderRadius: 100,
    opacity: 0.08,
  },
  trophy: {
    fontSize: 60,
    marginBottom: 15,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 10,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  message: {
    fontSize: 18,
    color: '#34495E',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 26,
    fontWeight: '500',
    paddingHorizontal: 20,
  },
  button: {
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  buttonGradient: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 45,
    borderRadius: 30,
    minWidth: 200,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#45a049',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#FFD700',
    borderWidth: 3,
  },
  topLeft: {
    top: -3,
    left: -3,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 20,
  },
  topRight: {
    top: -3,
    right: -3,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 20,
  },
  bottomLeft: {
    bottom: -3,
    left: -3,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 20,
  },
  bottomRight: {
    bottom: -3,
    right: -3,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 20,
  },
});

export default RoundCompleteModal;