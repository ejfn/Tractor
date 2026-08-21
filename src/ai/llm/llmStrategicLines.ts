import {
  Card,
  GameContext,
  GameState,
  getPartnerId,
  PlayableSuit,
  PlayerId,
  Suit,
  TrumpInfo,
} from "../../types";
import {
  calculateCardStrategicValue,
  isBiggestInSuit,
  isTrump,
} from "../../game/cardValue";
import {
  canBeatCombo,
  getCurrentWinningCombo,
} from "../../game/cardComparison";
import {
  CandidateLead,
  detectCandidateLeads,
} from "../leading/candidateLeadDetection";
import { collectLeadingContext } from "../leading/leadingContext";
import { scoreNonTrumpLead, scoreTrumpLead } from "../leading/leadingScoring";
import { analyzeSuitAvailability } from "../following/suitAvailabilityAnalysis";
import { selectStrategicDisposal } from "../following/strategicSelection";
import { handleEnoughRemainingScenario } from "../following/sameSuitDecision";
import { handleInsufficientScenario } from "../following/crossSuitDecision";

export type StrategicLineId = "A" | "B" | "C" | "D";

export type StrategicLineIntent =
  | "cash_winner"
  | "develop_suit"
  | "safe_exit"
  | "trump_control"
  | "ruff_win"
  | "feed_points"
  | "dump_trash"
  | "overtake_win"
  | "duck_low";

export interface StrategicLine {
  id: StrategicLineId;
  intent: StrategicLineIntent;
  label: string;
  description: string;
  cards: Card[];
  pointsAtStake: number;
  isGuaranteedWinner: boolean;
}

const formatCardList = (cards: Card[]): string =>
  cards.map((c) => c.toString()).join(" ");

const formatPlayLabel = (cards: Card[]): string =>
  cards.length > 1 ? `[${formatCardList(cards)}]` : formatCardList(cards);

const sumPoints = (cards: Card[]): number =>
  cards.reduce((sum, c) => sum + c.points, 0);

/**
 * Generates max 3–4 non-dominated Strategic Lines for a Leading turn.
 */
