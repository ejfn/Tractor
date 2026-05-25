# Shengji (升级 / Tractor) Elite AI Rules & Strategy Guide

This guide is a comprehensive reference designed specifically for LLM-driven AI players to make elite strategic decisions in the Chinese card game Shengji (升级 / Tractor). It incorporates the exact strategic heuristics used by our advanced rule-based AI bot.

---

## 1. Core Game Setup & Role Dynamics

- **The Deck**: Played with 2 full standard decks including 4 Jokers (108 cards total). Identical duplicate cards exist (e.g., two "A♠").
- **Fixed Partnerships**:
  * **Team A**: 'human' (sitting South) and 'bot2' (sitting North)
  * **Team B**: 'bot1' (sitting East) and 'bot3' (sitting West)
  * Teammates sit opposite each other. Play proceeds counter-clockwise: **human -> bot1 -> bot2 -> bot3**.
- **Role Alignment**:
  * **Defending Team**: Wants to win tricks containing points and hold the attacking team under 80 points to defend and advance their rank.
  * **Attacking Team**: Wants to capture 80+ points in the round to take over the defend role and advance their rank.

---

## 2. The Shifting Trump Group & Strength Hierarchy

The entire Trump Group is treated as a single, unified "suit" for following leads and forming combinations. Any trump card beats any non-trump card of any suit.

A card is a **Trump** if:
1. It is a Joker (Big Joker 'BJ' or Small Joker 'SJ').
2. Its rank matches the **Trump Rank** of the current round.
3. Its suit matches the **Trump Suit** of the round.

### Trump Strength Hierarchy (Highest to Lowest)
1. **Big Joker (BJ)** — The absolute highest card in the game.
2. **Small Joker (SJ)** — The second highest card.
3. **Trump-Suit Rank Card** — The card matching both Trump Rank and Trump Suit (e.g. 2♠ when Spades is trump, rank 2).
4. **Off-Suit Rank Cards** — Cards matching the Trump Rank but of other suits (e.g. 2♥, 2♦, 2♣).
   - *Note: All equal off-suit trump rank cards have equal strength; among them, the first one played in the trick wins.*
5. **Regular Trump Suit Cards** — Cards of the declared Trump Suit ranked by face value (A > K > Q > J > 10 > 9 > 8 > 7 > 6 > 5 > 4 > 3, excluding the rank card).

### Regular Non-Trump Suits Hierarchy
- Within each off-suit (Spades, Hearts, Clubs, Diamonds): **A > K > Q > J > 10 > 9 > 8 > 7 > 6 > 5 > 4 > 3**.
- Different non-trump suits cannot beat each other (e.g., a high Heart cannot beat a low Diamond unless it is played as a Trump-in).

---

## 3. Card Combinations

- **Single**: Any individual card.
- **Pair**: Exactly two IDENTICAL cards (same suit AND same rank, e.g. A♠-A♠ or SJ-SJ). Two different suits (e.g. A♠-A♦) or different jokers (SJ-BJ) do **NOT** form a pair.
- **Tractor**: Two or more consecutive pairs of the exact same suit or trump group (minimum 2 pairs / 4 cards).
- **Multi-Combo**: Multiple combinations of the same suit (e.g. K♠K♠ + Q♠ + 7♠) led simultaneously. 
  - Leading Multi-Combos are **ONLY** valid if every individual component combination is unbeatable by any cards held by other players.
  - **CRITICAL**: A leading Multi-Combo MUST be from a single non-trump suit only. You **CANNOT** lead a trump multi-combo! Trump cards can only be led as straight Single, Pair, or Tractor combos.

---

## 4. Advanced Tractor Formation Rules

Tractors in Shengji follow strict consecutive ranking:
1. **Regular Suit Consecutive**: Pairs must be consecutive in face value (A followed by K, K by Q, etc.).
2. **Rank-Skip**: If the round's Trump Rank bridges a gap in a suit, consecutive pairs skip that rank to form a tractor.
   - *Example*: If the round's Trump Rank is 7, then 6♠6♠ and 8♠8♠ form consecutive pairs (6-8, skipping 7).
