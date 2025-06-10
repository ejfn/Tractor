import { describe, expect, test } from '@jest/globals';
import {
  processPlay
} from '../../src/game/playProcessing';
import {
  Card,
  GamePhase,
  PlayerId,
  Rank,
  Suit
} from "../../src/types";
import {
  createGameState,
  createTrumpScenarios,
} from "../helpers";

describe('Winning Player ID Tracking During Trick', () => {
  const trumpInfo = createTrumpScenarios.spadesTrump();

  test('Should initialize winningPlayerId to leadingPlayerId when trick starts', () => {
    const gameState = createGameState();
    gameState.gamePhase = GamePhase.Playing;
    gameState.currentPlayerIndex = 0; // Human starts

    const leadingCard = Card.createCard(Suit.Hearts, Rank.King, 0);

    const result = processPlay(gameState, [leadingCard]);
    
    expect(result.newState.currentTrick).toBeTruthy();
    expect(result.newState.currentTrick!.plays[0].playerId).toBe(PlayerId.Human);
    expect(result.newState.currentTrick!.winningPlayerId).toBe(PlayerId.Human);
    expect(result.trickComplete).toBe(false);
  });

  test('Should update winningPlayerId when a stronger play is made', () => {
    const gameState = createGameState();
    gameState.gamePhase = GamePhase.Playing;
    gameState.currentPlayerIndex = 0; // Human starts

    // Human leads with King
    const leadingCard = Card.createCard(Suit.Hearts, Rank.King, 0);
    let result = processPlay(gameState, [leadingCard]);
    
    expect(result.newState.currentTrick!.winningPlayerId).toBe(PlayerId.Human);

    // Bot1 plays Ace (stronger)
    const strongerCard = Card.createCard(Suit.Hearts, Rank.Ace, 0);
    result = processPlay(result.newState, [strongerCard]);
    
    expect(result.newState.currentTrick!.winningPlayerId).toBe(PlayerId.Bot1);
    expect(result.trickComplete).toBe(false);
  });

  test('Should not update winningPlayerId when a weaker play is made', () => {
    const gameState = createGameState();
    gameState.gamePhase = GamePhase.Playing;
    gameState.currentPlayerIndex = 0; // Human starts

    // Human leads with Ace
    const leadingCard = Card.createCard(Suit.Hearts, Rank.Ace, 0);
    let result = processPlay(gameState, [leadingCard]);
    
    expect(result.newState.currentTrick!.winningPlayerId).toBe(PlayerId.Human);

    // Bot1 plays King (weaker)
    const weakerCard = Card.createCard(Suit.Hearts, Rank.King, 0);
    result = processPlay(result.newState, [weakerCard]);
    
    expect(result.newState.currentTrick!.winningPlayerId).toBe(PlayerId.Human); // Should remain Human
    expect(result.trickComplete).toBe(false);
  });

  test('Should update winningPlayerId with trump cards beating non-trump', () => {
    const gameState = createGameState();
    gameState.gamePhase = GamePhase.Playing;
    gameState.currentPlayerIndex = 0; // Human starts
    gameState.trumpInfo = trumpInfo; // Set trump info (Spades trump, rank 2)

    // Human leads with non-trump Ace
    const leadingCard = Card.createCard(Suit.Hearts, Rank.Ace, 0);
    let result = processPlay(gameState, [leadingCard]);
    
    expect(result.newState.currentTrick!.winningPlayerId).toBe(PlayerId.Human);

    // Bot1 plays trump card (stronger than non-trump)
    const trumpCard = Card.createCard(Suit.Spades, Rank.Three, 0); // Trump suit
    result = processPlay(result.newState, [trumpCard]);
    
    expect(result.newState.currentTrick!.winningPlayerId).toBe(PlayerId.Bot1);
    expect(result.trickComplete).toBe(false);
  });

  test('Should track winningPlayerId through complete 4-player trick', () => {
    const gameState = createGameState();
    gameState.gamePhase = GamePhase.Playing;
    gameState.currentPlayerIndex = 0; // Human starts

    // Human leads with 5
    const card1 = Card.createCard(Suit.Hearts, Rank.Five, 0);
    let result = processPlay(gameState, [card1]);
    expect(result.newState.currentTrick!.winningPlayerId).toBe(PlayerId.Human);

    // Bot1 plays 7 (stronger)
    const card2 = Card.createCard(Suit.Hearts, Rank.Seven, 0);
    result = processPlay(result.newState, [card2]);
    expect(result.newState.currentTrick!.winningPlayerId).toBe(PlayerId.Bot1);

    // Bot2 plays King (stronger)
    const card3 = Card.createCard(Suit.Hearts, Rank.King, 0);
    result = processPlay(result.newState, [card3]);
    expect(result.newState.currentTrick!.winningPlayerId).toBe(PlayerId.Bot2);

    // Bot3 plays 6 (weaker)
    const card4 = Card.createCard(Suit.Hearts, Rank.Six, 0);
    result = processPlay(result.newState, [card4]);
    
    // Trick should be complete and Bot2 should still be the winner
    expect(result.trickComplete).toBe(true);
    expect(result.trickWinnerId).toBe(PlayerId.Bot2);
    expect(result.newState.currentTrick!.winningPlayerId).toBe(PlayerId.Bot2);
  });

  test('Should handle pair combinations correctly', () => {
    const gameState = createGameState();
    gameState.gamePhase = GamePhase.Playing;
    gameState.currentPlayerIndex = 0; // Human starts
    gameState.trumpInfo = trumpInfo; // Apply trump info (Spades trump)

    // Human leads with pair of 5s
    const leadingPair = Card.createPair(Suit.Hearts, Rank.Five);
    let result = processPlay(gameState, leadingPair);
    expect(result.newState.currentTrick!.winningPlayerId).toBe(PlayerId.Human);

    // Bot1 plays pair of Kings (stronger pair)
    const strongerPair = Card.createPair(Suit.Hearts, Rank.King);
    result = processPlay(result.newState, strongerPair);
    expect(result.newState.currentTrick!.winningPlayerId).toBe(PlayerId.Bot1);

    // Bot2 plays pair of 7s (weaker pair)
    const weakerPair = Card.createPair(Suit.Hearts, Rank.Seven);
    result = processPlay(result.newState, weakerPair);
    expect(result.newState.currentTrick!.winningPlayerId).toBe(PlayerId.Bot1); // Should remain Bot1

    // Bot3 plays trump pair (should beat non-trump pair)
    const trumpPair = Card.createPair(Suit.Spades, Rank.Three);
    result = processPlay(result.newState, trumpPair);
    
    expect(result.trickComplete).toBe(true);
    expect(result.trickWinnerId).toBe(PlayerId.Bot3);
    expect(result.newState.currentTrick!.winningPlayerId).toBe(PlayerId.Bot3);
  });

  test('winningPlayerId should be mandatory in Trick type', () => {
    // This test verifies the type safety of the new mandatory field
    const trick = {
      leadingPlayerId: PlayerId.Human,
      leadingCombo: [Card.createCard(Suit.Hearts, Rank.Ace, 0)],
      plays: [],
      winningPlayerId: PlayerId.Human, // This field is now mandatory
      points: 0
    };

    // TypeScript should compile this without errors
    expect(trick.winningPlayerId).toBe(PlayerId.Human);
  });
});