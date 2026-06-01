# Derived Game-State Signals for the LLM (future work)

Shengji is, from one seat, a **near-perfect-information game**: with full card
accounting almost every strategic signal is *computable*, not guessed. This note
captures a shared, code-side analytical layer the LLM (and the rule-based AI) could
draw on. It is **general** — win-safety is only one consumer; the same accounting
feeds leading, ruffing, conservation, and point-pressure decisions alike.

**Not scheduled for implementation** — captured so the reasoning isn't lost. Implement
selectively, cheapest-value-first.

## The accounting identity everything builds on

A Tractor deck is **108 cards** = two 52-card decks + 4 jokers. Dealt **25 × 4 = 100**;
the remaining **8 form the kitty**. Points total **200** = **50 per suit**
(2×5 + 2×10 + 2×K). When the trump *rank* is itself a point rank (5/10/K), those copies
promote into the trump group, so a side suit holds less.

For any card or suit: **unseen = total − played − in-my-hand**, and the unseen cards
sit in the other three hands *or* the hidden kitty.

> **The one irreducible unknown: the kitty.** With 8 cards hidden, you can *bound* but
> not *prove* a specific card sits in an opponent's hand. So most signals below are
> confidence improvements, not certainties — except late in the round, when few cards
> remain unseen and the kitty's share of the unknown shrinks toward exact.

## The shared signal layer

Compute in code (shared with the rule-based AI, which already derives much of this for
its scoring), surface compactly to the small LLM, and let the model *interpret* rather
than *count*.

1. **Per-suit / per-rank card census** — which specific cards are still unseen, split by
   "could be in a hand" vs "could be kitty". The substrate for everything else.
2. **Point accounting** — points played, in-hand, and still live *per suit*, down to
   *which* point cards remain ("both Ks still out" vs "suit drained"). Today
   `localFormatLiveOffSuitPoints` does the off-suit total only.
3. **Void model** — confirmed voids (already tracked in `memoryContext`) **plus**
   *probabilistic* voids: a player who failed to win with points up, or who has shown
   many of a suit, is likely short/void. Grade as a probability, not a flag.
4. **Trump census** — how much trump, and which high trumps (jokers, active ranks),
   remain among the other seats. Drives when trump is safe to spend vs. must be hoarded.
5. **Stage** — early/mid/late from hand size; late game tightens every estimate toward
   exact and shifts conservation toward cashing.
6. **Boss / unbeatable status** — memory-aware (the engine's `isComboUnbeatable`
   already does this for singles; extend to pairs/tractors).
7. **Forced-play detection** — when an opponent *must* follow a suit and holds only
   point cards there, your team is **guaranteed to extract points** (no kitty
   ambiguity); flag too when the last relevant seat can instead dump high or ruff.
8. **Observed forced point-spill** — a player never volunteers a 10/K into a trick their
   team won't win, so a point card seen played into a **lost** trick means they were
   forced: a void/shortage tell that sharpens the void model (#3) — they couldn't follow
   the led suit, or are down to only high cards in it.

## Consumers — why this is general, not win-safety-specific

- **Win-safety verdict** — grade `teammateWinSafe` (today a boolean tested only on the
  winning card *as a single*) into SECURED / STRONG / SLIM using void probability,
  pair/tractor unbeatability, and stage.
- **Leading** — attack point-rich suits; lead into a likely-void opponent to force
  their trump; avoid drained suits; time boss-cashing for when all higher copies are
  seen (a K is boss once both Aces are accounted for).
- **Following / contribution** — press hard when points are *forced* out; contribute
  on a safe win; stop feeding a drained suit.
- **Ruffing** — ruff to capture when worthwhile and size the ruff to the trump still
  outstanding (don't over-ruff a trick no one left can top).
- **Conservation & trump management** — spend freely once opponents' trump is
  exhausted; hoard when trump is scarce (especially No-Trump rounds).
- **Point pressure / endgame** — how many points remain to contest sets how aggressive
  to be on each side of the 80-point line.

## Implementation principle

Keep the division of labour the prompt already uses: **count in code** (shared with the
rule-based AI), surface **compact derived signals** to the LLM, and let the small model
spend its limited reasoning on *judgement among legal options* — not arithmetic.

If picking one off first: **forced-points detection** is the highest-value,
lowest-uncertainty signal — fully computable, no kitty ambiguity, and useful to both
leading and following.
