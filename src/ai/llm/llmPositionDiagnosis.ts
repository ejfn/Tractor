import {
  Card,
  Combo,
  ComboType,
  GameContext,
  GameState,
  getPartnerId,
  JokerType,
  PlayerId,
  Suit,
  TrumpInfo,
} from "../../types";
import {
  calculateCardStrategicValue,
  isBiggestInSuit,
} from "../../game/cardValue";
import {
  canBeatCombo,
  getCurrentWinningCombo,
} from "../../game/cardComparison";
import { isComboUnbeatable } from "../../game/multiComboValidation";
import { analyzeSuitAvailability } from "../following/suitAvailabilityAnalysis";
import {
  CandidateLead,
  detectCandidateLeads,
} from "../leading/candidateLeadDetection";

/**
 * Position Diagnosis — facts and consequences, never recommendations.
 *
 * This module is the "analyst" half of the LLM bot: the TypeScript engine does
 * the cognition a small model is bad at (counting unseen cards, lookahead,
 * structure extraction, over-ruff survival) and lays out, for each legal play,
 * what it would *cost and yield in POINTS* — then stops. It never ranks, scores,
 * stars, or picks a card; the LLM makes the strategic call from these facts.
 *
 * Two disciplines hold this neutral:
 *   1. Consequences are stated in point-flow (capture / concede / bank / protect /
 *      control), because the round is won on points, not tricks.
 *   2. Equivalent plays are collapsed into one class (using unseen-card knowledge),
 *      and graded choices (how big to ruff, point-card or not) are spelled out —
 *      but every option gets the same neutral, symmetric framing.
 */

const comboLabel = (cards: Card[]): string =>
  cards.map((c) => c.toString()).join(" ");

/** A play label, bracketed when it is a multi-card combo so the unit reads clearly. */
const playLabel = (cards: Card[]): string =>
  cards.length > 1 ? `[${comboLabel(cards)}]` : comboLabel(cards);

const listLabel = (cards: Card[]): string =>
  cards.map((c) => c.toString()).join(", ");

const sumPoints = (cards: Card[]): number =>
  cards.reduce((sum, c) => sum + c.points, 0);

/** Number of pairs sitting inside a flat set of cards (by card identity). */
function countHeldPairs(cards: Card[]): number {
  const counts = new Map<string, number>();
  for (const c of cards)
    counts.set(c.commonId, (counts.get(c.commonId) ?? 0) + 1);
  let pairs = 0;
  for (const n of counts.values()) pairs += Math.floor(n / 2);
  return pairs;
}

/** Phrase the value of taking the trick now, framed in points + lead control. */
function winYield(trickPoints: number): string {
  return trickPoints > 0
    ? `WINS the trick → captures ${trickPoints} pts for your team`
    : `WINS the trick (0 pts) → you gain the lead next (cash bosses / set up points)`;
}

// ---------------------------------------------------------------------------
// Following diagnosis
// ---------------------------------------------------------------------------

/**
 * Build the `## Your Options` content for the following path: the legal plays
 * grouped into strategically-distinct classes, each with its point consequence.
 * Returns the inner markdown (no header); empty string when there is no trick.
 */