3. **Trump Group Tractors**: In the trump group, consecutive rank value for tractors is defined as:
   - **A of Trump Suit** $\rightarrow$ **Off-Suit Trump Rank Pairs** $\rightarrow$ **Trump-Suit Trump Rank Pair** $\rightarrow$ **Small Joker Pair (SJ-SJ)** $\rightarrow$ **Big Joker Pair (BJ-BJ)**.
   - *Valid Trump Tractors*:
     * **A of Trump Suit + Off-Suit Trump Rank**: A♣A♣-2♥2♥ (when 2 is rank, Clubs is trump).
     * **Off-Suit Trump Rank + Trump-Suit Trump Rank**: 2♥2♥-2♣2♣ (off-suit + trump-suit rank pair).
     * **Trump-Suit Trump Rank + Small Joker**: 2♣2♣-SJSJ.
     * **Small Joker + Big Joker**: SJSJ-BJBJ.
   - *Constraint*: Off-suit rank pairs do **NOT** form tractors with each other (e.g. 2♥2♥-2♦2♦ is invalid).

---

## 5. How to Lead (Scoring-Based Strategic Leads)

Leading is your most powerful tool to control the tempo of the game. Our advanced AI scores candidate leads based on these precise rules:

### A. Non-Trump Leading Strategy (Strongly Preferred Early Game)
- **High-Value Ace/King Lead (+50 Bonus)**: Always prefer to lead a non-trump Ace (or a King if Ace is the trump rank). These cards have a very high likelihood of winning, allowing you to secure the lead safely and draw out low cards.
- **Unbeatable Combination Lead (+50 Bonus)**: If a combination (Single, Pair, or Tractor) is mathematically unbeatable, it is a perfect lead.
- **Teammate Void suit Lead (+35 Bonus)**: If your partner is void in a non-trump suit, leading it is highly strategic because your partner can **trump-in** (cut) to win the trick and capture points.
- **Avoid Opponent Void suits (-25 Penalty)**: Do **not** lead a non-trump suit if an opponent is void in it, as they will trump-in and steal your high card.
- **Never Lead Point Cards Prematurely (Point Penalty)**: Point cards (10s and Kings) carry a heavy penalty when led unless they are unbeatable. Leading a 10 or King that is beatable allows opponents to win the trick and steal those points!
- **Dumping Short Suits**: Leading low cards in suits where you only hold 1 or 2 cards helps clear the suit from your hand, creating a void so you can trump-in later.

### B. Trump Leading Strategy (Highly Restricted)
- **Single Trump Penalty**: Leading single trump cards is heavily penalized early in the game (Big Joker -20, Small Joker -19, rank cards -15, regular trumps negative rank value). This prevents wasting your ultimate defensive assets on low-value tricks.
- **Trump Pairs (+40 Bonus)**: Unlike single trumps, leading a trump pair (e.g. 2♥-2♥ or 5♣-5♣) is highly encouraged because it is very difficult to beat and exerts immense pressure on opponents' trump hands.
- **Trump Stage Promotions**: Leading single trumps becomes acceptable only in the:
  - **Mid-Stage** (after >12 trumps are played, +5 rank bonus) to bleed remaining low trumps.
  - **Late-Stage** (after >24 trumps are played, +10 high-card bonus) to draw out opponents' remaining high trumps.

---

## 6. How to Follow (Strict Priorities & Resource Preservation)

When a trick is led, followers must play the exact same number of cards and obey these strict priorities:

### Following Priority Rules
1. **Priority 1: Count Match & Suit Following**: If you have cards of the led suit/group in your hand, you MUST play them. Do not play other suits.
2. **Priority 2: Tractor Matching**: If a Tractor is led and you have a tractor of the same size in that suit, you must play it. If not, you must play as many pairs as possible (up to the required card count).
3. **Priority 3: Pair Preservation & Priorities (checkSameSuitPairPreservation)**:
   - If a Pair is led and you have a pair in the led suit/group, you MUST follow with a pair. You cannot break up your pair or play singles instead.
   - **Preservation**: If you play any card from a pair in the led suit, you must play the other card of that pair to avoid breaking/preservation violations (unless forced by card count).
4. **Priority 4: Anti-Cheat Validation (validateAntiCheatStructure)**:
   - You must play your highest available combinations in the led suit. You cannot intentionally play singles to "save" pairs of that suit from being played.
5. **Priority 5: Trump-in / Cutting Rules**:
   - If you are void in the led suit, you can play trump cards to cut and attempt to win.
   - **Combination matching is strict for cutting**: To beat a led pair, you must play a trump pair. Playing two single trumps does not count as a pair and cannot beat the led pair.

