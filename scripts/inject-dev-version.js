#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const DEV_VERSION_PATH = path.join(__dirname, '..', 'src', 'dev-version.json');

try {
  // Get git commit hash
  const gitCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  
  // Create dev version info
  const devVersion = {
    gitCommit,
    timestamp: new Date().toISOString(),
  };
  
  // Ensure src directory exists
  const srcDir = path.dirname(DEV_VERSION_PATH);
  if (!fs.existsSync(srcDir)) {
    fs.mkdirSync(srcDir, { recursive: true });
  }
  
  // Write dev version file
  fs.writeFileSync(DEV_VERSION_PATH, JSON.stringify(devVersion, null, 2) + '\n');
  
  console.log(`✓ Injected dev git commit: ${gitCommit.substring(0, 7)}`);
} catch (error) {
  console.warn('⚠️ Could not inject dev version:', error.message);
}