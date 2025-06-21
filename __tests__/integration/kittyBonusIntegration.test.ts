import { finalizeTrumpDeclaration } from "../../src/game/dealingAndDeclaration";
import { processPlay } from "../../src/game/playProcessing";
import {
  Card,
  DeckId,
  GamePhase,
  GameState,
  PlayerId,
  Rank,
  Suit,
} from "../../src/types";
import { createGameState } from "../helpers/gameStates";

describe("Kitty Bonus Integration", () => {
  let gameState: GameState;
  let testCards: Card[];

  beforeEach(() => {
    // Create a game state where players have 1 card each (final trick scenario)
    gameState = createGameState();
    gameState.gamePhase = GamePhase.Playing;

    // Create test cards with points
    testCards = [
      Card.createCard(Suit.Hearts, Rank.King, 0), // Human - 10 points
      Card.createCard(Suit.Hearts, Rank.Queen, 0), // Bot1 - 0 points
      Card.createCard(Suit.Hearts, Rank.Five, 0), // Bot2 - 5 points (teammate)
      Card.createCard(Suit.Hearts, Rank.Jack, 0), // Bot3 - 0 points
    ];

    // Set up players with single cards (final trick)
    gameState.players[0].hand = [testCards[0]]; // Human
    gameState.players[1].hand = [testCards[1]]; // Bot1
    gameState.players[2].hand = [testCards[2]]; // Bot2
    gameState.players[3].hand = [testCards[3]]; // Bot3

    // Create kitty with 25 points (2 Kings + 1 Five)
    gameState.kittyCards = [
      Card.createCard(Suit.Spades, Rank.King, 0),
      Card.createCard(Suit.Clubs, Rank.King, 0),
      Card.createCard(Suit.Diamonds, Rank.Five, 0),
    ];

    // Set teams: Human + Bot2 (Team A) vs Bot1 + Bot3 (Team B)
    // Team A is attacking (needs kitty bonus)
    gameState.teams[0].isDefending = false; // Team A attacking
    gameState.teams[1].isDefending = true; // Team B defending

    // Reset team points
    gameState.teams[0].points = 0;
    gameState.teams[1].points = 0;

    // Set current player to Human (leading)
    gameState.currentPlayerIndex = 0;
  });

  test("should apply 2x kitty bonus when attacking team wins final trick with singles", () => {
    // Human leads King of Hearts (will win the trick)
    const result1 = processPlay(gameState, [testCards[0]]);
    expect(result1.trickComplete).toBe(false);

    // Bot1 follows with Queen
    gameState = result1.newState;
    gameState.currentPlayerIndex = 1;
    const result2 = processPlay(gameState, [testCards[1]]);
    expect(result2.trickComplete).toBe(false);

    // Bot2 follows with 5 (teammate supporting)
    gameState = result2.newState;
    gameState.currentPlayerIndex = 2;
    const result3 = processPlay(gameState, [testCards[2]]);
    expect(result3.trickComplete).toBe(false);

    // Bot3 completes the trick
    gameState = result3.newState;
    gameState.currentPlayerIndex = 3;
    const finalResult = processPlay(gameState, [testCards[3]]);

    // Verify trick is complete and Human wins
    expect(finalResult.trickComplete).toBe(true);
    expect(finalResult.trickWinnerId).toBe(PlayerId.Human);

    // Check points calculation
    const teamA = finalResult.newState.teams[0]; // Human + Bot2 (attacking)
    const trickPoints = 10 + 5; // King (10) + Five (5) = 15 points
    const kittyPoints = 10 + 10 + 5; // 2 Kings + 1 Five = 25 points
    const kittyBonus = kittyPoints * 2; // Singles final trick = 2x multiplier = 50 points

    // After trick completion: team should have ONLY trick points (kitty bonus applied later)
    expect(teamA.points).toBe(trickPoints);

    // Verify kitty bonus info is properly stored for round completion
    expect(finalResult.newState.roundEndKittyInfo).toBeDefined();
    expect(
      finalResult.newState.roundEndKittyInfo?.kittyBonus?.bonusPoints,
    ).toBe(kittyBonus);
  });

  test("should apply 4x kitty bonus when attacking team wins final trick with pairs", () => {
    // Modify cards to create a pair scenario
    const pairCards = [
      Card.createCard(Suit.Hearts, Rank.King, 0),
      Card.createCard(Suit.Hearts, Rank.King, 0),
    ];

    const botCards = [
      Card.createCard(Suit.Hearts, Rank.Queen, 0),
      Card.createCard(Suit.Hearts, Rank.Queen, 0),
      Card.createCard(Suit.Hearts, Rank.Five, 0),
      Card.createCard(Suit.Hearts, Rank.Five, 0),
      Card.createCard(Suit.Hearts, Rank.Jack, 0),
      Card.createCard(Suit.Hearts, Rank.Jack, 0),
    ];

    // Set up final trick with pairs (each player has 2 cards)
    gameState.players[0].hand = pairCards; // Human - pair of Kings
    gameState.players[1].hand = [botCards[0], botCards[1]]; // Bot1 - pair of Queens
    gameState.players[2].hand = [botCards[2], botCards[3]]; // Bot2 - pair of 5s
    gameState.players[3].hand = [botCards[4], botCards[5]]; // Bot3 - pair of Jacks

    // Human leads with pair of Kings
    const result1 = processPlay(gameState, pairCards);
    expect(result1.trickComplete).toBe(false);

    // Complete the trick with all other players following
    gameState = result1.newState;
    gameState.currentPlayerIndex = 1;
    const result2 = processPlay(gameState, [botCards[0], botCards[1]]);

    gameState = result2.newState;
    gameState.currentPlayerIndex = 2;
    const result3 = processPlay(gameState, [botCards[2], botCards[3]]);

    gameState = result3.newState;
    gameState.currentPlayerIndex = 3;
    const finalResult = processPlay(gameState, [botCards[4], botCards[5]]);

    // Verify trick is complete and Human wins
    expect(finalResult.trickComplete).toBe(true);
    expect(finalResult.trickWinnerId).toBe(PlayerId.Human);

    // Check points calculation with 4x multiplier for pairs
    const teamA = finalResult.newState.teams[0];
    const trickPoints = 20 + 10; // Human Kings (20) + Bot2 Fives (10) = 30 points
    const kittyPoints = 25; // Same kitty: 25 points
    const kittyBonus = kittyPoints * 4; // Pairs final trick = 4x multiplier = 100 points

    // After trick completion: team should have ONLY trick points (kitty bonus applied later)
    expect(teamA.points).toBe(trickPoints);

    // Verify kitty bonus info is properly stored for round completion
    expect(finalResult.newState.roundEndKittyInfo).toBeDefined();
    expect(
      finalResult.newState.roundEndKittyInfo?.kittyBonus?.bonusPoints,
    ).toBe(kittyBonus);
  });

  test("should NOT apply kitty bonus when defending team wins final trick", () => {
    // Modify the scenario so Bot1 (defending team) wins
    const strongCard = Card.createCard(Suit.Hearts, Rank.Ace, 0);
    gameState.players[1].hand = [strongCard]; // Bot1 gets Ace (strongest)

    // Human leads with King
    const result1 = processPlay(gameState, [testCards[0]]);
    gameState = result1.newState;
    gameState.currentPlayerIndex = 1;

    // Bot1 plays Ace (wins the trick)
    const result2 = processPlay(gameState, [strongCard]);
    gameState = result2.newState;
    gameState.currentPlayerIndex = 2;

    // Complete the trick
    const result3 = processPlay(gameState, [testCards[2]]);
    gameState = result3.newState;
    gameState.currentPlayerIndex = 3;

    const finalResult = processPlay(gameState, [testCards[3]]);

    // Verify Bot1 (defending team) wins
    expect(finalResult.trickComplete).toBe(true);
    expect(finalResult.trickWinnerId).toBe(PlayerId.Bot1);

    // Check that defending team gets trick points but NO kitty bonus
    const teamB = finalResult.newState.teams[1]; // Bot1 + Bot3 (defending)
    const trickPoints = 10 + 5; // King + Five = 15 points
    const expectedTotal = trickPoints; // NO kitty bonus for defending team

    expect(teamB.points).toBe(expectedTotal);

    // Attacking team should have 0 points
    const teamA = finalResult.newState.teams[0];
    expect(teamA.points).toBe(0);
  });

  test("should NOT apply kitty bonus for non-final tricks", () => {
    // Modify scenario to have multiple cards (not final trick)
    gameState.players.forEach((player, index) => {
      player.hand = [
        testCards[index],
        Card.createCard(Suit.Spades, Rank.Three, (index % 2) as DeckId),
      ];
    });

    // Play the first trick (not final)
    const result1 = processPlay(gameState, [testCards[0]]);
    gameState = result1.newState;
    gameState.currentPlayerIndex = 1;

    const result2 = processPlay(gameState, [testCards[1]]);
    gameState = result2.newState;
    gameState.currentPlayerIndex = 2;

    const result3 = processPlay(gameState, [testCards[2]]);
    gameState = result3.newState;
    gameState.currentPlayerIndex = 3;

    const finalResult = processPlay(gameState, [testCards[3]]);

    // Verify trick is complete but NOT final
    expect(finalResult.trickComplete).toBe(true);
    expect(finalResult.trickWinnerId).toBe(PlayerId.Human);

    // Check that only trick points are added (no kitty bonus)
    const teamA = finalResult.newState.teams[0];
    const trickPoints = 10 + 5; // King + Five = 15 points
    const expectedTotal = trickPoints; // NO kitty bonus for non-final trick

    expect(teamA.points).toBe(expectedTotal);
  });

  test("should handle empty kitty correctly", () => {
    // Set empty kitty
    gameState.kittyCards = [];

    // Human wins final trick
    const result1 = processPlay(gameState, [testCards[0]]);
    gameState = result1.newState;
    gameState.currentPlayerIndex = 1;

    const result2 = processPlay(gameState, [testCards[1]]);
    gameState = result2.newState;
    gameState.currentPlayerIndex = 2;

    const result3 = processPlay(gameState, [testCards[2]]);
    gameState = result3.newState;
    gameState.currentPlayerIndex = 3;

    const finalResult = processPlay(gameState, [testCards[3]]);

    // Check that only trick points are added (no kitty bonus)
    const teamA = finalResult.newState.teams[0];
    const trickPoints = 10 + 5; // King + Five = 15 points
    const expectedTotal = trickPoints; // NO kitty bonus for empty kitty

    expect(teamA.points).toBe(expectedTotal);
  });

  test("should correctly analyze combo structure for multiplier calculation", () => {
    // Test with tractor (consecutive pairs) - should get 4x multiplier
    const tractorCards = [
      Card.createCard(Suit.Hearts, Rank.Seven, 0),
      Card.createCard(Suit.Hearts, Rank.Seven, 0),
      Card.createCard(Suit.Hearts, Rank.Eight, 0),
      Card.createCard(Suit.Hearts, Rank.Eight, 0),
    ];

    const botCards = [
      Card.createCard(Suit.Hearts, Rank.Six, 0),
      Card.createCard(Suit.Hearts, Rank.Six, 0),
      Card.createCard(Suit.Hearts, Rank.Five, 0),
      Card.createCard(Suit.Hearts, Rank.Five, 0),
      Card.createCard(Suit.Hearts, Rank.Four, 0),
      Card.createCard(Suit.Hearts, Rank.Four, 0),
      Card.createCard(Suit.Hearts, Rank.Three, 0),
      Card.createCard(Suit.Hearts, Rank.Three, 0),
      Card.createCard(Suit.Hearts, Rank.Two, 0),
      Card.createCard(Suit.Hearts, Rank.Two, 0),
      Card.createCard(Suit.Hearts, Rank.Ace, 0),
      Card.createCard(Suit.Hearts, Rank.Ace, 0),
    ];

    // Set up final trick with tractors (each player has 4 cards for tractor)
    gameState.players[0].hand = tractorCards; // Human - tractor 7-7-8-8
    gameState.players[1].hand = [
      botCards[0],
      botCards[1],
      botCards[2],
      botCards[3],
    ]; // Bot1 - tractor 6-6-5-5
    gameState.players[2].hand = [
      botCards[4],
      botCards[5],
      botCards[6],
      botCards[7],
    ]; // Bot2 - tractor 4-4-3-3
    gameState.players[3].hand = [
      botCards[8],
      botCards[9],
      botCards[10],
      botCards[11],
    ]; // Bot3 - tractor 2-2-A-A

    // Human leads with tractor
    const result1 = processPlay(gameState, tractorCards);
    expect(result1.trickComplete).toBe(false);

    // Complete the trick with all other players following
    gameState = result1.newState;
    gameState.currentPlayerIndex = 1;
    const result2 = processPlay(gameState, [
      botCards[0],
      botCards[1],
      botCards[2],
      botCards[3],
    ]);

    gameState = result2.newState;
    gameState.currentPlayerIndex = 2;
    const result3 = processPlay(gameState, [
      botCards[4],
      botCards[5],
      botCards[6],
      botCards[7],
    ]);

    gameState = result3.newState;
    gameState.currentPlayerIndex = 3;
    const finalResult = processPlay(gameState, [
      botCards[8],
      botCards[9],
      botCards[10],
      botCards[11],
    ]);

    // Verify trick is complete and Human wins with tractor
    expect(finalResult.trickComplete).toBe(true);
    expect(finalResult.trickWinnerId).toBe(PlayerId.Human);

    // Check points calculation with 4x multiplier for tractor
    const teamA = finalResult.newState.teams[0];
    const trickPoints = 10; // Bot2 Five = 5 points * 2 = 10 points
    const kittyPoints = 25; // Same kitty: 25 points
    const kittyBonus = kittyPoints * 4; // Tractor final trick = 4x multiplier = 100 points

    // After trick completion: team should have ONLY trick points (kitty bonus applied later)
    expect(teamA.points).toBe(trickPoints);

    // Verify kitty bonus info is properly stored for round completion
    expect(finalResult.newState.roundEndKittyInfo).toBeDefined();
    expect(
      finalResult.newState.roundEndKittyInfo?.kittyBonus?.bonusPoints,
    ).toBe(kittyBonus);
  });

  test("should populate roundEndKittyInfo for display in round result modal", () => {
    // Set up full 8-card kitty for proper test
    gameState.kittyCards = [
      Card.createCard(Suit.Spades, Rank.King, 0),
      Card.createCard(Suit.Clubs, Rank.King, 0),
      Card.createCard(Suit.Diamonds, Rank.Five, 0),
      Card.createCard(Suit.Spades, Rank.Three, 0),
      Card.createCard(Suit.Hearts, Rank.Four, 0),
      Card.createCard(Suit.Clubs, Rank.Six, 0),
      Card.createCard(Suit.Diamonds, Rank.Seven, 0),
      Card.createCard(Suit.Spades, Rank.Eight, 0),
    ];

    // Create test cards for pairs
    const kingPair = [
      Card.createCard(Suit.Hearts, Rank.King, 0),
      Card.createCard(Suit.Hearts, Rank.King, 0),
    ];
    const queenPair = [
      Card.createCard(Suit.Hearts, Rank.Queen, 0),
      Card.createCard(Suit.Hearts, Rank.Queen, 0),
    ];
    const fivePair = [
      Card.createCard(Suit.Hearts, Rank.Five, 0),
      Card.createCard(Suit.Hearts, Rank.Five, 0),
    ];
    const jackPair = [
      Card.createCard(Suit.Hearts, Rank.Jack, 0),
      Card.createCard(Suit.Hearts, Rank.Jack, 0),
    ];

    // Set up players with pairs (final trick scenario)
    gameState.players[0].hand = kingPair;
    gameState.players[1].hand = queenPair;
    gameState.players[2].hand = fivePair;
    gameState.players[3].hand = jackPair;

    // Human wins final trick with pairs
    const result1 = processPlay(gameState, kingPair); // Human plays King pair
    gameState = result1.newState;
    gameState.currentPlayerIndex = 1;

    const result2 = processPlay(gameState, queenPair); // Bot1 plays Queen pair
    gameState = result2.newState;
    gameState.currentPlayerIndex = 2;

    const result3 = processPlay(gameState, fivePair); // Bot2 plays Five pair
    gameState = result3.newState;
    gameState.currentPlayerIndex = 3;

    const finalResult = processPlay(gameState, jackPair); // Bot3 plays Jack pair

    // Verify roundEndKittyInfo is populated
    expect(finalResult.newState.roundEndKittyInfo).toBeDefined();
    expect(finalResult.newState.kittyCards).toHaveLength(8); // Use gameState.kittyCards
    expect(finalResult.newState.roundEndKittyInfo?.kittyPoints).toBe(25);
    expect(finalResult.newState.roundEndKittyInfo?.finalTrickType).toBe(
      "pairs/tractors",
    );
    expect(finalResult.newState.roundEndKittyInfo?.kittyBonus).toBeDefined();
    expect(
      finalResult.newState.roundEndKittyInfo?.kittyBonus?.bonusPoints,
    ).toBe(100);
    expect(finalResult.newState.roundEndKittyInfo?.kittyBonus?.multiplier).toBe(
      4,
    );
  });

  test("should populate roundEndKittyInfo without bonus when defending team wins", () => {
    // Set up fresh game state for this test with proper kitty
    const testGameState = createGameState();
    testGameState.gamePhase = GamePhase.Playing;
    testGameState.kittyCards = [
      Card.createCard(Suit.Spades, Rank.King, 0),
      Card.createCard(Suit.Clubs, Rank.King, 0),
      Card.createCard(Suit.Diamonds, Rank.Five, 0),
      Card.createCard(Suit.Spades, Rank.Three, 0),
      Card.createCard(Suit.Hearts, Rank.Four, 0),
      Card.createCard(Suit.Clubs, Rank.Six, 0),
      Card.createCard(Suit.Diamonds, Rank.Seven, 0),
      Card.createCard(Suit.Spades, Rank.Eight, 0),
    ];

    // Create cards where defending team wins the final trick
    // From debug: Team A is defending (Human + Bot2), Team B is attacking (Bot1 + Bot3)
    const humanCard = Card.createCard(Suit.Hearts, Rank.King, 0);
    const bot1Card = Card.createCard(Suit.Hearts, Rank.Queen, 0); // Lower card
    const bot2Card = Card.createCard(Suit.Hearts, Rank.Ace, 0); // Highest card - defending team wins!
    const bot3Card = Card.createCard(Suit.Hearts, Rank.Jack, 0);

    // Set up players with single cards (final trick scenario)
    testGameState.players[0].hand = [humanCard]; // Human - Team A (defending)
    testGameState.players[1].hand = [bot1Card]; // Bot1 - Team B (attacking)
    testGameState.players[2].hand = [bot2Card]; // Bot2 - Team A (defending) - WINS!
    testGameState.players[3].hand = [bot3Card]; // Bot3 - Team B (attacking)

    // Play the final trick with defending team winning
    const result1 = processPlay(testGameState, [humanCard]); // Human plays King
    let currentState = result1.newState;
    currentState.currentPlayerIndex = 1;

    const result2 = processPlay(currentState, [bot1Card]); // Bot1 plays Queen
    currentState = result2.newState;
    currentState.currentPlayerIndex = 2;

    const result3 = processPlay(currentState, [bot2Card]); // Bot2 plays Ace (wins!)
    currentState = result3.newState;
    currentState.currentPlayerIndex = 3;

    const finalResult = processPlay(currentState, [bot3Card]); // Bot3 plays Jack

    // Verify defending team won (Bot2 from Team A)
    expect(finalResult.trickWinnerId).toBe("bot2");

    // Verify roundEndKittyInfo is populated but without bonus
    expect(finalResult.newState.roundEndKittyInfo).toBeDefined();
    expect(finalResult.newState.kittyCards).toHaveLength(8); // Use gameState.kittyCards
    expect(finalResult.newState.roundEndKittyInfo?.kittyPoints).toBe(25);
    expect(finalResult.newState.roundEndKittyInfo?.finalTrickType).toBe(
      "singles",
    );
    expect(finalResult.newState.roundEndKittyInfo?.kittyBonus).toBeUndefined(); // No bonus
  });

  test("should transition to KittySwap phase after dealing completes", () => {
    // Create a game state where dealing is complete
    const dealingCompleteState = createGameState();
    dealingCompleteState.gamePhase = GamePhase.Dealing;
    dealingCompleteState.kittyCards = [
      Card.createCard(Suit.Spades, Rank.King, 0),
      Card.createCard(Suit.Clubs, Rank.King, 0),
      Card.createCard(Suit.Diamonds, Rank.Five, 0),
      Card.createCard(Suit.Spades, Rank.Three, 0),
      Card.createCard(Suit.Hearts, Rank.Four, 0),
      Card.createCard(Suit.Clubs, Rank.Six, 0),
      Card.createCard(Suit.Diamonds, Rank.Seven, 0),
      Card.createCard(Suit.Spades, Rank.Eight, 0),
    ];

    // All players should have 17 cards (normal hand size for Tractor)
    dealingCompleteState.players.forEach((player) => {
      player.hand = Array(17)
        .fill(null)
        .map((_, i) =>
          Card.createCard(Suit.Hearts, Rank.Two, (i % 2) as DeckId),
        );
    });

    // Finalize trump declaration (simulates dealing completion)
    const finalizedState = finalizeTrumpDeclaration(dealingCompleteState);

    // Should transition to KittySwap phase
    expect(finalizedState.gamePhase).toBe(GamePhase.KittySwap);

    // Round starting player (Human by default) should have 25 cards (17 + 8 kitty)
    const roundStartingPlayer =
      finalizedState.players[finalizedState.roundStartingPlayerIndex];
    expect(roundStartingPlayer.hand).toHaveLength(25);

    // Current player should be the round starting player
    expect(finalizedState.currentPlayerIndex).toBe(
      finalizedState.roundStartingPlayerIndex,
    );
  });
});