export function generateLeadingLines(
  gameState: GameState,
  hand: Card[],
  playerId: PlayerId,
  trumpInfo: TrumpInfo,
  gameContext: GameContext,
): StrategicLine[] {
  const candidates = detectCandidateLeads(hand, gameState, playerId, trumpInfo);
  if (candidates.length === 0) {
    if (hand.length === 0) return [];
    return [
      {
        id: "A",
        intent: "safe_exit",
        label: `Play ${hand[0].toString()}`,
        description: "Only available card in hand",
        cards: [hand[0]],
        pointsAtStake: hand[0].points,
        isGuaranteedWinner: false,
      },
    ];
  }

  const leadingContext = collectLeadingContext(gameState, playerId);
  const partnerId = getPartnerId(playerId);
  const memory = gameContext.memoryContext;

  // 1. Group candidates by strategic category
  const cashCandidates: CandidateLead[] = [];
  const developCandidates: CandidateLead[] = [];
  const exitCandidates: CandidateLead[] = [];
  const trumpCandidates: CandidateLead[] = [];

  for (const cand of candidates) {
    const isTr = cand.metadata.isTrump;
    const isUnbeatable = cand.metadata.isUnbeatable;
    const card = cand.cards[0];
    const isBoss =
      !isTr && cand.cards.length === 1 && isBiggestInSuit(card, trumpInfo);

    if (isTr) {
      trumpCandidates.push(cand);
    } else if (isUnbeatable || isBoss) {
      cashCandidates.push(cand);
    } else if (cand.cards.length > 1) {
      developCandidates.push(cand);
    } else {
      // Non-trump singles: check if suit length >= 4 (develop) or weak (exit)
      const suitLength = hand.filter(
        (c) => c.suit === card.suit && !isTrump(c, trumpInfo),
      ).length;
      if (suitLength >= 4) {
        developCandidates.push(cand);
      } else {
        exitCandidates.push(cand);
      }
    }
  }

  const lines: Omit<StrategicLine, "id">[] = [];

  // Line Archetype 1: CASH_WINNER
  if (cashCandidates.length > 0) {
    // Sort cash candidates: Multi-combo / tractor / pair > singles, then higher points
    const bestCash = [...cashCandidates].sort((a, b) => {
      if (a.cards.length !== b.cards.length) {
        return b.cards.length - a.cards.length;
      }
      if (a.metadata.points !== b.metadata.points) {
        return b.metadata.points - a.metadata.points;
      }
      return (
        calculateCardStrategicValue(b.cards[0], trumpInfo, "basic") -
        calculateCardStrategicValue(a.cards[0], trumpInfo, "basic")
      );
    })[0];

    const pts = bestCash.metadata.points;
    const ptDesc = pts > 0 ? `, claims ${pts} pts` : "";
    lines.push({
      intent: "cash_winner",
      label: `Cash Boss ${formatPlayLabel(bestCash.cards)}`,
      description: `Guaranteed trick winner${ptDesc}; retains lead and control`,
      cards: bestCash.cards,
      pointsAtStake: pts,
      isGuaranteedWinner: true,
    });
  }

  // Line Archetype 2: ATTACK_DEVELOP_SUIT
  if (developCandidates.length > 0) {
    // Score non-trump leads to find the best development candidate
    const scoredDevelop = developCandidates.map((c) => ({
      candidate: c,
      score: scoreNonTrumpLead(c, trumpInfo, leadingContext).score,
    }));
    scoredDevelop.sort((a, b) => b.score - a.score);
    const bestDevelop = scoredDevelop[0].candidate;

    const suit = bestDevelop.metadata.suit;
    lines.push({
      intent: "develop_suit",
      label: `Attack ${suit} with ${formatPlayLabel(bestDevelop.cards)}`,
      description: `Pressures opponents' ${suit}; forces trumps or bleeds stoppers`,
      cards: bestDevelop.cards,
      pointsAtStake: bestDevelop.metadata.points,
      isGuaranteedWinner: false,
    });
  }

  // Line Archetype 3: SAFE_EXIT_FEED
  if (exitCandidates.length > 0) {
    // Check if teammate is confirmed void in any suit
    const partnerVoidSuits =
      memory.playerMemories[partnerId]?.suitVoids ?? new Set();
    const feedCandidate = exitCandidates.find(
      (c) =>
        c.metadata.suit !== Suit.None &&
        partnerVoidSuits.has(c.metadata.suit as PlayableSuit) &&
        c.metadata.points === 0,
    );

    const bestExit =
      feedCandidate ||
      [...exitCandidates].sort((a, b) => {
        // Prefer 0 points, then lower rank
        if (a.metadata.points !== b.metadata.points) {
          return a.metadata.points - b.metadata.points;
        }
        return (
          calculateCardStrategicValue(a.cards[0], trumpInfo, "basic") -
          calculateCardStrategicValue(b.cards[0], trumpInfo, "basic")
        );
      })[0];

    const isPartnerVoid =
      bestExit.metadata.suit !== Suit.None &&
      partnerVoidSuits.has(bestExit.metadata.suit as PlayableSuit);
    const desc = isPartnerVoid
      ? `Feeds partner's void in ${bestExit.metadata.suit}; passes lead at 0 pt risk`
      : `Safely passes lead in ${bestExit.metadata.suit}; risks ${bestExit.metadata.points} pts`;

    lines.push({
      intent: "safe_exit",
      label: `Safe Exit with ${formatPlayLabel(bestExit.cards)}`,
      description: desc,
      cards: bestExit.cards,
      pointsAtStake: bestExit.metadata.points,
      isGuaranteedWinner: false,
    });
  }

  // Line Archetype 4: TRUMP_CONTROL
  if (trumpCandidates.length > 0) {
    const scoredTrumps = trumpCandidates.map((c) => ({
      candidate: c,
      score: scoreTrumpLead(c, trumpInfo, leadingContext).score,
    }));
    scoredTrumps.sort((a, b) => b.score - a.score);
    const bestTrump = scoredTrumps[0].candidate;

    // Pick top trump candidate
    const isPair = bestTrump.cards.length > 1;
    const label = isPair
      ? `Draw Trumps with ${formatPlayLabel(bestTrump.cards)}`
      : `Lead Trump ${formatPlayLabel(bestTrump.cards)}`;
    const desc = isPair
      ? "Bleeds opponent trump pairs; asserts trump command"
      : "Leads trump to pass lead or test opponent trump depth";

    lines.push({
      intent: "trump_control",
      label,
      description: desc,
      cards: bestTrump.cards,
      pointsAtStake: bestTrump.metadata.points,
      isGuaranteedWinner: false,
    });
  }

  // If no lines were generated (fallback), provide best scored candidate
  if (lines.length === 0 && candidates.length > 0) {
    const first = candidates[0];
    lines.push({
      intent: "safe_exit",
      label: `Lead ${formatPlayLabel(first.cards)}`,
      description: "Standard lead play",
      cards: first.cards,
      pointsAtStake: first.metadata.points,
      isGuaranteedWinner: first.metadata.isUnbeatable,
    });
  }

  // Assign sequential IDs A, B, C, D (max 4)
  const lineIds: StrategicLineId[] = ["A", "B", "C", "D"];
  return lines.slice(0, 4).map((line, idx) => ({
    ...line,
    id: lineIds[idx],
  }));
}