export function buildFollowingOptions(
  gameState: GameState,
  playerId: PlayerId,
  hand: Card[],
  gameContext: GameContext,
  voids: Record<string, string[]>,
): string {
  const trumpInfo = gameState.trumpInfo;
  const currentTrick = gameState.currentTrick;
  const winnerAnalysis = gameContext.trickWinnerAnalysis;
  if (!currentTrick || currentTrick.plays.length === 0 || !winnerAnalysis) {
    return "";
  }

  const plays = currentTrick.plays;
  const leadCards = plays[0].cards;
  const winningCombo = getCurrentWinningCombo(currentTrick);
  const winningCard = winningCombo[0];
  const winnerId = winnerAnalysis.currentWinner;
  const { isTeammateWinning, isTrumpLead, trickPoints } = winnerAnalysis;
  const partnerId = getPartnerId(playerId);

  const playedIds = plays.map((p) => p.playerId);
  const yetToPlay = gameState.players
    .map((p) => p.id)
    .filter((id) => id !== playerId && !playedIds.includes(id));
  const remainingOpponents = yetToPlay.filter((id) => id !== partnerId);
  const ledSuit = isTrumpLead ? "Trump Group" : leadCards[0].suit;
  const isAnyOpponentVoidLed = remainingOpponents.some((id) =>
    (voids[id] || []).includes(ledSuit),
  );

  const teammateWinSafe = computeTeammateWinSafe({
    isTeammateWinning,
    isTrumpLead,
    winningCard,
    remainingOpponents,
    isAnyOpponentVoidLed,
    ledSuit,
    voids,
    hand,
    gameContext,
    trumpInfo,
  });

  // How a non-winning play moves points, given who currently holds the trick.
  const concedeNote = (points: number): string => {
    if (points === 0) {
      return isTeammateWinning && teammateWinSafe
        ? `safe filler — your team keeps the trick`
        : `loses; concedes nothing of yours`;
    }
    if (isTeammateWinning && teammateWinSafe) {
      return `banks ${points} pts onto your team's secured trick`;
    }
    if (isTeammateWinning) {
      return `adds ${points} pts, but ${remainingOpponents.join("/")} can still take the trick`;
    }
    return `adds ${points} pts to the opponents' trick`;
  };

  const analysis = analyzeSuitAvailability(leadCards, hand, trumpInfo);
  const lines: string[] = [
    `Play exactly ${analysis.requiredLength} card(s). Copy cards verbatim from YOUR HAND — to repeat a card (a pair) you must hold two copies of it (shown ×2).`,
  ];

  switch (analysis.scenario) {
    case "valid_combos": {
      // You hold combos matching the led structure — those are your legal plays.
      const winners = analysis.validCombos.filter((c) =>
        canBeatCombo(c.cards, winningCombo, trumpInfo),
      );
      const losers = analysis.validCombos.filter(
        (c) => !canBeatCombo(c.cards, winningCombo, trumpInfo),
      );
      for (const combo of sortCombosAsc(winners, trumpInfo)) {
        lines.push(
          `- ${playLabel(combo.cards)} → ${winYield(trickPoints)}${pointCost(combo.cards)}`,
        );
      }
      lines.push(...renderLosers(losers, concedeNote, trumpInfo));
      break;
    }

    case "enough_remaining": {
      // Cards in suit but cannot match the led structure → you cannot win this
      // trick; the only choice is which cards to give up.
      lines.push(
        `- You hold ${analysis.availableCount} ${suitName(ledSuit)} card(s) but no matching ${analysis.leadingComboType.toLowerCase()} — you cannot beat ${winnerId}. Play ${analysis.requiredLength} from this suit:`,
      );
      const heldPairs = countHeldPairs(analysis.remainingCards);
      if (
        (analysis.leadingComboType === ComboType.Pair ||
          analysis.leadingComboType === ComboType.Tractor) &&
        heldPairs > 0
      ) {
        const requiredPairs = Math.min(heldPairs, analysis.requiredLength / 2);
        lines.push(
          `  FORCED: you hold ${heldPairs} pair(s) here — you must keep ${requiredPairs} of them intact (cannot split a pair while you hold one).`,
        );
      }
      lines.push(
        ...renderDisposalClasses(
          analysis.remainingCards,
          concedeNote,
          trumpInfo,
        ),
      );
      break;
    }

    case "insufficient": {
      // Must play every suit card you hold, then fill the rest from elsewhere.
      lines.push(
        `- Only ${analysis.availableCount} ${suitName(ledSuit)} card(s), ${analysis.requiredLength} required — you cannot win. FORCED to play all of: ${listLabel(analysis.remainingCards)}.`,
      );
      const fillCount = analysis.requiredLength - analysis.availableCount;
      lines.push(
        `  Fill the remaining ${fillCount} from any suit (trump or off-suit). ${concedeNote(0)} via the fill choice:`,
      );
      const fillPool = hand.filter(
        (c) => !analysis.remainingCards.some((r) => r.id === c.id),
      );
      lines.push(...renderDisposalClasses(fillPool, concedeNote, trumpInfo));
      break;
    }

    case "void": {
      lines.push(
        ...renderVoidOptions({
          gameState,
          leadCards,
          winningCombo,
          winnerId,
          trickPoints,
          isTeammateWinning,
          teammateWinSafe,
          remainingOpponents,
          isAnyOpponentVoidLed,
          ledSuit,
          hand,
          trumpInfo,
          concedeNote,
        }),
      );
      break;
    }
  }

  return lines.join("\n");
}

