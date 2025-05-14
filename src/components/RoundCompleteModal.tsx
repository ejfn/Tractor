import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Animated,
  Modal
} from 'react-native';

interface RoundCompleteModalProps {
  visible: boolean;
  message: string;
  onNextRound: () => void;
  fadeAnim: Animated.Value;
  scaleAnim: Animated.Value;
}

/**
 * Round completion modal displaying the round results and next round button
 */
const RoundCompleteModal: React.FC<RoundCompleteModalProps> = ({
  visible,
  message,
  onNextRound,
  fadeAnim,
  scaleAnim
}) => {
  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onNextRound}
    >
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <Text style={styles.title}>Round Complete</Text>
          <Text style={styles.message}>{message}</Text>
          
          <TouchableOpacity
            style={styles.button}
            onPress={onNextRound}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>NEXT ROUND</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)', // Semi-transparent background
  },
  card: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3F51B5',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 18,
    color: '#212121',
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#3F51B5',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 30,
    width: '80%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
});

export default RoundCompleteModal;