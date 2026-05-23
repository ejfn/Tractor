# Versioning Strategy

**OTA-compatible versioning system for Tractor**

## Overview

Tractor uses a triple-version system with explicit runtime version control for precise OTA management.

## Version Types

### App Version (`expo.version`)
**Purpose**: User-visible version displayed in app
- **Production**: `v{major}.{minor}.{patch}` (actual release version)
- **Beta**: `v{major}.{next-minor}.0-beta.{count}` (clean version without hash)
- **Alpha**: `v{major}.{next-minor}.0-alpha.{count}` (clean version without hash)

### Runtime Version (`expo.runtimeVersion`)
**Purpose**: Controls OTA compatibility and update isolation
- **Production**: `v{major}.{minor}.0` (normalized for cross-patch OTA)
- **Beta**: `v{major}.{next-minor}.0-beta` (stable across the beta lineage to enable OTA updates without APK rebuilding)
- **Alpha**: `v{major}.{next-minor}.0-alpha.{count}+{git-hash}` (isolated per build to guarantee feature branch safety)

### Full Version (`expo.extra.version`)
**Purpose**: Complete tracking with git hash for debugging
- **Production**: `v{major}.{minor}.{patch}+{git-hash}` (actual tag + hash)
- **Beta**: `v{major}.{next-minor}.0-beta.{count}+{git-hash}` (complete tracking)
- **Alpha**: `v{major}.{next-minor}.0-alpha.{count}+{git-hash}` (complete tracking)

## Versioning by Build Type

### Production Releases (Tags)
- **App Version**: `v1.0.3` (actual release version)
- **Runtime Version**: `v1.0.0` (normalized for OTA)
- **Full Version**: `v1.0.3+abc1234` (with git hash)
- **OTA**: Compatible between patch releases

### Beta Builds (Main Branch)
- **App Version**: `v1.1.0-beta.5` (clean version)
- **Runtime Version**: `v1.1.0-beta` (stable across all beta commits)
- **Full Version**: `v1.1.0-beta.5+def5678` (complete tracking)
- **OTA**: Compatible across all beta updates for that version lineage

### Alpha Builds (Feature Branches)
- **App Version**: `v1.1.0-alpha.3` (clean version)
- **Runtime Version**: `v1.1.0-alpha.3+ghi9012` (isolated per feature branch commit)
- **Full Version**: `v1.1.0-alpha.3+ghi9012` (complete tracking)
- **OTA**: Isolated per build to protect experimental branches

## OTA Compatibility

| Build Type | Runtime Version | OTA Compatibility |
|------------|-----------------|-------------------|
| **Production** | `v1.0.0` | ✅ Between patch releases |
| **Beta** | `v1.1.0-beta` | ✅ Across all beta commits in lineage |
| **Alpha** | `v1.1.0-alpha.X+hash` | ❌ Isolated per build (feature safety) |

## Dev Client Side-by-Side Installation

To prevent development builds from overwriting your stable production build on your mobile device, Tractor dynamically overrides the package configuration on the GitHub Actions runner before compiling the Development Client APK:

* **Standard / Production builds**: Compiles with the static production details (`name: "Tractor"`, `package: "com.cardgame.tractor"`).
* **Development Client builds**: The [**`eas-build-dev.yml`**](file:///home/eric/repos/Tractor/.github/workflows/eas-build-dev.yml) workflow uses `jq` to statically mutate `app.json` on the runner before uploading (`name: "Tractor (Dev)"`, `package: "com.cardgame.tractor.dev"`, `updates.requestHeaders["expo-channel-name"] = "preview"`).

This allows developers to keep the official production app installed while concurrently running and testing with the custom Development Client shell.

## Key Benefits

- **Accurate App Versions**: Users see actual release versions (v1.0.3, not v1.0.0)
- **Explicit OTA Control**: Runtime version directly controls update compatibility
- **Clean APK Filenames**: `tractor-v1.0.3.apk` instead of normalized versions
- **Testing Isolation**: Feature branches are safely isolated, while the main beta branch supports frictionless OTA updates
- **Side-by-Side Testing**: Develop and test Dev Clients without overwriting the production build
- **Precise Debugging**: Git hash enables exact commit tracking
- **Automated Calculation**: Version logic derived from git tags