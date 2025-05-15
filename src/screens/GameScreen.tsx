import React from 'react';
import GameScreenController from './GameScreenController';

/**
 * Main game screen component - serves as the entry point
 * Uses the controller-view pattern for better separation of concerns
 */
const GameScreen: React.FC = () => {
  // Simply render the controller, which manages all game logic
  return <GameScreenController />;
};

export default GameScreen;