### Heuristic Card Preservation Strategies
* **Tractor Preservation**: When playing pairs to follow a led single pair, prioritze standalone pairs first to avoid breaking up active **Tractors** in your hand.
* **Pair Preservation**: When playing singles to follow a led single card, prioritize playing unpaired cards (singles) first to avoid breaking up active **Pairs** in your hand.

### Discarding Strategy (When Out of Led Suit & Not Cutting)
* **Teammate Win Guarantee (Feeding)**: Only feed point cards (**5, 10, K**) to your teammate if they are **guaranteed to win the trick** (e.g. you are the last player in the trick, or their played card is mathematically unbeatable based on cards played).
* **Dumping Useless Cards**: If opponents are winning and you cannot beat them, discard your lowest non-point cards to deny them points, and conserve your high cards for later.

---

## 7. Using Trick History as the Strategic Source of Truth

An elite player never plays cards in a vacuum. You must analyze the **Trick History** (previous tricks) and **Current Plays** to make optimal strategic decisions:

### A. Card Counting (Tracking Outstanding Cards)
- Always track which high cards (Aces, Kings) of each suit have already been played.
- **Why?** If the A♣ and K♣ have been played, your Q♣ is now the absolute highest outstanding card in Clubs! It is a guaranteed winner. If you lead it, no opponent can beat it unless they trump-in.
- **Trump Tracking**: Monitor the played Jokers (BJ and SJ) and rank cards. If the Big Joker is gone, the Small Joker is now the supreme card. If both Jokers are played, your high trump-suit cards become the ultimate weapons.

### B. Suit Void Analysis (Detecting Voids)
- Watch the previous plays carefully to see which players failed to follow suit:
  - If **Bot 1 (opponent)** discarded a Heart on a Spade lead, **Bot 1 is void in Spades**.
  - **Strategic Adjustment**: If you lead Spades, Bot 1 will likely trump-in and steal your trick. Avoid leading Spades unless you want to force Bot 1 to waste a trump card.
  - If **Bot 2 (your partner)** is void in Diamonds:
  - **Strategic Adjustment**: Leading a Diamond is highly strategic because your partner can trump-in to win the trick and capture any points!

### C. Point Tracking & Point Pressure
- Keep track of the current points collected in the round:
  - **Attacking Team Point Pressure**: If your team is attacking and points are low (<24 points), pressure is **HIGH**; play aggressively to capture points. If points are high (>56 points), pressure is **LOW**; you can play more conservatively.
  - **Defending Team Point Pressure**: If your team is defending and attacking team points are low (<24 points), pressure is **LOW**; you are defending successfully. If points are high (>56 points), pressure is **HIGH**; defend aggressively and save your highest cards to deny points.

### D. Leading Patterns & Hand Strength Deduction (Reading Leads)
By watching the choices of a player when they lead a trick, you can dynamically deduce their remaining hand composition:
- **Ace then Trump Lead**: If a player leads a non-trump Ace (winning the trick), and immediately leads a Trump card in the very next trick, this strongly signals they **have no more safe non-trump winners (Aces or unbeatable pairs)** left in their off-suits. They are now either forced to lead trumps because they have no other safe entries, or they hold a dominant trump hand and are transitioning to bleed everyone's trumps.
- **Low Off-Suit Lead**: If a player leads a low off-suit card (e.g. leading a 4♦ or 5♠), it typically implies they are void-depleting (clearing their short suits to gain trump-in capability) or trying to feed/locate their partner's high cards in that suit.
- **Pair/Tractor Leads**: Leading an off-suit pair or tractor early indicates they hold highly structured combinations in that suit and are driving the tempo.

---

## 8. Multi-Combo Beating & Beating Comparison

1. **Trump Multi-Combo Beating**:
   - A follower completely void in the led suit can beat a leading non-trump multi-combo by playing a trump multi-combo.
   - **Structure Match**: The trump multi-combo must match or exceed the exact structural components (pairs, tractors, singles) and have the **exact same total card count** as the lead.
2. **Trump vs Trump Multi-Combo Comparison**:
   - If multiple players play a trump multi-combo, the winner is determined by comparing their highest combination types:
     * Compare the biggest **Tractor** component.
     * If no tractors exist, compare the biggest **Pair** component.
     * If no pairs exist, compare the biggest **Single** card.
