# Versioning Strategy

**OTA-compatible versioning system for Tractor**

## Overview

Tractor uses a dual-version system that enables OTA updates for production while isolating test builds.

## Version Types

### App Version (`expo.version`)
**Purpose**: Runtime version that determines OTA compatibility
- **Production**: `v{major}.{minor}.0` (clean for OTA compatibility)
- **Beta**: `v{major}.{next-minor}.0-beta.{count}+{git-hash}` (next minor from last tag)
- **Alpha**: `v{major}.{next-minor}.0-alpha.{count}+{git-hash}` (next minor from last tag)

### Full Version (`expo.extra.version`)
**Purpose**: Complete tracking with git hash
- **Production**: `v{major}.{minor}.{patch}+{git-hash}` (actual tag + hash)
- **Beta**: `v{major}.{next-minor}.0-beta.{count}+{git-hash}` (same as app version)
- **Alpha**: `v{major}.{next-minor}.0-alpha.{count}+{git-hash}` (same as app version)

## Versioning by Build Type

### Production Releases (Tags)
- **App Version**: `v1.0.0` (normalized for OTA)
- **Full Version**: `v1.0.3+abc1234` (actual tag + hash)
- **OTA**: Compatible between patch releases

### Beta Builds (Main Branch)
- **App Version**: `v1.1.0-beta.5+def5678`
- **Full Version**: `v1.1.0-beta.5+def5678` (same)
- **OTA**: Isolated per build

### Alpha Builds (Feature Branches)
- **App Version**: `v1.1.0-alpha.3+ghi9012`
- **Full Version**: `v1.1.0-alpha.3+ghi9012` (same)
- **OTA**: Isolated per build

## OTA Compatibility

| Build Type | App Version | OTA Compatibility |
|------------|-------------|-------------------|
| **Production** | `v1.0.0` | ✅ Between patch releases |
| **Beta** | `v1.1.0-beta.X+hash` | ❌ Isolated per build |
| **Alpha** | `v1.1.0-alpha.X+hash` | ❌ Isolated per build |

## Key Benefits

- **Production**: Seamless OTA updates between patch releases
- **Testing**: Complete isolation prevents cross-contamination
- **Tracking**: Git hash enables precise debugging
- **Automation**: Version calculation from git tags