import React from "react";
import { Card as CardType, Player, PlayerId, TrumpInfo } from "../types/game";
import AIHandAnimated from "./AIHandAnimated";
import HumanHandAnimated from "./HumanHandAnimated";

interface PlayerHandAnimatedProps {
  player: Player;
  isCurrentPlayer: boolean;
  selectedCards: CardType[];
  onCardSelect?: (card: CardType) => void;
  onPlayCards?: () => void;
  showCards: boolean;
  trumpInfo: TrumpInfo;
  canPlay?: boolean;
}

const PlayerHandAnimated: React.FC<PlayerHandAnimatedProps> = ({
  player,
  isCurrentPlayer,
  selectedCards,
  onCardSelect,
  onPlayCards,
  showCards,
  trumpInfo,
  canPlay = false,
}) => {
  if (player.isHuman) {
    return (
      <HumanHandAnimated
        player={player}
        isCurrentPlayer={isCurrentPlayer}
        selectedCards={selectedCards}
        onCardSelect={onCardSelect}
        onPlayCards={onPlayCards}
        trumpInfo={trumpInfo}
        canPlay={canPlay}
      />
    );
  } else {
    // Determine AI position based on player id
    // Swapped positions for counter-clockwise rotation
    const position =
      player.id === PlayerId.Bot2
        ? "top"
        : player.id === PlayerId.Bot3
          ? "left"
          : "right";

    return (
      <AIHandAnimated
        player={player}
        trumpInfo={trumpInfo}
        isCurrentPlayer={isCurrentPlayer}
        position={position}
      />
    );
  }
};

export default PlayerHandAnimated;
