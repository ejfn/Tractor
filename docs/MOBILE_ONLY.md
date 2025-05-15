# Mobile-Only Application

## Important: This is a Mobile-Only Game

Tractor is specifically designed and optimized for **mobile platforms only** (Android and iOS).

### Platform Support

✅ **Supported Platforms:**
- Android devices
- iOS devices

❌ **Unsupported Platforms:**
- Web browsers
- Desktop applications
- Expo web/browser preview

### Development and Testing

When developing and testing the application:

1. **Always use a mobile device or emulator**
   - Android emulator (via Android Studio)
   - iOS simulator (via Xcode)
   - Physical devices connected via USB or over local network

2. **Avoid web-based previews**
   - The "web" preview in Expo will not work correctly
   - Browser-based testing will fail and show only the default Expo screen

3. **Running commands**
   ```bash
   # Correct way to run the app (specifies platform)
   npm run android   # For Android
   npm run ios       # For iOS
   
   # This will work but requires selecting a device
   npx expo start    # Then press 'a' for Android or 'i' for iOS
   ```

### Technical Details

The app is built using:
- React Native for native mobile development
- Expo for simplified build configuration and deployment
- React Navigation for screen management
- Custom components optimized for touch interaction

### Known Issues

- The app will not load correctly when previewed in a web browser
- Expo Go web preview will only show the "Welcome to Expo" default screen
- Running without targeting a specific platform may result in errors or blank screens

For additional information about the game architecture and implementation details, please see the [ARCHITECTURE.md](./ARCHITECTURE.md) file.