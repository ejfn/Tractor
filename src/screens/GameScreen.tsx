import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Alert,
  Dimensions,
  SafeAreaView
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import PlayerHand from '../components/PlayerHand';
import CardPlayArea from '../components/CardPlayArea';
import GameStatus from '../components/GameStatus';
import {
  GameState,
  Card,
  Rank,
  Suit,
  AIDifficulty,
  Player
} from '../types/game';
import { 
  initializeGame, 
  identifyCombos, 
  isValidPlay, 
  determineTrickWinner,
  calculateTrickPoints,
  isTrump
} from '../utils/gameLogic';
import { getAIMove, shouldAIDeclare } from '../utils/aiLogic';

const { width, height } = Dimensions.get('window');

const GameScreen: React.FC = () => {
  // Game state
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [gameConfig] = useState({
    playerName: 'You',
    teamNames: ['Team A', 'Team B'] as [string, string],
    startingRank: Rank.Two,
    aiDifficulty: AIDifficulty.Hard // Set AI to Hard difficulty
  });

  // UI state
  const [showTrumpDeclaration, setShowTrumpDeclaration] = useState(false);
  const [waitingForAI, setWaitingForAI] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<'A' | 'B' | null>(null);
  const [showTrickResult, setShowTrickResult] = useState(false);
  const [lastTrickWinner, setLastTrickWinner] = useState('');
  const [lastTrickPoints, setLastTrickPoints] = useState(0);
  
  // Timer for AI moves
  const [aiTimer, setAiTimer] = useState<NodeJS.Timeout | null>(null);

  // Initialize game
  useEffect(() => {
    if (!gameState) {
      const newGameState = initializeGame(
        gameConfig.playerName,
        gameConfig.teamNames,
        gameConfig.startingRank
      );
      setGameState(newGameState);

      // Check if player has trump rank to declare
      const humanPlayer = newGameState.players.find(p => p.isHuman);
      if (humanPlayer) {
        const hasTrumpRank = humanPlayer.hand.some(
          card => card.rank === newGameState.trumpInfo.trumpRank
        );

        if (hasTrumpRank) {
          setShowTrumpDeclaration(true);
        } else {
          // Check if AI should declare trump
          checkAITrumpDeclaration(newGameState);
        }
      }
    }
  }, [gameState, gameConfig.playerName, gameConfig.teamNames, gameConfig.startingRank]);
  
  // Handle AI turns
  useEffect(() => {
    if (gameState && 
        gameState.gamePhase === 'playing' && 
        !waitingForAI && 
        !gameState.players[gameState.currentPlayerIndex].isHuman) {
      
      // Set a delay for AI move to make the game feel more natural
      setWaitingForAI(true);
      const timer = setTimeout(() => {
        handleAIMove();
      }, 1500);

      setAiTimer(timer as unknown as NodeJS.Timeout);
    }
    
    return () => {
      if (aiTimer) {
        clearTimeout(aiTimer);
      }
    };
  }, [gameState, waitingForAI, aiTimer]);
  
  // Check if AI should declare trump
  const checkAITrumpDeclaration = (state: GameState) => {
    // Find the first AI player with a trump rank card
    const aiWithTrump = state.players.find(p =>
      !p.isHuman && p.hand.some(card => card.rank === state.trumpInfo.trumpRank)
    );

    if (aiWithTrump) {
      // Check if AI should declare based on strategy
      const shouldDeclare = shouldAIDeclare(
        state,
        aiWithTrump.id,
        gameConfig.aiDifficulty
      );

      if (shouldDeclare) {
        // Determine most common suit in AI's hand
        const suitCounts = aiWithTrump.hand.reduce((counts, card) => {
          if (card.suit) {
            counts[card.suit] = (counts[card.suit] || 0) + 1;
          }
          return counts;
        }, {} as Record<string, number>);

        // Find the most common suit
        let maxSuit = Suit.Spades;
        let maxCount = 0;

        Object.entries(suitCounts).forEach(([suit, count]) => {
          if (count > maxCount) {
            maxCount = count;
            maxSuit = suit as Suit;
          }
        });

        // Declare trump suit
        declareTrumpSuit(maxSuit);
      }
    }
  };

  // Handle AI move
  const handleAIMove = () => {
    if (!gameState) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];

    // Get AI move based on difficulty
    const aiMove = getAIMove(
      gameState,
      currentPlayer.id,
      gameConfig.aiDifficulty
    );

    // Process the AI's play
    processPlay(aiMove);
    setWaitingForAI(false);
  };
  
  // Handle card selection
  const handleCardSelect = (card: Card) => {
    if (gameState?.gamePhase !== 'playing') return;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    // Only allow current player to select cards
    if (!currentPlayer.isHuman) return;
    
    // Toggle card selection
    if (selectedCards.some(c => c.id === card.id)) {
      setSelectedCards(selectedCards.filter(c => c.id !== card.id));
    } else {
      setSelectedCards([...selectedCards, card]);
    }
  };
  
  // Handle trump suit declaration
  const declareTrumpSuit = (suit: Suit | null) => {
    if (!gameState) return;
    
    const newState = { ...gameState };
    
    if (suit) {
      newState.trumpInfo.trumpSuit = suit;
      newState.trumpInfo.declared = true;
    }
    
    newState.gamePhase = 'playing';
    setGameState(newState);
    setShowTrumpDeclaration(false);
  };
  
  // Handle play button click
  const handlePlay = () => {
    if (!gameState || selectedCards.length === 0) return;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    // Check if play is valid
    let isValid = false;
    
    if (!gameState.currentTrick) {
      // Player is leading - any combo is valid
      const combos = identifyCombos(currentPlayer.hand, gameState.trumpInfo);
      isValid = combos.some(combo => 
        combo.cards.length === selectedCards.length &&
        combo.cards.every(card => 
          selectedCards.some(selected => selected.id === card.id)
        )
      );
    } else {
      // Player is following - must match the leading combo
      isValid = isValidPlay(
        selectedCards,
        gameState.currentTrick.leadingCombo,
        currentPlayer.hand,
        gameState.trumpInfo
      );
    }
    
    if (!isValid) {
      Alert.alert('Invalid Play', 'Please select a valid combination of cards.');
      return;
    }
    
    // Process the play
    processPlay(selectedCards);
    setSelectedCards([]);
  };
  
  // Process a play (human or AI)
  const processPlay = (cards: Card[]) => {
    if (!gameState) return;
    
    const newState = { ...gameState };
    const currentPlayer = newState.players[newState.currentPlayerIndex];
    
    // Starting a new trick
    if (!newState.currentTrick) {
      newState.currentTrick = {
        leadingPlayerId: currentPlayer.id,
        leadingCombo: [...cards],
        plays: [],
        points: 0
      };
    } else {
      // Adding to existing trick
      newState.currentTrick.plays.push({
        playerId: currentPlayer.id,
        cards: [...cards]
      });
    }
    
    // Remove played cards from hand
    currentPlayer.hand = currentPlayer.hand.filter(
      card => !cards.some(played => played.id === card.id)
    );
    
    // Check if trick is complete (all players have played)
    const playersInTrick = new Set([
      newState.currentTrick.leadingPlayerId,
      ...newState.currentTrick.plays.map(play => play.playerId)
    ]);
    
    if (playersInTrick.size === newState.players.length) {
      // Determine winner and award points
      const winningPlayerId = determineTrickWinner(
        newState.currentTrick,
        newState.trumpInfo
      );
      
      // Calculate points in the trick
      const trickPoints = calculateTrickPoints(newState.currentTrick);
      
      // Find the winner's team
      const winningPlayer = newState.players.find(p => p.id === winningPlayerId);
      const winningTeam = winningPlayer ? newState.teams.find(t => t.id === winningPlayer.team) : null;
      
      if (winningTeam) {
        winningTeam.points += trickPoints;
      }
      
      // Store the completed trick
      newState.currentTrick.winningPlayerId = winningPlayerId;
      newState.currentTrick.points = trickPoints;
      newState.tricks.push({ ...newState.currentTrick });
      
      // Show trick result feedback
      setLastTrickWinner(winningPlayer?.name || '');
      setLastTrickPoints(trickPoints);
      setShowTrickResult(true);
      
      // Start a new trick with winner as the leader
      newState.currentTrick = null;
      
      // Set the next player to the winner of the trick
      newState.currentPlayerIndex = newState.players.findIndex(p => p.id === winningPlayerId);
      
      // Hide trick result after delay
      setTimeout(() => {
        setShowTrickResult(false);
        
        // Check if round is over
        if (newState.players.every(p => p.hand.length === 0)) {
          // End the round and calculate results
          endRound(newState);
        }
      }, 2000);
    } else {
      // Move to next player
      newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
    }
    
    setGameState(newState);
  };
  
  // End the current round
  const endRound = (state: GameState) => {
    const newState = { ...state };
    
    // Calculate scores and determine if a team levels up
    const defendingTeam = newState.teams.find(t => t.isDefending);
    const attackingTeam = newState.teams.find(t => !t.isDefending);
    
    if (defendingTeam && attackingTeam) {
      // Attacking team needs 80+ points to win
      if (attackingTeam.points >= 80) {
        // Attacking team levels up
        const rankOrder = Object.values(Rank);
        const currentRankIndex = rankOrder.indexOf(attackingTeam.currentRank);
        
        if (currentRankIndex < rankOrder.length - 1) {
          attackingTeam.currentRank = rankOrder[currentRankIndex + 1];
          
          // Switch defending/attacking roles
          defendingTeam.isDefending = false;
          attackingTeam.isDefending = true;
          
          // Show round result
          Alert.alert(
            'Round Complete',
            `Team ${attackingTeam.id} reached ${attackingTeam.points} points and advances to rank ${attackingTeam.currentRank}!`,
            [{ text: 'Next Round' }]
          );
        } else {
          // Game over - attacking team reached Ace and won
          setGameOver(true);
          setWinner(attackingTeam.id);
        }
      } else {
        // Defending team successfully defended
        const rankOrder = Object.values(Rank);
        const currentRankIndex = rankOrder.indexOf(defendingTeam.currentRank);
        
        if (currentRankIndex < rankOrder.length - 1) {
          defendingTeam.currentRank = rankOrder[currentRankIndex + 1];
          
          // Show round result
          Alert.alert(
            'Round Complete',
            `Team ${defendingTeam.id} successfully defended with ${attackingTeam.points}/80 points for attackers! They advance to rank ${defendingTeam.currentRank}.`,
            [{ text: 'Next Round' }]
          );
        } else {
          // Game over - defending team reached Ace and won
          setGameOver(true);
          setWinner(defendingTeam.id);
        }
      }
      
      // Reset points for next round
      defendingTeam.points = 0;
      attackingTeam.points = 0;
    }
    
    // If game not over, prepare next round
    if (!gameOver) {
      newState.roundNumber++;
      newState.gamePhase = 'dealing';
      
      // Set trump rank to defending team's rank
      const newDefendingTeam = newState.teams.find(t => t.isDefending);
      if (newDefendingTeam) {
        newState.trumpInfo.trumpRank = newDefendingTeam.currentRank;
        newState.trumpInfo.trumpSuit = undefined;
        newState.trumpInfo.declared = false;
      }
      
      // Create and shuffle a new deck
      const deck = initializeGame(
        gameConfig.playerName,
        gameConfig.teamNames,
        newState.trumpInfo.trumpRank
      ).deck;
      
      newState.deck = deck;
      
      // Deal cards
      let cardIndex = 0;
      const cardsPerPlayer = Math.floor((deck.length - 8) / newState.players.length);
      
      newState.players.forEach(player => {
        player.hand = deck.slice(cardIndex, cardIndex + cardsPerPlayer);
        cardIndex += cardsPerPlayer;
      });
      
      // Set kitty cards
      newState.kittyCards = deck.slice(deck.length - 8);
      
      // Reset trick history
      newState.tricks = [];
      newState.currentTrick = null;
      
      // First player is from defending team
      const defendingPlayers = newState.players.filter(
        p => p.team === newDefendingTeam?.id
      );
      newState.currentPlayerIndex = newState.players.indexOf(defendingPlayers[0]);
      
      // Set phase to declaring again
      newState.gamePhase = 'declaring';
      
      setGameState(newState);
      
      // Check for trump declaration
      const humanPlayer = newState.players.find(p => p.isHuman);
      if (humanPlayer) {
        const hasTrumpRank = humanPlayer.hand.some(
          card => card.rank === newState.trumpInfo.trumpRank
        );
        
        if (hasTrumpRank) {
          setShowTrumpDeclaration(true);
        } else {
          // Check if AI should declare trump
          checkAITrumpDeclaration(newState);
        }
      }
    }
  };

  // Find player positions
  const getPlayerPositions = (players: Player[]) => {
    const humanIndex = players.findIndex(p => p.isHuman);
    if (humanIndex === -1) return null;
    
    return {
      bottom: humanIndex,
      left: (humanIndex + 1) % players.length,
      top: (humanIndex + 2) % players.length,
      right: (humanIndex + 3) % players.length
    };
  };
  
  // Trump declaration modal with suit-colored buttons
  const renderTrumpDeclarationModal = () => {
    if (!gameState || !showTrumpDeclaration) return null;
    
    return (
      <Modal
        visible={showTrumpDeclaration}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Declare Trump Suit?</Text>
            <Text style={styles.modalText}>
              You have a {gameState.trumpInfo.trumpRank} in your hand.
              Would you like to declare a trump suit?
            </Text>
            
            <View style={styles.suitButtons}>
              {Object.values(Suit).map(suit => {
                let suitColor = '#000';
                let bgColor = '#F5F5F5';
                
                switch(suit) {
                  case Suit.Hearts:
                  case Suit.Diamonds:
                    suitColor = '#D32F2F';
                    bgColor = '#FFEBEE';
                    break;
                  case Suit.Clubs:
                  case Suit.Spades:
                    suitColor = '#212121';
                    bgColor = '#ECEFF1';
                    break;
                }
                
                return (
                  <TouchableOpacity
                    key={suit}
                    style={[styles.suitButton, { backgroundColor: bgColor }]}
                    onPress={() => declareTrumpSuit(suit)}
                  >
                    <Text style={[styles.suitSymbol, { color: suitColor }]}>
                      {suit === Suit.Hearts ? '♥' : 
                       suit === Suit.Diamonds ? '♦' : 
                       suit === Suit.Clubs ? '♣' : '♠'}
                    </Text>
                    <Text style={[styles.suitText, { color: suitColor }]}>{suit}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            
            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => declareTrumpSuit(null)}
            >
              <Text style={styles.skipText}>Don&apos;t Declare</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };
  
  // Trick result overlay
  const renderTrickResultOverlay = () => {
    if (!showTrickResult) return null;
    
    return (
      <View style={styles.trickResultContainer}>
        <View style={styles.trickResultContent}>
          <Text style={styles.trickWinnerText}>{lastTrickWinner} wins the trick!</Text>
          {lastTrickPoints > 0 && (
            <Text style={styles.trickPointsText}>
              + {lastTrickPoints} Points
            </Text>
          )}
        </View>
      </View>
    );
  };

  // Game over screen
  if (gameOver) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.gameOverContainer}>
          <Text style={styles.gameOverTitle}>Game Over!</Text>
          <Text style={styles.winnerText}>
            {winner === 'A' ? gameConfig.teamNames[0] : gameConfig.teamNames[1]} wins!
          </Text>
          
          <TouchableOpacity 
            style={styles.startButton}
            onPress={() => {
              setGameState(null);
              setGameOver(false);
              setWinner(null);
            }}
          >
            <Text style={styles.buttonText}>New Game</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Loading state
  if (!gameState) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading game...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  // Get player positions
  const positions = getPlayerPositions(gameState.players);
  if (!positions) return null;

  // Main game screen
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      
      {/* Game status bar */}
      <View style={styles.statusBarContainer}>
        <GameStatus
          teams={gameState.teams}
          trumpInfo={gameState.trumpInfo}
          roundNumber={gameState.roundNumber}
          gamePhase={gameState.gamePhase}
        />
      </View>
      
      {/* Main game table */}
      <View style={styles.tableContainer}>
        {/* Top player */}
        <View style={styles.topPlayerContainer}>
          <PlayerHand
            player={gameState.players[positions.top]}
            isCurrentPlayer={positions.top === gameState.currentPlayerIndex}
            selectedCards={[]}
            showCards={false}
            trumpInfo={gameState.trumpInfo}
            position="top"
          />
        </View>
        
        {/* Middle section with left player, play area, and right player */}
        <View style={styles.middleSection}>
          {/* Left player */}
          <View style={styles.leftPlayerContainer}>
            <PlayerHand
              player={gameState.players[positions.left]}
              isCurrentPlayer={positions.left === gameState.currentPlayerIndex}
              selectedCards={[]}
              showCards={false}
              trumpInfo={gameState.trumpInfo}
              position="left"
            />
          </View>
          
          {/* Play area */}
          <View style={styles.playAreaContainer}>
            <CardPlayArea
              currentTrick={gameState.currentTrick}
              players={gameState.players}
              trumpInfo={gameState.trumpInfo}
              winningPlayerId={gameState.currentTrick?.winningPlayerId}
            />
          </View>
          
          {/* Right player */}
          <View style={styles.rightPlayerContainer}>
            <PlayerHand
              player={gameState.players[positions.right]}
              isCurrentPlayer={positions.right === gameState.currentPlayerIndex}
              selectedCards={[]}
              showCards={false}
              trumpInfo={gameState.trumpInfo}
              position="right"
            />
          </View>
        </View>
        
        {/* Bottom player (human) */}
        <View style={styles.bottomSection}>
          <View style={styles.humanHandContainer}>
            <PlayerHand
              player={gameState.players[positions.bottom]}
              isCurrentPlayer={positions.bottom === gameState.currentPlayerIndex}
              selectedCards={selectedCards}
              onCardSelect={handleCardSelect}
              showCards={true}
              trumpInfo={gameState.trumpInfo}
              position="bottom"
            />
          </View>
          
          {/* Play button */}
          {gameState.gamePhase === 'playing' && 
            gameState.players[gameState.currentPlayerIndex].isHuman && (
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.playButton,
                  selectedCards.length === 0 ? styles.disabledButton : null
                ]}
                disabled={selectedCards.length === 0}
                onPress={handlePlay}
              >
                <Text style={styles.buttonText}>Play Selected Cards</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
      
      {/* Overlay for AI thinking */}
      {waitingForAI && (
        <View style={styles.waitingContainer}>
          <View style={styles.waitingContent}>
            <Text style={styles.waitingText}>
              {gameState.players[gameState.currentPlayerIndex].name} is thinking...
            </Text>
          </View>
        </View>
      )}
      
      {/* Trick result overlay */}
      {renderTrickResultOverlay()}
      
      {/* Trump declaration modal */}
      {renderTrumpDeclarationModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  statusBarContainer: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    zIndex: 10,
  },
  tableContainer: {
    flex: 1,
    backgroundColor: '#0B4619', // Rich green card table
    borderRadius: 16,
    borderWidth: 4,
    borderColor: '#1B651E',
    margin: 10,
    padding: 10,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  topPlayerContainer: {
    height: '15%',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
  },
  middleSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftPlayerContainer: {
    width: '20%',
    height: '100%',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  playAreaContainer: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightPlayerContainer: {
    width: '20%',
    height: '100%',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  bottomSection: {
    height: '25%',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  humanHandContainer: {
    width: '100%',
    height: '70%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContainer: {
    width: '100%',
    height: '30%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
  },
  playButton: {
    backgroundColor: '#B71C1C',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    minWidth: 180,
  },
  disabledButton: {
    backgroundColor: '#9E9E9E',
    shadowOpacity: 0.2,
    elevation: 2,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3F51B5',
  },
  loadingText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  waitingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 10,
  },
  waitingContent: {
    backgroundColor: '#FFFFFF',
    padding: 25,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 15,
  },
  waitingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#303F9F',
    textAlign: 'center',
  },
  trickResultContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 20,
  },
  trickResultContent: {
    backgroundColor: '#4CAF50',
    padding: 25,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  trickWinnerText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  trickPointsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFEB3B',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 25,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#303F9F',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 24,
  },
  suitButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
  },
  suitButton: {
    padding: 15,
    margin: 8,
    borderRadius: 12,
    minWidth: 90,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  suitSymbol: {
    fontSize: 30,
    marginBottom: 5,
  },
  suitText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  skipButton: {
    backgroundColor: '#EEEEEE',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  skipText: {
    fontSize: 16,
    color: '#616161',
    fontWeight: 'bold',
  },
  gameOverContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3F51B5',
    padding: 20,
  },
  gameOverTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 15,
    color: 'white',
  },
  winnerText: {
    fontSize: 24,
    marginBottom: 30,
    color: '#4CAF50',
    fontWeight: 'bold',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  startButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 20,
    width: '80%',
    alignItems: 'center',
  },
});

export default GameScreen;