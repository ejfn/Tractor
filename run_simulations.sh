#!/bin/bash

# Simulation Runner Script
#
# Usage:
# ./run_simulations.sh [number_of_games]
#
# Example:
# ./run_simulations.sh 100
#
# This script runs the game simulation test with a specified number of games
# and sets the log level to DEBUG to capture detailed AI decision-making data.

# Default to 10 games if no argument is provided
TARGET_GAMES=${1:-10}

# Set the log level to DEBUG to capture detailed logs
export LOG_LEVEL=DEBUG
export TARGET_GAMES=$TARGET_GAMES

echo "Running $TARGET_GAMES game simulations with DEBUG logging..."

# Inject development version before running simulations
echo "Injecting development version..."
node scripts/inject-dev-version.js

# Run the simulation test
npm run test:simulation

echo "Simulations complete. Logs are located in the logs/ directory."

# Compress all .log files to .log.gz for efficient storage and upload
echo "Compressing log files..."
if [ -d "logs" ] && [ -n "$(find logs -name "*.log" -type f 2>/dev/null)" ]; then
    cd logs
    gzip *.log
    cd ..
    echo "✅ All .log files compressed to .log.gz"
else
    echo "⚠️  No .log files found to compress"
fi

echo "Ready for BigQuery upload: uv run analysis/bigquery_main.py upload"
