import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Modal
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
  if (!visible) return null;
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onNextRound}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Round Complete</Text>
          <Text style={styles.message}>{message}</Text>
          
          <TouchableOpacity
            style={styles.button}
            onPress={onNextRound}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>NEXT ROUND</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 25,
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3F51B5',
    marginBottom: 15,
  },
  message: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#3F51B5',
    paddingVertical: 12,
    paddingHorizontal: 35,
    borderRadius: 25,
    minWidth: 140,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default RoundCompleteModal;