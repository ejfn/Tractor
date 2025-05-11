import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Dimensions,
  Animated,
  Easing
} from 'react-native';
import {
  GameState,
  Rank,
  Suit,
  Card
} from '../types/game';
import { initializeGame, isTrump } from '../utils/gameLogic';

const { width, height } = Dimensions.get('window');

const SimpleGameScreen: React.FC = () => {
  // Game state
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTrumpDeclaration, setShowTrumpDeclaration] = useState(false);
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [showCardBacks, setShowCardBacks] = useState(false); // Toggle for showing card backs
  const [animatingCard, setAnimatingCard] = useState<{
    card: Card | null,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    rotation: number
  } | null>(null);

  // Animation refs
  const cardPositionX = useRef(new Animated.Value(0)).current;
  const cardPositionY = useRef(new Animated.Value(0)).current;
  const cardRotation = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(1)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;

  // Initialize game
  useEffect(() => {
    console.log("Initializing game...");
    try {
      // Create initial game state
      const newGameState = initializeGame(
        'You',
        ['Team A', 'Team B'],
        Rank.Two
      );
      console.log("Game state initialized:", JSON.stringify(newGameState).substring(0, 100) + "...");

      // Implement "flipping trump" mechanic
      // Take top card from kitty to determine trump suit
      if (newGameState.kittyCards.length > 0) {
        const flippedCard = newGameState.kittyCards[0];

        // If flipped card is a trump rank, set that as trump suit
        if (flippedCard.rank === newGameState.trumpInfo.trumpRank && flippedCard.suit) {
          newGameState.trumpInfo.trumpSuit = flippedCard.suit;
          newGameState.trumpInfo.declared = true;
        }
        // Otherwise use the suit of the flipped card as trump
        else if (flippedCard.suit) {
          newGameState.trumpInfo.trumpSuit = flippedCard.suit;
          newGameState.trumpInfo.declared = true;
        }

        // Move directly to playing phase
        newGameState.gamePhase = 'playing';

        // Initialize trick tracking - add a sample trick for visual purposes
        // In a real game, this would be managed through gameplay
        newGameState.currentTrick = {
          leadingPlayerId: newGameState.players[0].id,
          leadingCombo: [], // Will be filled when player plays a card
          plays: [], // Will contain each player's cards as they play them
          points: 0 // Initialize points for this trick
        };
      }

      setGameState(newGameState);
    } catch (error) {
      console.error("Error initializing game:", error);
      console.error("Failed to initialize game");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Animate a card being played - enhanced for smoother motion
  const animateCardPlay = (card: Card, startX: number, startY: number, endX: number, endY: number, rotation: number) => {
    // Set the initial position
    cardPositionX.setValue(0);
    cardPositionY.setValue(0);
    cardRotation.setValue(0);
    cardScale.setValue(1);
    cardOpacity.setValue(1);

    // Set the animating card
    setAnimatingCard({
      card,
      startX,
      startY,
      endX,
      endY,
      rotation
    });

    // Create animation sequence with improved timing and easing
    Animated.parallel([
      // Position X with slight spring motion
      Animated.spring(cardPositionX, {
        toValue: endX - startX,
        useNativeDriver: true,
        friction: 8.5, // Higher friction for less oscillation
        tension: 50,   // Lower tension for more natural motion
        velocity: 3    // Initial velocity for more natural feel
      }),
      // Position Y with slight spring motion
      Animated.spring(cardPositionY, {
        toValue: endY - startY,
        useNativeDriver: true,
        friction: 8.5,
        tension: 50,
        velocity: 3
      }),
      // Rotation using timing for controlled speed
      Animated.timing(cardRotation, {
        toValue: rotation,
        duration: 500, // Slightly reduced for snappier feel
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic)
      }),
      // Improved scale animation with spring physics
      Animated.sequence([
        // Initial bounce up
        Animated.spring(cardScale, {
          toValue: 1.1,
          useNativeDriver: true,
          friction: 5,   // Lower friction for more bounce
          tension: 120,  // Higher tension for quicker action
          velocity: 0    // No initial velocity
        }),
        // Settle back down with spring physics
        Animated.spring(cardScale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 7,    // Medium friction for slight bounce
          tension: 50,    // Medium tension for natural settling
          velocity: 0     // No initial velocity
        })
      ]),
    ]).start(() => {
      // Animation complete - hold briefly before fading
      setTimeout(() => {
        // Fade out the card with improved timing
        Animated.timing(cardOpacity, {
          toValue: 0,
          duration: 250, // Slightly faster fade
          useNativeDriver: true,
          easing: Easing.inOut(Easing.cubic) // Smoother fade transition
        }).start(() => {
          // Reset animation state
          setAnimatingCard(null);
        });
      }, 250); // Slightly reduced hold time
    });
  };

  // Handle card selection
  const handleCardSelect = (card: Card) => {
    if (!gameState) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];

    // Only allow current player to select cards if they're human
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

  // Render card back with simple pattern
  const renderCardBack = (isSelectable = false, id = '') => {
    return (
      <TouchableOpacity
        key={id || 'card-back'}
        style={styles.card}
        onPress={() => {
          if (isSelectable) {
            handleCardSelect({ id } as Card);
          }
        }}
        activeOpacity={0.7}
      >
        {/* Card back with simplified 3x3 grid pattern */}
        <View style={{
          flex: 1,
          backgroundColor: '#1A4B84', // Deep blue background
          borderRadius: 6,
          borderWidth: 1.5,
          borderColor: 'white',
          overflow: 'hidden',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative'
        }}>
          {/* Simple grid pattern */}
          <View style={{
            width: '90%',
            height: '90%',
            position: 'relative',
          }} pointerEvents="none">
            {/* Main grid container */}
            <View style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.3)'
            }} />

            {/* Horizontal lines */}
            <View style={{
              position: 'absolute',
              left: '10%',
              right: '10%',
              top: '33%',
              height: 1,
              backgroundColor: 'rgba(255, 255, 255, 0.3)'
            }} />

            <View style={{
              position: 'absolute',
              left: '10%',
              right: '10%',
              top: '66%',
              height: 1,
              backgroundColor: 'rgba(255, 255, 255, 0.3)'
            }} />

            {/* Vertical lines */}
            <View style={{
              position: 'absolute',
              top: '10%',
              bottom: '10%',
              left: '33%',
              width: 1,
              backgroundColor: 'rgba(255, 255, 255, 0.3)'
            }} />

            <View style={{
              position: 'absolute',
              top: '10%',
              bottom: '10%',
              left: '66%',
              width: 1,
              backgroundColor: 'rgba(255, 255, 255, 0.3)'
            }} />
          </View>

          {/* Center emblem */}
          <View style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: 'white',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'absolute',
            zIndex: 5
          }} pointerEvents="none">
            <Text style={{
              fontSize: 14,
              fontWeight: 'bold',
              color: '#1A4B84',
              textAlign: 'center'
            }}>T</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render mini card back - simplified and identical to main card pattern
  const renderMiniCardBack = () => {
    return (
      <View style={styles.stackedCardBack}>
        <View style={{
          flex: 1,
          backgroundColor: '#1A4B84', // Deep blue background
          borderRadius: 6,
          borderWidth: 3.5,
          borderColor: 'white',
          overflow: 'hidden',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative'
        }}>
          {/* Simple grid pattern */}
          <View style={{
            width: '90%',
            height: '90%',
            position: 'relative',
          }} pointerEvents="none">
            {/* Main grid container */}
            <View style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.3)'
            }} />

            {/* Horizontal lines */}
            <View style={{
              position: 'absolute',
              left: '10%',
              right: '10%',
              top: '33%',
              height: 1,
              backgroundColor: 'rgba(255, 255, 255, 0.3)'
            }} />

            <View style={{
              position: 'absolute',
              left: '10%',
              right: '10%',
              top: '66%',
              height: 1,
              backgroundColor: 'rgba(255, 255, 255, 0.3)'
            }} />

            {/* Vertical lines */}
            <View style={{
              position: 'absolute',
              top: '10%',
              bottom: '10%',
              left: '33%',
              width: 1,
              backgroundColor: 'rgba(255, 255, 255, 0.3)'
            }} />

            <View style={{
              position: 'absolute',
              top: '10%',
              bottom: '10%',
              left: '66%',
              width: 1,
              backgroundColor: 'rgba(255, 255, 255, 0.3)'
            }} />
          </View>

          {/* Center emblem */}
          <View style={{
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: 'white',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'absolute',
            zIndex: 5
          }} pointerEvents="none">
            <Text style={{
              fontSize: 8,
              fontWeight: 'bold',
              color: '#1A4B84',
              textAlign: 'center'
            }}>T</Text>
          </View>
        </View>
      </View>
    );
  };

  // Removed unused renderMiniCardBackVertical function

  // Render card component
  const renderCard = (card: Card, isSelected: boolean = false, faceDown: boolean = false) => {
    // If card is face down, render the back pattern
    if (faceDown) {
      // Make player cards selectable, others not
      const isPlayerCard = humanPlayer && humanPlayer.hand.some(c => c.id === card.id);
      return renderCardBack(isPlayerCard, card.id);
    }
    // Determine card color and symbol
    const suitSymbol = card.suit === Suit.Hearts
      ? '♥'
      : card.suit === Suit.Diamonds
        ? '♦'
        : card.suit === Suit.Clubs
          ? '♣'
          : '♠';

    const cardColor = card.suit === Suit.Hearts || card.suit === Suit.Diamonds ? '#D32F2F' : '#000000';
    const isTrumpCard = gameState ? isTrump(card, gameState.trumpInfo) : false;
    const isTopTrumpCard = gameState ? (card.rank === gameState.trumpInfo.trumpRank && card.suit === gameState.trumpInfo.trumpSuit) : false;

    // Determine background color based on card type
    let bgColor = 'white';
    if (isTopTrumpCard) {
      bgColor = '#FFF9C4'; // Light yellow for top trump
    } else if (isTrumpCard) {
      bgColor = '#E8F5E9'; // Light green for trumps
    }

    // Special border for trump cards
    let borderColor = '#CCCCCC';
    let borderWidth = 1;
    if (isTopTrumpCard) {
      borderColor = '#FBC02D'; // Gold border for top trump
      borderWidth = 2;
    } else if (isTrumpCard) {
      borderColor = '#4CAF50'; // Green border for trumps
      borderWidth = 1.5;
    }

    // For jokers, apply special styling with red for big joker and black for small joker
    if (card.joker) {
      bgColor = card.joker === 'Big' ? '#FFEBEE' : '#F5F5F5';
      borderColor = card.joker === 'Big' ? '#D32F2F' : '#000000';
      borderWidth = 2;

      // Simplified joker card with just a star and vertical JOKER text
      const jokerColor = card.joker === 'Big' ? '#D32F2F' : '#000000';
      const jokerBgColor = 'white';

      return (
        <TouchableOpacity
          key={card.id}
          style={[
            styles.card,
            {
              backgroundColor: jokerBgColor,
              borderColor: 'transparent', // Removed border
              borderWidth: 0, // No border
              padding: 0,
              justifyContent: 'center',
              alignItems: 'center',
            },
            isSelected && styles.selectedCard
          ]}
          onPress={() => handleCardSelect(card)}
          activeOpacity={0.7} // Added to show feedback when pressed
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} // Increased touch area
        >
          {/* Card content with rank value in top left and bottom right */}
          <View style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            {/* Top left vertical JOKER text as rank value */}
            <View style={{
              position: 'absolute',
              top: 3,
              left: 3,
              flexDirection: 'column',
              alignItems: 'center',
              zIndex: 10,
            }}>
              {['J','O','K','E','R'].map((letter, idx) => (
                <Text key={idx} style={{
                  fontSize: 10, // Smaller text size
                  fontWeight: 'bold',
                  color: jokerColor,
                  lineHeight: 11, // Adjusted line height
                  textAlign: 'center',
                }}>
                  {letter}
                </Text>
              ))}
            </View>

            {/* Bottom right vertical JOKER text (inverted) */}
            <View style={{
              position: 'absolute',
              bottom: 3,
              right: 3,
              flexDirection: 'column',
              alignItems: 'center',
              transform: [{ rotate: '180deg' }],
              zIndex: 10,
            }}>
              {['J','O','K','E','R'].map((letter, idx) => (
                <Text key={idx} style={{
                  fontSize: 10, // Smaller text size
                  fontWeight: 'bold',
                  color: jokerColor,
                  lineHeight: 11, // Adjusted line height
                  textAlign: 'center',
                }}>
                  {letter}
                </Text>
              ))}
            </View>

            {/* Smaller star symbol in center */}
            <Text style={{
              fontSize: 45,
              color: jokerColor,
              opacity: 0.8,
              fontWeight: 'bold',
            }}>
              ★
            </Text>
          </View>
        </TouchableOpacity>
      );
    }

    // Render normal card with suit symbols at both corners
    return (
      <TouchableOpacity
        key={card.id}
        style={[
          styles.card,
          { backgroundColor: bgColor, borderColor, borderWidth },
          isSelected && styles.selectedCard
        ]}
        onPress={() => handleCardSelect(card)}
        activeOpacity={0.7} // Added to show feedback when pressed
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} // Increased touch area
      >
        {/* Card header with rank and suit */}
        <View style={styles.cardHeader}>
          <View style={styles.rankSuitPair}>
            <Text style={[styles.cardRank, { color: cardColor }]}>
              {card.rank}
            </Text>
            <Text style={[styles.suitSymbolSmall, { color: cardColor }]}>
              {suitSymbol}
            </Text>
          </View>
          {/* Mini indicator */}
          {isTopTrumpCard && (
            <Text style={styles.miniIndicator}>🏆</Text>
          )}
          {isTrumpCard && !isTopTrumpCard && (
            <Text style={styles.miniIndicator}>♦</Text>
          )}
        </View>

        {/* Card center with large suit symbol */}
        <View style={styles.cardCenter}>
          <Text style={[styles.suitSymbolLarge, { color: cardColor }]}>
            {suitSymbol}
          </Text>
        </View>

        {/* Card footer with rank and suit (inverted) */}
        <View style={styles.cardFooter}>
          <View style={styles.rankSuitPairInverted}>
            <Text style={[styles.suitSymbolSmall, { color: cardColor }]}>
              {suitSymbol}
            </Text>
            <Text style={[styles.cardRank, { color: cardColor }]}>
              {card.rank}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render trump declaration modal
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

  // Helper function to calculate card value for sorting
  const getCardSortValue = (card: Card): number => {
    // Base value from card rank
    const rankValues: Record<Rank, number> = {
      [Rank.Two]: 2,
      [Rank.Three]: 3,
      [Rank.Four]: 4,
      [Rank.Five]: 5,
      [Rank.Six]: 6,
      [Rank.Seven]: 7,
      [Rank.Eight]: 8,
      [Rank.Nine]: 9,
      [Rank.Ten]: 10,
      [Rank.Jack]: 11,
      [Rank.Queen]: 12,
      [Rank.King]: 13,
      [Rank.Ace]: 14,
    };

    // Suit values for sorting by suit
    const suitValues: Record<Suit, number> = {
      [Suit.Spades]: 40,
      [Suit.Hearts]: 30,
      [Suit.Clubs]: 20,
      [Suit.Diamonds]: 10,
    };

    // Categories for sorting (higher = better)
    // 4000+ = Jokers
    // 3000+ = Trump rank cards
    // 2000+ = Trump suit cards
    // 0-1999 = Regular cards

    // JOKERS - highest value
    if (card.joker) {
      return card.joker === 'Big' ? 4100 : 4000;
    }

    // TRUMP RANK CARDS - second highest
    if (gameState && card.rank === gameState.trumpInfo.trumpRank) {
      // Trump rank and trump suit is highest in this category
      if (card.suit === gameState.trumpInfo.trumpSuit) {
        return 3500 + rankValues[card.rank];
      }
      // Otherwise sort by suit within trump rank
      return 3000 + (card.suit ? suitValues[card.suit] : 0) + rankValues[card.rank];
    }

    // TRUMP SUIT CARDS - third highest
    if (gameState && card.suit === gameState.trumpInfo.trumpSuit) {
      return 2000 + rankValues[card.rank!];
    }

    // REGULAR CARDS - lowest, sort by suit then rank
    let value = rankValues[card.rank!];

    // Add suit value for sorting
    if (card.suit) {
      value += suitValues[card.suit];
    }

    return value;
  };

  // Sort human player's hand
  let sortedHand: Card[] = [];

  // Find human player
  const humanPlayer = gameState?.players.find(p => p.isHuman);
  const isHumanTurn = gameState?.players[gameState.currentPlayerIndex].isHuman || false;

  // Sort cards if human player exists
  if (humanPlayer) {
    // First sort by category and rank
    const handByValue = [...humanPlayer.hand].sort((a, b) => getCardSortValue(b) - getCardSortValue(a));

    // Then split by suit and interleave them for better visibility
    const jokers: Card[] = [];
    const trumps: Card[] = [];
    const spades: Card[] = [];
    const hearts: Card[] = [];
    const clubs: Card[] = [];
    const diamonds: Card[] = [];

    // Categorize cards by type
    handByValue.forEach(card => {
      if (card.joker) {
        jokers.push(card);
      } else if (gameState && (card.rank === gameState.trumpInfo.trumpRank || card.suit === gameState.trumpInfo.trumpSuit)) {
        trumps.push(card);
      } else if (card.suit === Suit.Spades) {
        spades.push(card);
      } else if (card.suit === Suit.Hearts) {
        hearts.push(card);
      } else if (card.suit === Suit.Clubs) {
        clubs.push(card);
      } else if (card.suit === Suit.Diamonds) {
        diamonds.push(card);
      }
    });

    // Create an alternating color pattern: black-red-black-red
    // First jokers and trumps as special categories
    // Then use a fixed ordering of suits that we rotate based on trump suit color
    sortedHand = [];

    // Add special cards first
    sortedHand.push(...jokers, ...trumps);

    // Create suit arrays with color information (only include non-empty suits)
    const suitArrays = [];
    if (spades.length > 0) suitArrays.push({ cards: spades, color: 'black', name: 'Spades' });
    if (hearts.length > 0) suitArrays.push({ cards: hearts, color: 'red', name: 'Hearts' });
    if (clubs.length > 0) suitArrays.push({ cards: clubs, color: 'black', name: 'Clubs' });
    if (diamonds.length > 0) suitArrays.push({ cards: diamonds, color: 'red', name: 'Diamonds' });

    // Simple approach: fixed suit order (Spades, Hearts, Clubs, Diamonds) rotated based on trump suit

    // Define fixed suit order (already alternates black-red-black-red)
    const standardSuitOrder = ['Spades', 'Hearts', 'Clubs', 'Diamonds'];

    // Create a map of suits that are present
    const suitMap: Record<string, Card[]> = {};
    suitArrays.forEach(suitArray => {
      suitMap[suitArray.name] = suitArray.cards;
    });

    // Find the index of the trump suit in our standard order
    let trumpIndex = -1;
    if (gameState && gameState.trumpInfo.trumpSuit) {
      trumpIndex = standardSuitOrder.indexOf(gameState.trumpInfo.trumpSuit);
    }

    // Rotate the suit order so trump comes first (if trump suit exists)
    let rotatedOrder = [...standardSuitOrder];
    if (trumpIndex !== -1) {
      // Slice and rearrange the array to start with the trump suit
      rotatedOrder = [
        ...standardSuitOrder.slice(trumpIndex),
        ...standardSuitOrder.slice(0, trumpIndex)
      ];
    }

    // Add cards in the rotated order
    rotatedOrder.forEach(suitName => {
      if (suitMap[suitName]) {
        sortedHand.push(...suitMap[suitName]);
      }
    });

    // Group information for display - we'll set them but not show labels
    const getCardGroup = (card: Card): string => {
      if (card.joker) {
        return 'joker';
      }

      if (gameState && card.rank === gameState.trumpInfo.trumpRank) {
        return 'trump-rank';
      }

      if (gameState && card.suit === gameState.trumpInfo.trumpSuit) {
        return 'trump-suit';
      }

      return 'regular';
    };

    // Add grouping property to each card (doesn't affect the actual card objects in the game state)
    sortedHand.forEach((card, index) => {
      // Add visual grouping
      const currentGroup = getCardGroup(card);
      const prevGroup = index > 0 ? getCardGroup(sortedHand[index - 1]) : null;

      // Mark first card in each group
      if (currentGroup !== prevGroup) {
        (card as any).isGroupStart = true;
        (card as any).groupName = currentGroup;
      }
    });
  }

  // Display simple game screen
  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading game...</Text>
      </View>
    );
  }

  if (!gameState) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Failed to load game state</Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => setIsLoading(true)}
        >
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tractor Card Game</Text>
        <Text style={styles.subtitle}>Round: {gameState.roundNumber}</Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          Trump Rank: {gameState.trumpInfo.trumpRank}
          {gameState.trumpInfo.trumpSuit ? ` of ${gameState.trumpInfo.trumpSuit}` : ''}
        </Text>
        <Text style={styles.infoText}>
          Game Phase: {gameState.gamePhase}
        </Text>
        {isHumanTurn && (
          <Text style={styles.yourTurnText}>Your Turn!</Text>
        )}
      </View>


      {/* Table layout with players positioned around */}
      <View style={styles.tableContainer}>
        {/* Team status indicators in corners */}
        {gameState.teams.map(team => {
          const isDefending = team.isDefending;

          return (
            <View
              key={team.id}
              style={[
                styles.tableTeamIndicator,
                isDefending ? styles.tableDefendingTeam : styles.tableAttackingTeam,
                { [isDefending ? 'left' : 'right']: 10 } // Position defending on left, attacking on right
              ]}
            >
              <Text style={styles.tableTeamBadge}>Team {team.id}</Text>
              <Text style={styles.tableTeamRole}>
                {isDefending ? '🛡️ DEFENDING' : 'ATTACKING ⚔️'}
              </Text>
              <Text style={styles.tableTeamPoints}>
                {isDefending ? '\u00A0' : `PTS: ${team.points}`}
              </Text>
            </View>
          );
        })}
        {/* Top opponent */}
        <View style={styles.topPlayerPosition}>
          {gameState.players.map((player, index) => {
            // Find the 2nd AI player for the top position (you can adjust this logic)
            if (!player.isHuman && index === 2) {
              return (
                <View key={player.id} style={[
                  index === gameState.currentPlayerIndex && styles.highlightCurrentPlayer,
                  {
                    alignItems: 'center',
                    position: 'relative',
                    backgroundColor: 'transparent', // Ensure transparent background
                    paddingVertical: 15 // Add more spacing between elements
                  }
                ]}>
                  <Text
                    style={[
                      styles.playerNameText,
                      {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)', // Even darker background
                        position: 'relative', // Override absolute positioning
                        marginBottom: 8, // Add space below name
                        marginTop: 0, // No top margin
                        alignSelf: 'center',
                        textAlign: 'center',
                        paddingHorizontal: 6,
                        minWidth: 60,
                        borderRadius: 5
                      }
                    ]}
                  >{player.name}</Text>
                  {player.hand.length > 0 && (
                    <View
                      style={{
                        position: 'relative',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        marginBottom: 8, // Add space below cards
                        alignSelf: "center", // Center the cards horizontally
                        backgroundColor: 'transparent'
                      }}
                    >
                      {/* Render multiple cards up to max 10 - reversed stack order */}
                      {Array.from({ length: Math.min(10, player.hand.length) }).reverse().map((_, i) => (
                        <View
                          key={`card-top-${i}`}
                          shouldRasterizeIOS={true}
                          renderToHardwareTextureAndroid={true}
                          style={{
                            position: 'relative',
                            transform: [{ rotate: '180deg' }], // Rotate cards 180 degrees
                            zIndex: 10 - i, // Reversed z-index so newest cards appear on top
                            width: 40, // Reduced width
                            height: 60, // Reduced height
                            backgroundColor: 'transparent',
                            marginLeft: i === 0 ? 0 : -30, // Overlap cards (adjusted for reduced size)
                            // Improve rendering quality
                            backfaceVisibility: 'hidden',
                            shadowOpacity: 0,
                          }}
                        >
                          {renderMiniCardBack()}
                        </View>
                      ))}
                    </View>
                  )}
                  <Text
                    style={[
                      styles.cardCountText,
                      {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)', // Darker background
                        position: 'relative', // Override absolute positioning
                        marginTop: 0, // No top margin
                        alignSelf: 'center',
                        textAlign: 'center',
                        paddingHorizontal: 4,
                        minWidth: 50,
                        borderRadius: 5
                      }
                    ]}
                  >{player.hand.length}</Text>
                </View>
              );
            }
            return null;
          })}
        </View>

        {/* Subtle pattern overlay for table texture - add pointerEvents="none" to allow clicks to pass through */}
        <View style={styles.tableTextureOverlay} pointerEvents="none" />

        {/* Middle row with left player, play area, and right player */}
        <View style={styles.middleRow}>
          {/* Left opponent */}
          <View style={styles.leftPlayerPosition}>
            {gameState.players.map((player, index) => {
              // Find the 1st AI player for the left position
              if (!player.isHuman && index === 1) {
                return (
                  <View key={player.id} style={[
                    index === gameState.currentPlayerIndex && styles.highlightCurrentPlayer,
                    {
                      alignItems: 'center',
                      position: 'relative',
                      backgroundColor: 'transparent',
                      paddingVertical: 10 // Add more spacing between elements
                    }
                  ]}>
                    <Text
                      style={[
                        styles.playerNameText,
                        {
                          backgroundColor: 'rgba(0, 0, 0, 0.8)', // Even darker background
                          position: 'relative', // Override absolute positioning
                          marginBottom: 8, // Add space below name
                          marginTop: 0, // No top margin
                          alignSelf: 'center',
                          textAlign: 'center',
                          paddingHorizontal: 6,
                          minWidth: 60,
                          borderRadius: 5
                        }
                      ]}
                    >{player.name}</Text>
                    {player.hand.length > 0 && (
                      <View
                        style={{
                          position: 'relative',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          marginBottom: 8, // Add space below cards
                          alignSelf: "center", // Center the cards horizontally
                          backgroundColor: 'transparent'
                        }}
                      >
                        {/* Render multiple cards up to max 10 - reversed stack order */}
                        {Array.from({ length: Math.min(10, player.hand.length) }).reverse().map((_, i) => (
                          <View
                            key={`card-left-${i}`}
                            shouldRasterizeIOS={true}
                            renderToHardwareTextureAndroid={true}
                            style={{
                              position: 'relative',
                              zIndex: i, // Now newest cards (index 0) have highest z-index
                              width: 40, // Width of card (reduced size)
                              height: 60, // Height of card (reduced size)
                              backgroundColor: 'transparent',
                              marginTop: i === 0 ? 0 : -48, // Overlap cards vertically (adjusted for reduced size)
                              transform: [{ rotate: '90deg' }], // Rotate to face right
                              // Improve rendering quality
                              backfaceVisibility: 'hidden',
                              shadowOpacity: 0,
                            }}
                          >
                            {renderMiniCardBack()} {/* Use same renderer as top player */}
                          </View>
                        ))}
                      </View>
                    )}
                    <Text
                      style={[
                        styles.cardCountText,
                        {
                          backgroundColor: 'rgba(0, 0, 0, 0.8)', // Darker background
                          position: 'relative', // Override absolute positioning
                          marginTop: 0, // No top margin
                          alignSelf: 'center',
                          textAlign: 'center',
                          paddingHorizontal: 4,
                          minWidth: 50,
                          borderRadius: 5
                        }
                      ]}
                    >{player.hand.length}</Text>
                  </View>
                );
              }
              return null;
            })}
          </View>

          {/* Play area divided into four regions for cards from each player */}
          <View
            style={[styles.playArea, { backgroundColor: 'transparent' }]}
            accessibilityLabel="play-area"
          >
            {/* Top player area */}
            <View style={styles.playedCardTop}>
              {gameState.currentTrick?.plays.map((play, index) => {
                // Find if this play belongs to the top player (player index 2)
                if (play.playerId === gameState.players[2]?.id && play.cards.length > 0) {
                  return (
                    <View key={`top-play-${index}`}>
                      {renderCard(play.cards[0], false)}
                    </View>
                  );
                }
                return null;
              })}
            </View>

            {/* Left player area */}
            <View style={styles.playedCardLeft}>
              {gameState.currentTrick?.plays.map((play, index) => {
                // Find if this play belongs to the left player (player index 1)
                if (play.playerId === gameState.players[1]?.id && play.cards.length > 0) {
                  return (
                    <View key={`left-play-${index}`}>
                      {renderCard(play.cards[0], false)}
                    </View>
                  );
                }
                return null;
              })}
            </View>

            {/* Center area - for trump card or other game indicators */}
            {gameState.kittyCards.length > 0 && (
              <View style={[styles.kittyCardContainer, {opacity: 0.6}]}>
                {/* Render card at the same size as other cards */}
                {renderCard(gameState.kittyCards[0], false)}
              </View>
            )}

            {/* Right player area */}
            <View style={styles.playedCardRight}>
              {gameState.currentTrick?.plays.map((play, index) => {
                // Find if this play belongs to the right player (player index 3)
                if (play.playerId === gameState.players[3]?.id && play.cards.length > 0) {
                  return (
                    <View key={`right-play-${index}`}>
                      {renderCard(play.cards[0], false)}
                    </View>
                  );
                }
                return null;
              })}
            </View>

            {/* Bottom (human) player area */}
            <View style={styles.playedCardBottom}>
              {gameState.currentTrick?.plays.map((play, index) => {
                // Find if this play belongs to the human player (player index 0)
                if (play.playerId === 'player' && play.cards.length > 0) {
                  return (
                    <View key={`human-play-${index}`}>
                      {renderCard(play.cards[0], false)}
                    </View>
                  );
                }
                return null;
              })}
            </View>
          </View>

          {/* Right opponent */}
          <View style={styles.rightPlayerPosition}>
            {gameState.players.map((player, index) => {
              // Find the 3rd AI player for the right position
              if (!player.isHuman && index === 3) {
                return (
                  <View key={player.id} style={[
                    index === gameState.currentPlayerIndex && styles.highlightCurrentPlayer,
                    {
                      alignItems: 'center',
                      position: 'relative',
                      backgroundColor: 'transparent',
                      paddingVertical: 10 // Add more spacing between elements
                    }
                  ]}>
                    <Text
                      style={[
                        styles.playerNameText,
                        {
                          backgroundColor: 'rgba(0, 0, 0, 0.8)', // Even darker background
                          position: 'relative', // Override absolute positioning
                          marginBottom: 8, // Add space below name
                          marginTop: 0, // No top margin
                          alignSelf: 'center',
                          textAlign: 'center',
                          paddingHorizontal: 6,
                          minWidth: 60,
                          borderRadius: 5
                        }
                      ]}
                    >{player.name}</Text>
                    {player.hand.length > 0 && (
                      <View
                        style={{
                          position: 'relative',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          marginBottom: 8, // Add space below cards
                          alignSelf: "center", // Center the cards horizontally
                          backgroundColor: 'transparent'
                        }}
                      >
                        {/* Render multiple cards up to max 10 - normal stacking order */}
                        {Array.from({ length: Math.min(10, player.hand.length) }).map((_, i) => (
                          <View
                            key={`card-right-${i}`}
                            shouldRasterizeIOS={true}
                            renderToHardwareTextureAndroid={true}
                            style={{
                              position: 'relative',
                              zIndex: 10 - i, // Reverse z-index for proper stacking
                              width: 40, // Width of card (reduced size)
                              height: 60, // Height of card (reduced size)
                              backgroundColor: 'transparent',
                              marginTop: i === 0 ? 0 : -48, // Overlap cards vertically (adjusted for reduced size)
                              transform: [{ rotate: '270deg' }], // Rotate to face left
                              // Improve rendering quality
                              backfaceVisibility: 'hidden',
                              shadowOpacity: 0,
                            }}
                          >
                            {renderMiniCardBack()} {/* Use same renderer as top player */}
                          </View>
                        ))}
                      </View>
                    )}
                    <Text
                      style={[
                        styles.cardCountText,
                        {
                          backgroundColor: 'rgba(0, 0, 0, 0.8)', // Darker background
                          position: 'relative', // Override absolute positioning
                          marginTop: 0, // No top margin
                          alignSelf: 'center',
                          textAlign: 'center',
                          paddingHorizontal: 4,
                          minWidth: 50,
                          borderRadius: 5
                        }
                      ]}
                    >{player.hand.length}</Text>
                  </View>
                );
              }
              return null;
            })}
          </View>
        </View>

        {/* Bottom player (human) */}
        <View style={styles.bottomPlayerPosition}>
          {humanPlayer && (
            <View style={[styles.humanPlayerContainer, { backgroundColor: 'transparent' }]}>
              
              <View style={styles.cardsScrollContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={true}
                  indicatorStyle="white"
                  style={styles.cardsScrollView}
                  contentContainerStyle={{flexGrow: 1, justifyContent: 'center', paddingBottom: 8}}
                >
                  <View style={styles.humanCardRow}>
                    {sortedHand.map((card, index) => {
                      const isSelected = selectedCards.some(c => c.id === card.id);

                      return (
                        <View
                          key={card.id}
                          accessibilityLabel={`card-${card.id}`}
                          style={[
                            styles.cardContainer,
                            {
                              marginLeft: index === 0 ? 0 : -40, // Tighter stacking
                              // Vertical movement for selection without popping out
                              transform: [
                                { translateY: isSelected ? -10 : 0 } // Raised when selected
                              ],
                              zIndex: 10 + index, // Maintain consistent z-index based on card order
                              // Apply same rendering optimizations for consistency
                              backfaceVisibility: 'hidden',
                              shadowOpacity: isSelected ? 0.3 : 0, // Keep shadow for selected cards
                            }
                          ]}
                        >
                          {renderCard(
                            card,
                            isSelected,
                            showCardBacks
                          )}
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              <View style={styles.buttonContainer}>
                <View style={{flexDirection: 'row', justifyContent: 'flex-end', width: '100%', paddingHorizontal: 20}}>
                  {isHumanTurn && selectedCards.length > 0 && (
                    <TouchableOpacity
                      style={[styles.playButton, {marginRight: 10}]}
                      onPress={() => {
                      // Use React Native screens measures for animations
                      // Calculate human player card position in the play area (bottom side of table)
                      const humanPlayPos = {
                        x: width / 2 - 32.5, // Center horizontally
                        y: height / 2 + 40   // Position lower in the play area (closer to human)
                      };

                      // Position from bottom of screen (human hand area)
                      const startPos = {
                        x: width / 2 - 32.5,
                        y: height - 150
                      };

                      // Animate the selected card to the human player's play position
                      animateCardPlay(
                        selectedCards[0],
                        startPos.x,
                        startPos.y,
                        humanPlayPos.x,
                        humanPlayPos.y,
                        0 // no rotation
                      );

                      // After animation completes, show a more detailed alert
                      setTimeout(() => {
                        // Determine the played card information
                        const cardDescriptions = selectedCards.map(card => {
                          if (card.joker) {
                            return `${card.joker} Joker`;
                          } else {
                            return `${card.rank} of ${card.suit}`;
                          }
                        }).join(', ');

                        // Log card played without showing alert
                        console.log(`Card played: ${cardDescriptions}`);

                        // Update game state to track played cards
                        if (gameState && gameState.currentTrick) {
                          const updatedGameState = { ...gameState };
                          const currentTrick = updatedGameState.currentTrick;

                          if (currentTrick) {
                            // If this is the first card played in the trick, it becomes the leading card
                            if (currentTrick.plays.length === 0) {
                              currentTrick.leadingCombo = [selectedCards[0]];
                            }

                            // Add this card to the trick's plays
                            currentTrick.plays.push({
                              playerId: 'player', // Human player ID
                              cards: [selectedCards[0]]
                            });
                          }

                          // Update game state - in a real game, you'd move to the next player's turn
                          setGameState(updatedGameState);
                        }

                        setSelectedCards([]);
                      }, 750); // Reduced delay for better responsiveness
                    }}
                  >
                    <Text style={styles.playButtonText}>
                      Play {selectedCards.length} Card{selectedCards.length !== 1 ? 's' : ''}
                    </Text>
                  </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.flipButton}
                    onPress={() => setShowCardBacks(!showCardBacks)}
                  >
                    <Text style={styles.flipButtonText}>
                      {showCardBacks ? "Show Faces" : "Show Backs"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Debug button removed */}

      {/* Animated card during transitions */}
      {animatingCard && animatingCard.card && (
        <Animated.View
          shouldRasterizeIOS={true}
          renderToHardwareTextureAndroid={true}
          style={[
            styles.cardTransition,
            {
              left: animatingCard.startX,
              top: animatingCard.startY,
              transform: [
                { translateX: cardPositionX },
                { translateY: cardPositionY },
                { rotate: cardRotation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg']
                })},
                { scale: cardScale }
              ],
              opacity: cardOpacity,
              // Apply rendering optimizations to animated cards for smoother motion
              backfaceVisibility: 'hidden',
              shadowOpacity: 0
            }
          ]}
        >
          {renderCard(animatingCard.card, false)}
        </Animated.View>
      )}

      {renderTrumpDeclarationModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
  errorText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
    color: 'red',
  },
  header: {
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#3F51B5',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: '#E8EAF6',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    alignItems: 'center',
    maxWidth: 300,
    alignSelf: 'center',
    width: '100%',
  },
  infoText: {
    fontSize: 14,
    marginBottom: 5,
    textAlign: 'center',
  },
  yourTurnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 5,
    textAlign: 'center',
  },
  tableTeamIndicator: {
    position: 'absolute',
    top: 10,
    padding: 6,
    borderRadius: 8,
    zIndex: 10,
    maxWidth: 120,
    opacity: 0.8,
  },
  tableDefendingTeam: {
    backgroundColor: 'rgba(46, 125, 50, 0.7)', // Darker green with semi-transparency
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  tableAttackingTeam: {
    backgroundColor: 'rgba(230, 81, 0, 0.7)', // Darker orange with semi-transparency
    borderColor: '#FF9800',
    borderWidth: 1,
  },
  tableTeamBadge: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  tableTeamRole: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  tableTeamPoints: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  // Enhanced table layout styles
  tableContainer: {
    flex: 1,
    justifyContent: 'space-between',
    marginTop: 5,
    borderRadius: 24,
    backgroundColor: '#0B4619', // Richer green for card table
    borderWidth: 6,
    borderColor: '#1B651E', // Border with subtle contrast
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    // Adjust padding based on screen size
    paddingVertical: height < 700 ? 12 : 18,
    paddingHorizontal: width < 380 ? 10 : 18,
    minHeight: height * 0.62, // Slightly more space for the table
    // Add subtle texture pattern
    position: 'relative',
    overflow: 'hidden',
  },
  // Top player
  topPlayerPosition: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    backgroundColor: 'transparent',
    // No border
  },
  topPlayer: {
    minWidth: 250,
    width: 'auto',
    maxWidth: '80%',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: 'transparent',
  },
  // Middle row with left, center, right
  middleRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftPlayerPosition: {
    width: '25%',
    alignItems: 'center',
    paddingRight: 8, // More space between left player and play area
    backgroundColor: 'transparent',
    // No border
    marginRight: 4,
  },
  leftPlayer: {
    alignItems: 'center',
    width: 100, // Wider to fit rotated cards
    paddingHorizontal: 10,
    paddingVertical: 15,
    maxHeight: 350, // Significantly increased for more cards
    backgroundColor: 'transparent',
  },
  playArea: {
    width: '50%',
    height: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
    position: 'relative',
    // Create four distinct areas for cards played by each player
    padding: 10,
  },
  playedCardTop: {
    position: 'absolute',
    top: '10%',
    alignSelf: 'center',
  },
  playedCardLeft: {
    position: 'absolute',
    left: '10%',
    alignSelf: 'center',
  },
  playedCardRight: {
    position: 'absolute',
    right: '10%',
    alignSelf: 'center',
  },
  playedCardBottom: {
    position: 'absolute',
    bottom: '10%',
    alignSelf: 'center',
  },
  kittyCardContainer: {
    transform: [{ scale: 1.0 }], // Don't scale down, keep same size as other cards
    backgroundColor: 'transparent',
    // No border
  },
  rightPlayerPosition: {
    width: '25%',
    alignItems: 'center',
    paddingLeft: 8, // More space between right player and play area
    backgroundColor: 'transparent',
    // No border
    marginLeft: 4,
  },
  rightPlayer: {
    alignItems: 'center',
    width: 100, // Wider to fit rotated cards
    paddingHorizontal: 10,
    paddingVertical: 15,
    maxHeight: 350, // Significantly increased for more cards
    backgroundColor: 'transparent',
  },
  // Bottom player
  bottomPlayerPosition: {
    width: '100%',
    marginTop: 12,
    backgroundColor: 'transparent',
    // No border
    paddingTop: 8,
    // No shadow
  },
  humanPlayerContainer: {
    width: '100%',
    backgroundColor: 'transparent',
  },
  // Player styling
  highlightCurrentPlayer: {
    backgroundColor: 'rgba(255, 193, 7, 0.08)', // Very subtle yellow background
    borderRadius: 16,
    padding: 10,
    // Enhanced glow effect
    shadowColor: '#FFC107',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 18,
    elevation: 10,
    // Add border for current player
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
  },
  playerNameText: {
    fontSize: 12, // Smaller font size
    fontWeight: 'bold',
    textAlign: 'center',
    color: 'white', // White text on green table background
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8, // Reduced padding
    paddingVertical: 3, // Reduced padding
    borderRadius: 8, // Smaller radius
    overflow: 'hidden',
    position: 'absolute', // Position absolutely to prevent overlap
    zIndex: 10, // Ensure it's above cards
    // No border
    // Improved shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  // Top player name style no longer needed - using inline styles
  // Left and right player name styles no longer needed - using inline styles
  cardCountText: {
    fontSize: 10, // Smaller font size
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 6, // Reduced padding
    paddingVertical: 1, // Reduced padding
    borderRadius: 6, // Smaller radius
    position: 'absolute',
    zIndex: 10,
  },
  // Top card count style no longer needed - using inline styles
  // Left and right card count styles no longer needed - using inline styles
  // Card layouts
  cardRowHorizontal: {
    flexDirection: 'row',
    justifyContent: 'center',
    height: 105, // Increased for larger cards
    width: 250, // Wider to accommodate larger cards
    position: 'relative', // For absolute positioning of stacked cards
    marginVertical: 10,
    marginLeft: -25, // Adjust position to center the spread cards
    backgroundColor: 'transparent', // Ensure transparency
  },
  cardColumnVertical: {
    flexDirection: 'column',
    alignItems: 'center',
    width: 105, // Increased for larger cards
    height: 250, // Taller to accommodate larger cards
    position: 'relative', // For absolute positioning of stacked cards
    marginVertical: 10,
    marginTop: -25, // Adjust position to center the spread
    backgroundColor: 'transparent', // Ensure transparency
  },
  miniCardContainer: {
    width: 50, // Smaller width for AI cards (down from 65)
    height: 75, // Smaller height for AI cards (down from 95)
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.2, // Exact match to card style
    shadowRadius: 2,
    elevation: 3,
    borderWidth: 0, // Remove border
    borderRadius: 6, // Slightly smaller border radius to match
    backgroundColor: 'transparent', // Make background transparent
    margin: 0, // Remove margin
    padding: 0, // Remove padding
  },
  miniCardVertical: {
    // No default transform - will be applied in the component
    width: 50, // Width of card for side players
    height: 75, // Height of card for side players
    marginHorizontal: 0, // Remove margins for better alignment
    marginVertical: 0, // Remove margins for better alignment
    zIndex: 1, // Help with stacking appearance
  },
  cardsScrollContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: 'transparent',
    // Simple padding with no border
    paddingVertical: 5,
    overflow: 'visible', // Allow cards to be visible outside container
  },
  cardsScrollView: {
    height: 120, // Slightly increased height for raised cards
    width: '100%',
    backgroundColor: 'transparent',
    // Add horizontal fade effect containers at edges
    paddingHorizontal: 10,
    paddingTop: 5, // Add top padding for raised cards
  },
  humanCardRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    height: 105, // Slightly taller for raised cards
    alignItems: 'flex-end',
    justifyContent: 'center', // Center the cards horizontally
    backgroundColor: 'transparent',
    overflow: 'visible', // Allow cards to be visible outside container
  },
  cardContainer: {
    zIndex: 1,
    marginLeft: -40, // Tight stacking for compact display
    // To handle the touch events properly
    height: 95, // Match card height
    width: 65, // Match card width
  },
  // Card styles (existing)
  card: {
    width: 65,
    height: 95,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    margin: 2,
    padding: 5,
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.15, // Reduced shadow opacity for better rendering
    shadowRadius: 2,
    elevation: 2, // Reduced elevation for better rendering
    overflow: 'hidden',
    // Added rendering optimizations
    backfaceVisibility: 'hidden',
  },
  selectedCard: {
    borderColor: '#3F51B5',
    borderWidth: 2.5, // Slightly thicker border
    backgroundColor: '#E8EAF6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4, // Increased opacity
    shadowRadius: 5, // Larger shadow
    elevation: 8, // Increased elevation
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 2,
    width: '100%',
  },
  rankSuitPair: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  rankSuitPairInverted: {
    flexDirection: 'column',
    alignItems: 'center',
    transform: [{ rotate: '180deg' }],
  },
  miniIndicator: {
    fontSize: 10,
    marginRight: 2,
  },
  cardCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardFooter: {
    alignItems: 'flex-end',
    marginTop: 2,
  },
  cardRank: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  suitSymbolLarge: {
    fontSize: 30,
    fontWeight: 'bold',
  },
  suitSymbolSmall: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Simple card back styles
  cardBackSimple: {
    flex: 1,
    backgroundColor: '#1A4B84', // Deep blue background
    borderRadius: 6,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  gridPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.25)', // Subtle white lines
    alignSelf: 'center',
  },
  cardWhiteBorder: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 1)', // Solid white border
    borderRadius: 4, // Slightly smaller radius for cleaner look
    zIndex: 5, // Higher z-index to be on top
  },
  miniCardWhiteBorder: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    borderWidth: 1.5, // Thinner for mini cards
    borderColor: 'rgba(255, 255, 255, 1)', // Solid white border
    borderRadius: 4, // Same border radius as main cards for consistency
    zIndex: 5, // Higher z-index to be on top
  },
  patternContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  // We kept only the necessary styles for the new simple pattern
  centerEmblem: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 28, // Smaller for AI cards
    height: 28, // Smaller for AI cards
    borderRadius: 14, // Half of width/height
    backgroundColor: 'white',
    marginTop: -14, // Half of height
    marginLeft: -14, // Half of width
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(126, 211, 255, 0.8)', // Light blue border
    zIndex: 10,
  },
  centerEmblemText: {
    fontSize: 16, // Smaller for AI cards
    fontWeight: 'bold',
    color: '#1A4B84', // Match background color
    textAlign: 'center',
    textAlignVertical: 'center', // For Android
    includeFontPadding: false, // For more precise centering
    lineHeight: 20, // Adjust to match font size more closely
    paddingBottom: 2, // Small adjustment to visually center
  },
  // Animation styles for card transitions - enhanced for better rendering
  cardTransition: {
    position: 'absolute',
    width: 65,
    height: 95,
    zIndex: 100,
    backgroundColor: 'transparent',
    backfaceVisibility: 'hidden',
    // Apply shadow optimizations
    shadowColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  // Table texture effect - with pointerEvents set to none to allow interactions to pass through
  tableTextureOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.05, // Reduced opacity
    zIndex: 1,
    backgroundColor: 'transparent',
    // No borders or gradient pattern
    // Critical fix to allow touch events to pass through
    pointerEvents: 'none',
  },
  // Mini card back styles - smaller size for AI players
  stackedCardBack: {
    width: '100%', // Use 100% to fill container width
    height: '100%', // Use 100% to fill container height
    backgroundColor: 'transparent', // Make background transparent
    borderRadius: 6, // Slightly smaller border radius
    borderWidth: 0, // Remove border
    margin: 0, // Remove margin
    padding: 0, // Remove padding
    shadowColor: 'transparent', // Remove shadow for better rendering
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0, // Remove elevation for cleaner rendering
    overflow: 'hidden',
    // Additional optimizations for crisp rendering
    backfaceVisibility: 'hidden',
  },
  // Removed unused mini diamond styles - now using main diamond pattern styles for all cards
  // UI components
  handHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3, // Reduced margin
    backgroundColor: 'transparent',
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
    paddingHorizontal: 2, // Added minimal padding
    paddingVertical: 0, // No vertical padding
  },
  flipButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: 6,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  flipButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  buttonContainer: {
    height: 50, // Reduced height
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5, // Slightly increased margin
    marginBottom: 5, // Added bottom margin
    backgroundColor: 'transparent',
    paddingVertical: 0, // No padding
  },
  playButton: {
    backgroundColor: '#B71C1C', // Deeper red for better contrast
    paddingVertical: 8, // Reduced vertical padding
    paddingHorizontal: 25, // Reduced horizontal padding
    borderRadius: 24, // Slightly less rounded button
    // Enhanced shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 6,
    borderWidth: 1, // Thinner border
    borderColor: 'rgba(255, 255, 255, 0.3)',
    // Reduced margins
    marginTop: 0,
    marginBottom: 0,
  },
  playButtonText: {
    color: 'white',
    fontSize: 14, // Smaller font size
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  debugButton: {
    backgroundColor: '#9E9E9E',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 5,
    alignSelf: 'center',
  },
  debugButtonText: {
    color: 'white',
    fontSize: 12,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: '80%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#303F9F',
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
    width: 70,
    height: 70,
    margin: 8,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  suitSymbol: {
    fontSize: 30,
    marginBottom: 5,
  },
  suitText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  skipButton: {
    backgroundColor: '#EEEEEE',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  skipText: {
    fontSize: 14,
    color: '#757575',
  },
  button: {
    backgroundColor: '#3F51B5',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 20,
    alignSelf: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SimpleGameScreen;