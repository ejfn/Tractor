// Types for progressive dealing during trump declaration phase

export type DealingState = {
  cardsPerPlayer: number; // Number of cards each player should receive
  currentRound: number; // Current dealing round (0-based)
  currentDealingPlayerIndex: number; // Index of player receiving next card
  startingDealingPlayerIndex: number; // Index of player who started dealing (for round completion)
  totalRounds: number; // Total rounds needed to complete dealing
  completed: boolean; // Whether dealing is finished
  kittyDealt: boolean; // Whether kitty cards have been set aside
  paused: boolean; // Whether dealing is currently paused for declarations
  pauseReason?: string; // Reason for pause (e.g., "trump_declaration")
};

export type DealingProgress = {
  current: number; // Cards dealt so far
  total: number; // Total cards to be dealt
};