/**
 * Generates max 2–3 non-dominated Strategic Lines for a Following turn.
 */
export function generateFollowingLines(
  gameState: GameState,
  hand: Card[],
  playerId: PlayerId,
  trumpInfo: TrumpInfo,
  gameContext: GameContext,
): StrategicLine[] {
  const currentTrick = gameState.currentTrick;
  const winnerAnalysis = gameContext.trickWinnerAnalysis;
  if (!currentTrick || currentTrick.plays.length === 0 || !winnerAnalysis) {
    return [];
  }

  const leadCards = currentTrick.plays[0].cards;
  const analysis = analyzeSuitAvailability(leadCards, hand, trumpInfo);
  const { isTeammateWinning, trickPoints } = winnerAnalysis;
  const winningCombo = getCurrentWinningCombo(currentTrick);

  const lines: Omit<StrategicLine, "id">[] = [];

  switch (analysis.scenario) {
    case "void": {
      // 1. Line A: RUFF_TO_WIN (if available)
      const trumpAnalysis = analyzeSuitAvailability(
        leadCards,
        hand,
        trumpInfo,
        Suit.None,
      );
      const ruffWinners = trumpAnalysis.validCombos.filter((c) =>
        canBeatCombo(c.cards, winningCombo, trumpInfo),
      );

      if (ruffWinners.length > 0 && !isTeammateWinning) {
        // Sort lowest winning trump
        const lowestWinningRuff = [...ruffWinners].sort(
          (a, b) =>
            calculateCardStrategicValue(a.cards[0], trumpInfo, "basic") -
            calculateCardStrategicValue(b.cards[0], trumpInfo, "basic"),
        )[0];

        lines.push({
          intent: "ruff_win",
          label: `Ruff with ${formatPlayLabel(lowestWinningRuff.cards)}`,
          description: `Wins the trick; captures ${trickPoints} pts; spends low trump`,
          cards: lowestWinningRuff.cards,
          pointsAtStake: trickPoints,
          isGuaranteedWinner: true,
        });
      }

      // 2. Line B: FEED_POINTS (if teammate is winning safely and we have point cards)
      const offSuitPointCards = hand.filter(
        (c) => !isTrump(c, trumpInfo) && c.points > 0,
      );
      if (
        isTeammateWinning &&
        offSuitPointCards.length >= analysis.requiredLength
      ) {
        // Pick highest point cards
        const sortedPoints = [...offSuitPointCards].sort(
          (a, b) => b.points - a.points,
        );
        const feedCards = sortedPoints.slice(0, analysis.requiredLength);
        const feedPts = sumPoints(feedCards);

        lines.push({
          intent: "feed_points",
          label: `Bank Points with ${formatPlayLabel(feedCards)}`,
          description: `Banks +${feedPts} pts onto partner's winning trick`,
          cards: feedCards,
          pointsAtStake: feedPts,
          isGuaranteedWinner: false,
        });
      }

      // 3. Line C: DUMP_TRASH (discard lowest non-point off-suit cards)
      const offSuitNonTrump = hand.filter((c) => !isTrump(c, trumpInfo));
      const trashPool =
        offSuitNonTrump.length >= analysis.requiredLength
          ? offSuitNonTrump
          : hand;

      const trashCards = selectStrategicDisposal(
        trashPool,
        trumpInfo,
        analysis.requiredLength,
      );
      const trashPts = sumPoints(trashCards);

      lines.push({
        intent: "dump_trash",
        label: `Discard Trash ${formatPlayLabel(trashCards)}`,
        description: `Concedes trick; preserves trumps and bosses (risks ${trashPts} pts)`,
        cards: trashCards,
        pointsAtStake: trashPts,
        isGuaranteedWinner: false,
      });
      break;
    }

    case "valid_combos": {
      // In-suit valid combos
      const winners = analysis.validCombos.filter((c) =>
        canBeatCombo(c.cards, winningCombo, trumpInfo),
      );
      const losers = analysis.validCombos.filter(
        (c) => !canBeatCombo(c.cards, winningCombo, trumpInfo),
      );

      // Line A: OVERTAKE_WIN
      if (winners.length > 0) {
        const lowestWinner = [...winners].sort(
          (a, b) =>
            calculateCardStrategicValue(a.cards[0], trumpInfo, "basic") -
            calculateCardStrategicValue(b.cards[0], trumpInfo, "basic"),
        )[0];

        lines.push({
          intent: "overtake_win",
          label: `Win with ${formatPlayLabel(lowestWinner.cards)}`,
          description: isTeammateWinning
            ? "Overtakes trick to guarantee team win before next opponent acts"
            : `Beats opponent; captures ${trickPoints} pts in trick`,
          cards: lowestWinner.cards,
          pointsAtStake: trickPoints,
          isGuaranteedWinner: true,
        });
      }

      // Line B: FEED_PARTNER (if teammate winning and have point combos)
      const pointLosers = losers.filter((c) => sumPoints(c.cards) > 0);
      if (isTeammateWinning && pointLosers.length > 0) {
        const bestPointCombo = [...pointLosers].sort(
          (a, b) => sumPoints(b.cards) - sumPoints(a.cards),
        )[0];
        const pts = sumPoints(bestPointCombo.cards);

        lines.push({
          intent: "feed_points",
          label: `Contribute ${formatPlayLabel(bestPointCombo.cards)}`,
          description: `Banks +${pts} pts onto partner's winning trick`,
          cards: bestPointCombo.cards,
          pointsAtStake: pts,
          isGuaranteedWinner: false,
        });
      }

      // Line C: DUCK_LOW (lowest non-point loser)
      if (losers.length > 0) {
        const nonPointLosers = losers.filter((c) => sumPoints(c.cards) === 0);
        const bestDuck = (
          nonPointLosers.length > 0 ? nonPointLosers : losers
        ).sort(
          (a, b) =>
            calculateCardStrategicValue(a.cards[0], trumpInfo, "basic") -
            calculateCardStrategicValue(b.cards[0], trumpInfo, "basic"),
        )[0];

        lines.push({
          intent: "duck_low",
          label: `Play Low ${formatPlayLabel(bestDuck.cards)}`,
          description: `Follows low; saves higher cards (costs ${sumPoints(bestDuck.cards)} pts)`,
          cards: bestDuck.cards,
          pointsAtStake: sumPoints(bestDuck.cards),
          isGuaranteedWinner: false,
        });
      }
      break;
    }

    case "enough_remaining": {
      const selected = handleEnoughRemainingScenario(
        analysis,
        gameContext,
        trumpInfo,
        gameState,
        playerId,
      );
      const pts = sumPoints(selected);
      lines.push({
        intent: "duck_low",
        label: `Follow Suit ${formatPlayLabel(selected)}`,
        description: `Follows suit preserving combinations (risks ${pts} pts)`,
        cards: selected,
        pointsAtStake: pts,
        isGuaranteedWinner: false,
      });
      break;
    }

    case "insufficient": {
      const selected = handleInsufficientScenario(
        analysis,
        hand,
        gameContext,
        trumpInfo,
        gameState,
        playerId,
      );
      const pts = sumPoints(selected);
      lines.push({
        intent: "duck_low",
        label: `Follow Suit ${formatPlayLabel(selected)}`,
        description: `Plays all remaining suit cards and fills (risks ${pts} pts)`,
        cards: selected,
        pointsAtStake: pts,
        isGuaranteedWinner: false,
      });
      break;
    }
  }

  // Assign sequential IDs A, B, C (max 3)
  const lineIds: StrategicLineId[] = ["A", "B", "C"];
  return lines.slice(0, 3).map((line, idx) => ({
    ...line,
    id: lineIds[idx],
  }));
}
