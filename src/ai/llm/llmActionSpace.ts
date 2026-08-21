import {
  Card,
  GameContext,
  GameState,
  PlayableSuit,
  PlayerId,
  Suit,
  TrickPosition,
  TrumpInfo,
  getPartnerId,
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
import { detectCandidateLeads } from "../leading/candidateLeadDetection";
import { analyzeSuitAvailability } from "../following/suitAvailabilityAnalysis";
import { selectStrategicDisposal } from "../following/strategicSelection";
import { handleEnoughRemainingScenario } from "../following/sameSuitDecision";
import { handleInsufficientScenario } from "../following/crossSuitDecision";
import { shouldContributeToTeammate } from "../following/teammateAnalysis";

export interface LegalAction {
  index: number;
  label: string;
  cards: Card[];
  points: number;
  description: string;
}

const sumPoints = (cards: Card[]): number =>
  cards.reduce((sum, c) => sum + c.points, 0);

const formatCards = (cards: Card[]): string =>
  cards.length > 1
    ? `[${cards.map((c) => c.toString()).join(", ")}]`
    : (cards[0]?.toString() ?? "");

/**
 * Generates the discrete, enumerated Legal Action Space for the current trick.
 * Explicitly conditions on TrickPosition (1st, 2nd, 3rd, 4th seat) and teammate winning state.
 */
export function generateLegalActionSpace(
  gameState: GameState,
  hand: Card[],
  playerId: PlayerId,
  trumpInfo: TrumpInfo,
  gameContext: GameContext,
): LegalAction[] {
  const currentTrick = gameState.currentTrick;
  const isLeading = !currentTrick || currentTrick.plays.length === 0;

  if (isLeading) {
    return generateLeadingActionSpace(
      gameState,
      hand,
      playerId,
      trumpInfo,
      gameContext,
    );
  }

  return generateFollowingActionSpace(
    gameState,
    hand,
    playerId,
    trumpInfo,
    gameContext,
  );
}

/**
 * 1st Seat (Leader): Generates distinct lead actions across suits and power tiers.
 */
function generateLeadingActionSpace(
  gameState: GameState,
  hand: Card[],
  playerId: PlayerId,
  trumpInfo: TrumpInfo,
  gameContext: GameContext,
): LegalAction[] {
  const candidates = detectCandidateLeads(hand, gameState, playerId, trumpInfo);
  if (candidates.length === 0) {
    if (hand.length === 0) return [];
    return [
      {
        index: 1,
        label: `Play ${hand[0].toString()}`,
        cards: [hand[0]],
        points: hand[0].points,
        description: "Only available card in hand",
      },
    ];
  }

  const partnerId = getPartnerId(playerId);
  const memory = gameContext.memoryContext;
  const partnerVoidSuits =
    memory.playerMemories[partnerId]?.suitVoids ?? new Set();

  const actions: Omit<LegalAction, "index">[] = [];
  const seenSuitsForBoss = new Set<string>();

  // 1. Off-Suit Bosses (One per distinct suit)
  const bossCandidates = candidates.filter(
    (cand) =>
      !cand.metadata.isTrump &&
      (cand.metadata.isUnbeatable ||
        (cand.cards.length === 1 && isBiggestInSuit(cand.cards[0], trumpInfo))),
  );

  for (const boss of bossCandidates) {
    const suitKey = String(boss.metadata.suit);
    if (!seenSuitsForBoss.has(suitKey) && actions.length < 2) {
      seenSuitsForBoss.add(suitKey);
      const pts = boss.metadata.points;
      const ptDesc = pts > 0 ? `, claims ${pts} pts` : "";
      actions.push({
        label: `Cash Boss ${formatCards(boss.cards)}`,
        cards: boss.cards,
        points: pts,
        description: `Guaranteed ${boss.metadata.suit} winner${ptDesc}; retains lead and control`,
      });
    }
  }

  // 2. Trump Control Options (Master Joker vs Trump Pair vs Low Probe)
  const trumpCandidates = candidates.filter((c) => c.metadata.isTrump);
  if (trumpCandidates.length > 0) {
    const masterTrump = trumpCandidates.find((c) => {
      const card = c.cards[0];
      return (
        card.joker !== undefined ||
        card.rank === trumpInfo.trumpRank ||
        calculateCardStrategicValue(card, trumpInfo, "basic") >= 170
      );
    });

    const pairTrump = trumpCandidates.find((c) => c.cards.length >= 2);

    const lowTrump = [...trumpCandidates]
      .filter((c) => c.cards.length === 1 && c.metadata.points === 0)
      .sort(
        (a, b) =>
          calculateCardStrategicValue(a.cards[0], trumpInfo, "basic") -
          calculateCardStrategicValue(b.cards[0], trumpInfo, "basic"),
      )[0];

    if (pairTrump && actions.length < 3) {
      actions.push({
        label: `Draw Trump Pairs with ${formatCards(pairTrump.cards)}`,
        cards: pairTrump.cards,
        points: pairTrump.metadata.points,
        description: "Bleeds opponent trump pairs; asserts trump command",
      });
    } else if (masterTrump && actions.length < 3) {
      actions.push({
        label: `Command Board with ${formatCards(masterTrump.cards)}`,
        cards: masterTrump.cards,
        points: masterTrump.metadata.points,
        description: "Forces all players to play trumps; guarantees trick win",
      });
    } else if (lowTrump && actions.length < 3) {
      actions.push({
        label: `Probe Trump with ${formatCards(lowTrump.cards)}`,
        cards: lowTrump.cards,
        points: 0,
        description: "Tests opponent trump depth at 0 pt risk",
      });
    }
  }

  // 3. Off-Suit Long Attacks / Pairs
  const developCandidates = candidates.filter(
    (c) =>
      !c.metadata.isTrump &&
      !seenSuitsForBoss.has(String(c.metadata.suit)) &&
      (c.cards.length > 1 ||
        hand.filter((h) => h.suit === c.cards[0].suit && !isTrump(h, trumpInfo))
          .length >= 4),
  );

  if (developCandidates.length > 0 && actions.length < 4) {
    const bestDevelop = developCandidates[0];
    actions.push({
      label: `Attack ${bestDevelop.metadata.suit} with ${formatCards(bestDevelop.cards)}`,
      cards: bestDevelop.cards,
      points: bestDevelop.metadata.points,
      description: `Pressures opponents' ${bestDevelop.metadata.suit}; forces stoppers`,
    });
  }

  // 4. Safe Exits (0-pt singles targeting partner's void)
  const exitCandidates = candidates.filter(
    (c) => !c.metadata.isTrump && c.cards.length === 1,
  );

  if (exitCandidates.length > 0 && actions.length < 5) {
    const partnerVoidExit = exitCandidates.find(
      (c) =>
        c.metadata.suit !== Suit.None &&
        partnerVoidSuits.has(c.metadata.suit as PlayableSuit) &&
        c.metadata.points === 0,
    );

    const bestExit =
      partnerVoidExit ||
      [...exitCandidates].sort((a, b) => {
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

    actions.push({
      label: `Safe Exit ${formatCards(bestExit.cards)}`,
      cards: bestExit.cards,
      points: bestExit.metadata.points,
      description: desc,
    });
  }

  return actions.map((action, idx) => ({
    ...action,
    index: idx + 1,
  }));
}

/**
 * 2nd, 3rd, and 4th Seats: Generates position-aware following action choices.
 */
function generateFollowingActionSpace(
  gameState: GameState,
  hand: Card[],
  playerId: PlayerId,
  trumpInfo: TrumpInfo,
  gameContext: GameContext,
): LegalAction[] {
  const currentTrick = gameState.currentTrick;
  const winnerAnalysis = gameContext.trickWinnerAnalysis;
  if (!currentTrick || currentTrick.plays.length === 0 || !winnerAnalysis) {
    return [];
  }

  const leadCards = currentTrick.plays[0].cards;
  const analysis = analyzeSuitAvailability(leadCards, hand, trumpInfo);
  const { isTeammateWinning, trickPoints } = winnerAnalysis;
  const winningCombo = getCurrentWinningCombo(currentTrick);
  const position = gameContext.trickPosition;
  const is4thSeat = position === TrickPosition.Fourth;
  const isTeammateSecure = shouldContributeToTeammate(
    gameContext,
    gameState,
    playerId,
  );

  const actions: Omit<LegalAction, "index">[] = [];

  switch (analysis.scenario) {
    case "void": {
      // 1. Ruff Actions (Only when teammate is NOT securely winning)
      if (!isTeammateWinning || (!is4thSeat && !isTeammateSecure)) {
        const trumpAnalysis = analyzeSuitAvailability(
          leadCards,
          hand,
          trumpInfo,
          Suit.None,
        );
        const ruffWinners = trumpAnalysis.validCombos.filter((c) =>
          canBeatCombo(c.cards, winningCombo, trumpInfo),
        );

        if (ruffWinners.length > 0) {
          // Low Ruff
          const lowRuff = [...ruffWinners].sort(
            (a, b) =>
              calculateCardStrategicValue(a.cards[0], trumpInfo, "basic") -
              calculateCardStrategicValue(b.cards[0], trumpInfo, "basic"),
          )[0];

          actions.push({
            label: `Ruff Low with ${formatCards(lowRuff.cards)}`,
            cards: lowRuff.cards,
            points: trickPoints,
            description: `Wins trick with cheap trump; captures ${trickPoints} pts`,
          });

          // High Stopper Ruff (in 2nd/3rd seat when points >= 10 to prevent over-ruff)
          if (!is4thSeat && ruffWinners.length > 1 && trickPoints >= 10) {
            const highRuff = [...ruffWinners].sort(
              (a, b) =>
                calculateCardStrategicValue(b.cards[0], trumpInfo, "basic") -
                calculateCardStrategicValue(a.cards[0], trumpInfo, "basic"),
            )[0];

            if (highRuff.cards[0].id !== lowRuff.cards[0].id) {
              actions.push({
                label: `Ruff High with ${formatCards(highRuff.cards)}`,
                cards: highRuff.cards,
                points: trickPoints,
                description: `Protects ${trickPoints} pts against opponent over-ruffs`,
              });
            }
          }
        }
      }

      // 2. Point Banking (if teammate is winning)
      const offSuitPointCards = hand.filter(
        (c) => !isTrump(c, trumpInfo) && c.points > 0,
      );
      if (
        isTeammateWinning &&
        offSuitPointCards.length >= analysis.requiredLength
      ) {
        const sortedPoints = [...offSuitPointCards].sort(
          (a, b) => b.points - a.points,
        );
        const feedCards = sortedPoints.slice(0, analysis.requiredLength);
        const feedPts = sumPoints(feedCards);

        actions.push({
          label: `Bank Points with ${formatCards(feedCards)}`,
          cards: feedCards,
          points: feedPts,
          description: `Banks +${feedPts} pts onto partner's winning trick`,
        });
      }

      // 3. 0-Point Starvation Trash Discard (creating voids)
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

      actions.push({
        label: `Discard 0-Pt Trash ${formatCards(trashCards)}`,
        cards: trashCards,
        points: trashPts,
        description: `Concedes trick; develops suit void; risks ${trashPts} pts`,
      });
      break;
    }

    case "valid_combos": {
      const winners = analysis.validCombos.filter((c) =>
        canBeatCombo(c.cards, winningCombo, trumpInfo),
      );
      const losers = analysis.validCombos.filter(
        (c) => !canBeatCombo(c.cards, winningCombo, trumpInfo),
      );

      // 4th Seat with winning teammate -> NEVER OVERTAKE
      const canOvertake = !is4thSeat || !isTeammateWinning;

      // 1. Ceiling Raise / High Stopper (in 2nd or 3rd seat: Rank >= 10, e.g. 10, J, Q)
      if (canOvertake && winners.length > 0 && !is4thSeat) {
        const ceilingWinners = winners.filter((w) => {
          const val = calculateCardStrategicValue(
            w.cards[0],
            trumpInfo,
            "basic",
          );
          return val >= 110 && val <= 150;
        });

        if (ceilingWinners.length > 0) {
          const bestCeiling = [...ceilingWinners].sort(
            (a, b) =>
              calculateCardStrategicValue(a.cards[0], trumpInfo, "basic") -
              calculateCardStrategicValue(b.cards[0], trumpInfo, "basic"),
          )[0];

          actions.push({
            label: `Raise Ceiling with ${formatCards(bestCeiling.cards)}`,
            cards: bestCeiling.cards,
            points: trickPoints,
            description: `Sets a high ceiling to block next player from winning cheaply; seizes tempo`,
          });
        }
      }

      // 2. Economical / Cheap Winner (4th seat uses this for exact win)
      if (canOvertake && winners.length > 0) {
        const lowestWinner = [...winners].sort(
          (a, b) =>
            calculateCardStrategicValue(a.cards[0], trumpInfo, "basic") -
            calculateCardStrategicValue(b.cards[0], trumpInfo, "basic"),
        )[0];

        if (
          actions.length === 0 ||
          actions[0].cards[0].id !== lowestWinner.cards[0].id
        ) {
          actions.push({
            label: `Win Cheaply with ${formatCards(lowestWinner.cards)}`,
            cards: lowestWinner.cards,
            points: trickPoints,
            description: `Wins trick with lowest viable card; risks over-ruff if opponents play after`,
          });
        }
      }

      // 3. Point Banking (if teammate is winning)
      const pointLosers = losers.filter((c) => sumPoints(c.cards) > 0);
      if (isTeammateWinning && pointLosers.length > 0) {
        const bestPointCombo = [...pointLosers].sort(
          (a, b) => sumPoints(b.cards) - sumPoints(a.cards),
        )[0];
        const pts = sumPoints(bestPointCombo.cards);

        actions.push({
          label: `Bank Points with ${formatCards(bestPointCombo.cards)}`,
          cards: bestPointCombo.cards,
          points: pts,
          description: `Banks +${pts} pts onto partner's winning trick`,
        });
      }

      // 4. 0-Point Clean Duck / Starvation
      if (losers.length > 0) {
        const nonPointLosers = losers.filter((c) => sumPoints(c.cards) === 0);
        const bestDuck = (
          nonPointLosers.length > 0 ? nonPointLosers : losers
        ).sort(
          (a, b) =>
            calculateCardStrategicValue(a.cards[0], trumpInfo, "basic") -
            calculateCardStrategicValue(b.cards[0], trumpInfo, "basic"),
        )[0];

        actions.push({
          label: `Duck Low with ${formatCards(bestDuck.cards)}`,
          cards: bestDuck.cards,
          points: sumPoints(bestDuck.cards),
          description: `Concedes trick; starves opponents (costs ${sumPoints(bestDuck.cards)} pts)`,
        });
      }
      break;
    }

    case "enough_remaining": {
      // 1. Standard Pair-Preserving Follow
      const standardFollow = handleEnoughRemainingScenario(
        analysis,
        gameContext,
        trumpInfo,
        gameState,
        playerId,
      );
      const stdPts = sumPoints(standardFollow);

      actions.push({
        label: `Preserve Pairs ${formatCards(standardFollow)}`,
        cards: standardFollow,
        points: stdPts,
        description: `Follows suit preserving combinations (risks ${stdPts} pts)`,
      });

      // 2. 0-Point Starvation Follow (breaks 0-pt pair if standard leaked points)
      if (stdPts > 0 && analysis.remainingCards) {
        const zeroPtCards = analysis.remainingCards.filter(
          (c) => c.points === 0,
        );
        if (zeroPtCards.length >= analysis.requiredLength) {
          const zeroPtFollow = zeroPtCards.slice(0, analysis.requiredLength);
          actions.push({
            label: `Starve with 0-Pts ${formatCards(zeroPtFollow)}`,
            cards: zeroPtFollow,
            points: 0,
            description: "Breaks 0-pt cards to give 0 points to opponents",
          });
        }
      }

      // 3. Point Banking (if teammate is winning)
      if (isTeammateWinning && analysis.remainingCards) {
        const ptCards = analysis.remainingCards.filter((c) => c.points > 0);
        if (ptCards.length >= analysis.requiredLength) {
          const sortedPts = [...ptCards].sort((a, b) => b.points - a.points);
          const feedCards = sortedPts.slice(0, analysis.requiredLength);
          const pts = sumPoints(feedCards);
          actions.push({
            label: `Bank Points with ${formatCards(feedCards)}`,
            cards: feedCards,
            points: pts,
            description: `Banks +${pts} pts onto partner's winning trick`,
          });
        }
      }
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
      actions.push({
        label: `Follow & Discard ${formatCards(selected)}`,
        cards: selected,
        points: pts,
        description: `Plays all remaining suit cards and fills (risks ${pts} pts)`,
      });
      break;
    }
  }

  return actions.slice(0, 5).map((action, idx) => ({
    ...action,
    index: idx + 1,
  }));
}