interface TeammateSafeArgs {
  isTeammateWinning: boolean;
  isTrumpLead: boolean;
  winningCard: Card | undefined;
  remainingOpponents: PlayerId[];
  isAnyOpponentVoidLed: boolean;
  ledSuit: string;
  voids: Record<string, string[]>;
  hand: Card[];
  gameContext: GameContext;
  trumpInfo: TrumpInfo;
}

/**
 * A teammate's win is "safe" when no remaining opponent can take it: none left
 * to act, an off-suit boss no live card beats (and no opponent can ruff), the
 * top trump, or a trump trick with every remaining opponent out of trump.
 */
function computeTeammateWinSafe(a: TeammateSafeArgs): boolean {
  const winningCard = a.winningCard;
  if (!a.isTeammateWinning || !winningCard) return false;
  if (a.remainingOpponents.length === 0) return true;

  const winnerOffSuitBoss =
    !winningCard.isTrump(a.trumpInfo) &&
    isComboUnbeatable(
      { type: ComboType.Single, cards: [winningCard], value: 0 },
      winningCard.suit,
      a.gameContext.memoryContext.playedCards,
      a.hand,
      a.trumpInfo,
      [],
    );
  if (winnerOffSuitBoss && !a.isAnyOpponentVoidLed) return true;

  if (winningCard.joker === JokerType.Big) return true;

  const allRemainingOpponentsVoidLed = a.remainingOpponents.every((id) =>
    (a.voids[id] || []).includes(a.ledSuit),
  );
  return a.isTrumpLead && allRemainingOpponentsVoidLed;
}

interface VoidArgs {
  gameState: GameState;
  leadCards: Card[];
  winningCombo: Card[];
  winnerId: PlayerId;
  trickPoints: number;
  isTeammateWinning: boolean;
  teammateWinSafe: boolean;
  remainingOpponents: PlayerId[];
  isAnyOpponentVoidLed: boolean;
  ledSuit: string;
  hand: Card[];
  trumpInfo: TrumpInfo;
  concedeNote: (points: number) => string;
}

/** Void in the led suit: lay out ruff-to-win grades and sluff classes. */
function renderVoidOptions(a: VoidArgs): string[] {
  const lines: string[] = [];

  // Ruff options that actually win: trump combos matching the led structure
  // that beat the current winner. (analyzeSuitAvailability on the trump group
  // returns exactly the trump combos of the led type.)
  const trumpAnalysis = analyzeSuitAvailability(
    a.leadCards,
    a.hand,
    a.trumpInfo,
    Suit.None,
  );
  const ruffWinners = trumpAnalysis.validCombos.filter((c) =>
    canBeatCombo(c.cards, a.winningCombo, a.trumpInfo),
  );

  const overRuffRisk =
    a.isAnyOpponentVoidLed && a.remainingOpponents.length > 0
      ? ` (caution: ${a.remainingOpponents.join("/")} is void in ${suitName(a.ledSuit)} and could over-ruff a low trump)`
      : "";

  if (ruffWinners.length > 0 && !a.isTeammateWinning) {
    for (const combo of sortCombosAsc(ruffWinners, a.trumpInfo)) {
      const pts = sumPoints(combo.cards);
      const costNote =
        pts > 0
          ? `; spends a ${pts}-pt trump`
          : `; spends trump ${playLabel(combo.cards)}`;
      lines.push(
        `- ruff with ${playLabel(combo.cards)} → ${winYield(a.trickPoints)}${costNote}${overRuffRisk}`,
      );
    }
  } else if (!a.isTeammateWinning) {
    lines.push(
      `- No trump you hold beats ${a.winnerId} — ruffing only spends trump for nothing.`,
    );
  }

  // Sluff: discard off-suit (non-trump) cards, conceding the trick.
  const offSuit = a.hand.filter((c) => !c.isTrump(a.trumpInfo));
  if (offSuit.length > 0) {
    if (a.isTeammateWinning && a.teammateWinSafe) {
      lines.push(
        `- ${a.winnerId} (teammate) is winning safely — sluff to bank points:`,
      );
    } else if (a.isTeammateWinning) {
      lines.push(
        `- ${a.winnerId} (teammate) leads but it isn't locked — sluffing:`,
      );
    } else {
      lines.push(`- Sluff off-suit (concede the trick, keep your trump):`);
    }
    lines.push(
      ...renderDisposalClasses(offSuit, a.concedeNote, a.trumpInfo, "  "),
    );
  }

  return lines;
}

