import {
  Card,
  GameContext,
  GameState,
  PlayableSuit,
  PlayerId,
  Rank,
  Suit,
  TrumpInfo,
  getPartnerId,
} from "../../types";
import { isBiggestInSuit, isTrump } from "../../game/cardValue";

export interface DecomposedTrumpGroup {
  bosses: Card[];
  tractors: Card[][];
  pairs: Card[][];
  middles: Card[];
  lows: Card[];
}

export interface DecomposedOffSuit {
  suit: PlayableSuit;
  bosses: Card[];
  tractors: Card[][];
  pairs: Card[][];
  singles: Card[];
}

export interface DecomposedHand {
  trump: DecomposedTrumpGroup;
  offSuits: Record<PlayableSuit, DecomposedOffSuit>;
}

const formatCard = (card: Card): string => {
  const ptStr = card.points > 0 ? ` (${card.points}pt)` : "";
  return `${card.toString()}${ptStr}`;
};

const formatCardsList = (cards: Card[]): string =>
  cards.map(formatCard).join(", ");

const formatPairList = (pairs: Card[][]): string =>
  pairs.map((pair) => `[${pair.map(formatCard).join(", ")}]`).join(", ");

/**
 * Decomposes a player's hand into structural components:
 * - Trumps: Bosses (Jokers, Trump Ranks), Combos (Pairs/Tractors), Middles, Lows
 * - Off-suits: Bosses (unbeatable), Combos (Pairs/Tractors), Singles
 *
 * Strictly pure facts and card groupings — ZERO strategic opinion.
 */
export function decomposeHand(
  hand: Card[],
  trumpInfo: TrumpInfo,
): DecomposedHand {
  const playableSuits: PlayableSuit[] = [
    Suit.Spades,
    Suit.Hearts,
    Suit.Clubs,
    Suit.Diamonds,
  ].filter((s) => s !== trumpInfo.trumpSuit) as PlayableSuit[];

  // 1. Separate Trump vs Off-Suit cards
  const trumpCards = hand.filter((c) => isTrump(c, trumpInfo));
  const offSuitCards = hand.filter((c) => !isTrump(c, trumpInfo));

  // 2. Process Trump Group
  const trumpBosses: Card[] = [];
  const trumpMiddles: Card[] = [];
  const trumpLows: Card[] = [];
  const trumpPairs: Card[][] = [];

  // Group trump cards by rank/identity to find pairs
  const trumpCounts = new Map<string, Card[]>();
  for (const c of trumpCards) {
    const key = c.toString();
    const existing = trumpCounts.get(key);
    if (existing) {
      existing.push(c);
    } else {
      trumpCounts.set(key, [c]);
    }
  }

  const trumpSingles: Card[] = [];
  for (const [, cards] of trumpCounts) {
    if (cards.length >= 2) {
      trumpPairs.push(cards.slice(0, 2));
      if (cards.length > 2) {
        trumpSingles.push(...cards.slice(2));
      }
    } else {
      trumpSingles.push(...cards);
    }
  }

  for (const c of trumpSingles) {
    const isJoker = c.joker !== undefined;
    const isRankTrump = c.rank === trumpInfo.trumpRank;
    const isTrumpAce = c.suit === trumpInfo.trumpSuit && c.rank === Rank.Ace;

    if (isJoker || isRankTrump || isTrumpAce) {
      trumpBosses.push(c);
    } else if (
      c.rank === Rank.King ||
      c.rank === Rank.Queen ||
      c.rank === Rank.Jack ||
      c.rank === Rank.Ten
    ) {
      trumpMiddles.push(c);
    } else {
      trumpLows.push(c);
    }
  }

  // 3. Process Off-Suits
  const offSuitsResult: Partial<Record<PlayableSuit, DecomposedOffSuit>> = {};

  for (const suit of playableSuits) {
    const cardsInSuit = offSuitCards.filter((c) => c.suit === suit);
    const suitBosses: Card[] = [];
    const suitPairs: Card[][] = [];
    const suitSingles: Card[] = [];

    const counts = new Map<string, Card[]>();
    for (const c of cardsInSuit) {
      const key = c.toString();
      const existing = counts.get(key);
      if (existing) {
        existing.push(c);
      } else {
        counts.set(key, [c]);
      }
    }

    for (const [, cards] of counts) {
      if (cards.length >= 2) {
        suitPairs.push(cards.slice(0, 2));
        if (cards.length > 2) {
          suitSingles.push(...cards.slice(2));
        }
      } else {
        suitSingles.push(...cards);
      }
    }

    for (const c of suitSingles) {
      if (isBiggestInSuit(c, trumpInfo)) {
        suitBosses.push(c);
      }
    }

    // Remaining non-boss singles
    const nonBossSingles = suitSingles.filter(
      (c) => !suitBosses.some((b) => b.id === c.id),
    );

    offSuitsResult[suit] = {
      suit,
      bosses: suitBosses,
      tractors: [],
      pairs: suitPairs,
      singles: nonBossSingles,
    };
  }

  return {
    trump: {
      bosses: trumpBosses,
      tractors: [],
      pairs: trumpPairs,
      middles: trumpMiddles,
      lows: trumpLows,
    },
    offSuits: offSuitsResult as Record<PlayableSuit, DecomposedOffSuit>,
  };
}

