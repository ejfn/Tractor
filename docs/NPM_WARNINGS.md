# NPM Dependency Warnings

This document tracks npm warnings related to deprecated dependencies that are not directly in our control.

## Current Warnings (as of January 2025)

These warnings come from sub-dependencies of our main packages:

1. **inflight@1.0.6**: Used by multiple packages through glob@6.x and glob@7.x
   - From: expo@53.0.9, jest@29.7.0, jest-expo@53.0.5, react-native@0.79.2, eas-cli@16.6.1
   
2. **lodash.get@4.4.2**: Likely from expo or react-native dependencies
   - Can be replaced with optional chaining (?.) in modern JS

3. **rimraf@2.4.5 & rimraf@3.0.2**: Used by various packages
   - From: expo@53.0.9, eas-cli@16.6.1

4. **glob@6.0.4 & glob@7.2.3**: Used extensively by jest, react-native, and expo
   - Multiple warnings for versions prior to v9

5. **@oclif/screen@3.0.8**: Likely from eas-cli

6. **abab@2.0.6**: Commonly used in jest/jsdom dependencies

7. **sudo-prompt@9.1.1**: Likely from react-native or expo CLI tools

8. **domexception@4.0.0**: Likely from jest/jsdom testing environment

9. **@xmldom/xmldom@0.7.13**: Often used in React Native ecosystem

## Actions Taken

1. Removed `@babel/plugin-proposal-export-namespace-from` (the only deprecated package we directly controlled)

## Recommendations

These warnings are harmless but annoying. They come from sub-dependencies and will likely be fixed as our main dependencies (expo, jest, react-native) update their own dependencies. 

To reduce warnings:
1. Keep main dependencies updated
2. Consider using `npm install --silent` for CI/CD
3. Wait for ecosystem updates

No immediate action required as these don't affect functionality.