/**
 * Collapse a set of losing combos into classes: non-point combos share one line
 * (they are interchangeable), point-bearing combos each get their own (the points
 * conceded differ). Winners are handled by the caller.
 */
function renderLosers(
  losers: Combo[],
  concedeNote: (points: number) => string,
  trumpInfo: TrumpInfo,
): string[] {
  if (losers.length === 0) return [];
  const lines: string[] = [];
  const nonPoint = losers.filter((c) => sumPoints(c.cards) === 0);
  const pointBearing = losers.filter((c) => sumPoints(c.cards) > 0);

  if (nonPoint.length > 0) {
    const labels = sortCombosAsc(nonPoint, trumpInfo)
      .map((c) => playLabel(c.cards))
      .join(" · ");
    lines.push(`- ${labels} → ${concedeNote(0)}`);
  }
  for (const combo of sortCombosAsc(pointBearing, trumpInfo)) {
    lines.push(
      `- ${playLabel(combo.cards)} → loses; ${concedeNote(sumPoints(combo.cards))}`,
    );
  }
  return lines;
}

/**
 * Collapse a flat pool of disposable cards into point-flow classes: low non-point
 * cards (interchangeable, one line) and each point card (distinct consequence).
 */
function renderDisposalClasses(
  cards: Card[],
  concedeNote: (points: number) => string,
  trumpInfo: TrumpInfo,
  indent = "",
): string[] {
  if (cards.length === 0) return [];
  const lines: string[] = [];
  const nonPoint = cards.filter((c) => c.points === 0);
  const pointCards = cards.filter((c) => c.points > 0);

  if (nonPoint.length > 0) {
    const sorted = [...nonPoint].sort(
      (x, y) =>
        calculateCardStrategicValue(x, trumpInfo, "basic") -
        calculateCardStrategicValue(y, trumpInfo, "basic"),
    );
    lines.push(
      `${indent}- low cards (${listLabel(sorted)}) → ${concedeNote(0)}`,
    );
  }
  for (const card of pointCards.sort((x, y) => x.points - y.points)) {
    lines.push(`${indent}- ${card.toString()} → ${concedeNote(card.points)}`);
  }
  return lines;
}

// ---------------------------------------------------------------------------
// Leading diagnosis
// ---------------------------------------------------------------------------

/**
 * Build the `## Lead Options` content: the legal leads enumerated by structure,
 * each with its point/control consequence. No score, no ranking.
 */
