# Versioning Strategy

**OTA-compatible versioning system for Tractor**

## Overview

Tractor uses a triple-version system with explicit runtime version control for precise OTA management.

## Version Types

### App Version (`expo.version`)
**Purpose**: User-visible version configured in `app.json` (without leading `v` per standard app store requirements)
- **Production**: `{major}.{minor}.{patch}` (actual release version, e.g. `1.0.3`)
- **Beta**: `{major}.{next-minor}.0-beta.{count}` (clean version without hash)
- **Alpha**: `{major}.{next-minor}.0-alpha.{count}` (clean version without hash)

### Runtime Version (`expo.runtimeVersion`)
**Purpose**: Controls OTA compatibility and update isolation
- **Production**: `v{major}.{minor}.0` (normalized for cross-patch OTA)
- **Beta**: `v{major}.{next-minor}.0-beta` (stable across the beta lineage to enable OTA updates without APK rebuilding)
- **Alpha**: `v{major}.{next-minor}.0-alpha.{count}+{git-hash}` (isolated per build to guarantee feature branch safety)

### Full Version (`expo.extra.version`)
**Purpose**: Complete tracking with git hash for debugging (injected into the build on CI; not stored in `app.json`)
- **Production**: `v{major}.{minor}.{patch}+{git-hash}` (actual tag + hash)
- **Beta**: `v{major}.{next-minor}.0-beta.{count}+{git-hash}` (complete tracking)
- **Alpha**: `v{major}.{next-minor}.0-alpha.{count}+{git-hash}` (complete tracking)

## Versioning by Build Type

### Production Releases (Tags)
- **App Version**: `1.0.3` (actual release version without leading 'v')
- **Runtime Version**: `v1.0.0` (normalized for OTA)
- **Full Version**: `v1.0.3+abc1234` (with git hash)
- **OTA**: Compatible between patch releases

### Beta Builds (Main Branch)
- **App Version**: `1.1.0-beta.5` (clean version without leading 'v')
- **Runtime Version**: `v1.1.0-beta` (stable across all beta commits)
- **Full Version**: `v1.1.0-beta.5+def5678` (complete tracking)
- **OTA**: Compatible across all beta updates for that version lineage

### Alpha Builds (Feature Branches)
- **App Version**: `1.1.0-alpha.3` (clean version without leading 'v')
- **Runtime Version**: `v1.1.0-alpha.3+ghi9012` (isolated per feature branch commit)
- **Full Version**: `v1.1.0-alpha.3+ghi9012` (complete tracking)
- **OTA**: Isolated per build to protect experimental branches

## OTA Compatibility

| Build Type | Runtime Version | OTA Compatibility |
|------------|-----------------|-------------------|
| **Production** | `v1.0.0` | ✅ Between patch releases |
| **Beta** | `v1.1.0-beta` | ✅ Across all beta commits in lineage |
| **Alpha** | `v1.1.0-alpha.X+hash` | ❌ Isolated per build (feature safety) |

## Release & Build Pipeline Automation

Tractor optimizes CI/CD resource usage and deployment speed by dynamically splitting release workflows:
- **Latest Release**: When a release is published and marked as **Latest** on GitHub:
  - The [**`build-apk.yml`**](../.github/workflows/build-apk.yml) workflow builds the Android APK binary and attaches it to the release assets.
  - The [**`ota-update.yml`**](../.github/workflows/ota-update.yml) workflow skips publishing (deferring to the newly built APK).
- **Non-Latest Releases & Pre-Releases**: When a release is published but is *not* marked as Latest (e.g. patch updates within the same runtime version, or pre-releases):
  - The [**`ota-update.yml`**](../.github/workflows/ota-update.yml) workflow deploys an OTA update via EAS.
  - The [**`build-apk.yml`**](../.github/workflows/build-apk.yml) workflow skips binary compilation.
- **Main Branch Pushes**: Pushes to `main` continue to run tests, update badges, and publish OTA updates to the `preview` branch.

## Dev Client Side-by-Side Installation

To prevent development builds from overwriting your stable production build on your mobile device, Tractor dynamically overrides the package configuration on the GitHub Actions runner before compiling the Development Client APK:

* **Standard / Production builds**: Compiles with the static production details (`name: "Tractor"`, `package: "com.cardgame.tractor"`).
* **Development Client builds**: The [**`build-dev-client.yml`**](../.github/workflows/build-dev-client.yml) workflow rewrites `app.json` on the runner before building — distinct app name, a `.dev` Android package / iOS bundle id, and the build's EAS update channel — so the Dev Client installs alongside production. (See the workflow for the exact `jq` mutations.)

This allows developers to keep the official production app installed while concurrently running and testing with the custom Development Client shell.

## Key Benefits

- **Accurate App Versions**: Users see actual release versions (v1.0.3, not v1.0.0)
- **Explicit OTA Control**: Runtime version directly controls update compatibility
- **Clean APK Filenames**: `tractor-v1.0.3.apk` instead of normalized versions
- **Testing Isolation**: Feature branches are safely isolated, while the main beta branch supports frictionless OTA updates
- **Side-by-Side Testing**: Develop and test Dev Clients without overwriting the production build
- **Precise Debugging**: Git hash enables exact commit tracking
- **Automated Calculation**: Version logic derived from git tags
- **Pre-Release Baseline**: Projects always start with `0.1.0` (runtime `v0.1.0`) as their initial baseline across `app.json`, `package.json`, and CI fallback version calculations