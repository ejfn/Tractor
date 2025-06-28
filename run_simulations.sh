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

# Run the simulation test
npm run test:simulation

echo "Simulations complete. Logs are located in the logs/ directory."

# Gzip all generated log files
echo "Compressing log files..."
gzip logs/*.log
echo "Log compression complete."
