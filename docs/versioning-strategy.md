# Tractor v1.0 Versioning & Update Strategy

## Overview

Tractor uses a **single-channel OTA update strategy** with EAS Updates for seamless patch distribution while controlling major releases.

## Version Configuration

### Current Setup (v1.0.0)
```json
// package.json & app.json
"version": "1.0.0"

// app.json android section  
"versionCode": 1
"package": "com.tractorgame.app"

// EAS Updates
"runtimeVersion": {"policy": "sdkVersion"}
"updates": {
  "url": "https://u.expo.dev/3256dcee-103a-467b-96c4-97a9f634df51",
  "requestHeaders": {"expo-channel-name": "production"}
}
```

## Update Strategy

### Patch Releases (1.0.x → OTA Updates)
**Use Case**: Bug fixes, minor improvements, content updates
**Method**: Over-The-Air (OTA) updates via EAS Updates
**User Experience**: Automatic updates, no manual installation required

**Process:**
```bash
# 1. Update version (keep versionCode: 1)
npm version patch  # 1.0.0 → 1.0.1

# 2. Push OTA update to production channel
npx eas update --channel production --message "Bug fixes for v1.0.1"

# 3. All v1.0.x users automatically receive update
```

### Minor/Major Releases (1.1.x → New APK)
**Use Case**: New features, breaking changes, native code updates
**Method**: New APK distribution via GitHub Releases
**User Experience**: Manual download and installation required

**Process:**
```bash
# 1. Update version and bump versionCode
npm version minor  # 1.0.x → 1.1.0
# Update app.json: "versionCode": 2

# 2. Build new APK
npx eas build --platform android --profile production

# 3. Create GitHub Release with new APK
# 4. Users must manually install to get 1.1.x features
```

## User Migration Path

### Current State: v1.0.0 Users
- **Receive**: Automatic OTA updates (1.0.1, 1.0.2, 1.0.3, etc.)
- **Compatible**: All 1.0.x patches use same versionCode (1)
- **Stable**: No breaking changes, only improvements and fixes

### Future State: v1.1.0 Release
- **v1.0.x users**: Continue receiving 1.0.x patches, must manually upgrade to 1.1.0
- **v1.1.0 users**: Start receiving automatic 1.1.x patches (versionCode: 2)
- **Migration**: Natural upgrade path as users want new features

## Benefits of Single Channel Strategy

✅ **Simplified Management**: One `production` channel instead of multiple version channels
✅ **Fast Patches**: Critical bug fixes reach all users instantly via OTA
✅ **Controlled Upgrades**: You decide when to require new APK downloads  
✅ **User Choice**: Users can stay on stable versions until ready to upgrade
✅ **Gradual Migration**: No forced updates, users upgrade when they want new features

## When to Bump versionCode (Force APK)

**Always bump versionCode for:**
- Expo SDK upgrades (e.g., SDK 53 → 54)
- New Android permissions
- Native module changes (adding/removing native dependencies)
- Breaking changes that can't be handled via OTA

**Can use OTA for:**
- JavaScript code changes
- React Native code updates (within same RN version)
- Asset updates (images, sounds)
- Configuration changes
- Bug fixes and improvements

## Version Compatibility Matrix

| User Version | versionCode | Receives Updates | Update Type |
|-------------|-------------|------------------|-------------|
| 1.0.0       | 1           | 1.0.1, 1.0.2... | OTA         |
| 1.0.1       | 1           | 1.0.2, 1.0.3... | OTA         |
| 1.0.x       | 1           | Latest 1.0.x    | OTA         |
| 1.1.0       | 2           | 1.1.1, 1.1.2... | OTA         |
| 1.1.x       | 2           | Latest 1.1.x    | OTA         |

## Implementation Status

✅ **EAS Build Configuration**: Production APK builds ready
✅ **EAS Updates Setup**: OTA update capability configured  
✅ **Single Channel**: `production` channel for all releases
✅ **Version Strategy**: 1.0.0 baseline with clear upgrade path
✅ **App Configuration**: Android package and permissions set

## Next Steps for v1.0 Release

1. **Build Production APK**: `npx eas build --platform android --profile production`
2. **Test APK Installation**: Verify on multiple Android devices
3. **Create GitHub Release**: Upload APK with release notes
4. **Test OTA Updates**: Verify patch update workflow from v1.0.0

## Future Considerations

- **Google Play Store**: Consider Play Store distribution for v2.0+
- **iOS Support**: Add iOS builds for broader platform support
- **Beta Channel**: Potential beta testing channel for pre-release features
- **Analytics**: Track update adoption rates and user feedback

---

**Documentation Updated**: June 5, 2024  
**Current Version**: 1.0.0 (versionCode: 1)  
**Status**: Ready for v1.0 production release