/**
 * Builds the ultra-compact perception text block for prompt consumption.
 * (<150 tokens)
 */
export function formatPerceptionBlock(
  gameState: GameState,
  playerId: PlayerId,
  hand: Card[],
  trumpInfo: TrumpInfo,
  gameContext: GameContext,
): string {
  const decomposed = decomposeHand(hand, trumpInfo);
  const partnerId = getPartnerId(playerId);
  const currentPlayer = gameState.players.find((p) => p.id === playerId);
  const teamId = currentPlayer?.team || "A";
  const isAttacking = gameContext.isAttackingTeam;
  const currentPts = gameContext.currentPoints;

  // Format Trump Group
  const trumpParts: string[] = [];
  if (decomposed.trump.bosses.length > 0) {
    trumpParts.push(`Bosses: [${formatCardsList(decomposed.trump.bosses)}]`);
  }
  if (decomposed.trump.pairs.length > 0) {
    trumpParts.push(`Pairs: ${formatPairList(decomposed.trump.pairs)}`);
  }
  if (decomposed.trump.middles.length > 0) {
    trumpParts.push(`Middles: [${formatCardsList(decomposed.trump.middles)}]`);
  }
  if (decomposed.trump.lows.length > 0) {
    trumpParts.push(`Lows: [${formatCardsList(decomposed.trump.lows)}]`);
  }
  const trumpLine =
    trumpParts.length > 0
      ? `Trump (${trumpInfo.trumpSuit || "None"} Rank ${trumpInfo.trumpRank}): ${trumpParts.join(" · ")}`
      : `Trump: None (void)`;

  // Format Off-Suits
  const offSuitLines: string[] = [];
  const playableSuits: PlayableSuit[] = [
    Suit.Spades,
    Suit.Hearts,
    Suit.Clubs,
    Suit.Diamonds,
  ].filter((s) => s !== trumpInfo.trumpSuit) as PlayableSuit[];

  for (const s of playableSuits) {
    const data = decomposed.offSuits[s];
    const parts: string[] = [];
    if (data.bosses.length > 0) {
      parts.push(`Bosses: [${formatCardsList(data.bosses)}]`);
    }
    if (data.pairs.length > 0) {
      parts.push(`Pairs: ${formatPairList(data.pairs)}`);
    }
    if (data.singles.length > 0) {
      parts.push(`Singles: [${formatCardsList(data.singles)}]`);
    }
    if (parts.length > 0) {
      offSuitLines.push(`${s}: ${parts.join(" · ")}`);
    } else {
      offSuitLines.push(`${s}: Void`);
    }
  }

  // Format Seating & Table
  const currentTrick = gameState.currentTrick;
  const isLeading = !currentTrick || currentTrick.plays.length === 0;
  const winnerAnalysis = gameContext.trickWinnerAnalysis;

  let trickStatus = "";
  if (isLeading) {
    trickStatus = "Trick Status: You have the lead (Opening Trick).";
  } else if (currentTrick && winnerAnalysis) {
    const playsStr = currentTrick.plays
      .map((p) => `${p.playerId} played [${formatCardsList(p.cards)}]`)
      .join(", ");
    const seatNum = currentTrick.plays.length + 1;
    const winnerName = winnerAnalysis.isTeammateWinning
      ? `${winnerAnalysis.currentWinner} (Teammate)`
      : `${winnerAnalysis.currentWinner} (Opponent)`;

    trickStatus = [
      `Trick Status: ${playsStr}`,
      `Your Seat: ${seatNum} of 4 | Current Winner: ${winnerName} | Table Points: ${winnerAnalysis.trickPoints} pts`,
    ].join("\n");
  }

  // Format Voids
  const memory = gameContext.memoryContext;
  const voidEntries = Object.entries(memory.playerMemories)
    .filter(([, pm]) => pm.suitVoids.size > 0 || pm.trumpVoid)
    .map(([pId, pm]) => {
      const suits = Array.from(pm.suitVoids).join(", ");
      const trStr = pm.trumpVoid ? "Trump" : "";
      const allVoids = [suits, trStr].filter(Boolean).join(", ");
      return `${pId} void in [${allVoids}]`;
    });
  const voidStr =
    voidEntries.length > 0 ? `Confirmed Voids: ${voidEntries.join(" | ")}` : "";

  return [
    `=== MATCH SITUATION ===`,
    `Role: Team ${teamId} (${isAttacking ? "Attackers — need 80 pts" : "Defenders — keep attackers under 80"}) | Current Score: ${currentPts} pts | Teammate: ${partnerId}`,
    trickStatus,
    voidStr,
    `\n=== YOUR STRUCTURED HAND ===`,
    trumpLine,
    ...offSuitLines,
  ]
    .filter(Boolean)
    .join("\n");
}
