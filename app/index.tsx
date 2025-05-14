import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

// Import both game screens
import EnhancedGameScreen from '../src/screens/EnhancedGameScreen';

export default function Index() {
  const [hasError, setHasError] = useState(false);

  // Function to render the game screen with error handling
  const renderGameScreen = () => {
    try {
      // Render the enhanced game screen
      return <EnhancedGameScreen />;
    } catch (error) {
      // Log the error and set error state
      console.error("Game loading error:", error instanceof Error ? error.message : String(error));
      // We need to use setTimeout to avoid state updates during render
      setTimeout(() => setHasError(true), 0);
      // Return error UI
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error loading game</Text>
          <Text>{error instanceof Error ? error.message : String(error)}</Text>
        </View>
      );
    }
  };

  // Debug UI removed since we fixed the issue

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      {hasError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Something went wrong</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => setHasError(false)}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.gameContainer}>
          {renderGameScreen()}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  gameContainer: {
    flex: 1,
    position: 'relative',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#D32F2F',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#3F51B5',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Debug styles removed
});