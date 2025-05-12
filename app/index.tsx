import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

// Import the enhanced game screen with all features
import EnhancedGameScreen from '../src/screens/EnhancedGameScreen';

export default function Index() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <EnhancedGameScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  }
});