export function buildLeadingOptions(
  gameState: GameState,
  playerId: PlayerId,
  hand: Card[],
  trumpInfo: TrumpInfo,
): string {
  const candidates = detectCandidateLeads(hand, gameState, playerId, trumpInfo);
  const lines: string[] = [];

  const offSuit = candidates.filter((c) => !c.metadata.isTrump);
  const trump = candidates.filter((c) => c.metadata.isTrump);

  // Off-suit, structured (multi-combo / tractor / pair) — highest leverage.
  const offStructured = offSuit.filter((c) => c.cards.length > 1);
  for (const c of offStructured) {
    const kind =
      c.type === ComboType.Invalid ? "multi-combo" : c.type.toLowerCase();
    const pts = c.metadata.points > 0 ? `, ${c.metadata.points} pts` : "";
    const fate = c.metadata.isUnbeatable
      ? `unbeatable → guaranteed to win + keep the lead`
      : `a higher ${c.metadata.suit} combo or a ruff can beat it`;
    lines.push(`- ${playLabel(c.cards)} (${kind}${pts}) → ${fate}`);
  }

  // Off-suit singles: bosses (likely win) and point cards stand alone; collapse
  // the low rubbish per suit into one class.
  const offSingles = offSuit.filter((c) => c.cards.length === 1);
  const notableSingles = offSingles.filter(
    (c) =>
      c.metadata.isUnbeatable ||
      isBiggestInSuit(c.cards[0], trumpInfo) ||
      c.metadata.points > 0,
  );
  for (const c of sortCandidatesDesc(notableSingles, trumpInfo)) {
    const card = c.cards[0];
    const pts = card.points > 0 ? `, ${card.points} pts` : "";
    const fate = c.metadata.isUnbeatable
      ? `unbeatable → wins the trick + keeps the lead`
      : isBiggestInSuit(card, trumpInfo)
        ? `suit boss → wins unless ruffed`
        : `a higher ${suitName(card.suit)} is still out — may be beaten or ruffed`;
    lines.push(`- ${card.toString()} (${suitName(card.suit)}${pts}) → ${fate}`);
  }
  const rubbishSingles = offSingles.filter((c) => !notableSingles.includes(c));
  if (rubbishSingles.length > 0) {
    const cards = rubbishSingles.map((c) => c.cards[0]);
    lines.push(
      `- low singles (${listLabel(cards)}) → low cards; give up the lead, carry no points`,
    );
  }

  // Trump leads stated as facts (cost + what beats them), not as a tactic — a
  // trump lead spends control you cannot then ruff with, and a trump-rank/joker
  // combo is your scarcest resource.
  const trumpStructured = trump.filter((c) => c.cards.length > 1);
  for (const c of trumpStructured) {
    const kind =
      c.type === ComboType.Invalid ? "multi-combo" : c.type.toLowerCase();
    const scarce =
      calculateCardStrategicValue(c.cards[0], trumpInfo, "basic") >= 170;
    const cost = scarce
      ? "spends scarce high trump (jokers/trump-rank)"
      : "spends trump — your ruff/control resource";
    lines.push(
      `- ${playLabel(c.cards)} (trump ${kind}) → wins the lead unless a higher trump ${kind} remains; ${cost}`,
    );
  }
  const trumpSingles = trump.filter((c) => c.cards.length === 1);
  if (trumpSingles.length > 0) {
    const cards = trumpSingles
      .map((c) => c.cards[0])
      .sort(
        (x, y) =>
          calculateCardStrategicValue(x, trumpInfo, "basic") -
          calculateCardStrategicValue(y, trumpInfo, "basic"),
      );
    lines.push(
      `- trump singles (${listLabel(cards)}) → spends trump — your ruff/control resource; jokers and trump-rank cards are your scarcest`,
    );
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function suitName(suit: string): string {
  return suit === Suit.None || suit === "Trump Group" ? "trump" : suit;
}

/** Point cost suffix for a winning play that spends point cards (e.g. a K). */
function pointCost(cards: Card[]): string {
  const pts = sumPoints(cards);
  return pts > 0 ? ` (note: this play itself carries ${pts} pts)` : "";
}

function sortCombosAsc(combos: Combo[], trumpInfo: TrumpInfo): Combo[] {
  return [...combos].sort(
    (a, b) =>
      calculateCardStrategicValue(a.cards[0], trumpInfo, "basic") -
      calculateCardStrategicValue(b.cards[0], trumpInfo, "basic"),
  );
}

function sortCandidatesDesc(
  candidates: CandidateLead[],
  trumpInfo: TrumpInfo,
): CandidateLead[] {
  return [...candidates].sort(
    (a, b) =>
      calculateCardStrategicValue(b.cards[0], trumpInfo, "basic") -
      calculateCardStrategicValue(a.cards[0], trumpInfo, "basic"),
  );
}
