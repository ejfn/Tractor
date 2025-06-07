# Versioning Strategy

**Comprehensive versioning system for Tractor with OTA compatibility**

---

## Overview

The Tractor project uses a sophisticated versioning system that separates **OTA-compatible app versions** from **full tracking versions** to enable proper Expo OTA updates while maintaining complete version history.

## Version Types

### App Version (`expo.version`)
**Purpose**: OTA compatibility and app store versioning  
**Format**: `v{major}.{minor}.0` (always patch 0)  
**Examples**: `v1.0.0`, `v1.1.0`, `v2.0.0`

### Full Version (`expo.extra.version`)
**Purpose**: Complete version tracking with git hash  
**Format**: `v{version}+{git-hash}` or `v{version}-{type}.{count}+{git-hash}`  
**Examples**: 
- `v1.0.3+abc1234` (release)
- `v1.1.0-beta.5+def5678` (beta)
- `v1.1.0-alpha.3+ghi9012` (alpha)

## Versioning by Build Type

### Production Releases (Tags)
**Trigger**: Git tags (`v1.0.3`, `v1.2.1`, etc.)  
**App Version**: Normalized to `v{major}.{minor}.0`  
**Full Version**: Actual tag + git hash  
**OTA Branch**: `production`

**Example**:
- Tag: `v1.0.3`
- App Version: `v1.0.0` (for OTA compatibility)
- Full Version: `v1.0.3+abc1234`

### Beta Builds (Main Branch)
**Trigger**: Main branch pushes  
**App Version**: `v{next-major}.{next-minor}.0-beta.{count}`  
**Full Version**: Same as app version + git hash  
**OTA Branch**: `beta`

**Example**:
- App Version: `v1.1.0-beta.5`
- Full Version: `v1.1.0-beta.5+def5678`

### Alpha Builds (Feature Branches)
**Trigger**: Manual workflow dispatch  
**App Version**: `v{next-major}.{next-minor}.0-alpha.{count}`  
**Full Version**: Same as app version + git hash  
**OTA Branch**: `alpha`

**Example**:
- App Version: `v1.1.0-alpha.3`
- Full Version: `v1.1.0-alpha.3+ghi9012`

## OTA Compatibility Matrix

| Build Type | App Version | Can Receive OTA From |
|------------|-------------|---------------------|
| **Production APK** | `v1.0.0` | Only other `v1.0.0` builds |
| **Beta Builds** | `v1.1.0-beta.X` | Other `v1.1.0-beta.X` builds |
| **Alpha Builds** | `v1.1.0-alpha.X` | Other `v1.1.0-alpha.X` builds |

**Key Insight**: Only builds with identical `expo.version` can exchange OTA updates.

## Version Generation Logic

### Git Tag Analysis
```bash
# Find latest version tag
LAST_TAG=$(git tag -l "v*.*.*" --sort=-version:refname | head -n1)

# Calculate next version
if [[ -n "$LAST_TAG" ]]; then
  LAST_VERSION=${LAST_TAG#v}
  MAJOR=$(echo $LAST_VERSION | cut -d. -f1)
  MINOR=$(echo $LAST_VERSION | cut -d. -f2)
  NEXT_VERSION="${MAJOR}.$((MINOR + 1)).0"
else
  NEXT_VERSION="1.0.0"
fi
```

### Release Normalization
```bash
# Release v1.0.3 becomes:
RAW_VERSION="v1.0.3"
APP_VERSION="v1.0.0"        # OTA compatible
FULL_VERSION="v1.0.3+abc1234"  # Complete tracking
```

## Development Workflow

### 1. Feature Development
- Work on feature branches
- Use alpha builds for testing: `v1.1.0-alpha.X`
- Alpha builds isolated from production

### 2. Integration Testing  
- Merge to main branch
- Beta builds: `v1.1.0-beta.X`
- Beta builds isolated from production

### 3. Release Process
- Create release tag: `v1.0.3`
- APK built with `expo.version: "v1.0.0"`
- Can receive OTA updates from other `v1.0.0` builds

### 4. Patch Updates
- Create new release tag: `v1.0.4`
- Still uses `expo.version: "v1.0.0"`
- Existing APKs can receive this as OTA update

### 5. Minor Version Bump
- Create release tag: `v1.1.0`
- New `expo.version: "v1.1.0"`
- Requires new APK build (no OTA to v1.0.x)

## File Structure

### Git Version Action
**Location**: `.github/actions/git-version/action.yml`  
**Purpose**: Analyzes git context and generates version information  
**Outputs**:
- `app-version`: OTA-compatible version
- `full-version`: Complete version with git hash
- `eas-branch`: Deployment branch

### Version Display Component
**Location**: `src/components/VersionDisplay.tsx`  
**Purpose**: Shows version in app UI  
**Priority**:
1. Dev version from `src/dev-version.json`
2. Full version from `expo.extra.version`
3. App version from `expo.version`

### Dev Version Script
**Location**: `scripts/inject-dev-version.js`  
**Purpose**: Generates development version info  
**Output**: `src/dev-version.json` with computed next version

## Configuration Files

### app.json Injection
The git-version action injects versions into `app.json`:
```json
{
  "expo": {
    "version": "v1.0.0",                    // App version (OTA compatible)
    "extra": {
      "version": "v1.0.3+abc1234",          // Full version (tracking)
      "gitCommit": "abc1234..."             // Complete git hash
    }
  }
}
```

### Workflow Integration
**EAS Update**: `eas update --branch {eas-branch} --message "Update {full-version}"`  
**EAS Build**: `eas build --platform android --profile production`

## Benefits

### OTA Compatibility
- Production APKs can receive patch-level OTA updates
- Clean separation between development and production
- Predictable update behavior

### Version Tracking
- Complete git history preserved in full version
- Easy debugging with git hash correlation
- Clear development vs production distinction

### Development Workflow
- Alpha/beta builds isolated from production
- Safe testing without affecting end users
- Automated version calculation from git tags

## Migration Notes

### From Previous System
- Old system: `expo.version` changed with every commit hash
- New system: `expo.version` stable for OTA compatibility
- Version display now uses `expo.extra.version` for full tracking

### Breaking Changes
- Workflow outputs renamed: `version` → `full-version`
- App compatibility determined by `expo.version`, not `expo.extra.version`
- OTA updates limited to exact `expo.version` matches

---

**Related Files:**
- `.github/actions/git-version/action.yml` - Version generation logic
- `src/components/VersionDisplay.tsx` - Version display component  
- `scripts/inject-dev-version.js` - Development version generation