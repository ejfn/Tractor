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
    aiDifficulty: AIDifficulty.Hard // Set AI to Hard difficulty
  });

  // UI state
  const [showSetup, setShowSetup] = useState(false); // Skip setup screen
  const [showTrumpDeclaration, setShowTrumpDeclaration] = useState(false);
  const [waitingForAI, setWaitingForAI] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<'A' | 'B' | null>(null);
  const [showTrickResult, setShowTrickResult] = useState(false);
  const [lastTrickWinner, setLastTrickWinner] = useState('');
  const [lastTrickPoints, setLastTrickPoints] = useState(0);

  
  // Animations - initialize with visible values for first render
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Thinking dots animation values
  const thinkingDot1 = useRef(new Animated.Value(1)).current;
  const thinkingDot2 = useRef(new Animated.Value(1)).current;
  const thinkingDot3 = useRef(new Animated.Value(1)).current;
  
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
    // Only animate when changing from setup to game screen
    if (!showSetup) {
      // Game screen animations with a slight delay to ensure component is mounted
      setTimeout(() => {
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
      }, 100);
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

  // Animate thinking dots (continuous animation regardless of whose turn it is)
  useEffect(() => {
    // Create animations for the thinking dots
    const animateThinkingDots = () => {
      // Sequence for first dot
      Animated.sequence([
        Animated.timing(thinkingDot1, {
          toValue: 0.4,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(thinkingDot1, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        })
      ]).start();

      // Sequence for second dot with delay
      setTimeout(() => {
        Animated.sequence([
          Animated.timing(thinkingDot2, {
            toValue: 0.4,
            duration: 300,
            useNativeDriver: true
          }),
          Animated.timing(thinkingDot2, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true
          })
        ]).start();
      }, 150);

      // Sequence for third dot with more delay
      setTimeout(() => {
        Animated.sequence([
          Animated.timing(thinkingDot3, {
            toValue: 0.4,
            duration: 300,
            useNativeDriver: true
          }),
          Animated.timing(thinkingDot3, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true
          })
        ]).start(() => {
          // After all animations complete, wait briefly and restart
          setTimeout(animateThinkingDots, 300);
        });
      }, 300);
    };

    // Start the animation loop
    animateThinkingDots();

    // Clean up on unmount
    return () => {
      // No explicit cleanup needed as animations will stop when component unmounts
    };
  }, [thinkingDot1, thinkingDot2, thinkingDot3]);
  
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
    // Force animation values to be visible during initial render
    if (fadeAnim._value === 0) {
      fadeAnim.setValue(1);
      scaleAnim.setValue(1);
    }

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
          {/* Game status bar above table */}
          <GameStatus
            teams={gameState.teams}
            trumpInfo={gameState.trumpInfo}
            roundNumber={gameState.roundNumber}
            gamePhase={gameState.gamePhase}
          />

          {/* Simple square table layout */}
          <View style={styles.gameTable}>
            {/* Top player (Bot 2) */}
            <View style={styles.topArea}>
              <View style={[
                styles.labelContainer,
                styles.topPlayerLabel, // Added extra spacing just for Bot 2
                gameState?.players.find(p => p.id === 'ai2')?.team === 'A' ?
                  styles.teamALabel : styles.teamBLabel
              ]}>
                <Text style={styles.playerLabel}>Bot 2</Text>
                {/* Show thinking dots when it's this player's turn and they're thinking */}
                {waitingForAI && gameState.currentPlayerIndex === gameState.players.findIndex(p => p.id === 'ai2') && (
                  <View style={styles.thinkingIndicator}>
                    <Animated.View style={[styles.thinkingDot, {opacity: thinkingDot1}]} />
                    <Animated.View style={[styles.thinkingDot, {opacity: thinkingDot2}]} />
                    <Animated.View style={[styles.thinkingDot, {opacity: thinkingDot3}]} />
                  </View>
                )}
              </View>
              <View style={styles.cardStackContainer}>
                {/* Cards for top player (Bot 2) - showing actual card count */}
                <View style={[styles.botCardsRow, { flexDirection: 'row-reverse' }]}>
                  {[...Array(Math.min(10, gameState.players.find(p => p.id === 'ai2')?.hand.length || 0))].map((_, i) => (
                    <View
                      key={`top-card-${i}`}
                      style={[
                        styles.botCardSmall,
                        { marginLeft: i < 9 ? -44 : 0, transform: [{ rotate: '0deg' }] }
                      ]}
                    >
                      <View style={styles.cardBackPattern}>
                        <View style={styles.cardBackGrid}>
                          <View style={styles.dotRow}>
                            <View style={styles.cardBackDot} />
                            <View style={styles.cardBackDot} />
                            <View style={styles.cardBackDot} />
                          </View>
                          <View style={styles.dotRow}>
                            <View style={styles.cardBackDot} />
                            <View style={styles.cardBackDot} />
                            <View style={styles.cardBackDot} />
                          </View>
                          <View style={styles.dotRow}>
                            <View style={styles.cardBackDot} />
                            <View style={styles.cardBackDot} />
                            <View style={styles.cardBackDot} />
                          </View>
                        </View>
                        <Text style={styles.cardBackLetter}>T</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Middle row */}
            <View style={styles.middleRow}>
              {/* Left player (Bot 1) */}
              <View style={styles.leftArea}>
                <View style={[
                styles.labelContainer,
                gameState?.players.find(p => p.id === 'ai1')?.team === 'A' ?
                  styles.teamALabel : styles.teamBLabel
              ]}>
                <Text style={styles.playerLabel}>Bot 1</Text>
                {/* Show thinking dots when it's this player's turn and they're thinking */}
                {waitingForAI && gameState.currentPlayerIndex === gameState.players.findIndex(p => p.id === 'ai1') && (
                  <View style={styles.thinkingIndicator}>
                    <Animated.View style={[styles.thinkingDot, {opacity: thinkingDot1}]} />
                    <Animated.View style={[styles.thinkingDot, {opacity: thinkingDot2}]} />
                    <Animated.View style={[styles.thinkingDot, {opacity: thinkingDot3}]} />
                  </View>
                )}
              </View>
                <View style={[styles.cardStackContainer, { flexDirection: 'column', marginTop: 10 }]}>
                  {/* Cards for left player (Bot 1) - showing actual card count */}
                  <View style={[styles.botCardsColumn, { flexDirection: 'column-reverse' }]}>
                    {[...Array(Math.min(10, gameState.players.find(p => p.id === 'ai1')?.hand.length || 0))].map((_, i) => (
                      <View
                        key={`left-card-${i}`}
                        style={[
                          styles.botCardSmall,
                          { marginTop: i < 9 ? -40 : 0, transform: [{ rotate: '270deg' }] }
                        ]}
                      >
                        <View style={styles.cardBackPattern}>
                          <View style={styles.cardBackGrid}>
                            <View style={styles.dotRow}>
                              <View style={styles.cardBackDot} />
                              <View style={styles.cardBackDot} />
                              <View style={styles.cardBackDot} />
                            </View>
                            <View style={styles.dotRow}>
                              <View style={styles.cardBackDot} />
                              <View style={styles.cardBackDot} />
                              <View style={styles.cardBackDot} />
                            </View>
                            <View style={styles.dotRow}>
                              <View style={styles.cardBackDot} />
                              <View style={styles.cardBackDot} />
                              <View style={styles.cardBackDot} />
                            </View>
                          </View>
                          <Text style={styles.cardBackLetter}>T</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              {/* Center play area */}
              <View style={styles.centerArea}>
                <CardPlayArea
                  currentTrick={gameState.currentTrick}
                  players={gameState.players}
                  trumpInfo={gameState.trumpInfo}
                  winningPlayerId={gameState.currentTrick?.winningPlayerId}
                />
              </View>

              {/* Right player (Bot 3) */}
              <View style={styles.rightArea}>
                <View style={[
                styles.labelContainer,
                gameState?.players.find(p => p.id === 'ai3')?.team === 'A' ?
                  styles.teamALabel : styles.teamBLabel
              ]}>
                <Text style={styles.playerLabel}>Bot 3</Text>
                {/* Show thinking dots when it's this player's turn and they're thinking */}
                {waitingForAI && gameState.currentPlayerIndex === gameState.players.findIndex(p => p.id === 'ai3') && (
                  <View style={styles.thinkingIndicator}>
                    <Animated.View style={[styles.thinkingDot, {opacity: thinkingDot1}]} />
                    <Animated.View style={[styles.thinkingDot, {opacity: thinkingDot2}]} />
                    <Animated.View style={[styles.thinkingDot, {opacity: thinkingDot3}]} />
                  </View>
                )}
              </View>
                <View style={[styles.cardStackContainer, { flexDirection: 'column', marginTop: 10 }]}>
                  {/* Cards for right player (Bot 3) - showing actual card count */}
                  <View style={styles.botCardsColumn}>
                    {[...Array(Math.min(10, gameState.players.find(p => p.id === 'ai3')?.hand.length || 0))].map((_, i) => (
                      <View
                        key={`right-card-${i}`}
                        style={[
                          styles.botCardSmall,
                          { marginBottom: i < 9 ? -40 : 0, transform: [{ rotate: '90deg' }] }
                        ]}
                      >
                        <View style={styles.cardBackPattern}>
                          <View style={styles.cardBackGrid}>
                            <View style={styles.dotRow}>
                              <View style={styles.cardBackDot} />
                              <View style={styles.cardBackDot} />
                              <View style={styles.cardBackDot} />
                            </View>
                            <View style={styles.dotRow}>
                              <View style={styles.cardBackDot} />
                              <View style={styles.cardBackDot} />
                              <View style={styles.cardBackDot} />
                            </View>
                            <View style={styles.dotRow}>
                              <View style={styles.cardBackDot} />
                              <View style={styles.cardBackDot} />
                              <View style={styles.cardBackDot} />
                            </View>
                          </View>
                          <Text style={styles.cardBackLetter}>T</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            {/* Bottom area - human player's hand */}
            <View style={styles.bottomArea}>
              <View style={[
                styles.labelContainer,
                gameState?.players.find(p => p.isHuman)?.team === 'A' ?
                  styles.teamALabel : styles.teamBLabel
              ]}>
                <Text style={styles.playerLabel}>You</Text>
                {/* Show thinking dots when it's human player's turn */}
                {gameState.currentPlayerIndex === humanPlayerIndex && (
                  <View style={styles.thinkingIndicator}>
                    <Animated.View style={[styles.thinkingDot, {opacity: thinkingDot1}]} />
                    <Animated.View style={[styles.thinkingDot, {opacity: thinkingDot2}]} />
                    <Animated.View style={[styles.thinkingDot, {opacity: thinkingDot3}]} />
                  </View>
                )}
              </View>
              {humanPlayerIndex !== -1 && (
                <PlayerHandAnimated
                  player={gameState.players[humanPlayerIndex]}
                  isCurrentPlayer={humanPlayerIndex === gameState.currentPlayerIndex}
                  selectedCards={selectedCards}
                  onCardSelect={handleCardSelect}
                  onPlayCards={handlePlay}
                  showCards={true}
                  trumpInfo={gameState.trumpInfo}
                  canPlay={gameState.gamePhase === 'playing' && gameState.players[gameState.currentPlayerIndex].isHuman}
                />
              )}
            </View>

            {/* Play button moved to PlayerHandAnimated component */}
          </View>
          
          {/* We now use thinking dot indicators instead of a full-screen overlay */}
          
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
    padding: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3F51B5',
  },
  setupContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3F51B5', // Deep blue
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
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
    fontSize: 14, // Reduced font size
    fontWeight: '600', // Slightly reduced weight
    textAlign: 'center', // Ensure text is centered
    flexShrink: 1, // Allow text to shrink if needed
  },
  creditsText: {
    fontSize: 14,
    color: '#9E9E9E',
  },
  gameTable: {
    flex: 1,
    backgroundColor: '#0B4619', // Rich green card table
    borderRadius: 16, // Consistent with GameStatus border radius
    borderWidth: 4,
    borderColor: '#1B651E',
    overflow: 'hidden',
    marginLeft: 10,
    marginRight: 10,
    marginTop: 0,
    marginBottom: 10, // Same as GameStatus marginBottom
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: 10,
  },
  // Top player - centered at the top of the table
  topArea: {
    width: '100%',
    height: 110, // Increased from 80 to 110
    marginTop: 15, // Reduced from 30 to 15
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Left player - along the left edge of the table at middle height
  leftArea: {
    width: 100, // Increased from 80 to 100
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Middle row container
  middleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 200,
    width: '100%',
  },
  // Center play area - in the middle of the table
  centerArea: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  // Right player - along the right edge of the table at middle height
  rightArea: {
    width: 100, // Increased from 80 to 100
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Bottom player - centered at the bottom of the table
  bottomArea: {
    width: '100%',
    height: 230, // Kept same height
    alignItems: 'center',
    justifyContent: 'center', // Center content vertically
    paddingTop: 0, // No padding at top
    paddingBottom: 0, // No padding at bottom
    marginBottom: 0, // No margin at bottom
  },
  // Play button - at the very bottom of the table
  buttonArea: {
    width: '100%',
    height: 45, // Height for button area
    alignItems: 'center',
    justifyContent: 'flex-start', // Align to top
    paddingTop: 0, // No padding
    marginTop: -20, // Even more negative margin to pull it up
    position: 'relative', // Establish positioning context
    zIndex: 10, // Ensure it stays above other elements
  },
  // Simple card representation
  simpleCard: {
    width: 50,  // Increased from 40 to 50
    height: 70, // Increased from 55 to 70
    backgroundColor: '#4169E1',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'white',
  },
  // Card stack container
  cardStackContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
  },
  // Label container for consistent sizing
  labelContainer: {
    height: 26, // Increased to match larger font size
    minWidth: 75, // Increased for better visibility
    borderRadius: 13, // Half of height for pill shape
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 3, // Original margin
    paddingHorizontal: 14, // Increased for better spacing
    borderWidth: 0.5, // Thin border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, // Subtle shadow
    shadowRadius: 2,
    elevation: 1, // Subtle elevation
    position: 'relative', // For absolute positioning of thinking indicator
  },
  // Team A label (defending team - green)
  teamALabel: {
    backgroundColor: 'rgba(46, 125, 50, 0.75)', // Slightly more transparent
    borderColor: '#E8F5E9', // Light green border
  },
  // Team B label (attacking team - red)
  teamBLabel: {
    backgroundColor: 'rgba(198, 40, 40, 0.75)', // Slightly more transparent
    borderColor: '#FFEBEE', // Light red border
  },
  // Top player label with extra spacing
  topPlayerLabel: {
    marginBottom: 15, // Extra space for Bot 2 label only
  },
  // Player label
  playerLabel: {
    fontSize: 14, // Increased font size for better visibility
    fontWeight: '600', // Increased from 500 to 600 for better readability
    color: 'white',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.2)', // Subtle text shadow
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  // Thinking indicator styles
  thinkingIndicator: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFC107',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD54F',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
    zIndex: 5,
  },
  thinkingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'white',
    marginHorizontal: 1,
  },
  // Center box
  centerBox: {
    width: 150,
    height: 150,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Center text
  centerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  // Human card with face
  humanCard: {
    width: 40,
    height: 55,
    backgroundColor: 'white',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#000',
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Container for stacked cards
  stackedCardContainer: {
    width: 70,
    height: 70,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Background stacked cards
  stackedCard: {
    position: 'absolute',
    width: 10,
    height: 65,
    backgroundColor: '#3A5FCD', // Slightly lighter blue
    borderRadius: 2,
    borderWidth: 1,
    borderColor: 'white',
  },
  // Background stacked cards (horizontal)
  horizontalStackedCard: {
    position: 'absolute',
    width: 65,
    height: 10,
    backgroundColor: '#3A5FCD', // Slightly lighter blue
    borderRadius: 2,
    borderWidth: 1,
    borderColor: 'white',
  },
  // Container for stacked cards
  stackedCardContainer: {
    width: 70,
    height: 70,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Background cards for left position (Bot 1)
  leftStackedCard1: {
    position: 'absolute',
    width: 50,
    height: 70,
    backgroundColor: '#3A5FCD',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'white',
    top: -5,
    left: -5,
    zIndex: -1,
  },
  leftStackedCard2: {
    position: 'absolute',
    width: 50,
    height: 70,
    backgroundColor: '#2B4FC0',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'white',
    top: -10,
    left: -10,
    zIndex: -2,
  },
  // Background cards for right position (Bot 3)
  rightStackedCard1: {
    position: 'absolute',
    width: 50,
    height: 70,
    backgroundColor: '#3A5FCD',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'white',
    top: -5,
    left: -5,
    zIndex: -1,
  },
  rightStackedCard2: {
    position: 'absolute',
    width: 50,
    height: 70,
    backgroundColor: '#2B4FC0',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'white',
    top: -10,
    left: -10,
    zIndex: -2,
  },
  // Background cards for top position (Bot 2)
  topStackedCard1: {
    position: 'absolute',
    width: 50,
    height: 70,
    backgroundColor: '#3A5FCD',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'white',
    top: -5,
    left: -5,
    zIndex: -1,
  },
  topStackedCard2: {
    position: 'absolute',
    width: 50,
    height: 70,
    backgroundColor: '#2B4FC0',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'white',
    top: -10,
    left: -10,
    zIndex: -2,
  },
  // New card container for Bot 3
  cardContainer: {
    position: 'relative',
    width: 50,
    height: 70,
  },
  // Rows and columns for bot cards
  botCardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  botCardsColumn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Small card for bots
  botCardSmall: {
    width: 35,
    height: 49,
    backgroundColor: '#4169E1',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'white',
    zIndex: 5,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  // Card back pattern
  cardBackPattern: {
    width: '85%',
    height: '85%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
    position: 'relative',
    overflow: 'hidden',
  },
  cardBackLetter: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    zIndex: 10,
  },
  cardBackGrid: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardBackDot: {
    width: 4,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 2,
  },
  // Card back dot pattern
  dotRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  // Card rank
  cardRank: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'black',
  },
  // Card suit
  cardSuit: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'black',
  },
  playButton: {
    backgroundColor: '#B71C1C', // Deeper red for better contrast
    paddingVertical: 8, // Increased vertical padding
    paddingHorizontal: 15, // Horizontal padding
    borderRadius: 20, // Increased border radius to match the taller button
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    width: '42%',
    minWidth: 130,
    height: 36, // Increased height
  },
  disabledButton: {
    backgroundColor: '#9E9E9E',
    shadowOpacity: 0.2,
    elevation: 2,
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
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  waitingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#303F9F',
    textAlign: 'center',
    lineHeight: 24,
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