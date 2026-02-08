# Texas Hold'em — No-Limit Rules

Reference document for the poker engine. Every rule described here must be
implemented by the engine specified in `spec.md`.

---

## 1. Overview

- **Players**: 2–10 per table.
- **Deck**: Standard 52 cards (4 suits × 13 ranks). No jokers.
- **Objective**: Win chips by either having the best 5-card hand at showdown or
  by getting all other players to fold.

---

## 2. Setup

### Dealer Button

A virtual "button" rotates clockwise one seat after each hand. The button
determines the order of action.

### Blinds

Before any cards are dealt, two forced bets are posted:

| Position              | Amount    |
| --------------------- | --------- |
| **Small blind (SB)**  | ½ big blind (rounded down to the smallest chip) |
| **Big blind (BB)**    | 1× the table's chosen blind amount |

In **heads-up** (2 players), the dealer posts the small blind and acts first
preflop but last on all subsequent streets (see §11).

---

## 3. Dealing

1. Each player receives **2 hole cards** face-down.
2. Up to **5 community cards** are dealt face-up in the center across three
   stages (flop, turn, river).

---

## 4. Betting Rounds

A hand has up to four betting rounds ("streets"). If only one player remains
at any point, that player wins the pot immediately.

### 4.1 Preflop

- Begins after hole cards are dealt.
- Action starts with the player to the **left of the big blind** (under the
  gun, UTG).
- The big blind has the option to check or raise if no one has raised.

### 4.2 Flop

- Three community cards are dealt face-up.
- Action starts with the first **active** player to the left of the dealer.

### 4.3 Turn

- One additional community card is dealt.
- Same action order as the flop.

### 4.4 River

- One final community card is dealt (5 total on the board).
- Same action order as the flop.

### Betting Round Completion

A betting round ends when every active player has:

1. Put in the same amount of chips (or is all-in), **and**
2. Had at least one opportunity to act.

---

## 5. Player Actions

On a player's turn, they may perform exactly one of the following:

| Action    | When available | Description |
| --------- | -------------- | ----------- |
| **Fold**  | Always         | Surrender hole cards and forfeit any claim to the pot. |
| **Check** | No bet to call | Pass action without putting in chips. |
| **Bet**   | No prior bet in this round | Place the first wager of the round. Minimum bet = 1 big blind. |
| **Call**  | Facing a bet/raise | Match the current bet amount. |
| **Raise** | Facing a bet/raise | Increase the bet. The raise must be at least the size of the previous raise (or the big blind if first raise). |
| **All-in**| Always (as a bet, call, or raise) | Put all remaining chips into the pot. An all-in for less than the minimum raise does **not** reopen action to players who have already acted. |

### Minimum Raise Rule (No-Limit)

If a player raises, the raise increment must be ≥ the largest previous raise
increment in that round. Example:

- BB = 100. Player A raises to 300 (increment of 200). Player B must raise to
  at least 500 (300 + 200).

If a player goes all-in for less than a full raise, action is **not** reopened
to players who have already acted in that round.

---

## 6. No-Limit Betting Structure

- **Minimum bet/raise**: 1 big blind (or the previous raise increment,
  whichever is greater).
- **Maximum bet/raise**: A player's entire stack ("no limit").
- There is **no cap** on the number of raises per round.

---

## 7. Hand Rankings

Ranked from strongest (#1) to weakest (#10). The engine evaluates the best
5-card hand from each player's 2 hole cards + 5 community cards (7 cards total).

| Rank | Hand             | Description | Example |
| ---- | ---------------- | ----------- | ------- |
| 1    | **Royal Flush**     | A-K-Q-J-10, all same suit | A♠ K♠ Q♠ J♠ 10♠ |
| 2    | **Straight Flush**  | Five consecutive cards, same suit | 7♥ 8♥ 9♥ 10♥ J♥ |
| 3    | **Four of a Kind**  | Four cards of the same rank | 9♣ 9♦ 9♥ 9♠ K♦ |
| 4    | **Full House**      | Three of a kind + a pair | Q♣ Q♦ Q♠ 5♥ 5♣ |
| 5    | **Flush**           | Five cards of the same suit (not consecutive) | 2♦ 5♦ 8♦ J♦ A♦ |
| 6    | **Straight**        | Five consecutive cards, mixed suits | 4♣ 5♦ 6♠ 7♥ 8♣ |
| 7    | **Three of a Kind** | Three cards of the same rank | 7♣ 7♦ 7♠ K♥ 2♣ |
| 8    | **Two Pair**        | Two different pairs | J♣ J♠ 4♥ 4♦ A♠ |
| 9    | **One Pair**        | Two cards of the same rank | 10♥ 10♣ A♠ 8♦ 3♣ |
| 10   | **High Card**       | None of the above | A♠ J♦ 8♣ 5♥ 2♠ |

### Special Straights

- **Ace-high (Broadway)**: 10-J-Q-K-A
- **Ace-low (Wheel)**: A-2-3-4-5 (the ace plays low; this is the lowest
  straight)

---

## 8. Tie-Breaking & Kickers

When two or more players have the same hand rank:

1. **Straight Flush / Straight**: Highest top card wins. A-2-3-4-5 loses to
   any other straight (5 is the high card).
2. **Four of a Kind**: Higher quad wins. If tied (community quads), highest
   kicker wins.
3. **Full House**: Higher trips first, then higher pair.
4. **Flush**: Compare cards from highest to lowest.
5. **Three of a Kind**: Higher trips first, then kickers from highest to
   lowest.
6. **Two Pair**: Higher pair first, then lower pair, then kicker.
7. **One Pair**: Higher pair, then kickers from highest to lowest.
8. **High Card**: Compare cards from highest to lowest.

If hands are completely identical after all comparisons, the pot is **split
equally**. Odd chips go to the player closest to the left of the dealer.

---

## 9. Showdown

- Occurs after the final betting round (river) if two or more players remain.
- The last aggressor (player who made the last bet or raise) shows first. If
  there was no betting on the river, the first active player to the left of
  the dealer shows first.
- Players may **muck** (fold without showing) if they cannot beat the shown
  hand. The engine auto-evaluates all hands and awards the pot, but tracks
  whether a hand was voluntarily shown or mucked.
- If all opponents fold before showdown, the winner is **not** required to
  show.

---

## 10. Side Pots

When a player goes all-in for less than the current bet, a side pot is created.

### Algorithm

1. Sort all-in players by their total contribution (ascending).
2. For each all-in amount, create a pot that every eligible player has matched.
3. Players can only win from pots they contributed to.

### Example

- Player A: all-in for 100
- Player B: all-in for 300
- Player C: calls 300

**Main pot**: 100 × 3 = 300 (A, B, C eligible)
**Side pot 1**: 200 × 2 = 400 (B, C eligible)

If A has the best hand, A wins 300. The best hand among B and C wins 400. If B
has the best hand overall, B wins both pots (700).

---

## 11. Heads-Up (2-Player) Rules

When only two players remain (or the game starts with two players):

- The **dealer** posts the **small blind** and acts **first preflop**.
- The **non-dealer** posts the **big blind** and acts **first post-flop** (on
  flop, turn, river).
- All other rules remain the same.

---

## 12. End of Hand

A hand ends when:

1. All players but one have folded → sole remaining player wins the pot.
2. The river betting round completes → showdown determines the winner(s).

After the pot is awarded:

- The dealer button moves one seat clockwise.
- Players with 0 chips are eliminated (in a tournament context) or may rebuy
  (in a cash game context).
- A new hand begins.
