import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, Text, View, StatusBar as RNStatusBar } from 'react-native';
import 'react-native-reanimated';

// Import the color scheme hook
import { useColorScheme } from '@/hooks/useColorScheme';

// Header title with "Tractor Card Game" on a single line
const HeaderTitle = () => (
  <View style={{ width: '100%', alignItems: 'center' }}>
    <Text
      style={{
        color: 'white',
        fontSize: 18,  // Slightly reduced font size
        fontWeight: 'bold',
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.25)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
        // Ensure it doesn't get truncated
        paddingHorizontal: 5,
        width: Platform.OS === 'android' ? 200 : undefined, // Fixed width on Android
      }}
      numberOfLines={1}
      adjustsFontSizeToFit={true}
    >
      Tractor Card Game
    </Text>
  </View>
);

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* Use dark status bar on Android for better visibility */}
      <StatusBar style={Platform.OS === 'android' ? 'light' : 'auto'} />
      {/* Render a view under the status bar to change its background on Android */}
      {Platform.OS === 'android' && (
        <View 
          style={{
            backgroundColor: '#3F51B5',
            height: RNStatusBar.currentHeight || 0,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        />
      )}
      <Stack
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: '#3F51B5', // Deep blue background for header
          },
          headerTintColor: '#FFFFFF', // White text for header
          headerTitleAlign: 'center', // Center the header title
          headerTitle: (props) => <HeaderTitle />,
          // Ensure header has no back button or other elements that would take space
          headerLeft: () => null,
          headerRight: () => null,
          contentStyle: {
            backgroundColor: 'transparent', // Reverted from filled color to transparent
            flex: 1, // Make content fill available space
            height: '100%', // Ensure content fills the height
          }
        }}
      />
    </ThemeProvider>
  );
}
