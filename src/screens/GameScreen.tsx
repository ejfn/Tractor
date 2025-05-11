import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  Modal,
  Alert,
  ScrollView
} from 'react-native';
import GameBoard from '../components/GameBoard';
import { 
  GameState, 
  Card, 
  Rank, 
  Suit, 
  AIDifficulty, 
  ComboType,
  Player
} from '../types/game';
import { 
  initializeGame, 
  identifyCombos, 
  isValidPlay, 
  determineTrickWinner,
  calculateTrickPoints
} from '../utils/gameLogic';
import { getAIMove, shouldAIDeclare } from '../utils/aiLogic';

const GameScreen: React.FC = () => {
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
  
  // Timer for AI moves
  const [aiTimer, setAiTimer] = useState<NodeJS.Timeout | null>(null);
  
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
  }, [showSetup, gameState]);
  
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
      
      setAiTimer(timer);
    }
    
    return () => {
      if (aiTimer) {
        clearTimeout(aiTimer);
      }
    };
  }, [gameState, waitingForAI]);
  
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
      
      // Start a new trick with winner as the leader
      newState.currentTrick = null;
      
      // Set the next player to the winner of the trick
      newState.currentPlayerIndex = newState.players.findIndex(p => p.id === winningPlayerId);
      
      // Check if round is over
      if (newState.players.every(p => p.hand.length === 0)) {
        // End the round and calculate results
        endRound(newState);
        return;
      }
    } else {
      // Move to next player
      newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
    }
    
    setGameState(newState);
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
        
        let mostCommonSuit = '';
        let maxCount = 0;
        
        Object.entries(suitCounts).forEach(([suit, count]) => {
          if (count > maxCount) {
            mostCommonSuit = suit;
            maxCount = count;
          }
        });
        
        // Declare trump suit
        declareTrumpSuit(mostCommonSuit as Suit);
      } else {
        // No one declared, start playing
        const newState = { ...state };
        newState.gamePhase = 'playing';
        setGameState(newState);
      }
    } else {
      // No one can declare, start playing
      const newState = { ...state };
      newState.gamePhase = 'playing';
      setGameState(newState);
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
  };
  
  // Setup screen
  if (showSetup) {
    return (
      <View style={styles.setupContainer}>
        <Text style={styles.gameTitle}>Tractor Single Player</Text>
        <Text style={styles.subtitle}>Shengji (升级) Card Game</Text>
        
        <TouchableOpacity
          style={styles.startButton}
          onPress={startNewGame}
        >
          <Text style={styles.buttonText}>Start Game</Text>
        </TouchableOpacity>
        
        <Text style={styles.creditsText}>
          You vs 3 AI Players
        </Text>
      </View>
    );
  }
  
  // Game over screen
  if (gameOver) {
    return (
      <View style={styles.setupContainer}>
        <Text style={styles.gameTitle}>Game Over!</Text>
        <Text style={styles.subtitle}>
          {winner === 'A' ? gameConfig.teamNames[0] : gameConfig.teamNames[1]} wins!
        </Text>
        
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => setShowSetup(true)}
        >
          <Text style={styles.buttonText}>New Game</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  // Trump declaration modal
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
              {Object.values(Suit).map(suit => (
                <TouchableOpacity
                  key={suit}
                  style={styles.suitButton}
                  onPress={() => declareTrumpSuit(suit)}
                >
                  <Text style={styles.suitText}>{suit}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => declareTrumpSuit(null)}
            >
              <Text style={styles.skipText}>Don't Declare</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };
  
  // Main game screen
  return (
    <View style={styles.container}>
      {gameState ? (
        <>
          <GameBoard
            gameState={gameState}
            selectedCards={selectedCards}
            onCardSelect={handleCardSelect}
          />
          
          {gameState.gamePhase === 'playing' && 
           gameState.players[gameState.currentPlayerIndex].isHuman && (
            <View style={styles.controlsContainer}>
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
          
          {waitingForAI && (
            <View style={styles.waitingContainer}>
              <Text style={styles.waitingText}>
                AI is thinking...
              </Text>
            </View>
          )}
          
          {renderTrumpDeclarationModal()}
        </>
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
    backgroundColor: '#F5F5F5',
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
    backgroundColor: '#E8EAF6',
    padding: 20,
  },
  gameTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#303F9F',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 30,
    color: '#5C6BC0',
  },
  startButton: {
    backgroundColor: '#3F51B5',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  creditsText: {
    fontSize: 14,
    color: '#9FA8DA',
  },
  controlsContainer: {
    padding: 10,
    backgroundColor: '#E8EAF6',
    borderTopWidth: 1,
    borderTopColor: '#C5CAE9',
  },
  playButton: {
    backgroundColor: '#3F51B5',
    paddingVertical: 12,
    borderRadius: 8,
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
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  waitingText: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 10,
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  suitButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
  },
  suitButton: {
    backgroundColor: '#E8EAF6',
    padding: 15,
    margin: 5,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  suitText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  skipButton: {
    backgroundColor: '#EEEEEE',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 16,
    color: '#616161',
  },
});

export default GameScreen;