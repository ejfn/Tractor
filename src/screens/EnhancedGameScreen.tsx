import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Alert,
  ScrollView,
  Animated,
  Dimensions
} from 'react-native';
import PlayerHandAnimated from '../components/PlayerHandAnimated';
import CardPlayArea from '../components/CardPlayArea';
import GameStatus from '../components/GameStatus';
import {
  GameState,
  Card,
  Rank,
  Suit,
  AIDifficulty
} from '../types/game';
import { 
  initializeGame, 
  identifyCombos, 
  isValidPlay, 
  determineTrickWinner,
  calculateTrickPoints
} from '../utils/gameLogic';
import { getAIMove, shouldAIDeclare } from '../utils/aiLogic';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const EnhancedGameScreen: React.FC = () => {
  // Game state
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [gameConfig, setGameConfig] = useState({
    playerName: 'You',
    teamNames: ['Team A', 'Team B'] as [string, string],
    startingRank: Rank.Two,
    aiDifficulty: AIDifficulty.Medium
  });
  
  // UI state
  const [showSetup, setShowSetup] = useState(true);
  const [showTrumpDeclaration, setShowTrumpDeclaration] = useState(false);
  const [waitingForAI, setWaitingForAI] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<'A' | 'B' | null>(null);
  const [showTrickResult, setShowTrickResult] = useState(false);
  const [lastTrickWinner, setLastTrickWinner] = useState('');
  const [lastTrickPoints, setLastTrickPoints] = useState(0);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  
  // Timer for AI moves
  const [aiTimer, setAiTimer] = useState<NodeJS.Timeout | null>(null);

  // Define functions used in useEffect hooks
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

  // Initialize animations
  useEffect(() => {
    if (!showSetup) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [showSetup, fadeAnim, scaleAnim, slideAnim]);
  
  // Initialize game
  useEffect(() => {
    if (!showSetup && !gameState) {
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
  }, [showSetup, gameState, gameConfig.playerName, gameConfig.teamNames, gameConfig.startingRank, checkAITrumpDeclaration]);
  
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
  }, [gameState, waitingForAI, handleAIMove, aiTimer]);
  
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
  
  // Duplicate functions removed, keeping only the instances defined earlier
  
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
  
  // Handle starting a new game
  const startNewGame = () => {
    setGameState(null);
    setSelectedCards([]);
    setShowSetup(false);
    setGameOver(false);
    setWinner(null);
    
    // Reset animations
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.95);
    slideAnim.setValue(SCREEN_WIDTH);
  };
  
  // Setup screen with animations
  if (showSetup) {
    return (
      <View style={styles.setupContainer}>
        <Animated.View
          style={[
            styles.setupCard,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <Text style={styles.gameTitle}>Tractor Single Player</Text>
          <Text style={styles.subtitle}>Shengji (升级) Card Game</Text>
          
          {/* Difficulty selection */}
          <View style={styles.difficultyContainer}>
            <Text style={styles.difficultyLabel}>AI Difficulty:</Text>
            <View style={styles.difficultyButtons}>
              {Object.values(AIDifficulty).map((difficulty) => (
                <TouchableOpacity
                  key={difficulty}
                  style={[
                    styles.difficultyButton,
                    gameConfig.aiDifficulty === difficulty && styles.selectedDifficulty
                  ]}
                  onPress={() => setGameConfig({...gameConfig, aiDifficulty: difficulty})}
                >
                  <Text style={[
                    styles.difficultyText,
                    gameConfig.aiDifficulty === difficulty && styles.selectedDifficultyText
                  ]}>
                    {difficulty}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.startButton}
            onPress={startNewGame}
          >
            <Text style={styles.buttonText}>Start Game</Text>
          </TouchableOpacity>
          
          <Text style={styles.creditsText}>
            You vs 3 AI Players
          </Text>
        </Animated.View>
      </View>
    );
  }
  
  // Game over screen
  if (gameOver) {
    return (
      <View style={styles.setupContainer}>
        <Animated.View
          style={[
            styles.setupCard,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <Text style={styles.gameOverTitle}>Game Over!</Text>
          <Text style={styles.winnerText}>
            {winner === 'A' ? gameConfig.teamNames[0] : gameConfig.teamNames[1]} wins!
          </Text>
          
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => setShowSetup(true)}
          >
            <Text style={styles.buttonText}>New Game</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }
  
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
          <Animated.View 
            style={[
              styles.modalContent,
              {
                transform: [{ scale: scaleAnim }],
                opacity: fadeAnim
              }
            ]}
          >
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
          </Animated.View>
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
  
  // Find human player index
  const humanPlayerIndex = gameState?.players.findIndex(p => p.isHuman) ?? -1;
  
  // Main game screen
  return (
    <View style={styles.container}>
      {gameState ? (
        <Animated.View style={[
          styles.gameContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }]
          }
        ]}>
          {/* Game status bar */}
          <GameStatus
            teams={gameState.teams}
            trumpInfo={gameState.trumpInfo}
            roundNumber={gameState.roundNumber}
            gamePhase={gameState.gamePhase}
          />
          
          {/* AI players */}
          <ScrollView style={styles.opponentsContainer}>
            {gameState.players.map((player, index) => 
              index !== humanPlayerIndex && (
                <PlayerHandAnimated
                  key={player.id}
                  player={player}
                  isCurrentPlayer={index === gameState.currentPlayerIndex}
                  selectedCards={[]}
                  showCards={false}
                  trumpInfo={gameState.trumpInfo}
                />
              )
            )}
          </ScrollView>
          
          {/* Play area */}
          <View style={styles.playAreaContainer}>
            <Text style={styles.sectionTitle}>Current Trick</Text>
            <CardPlayArea
              currentTrick={gameState.currentTrick}
              players={gameState.players}
              trumpInfo={gameState.trumpInfo}
              winningPlayerId={gameState.currentTrick?.winningPlayerId}
            />
          </View>
          
          {/* Human player's hand */}
          {humanPlayerIndex !== -1 && (
            <View style={styles.playerHandContainer}>
              <PlayerHandAnimated
                player={gameState.players[humanPlayerIndex]}
                isCurrentPlayer={humanPlayerIndex === gameState.currentPlayerIndex}
                selectedCards={selectedCards}
                onCardSelect={handleCardSelect}
                showCards={true}
                trumpInfo={gameState.trumpInfo}
              />
              
              {gameState.gamePhase === 'playing' && 
               gameState.players[gameState.currentPlayerIndex].isHuman && (
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
              )}
            </View>
          )}
          
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
        </Animated.View>
      ) : (
        <View style={styles.loadingContainer}>
          <Text>Loading game...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  gameContainer: {
    flex: 1,
    padding: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setupContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3F51B5',
    padding: 20,
  },
  setupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  gameTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#303F9F',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 30,
    color: '#5C6BC0',
    textAlign: 'center',
  },
  difficultyContainer: {
    width: '100%',
    marginBottom: 30,
  },
  difficultyLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  difficultyButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  difficultyButton: {
    flex: 1,
    padding: 12,
    margin: 5,
    borderRadius: 8,
    backgroundColor: '#EEEEEE',
    alignItems: 'center',
  },
  selectedDifficulty: {
    backgroundColor: '#3F51B5',
  },
  difficultyText: {
    fontWeight: 'bold',
    color: '#424242',
  },
  selectedDifficultyText: {
    color: '#FFFFFF',
  },
  startButton: {
    backgroundColor: '#3F51B5',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 20,
    width: '80%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  creditsText: {
    fontSize: 14,
    color: '#9E9E9E',
  },
  opponentsContainer: {
    maxHeight: '40%',
  },
  playAreaContainer: {
    flex: 1,
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#424242',
  },
  playerHandContainer: {
    marginTop: 'auto',
  },
  playButton: {
    backgroundColor: '#3F51B5',
    paddingVertical: 15,
    borderRadius: 10,
    margin: 10,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#9E9E9E',
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
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  waitingText: {
    fontSize: 18,
    fontWeight: 'bold',
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
  gameOverTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#303F9F',
  },
  winnerText: {
    fontSize: 24,
    marginBottom: 30,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
});

export default EnhancedGameScreen;