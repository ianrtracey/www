# Poker Engine — Technical Specification

Implements the rules defined in `rules.md` as a server-side engine with REST
API routes, backed by SQLite.

---

## 1. Stack

| Layer      | Technology |
| ---------- | ---------- |
| Framework  | Next.js 15 App Router |
| Language   | TypeScript (strict) |
| ORM        | Drizzle ORM |
| Database   | SQLite via `@libsql/client` |
| Tests      | Vitest |

### SQLite Deployment Strategy

Vercel serverless functions have ephemeral filesystems — `better-sqlite3`
cannot persist data in production. We use `@libsql/client` which supports three
connection modes with **identical** schema and ORM code:

| Mode       | Connection string       | Use case |
| ---------- | ----------------------- | -------- |
| Local file | `file:data/poker.db`    | Development (`npm run dev`) |
| In-memory  | `file::memory:`         | Tests (`vitest`) |
| Turso      | `libsql://your-db.turso.io` | Production (free tier) |

Environment variable: `DATABASE_URL` (defaults to `file:data/poker.db`).

---

## 2. New Dependencies

```jsonc
// package.json additions
{
  "dependencies": {
    "drizzle-orm": "^0.38",
    "@libsql/client": "^0.14"
  },
  "devDependencies": {
    "drizzle-kit": "^0.30",
    "vitest": "^3.0"
  },
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

---

## 3. File Structure

```
lib/poker/
├── db/
│   ├── client.ts            # @libsql/client singleton, reads DATABASE_URL
│   ├── schema.ts            # Drizzle table definitions
│   └── migrate.ts           # Run migrations programmatically
├── engine/
│   ├── deck.ts              # Shuffle, deal
│   ├── hand-evaluator.ts    # Evaluate best 5 of 7 cards
│   ├── betting.ts           # Validate actions, manage pots
│   └── game-controller.ts   # Orchestrate full hand lifecycle
├── types.ts                 # Shared TypeScript types
└── __tests__/
    ├── deck.test.ts
    ├── hand-evaluator.test.ts
    ├── betting.test.ts
    ├── game-controller.test.ts
    └── api.test.ts

app/api/poker/
├── games/
│   └── route.ts             # POST: create game
├── games/[gameId]/
│   ├── route.ts             # GET: game state
│   └── join/
│       └── route.ts         # POST: join game
├── games/[gameId]/hands/
│   └── route.ts             # POST: start new hand
├── games/[gameId]/hands/[handId]/
│   ├── route.ts             # GET: hand state
│   └── actions/
│       └── route.ts         # POST: player action

data/                        # SQLite file (gitignored)
drizzle/                     # Generated migrations
drizzle.config.ts            # Drizzle Kit config
```

---

## 4. Database Schema

Six tables. All IDs are `text` (ULIDs or UUIDs).

### 4.1 `players`

| Column       | Type    | Notes |
| ------------ | ------- | ----- |
| `id`         | text PK | |
| `name`       | text    | Unique, not null |
| `created_at` | integer | Unix timestamp ms |

### 4.2 `games`

| Column        | Type    | Notes |
| ------------- | ------- | ----- |
| `id`          | text PK | |
| `small_blind` | integer | Chip amount |
| `big_blind`   | integer | Chip amount |
| `status`      | text    | `waiting`, `active`, `finished` |
| `created_at`  | integer | Unix timestamp ms |

### 4.3 `game_players`

| Column      | Type    | Notes |
| ----------- | ------- | ----- |
| `id`        | text PK | |
| `game_id`   | text FK → games | |
| `player_id` | text FK → players | |
| `seat`      | integer | 0-9 |
| `chips`     | integer | Current stack |
| `status`    | text    | `active`, `sitting_out`, `eliminated` |

### 4.4 `hands`

| Column          | Type    | Notes |
| --------------- | ------- | ----- |
| `id`            | text PK | |
| `game_id`       | text FK → games | |
| `hand_number`   | integer | Sequential within game |
| `dealer_seat`   | integer | Seat of the button |
| `community_cards` | text  | JSON array of Card, e.g. `["Ah","Kd","7s"]` |
| `phase`         | text    | `preflop`, `flop`, `turn`, `river`, `showdown`, `complete` |
| `pots`          | text    | JSON array of Pot objects (see §5) |
| `deck_state`    | text    | JSON — remaining deck (encrypted or hashed in future) |
| `current_seat`  | integer | Seat whose turn it is |
| `last_raise`    | integer | Size of the last raise increment |
| `created_at`    | integer | Unix timestamp ms |

### 4.5 `hand_players`

| Column       | Type    | Notes |
| ------------ | ------- | ----- |
| `id`         | text PK | |
| `hand_id`    | text FK → hands | |
| `game_player_id` | text FK → game_players | |
| `seat`       | integer | Copied from game_players for quick access |
| `hole_cards` | text    | JSON array of 2 Card strings |
| `status`     | text    | `active`, `folded`, `all_in` |
| `bet`        | integer | Chips bet in current round |
| `total_bet`  | integer | Total chips bet across all rounds this hand |

### 4.6 `actions`

| Column         | Type    | Notes |
| -------------- | ------- | ----- |
| `id`           | text PK | |
| `hand_id`      | text FK → hands | |
| `hand_player_id` | text FK → hand_players | |
| `phase`        | text    | Phase when action occurred |
| `action_type`  | text    | `fold`, `check`, `bet`, `call`, `raise`, `all_in` |
| `amount`       | integer | Chips (0 for fold/check) |
| `sequence`     | integer | Order within hand |
| `created_at`   | integer | Unix timestamp ms |

### Drizzle Schema (sketch)

```typescript
// lib/poker/db/schema.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const players = sqliteTable("players", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: integer("created_at").notNull(),
});

export const games = sqliteTable("games", {
  id: text("id").primaryKey(),
  smallBlind: integer("small_blind").notNull(),
  bigBlind: integer("big_blind").notNull(),
  status: text("status", { enum: ["waiting", "active", "finished"] }).notNull(),
  createdAt: integer("created_at").notNull(),
});

export const gamePlayers = sqliteTable("game_players", {
  id: text("id").primaryKey(),
  gameId: text("game_id").notNull().references(() => games.id),
  playerId: text("player_id").notNull().references(() => players.id),
  seat: integer("seat").notNull(),
  chips: integer("chips").notNull(),
  status: text("status", {
    enum: ["active", "sitting_out", "eliminated"],
  }).notNull(),
});

export const hands = sqliteTable("hands", {
  id: text("id").primaryKey(),
  gameId: text("game_id").notNull().references(() => games.id),
  handNumber: integer("hand_number").notNull(),
  dealerSeat: integer("dealer_seat").notNull(),
  communityCards: text("community_cards").notNull().default("[]"),
  phase: text("phase", {
    enum: ["preflop", "flop", "turn", "river", "showdown", "complete"],
  }).notNull(),
  pots: text("pots").notNull().default("[]"),
  deckState: text("deck_state").notNull(),
  currentSeat: integer("current_seat"),
  lastRaise: integer("last_raise").notNull().default(0),
  createdAt: integer("created_at").notNull(),
});

export const handPlayers = sqliteTable("hand_players", {
  id: text("id").primaryKey(),
  handId: text("hand_id").notNull().references(() => hands.id),
  gamePlayerId: text("game_player_id").notNull().references(() => gamePlayers.id),
  seat: integer("seat").notNull(),
  holeCards: text("hole_cards").notNull(),
  status: text("status", {
    enum: ["active", "folded", "all_in"],
  }).notNull(),
  bet: integer("bet").notNull().default(0),
  totalBet: integer("total_bet").notNull().default(0),
});

export const actions = sqliteTable("actions", {
  id: text("id").primaryKey(),
  handId: text("hand_id").notNull().references(() => hands.id),
  handPlayerId: text("hand_player_id").notNull().references(() => handPlayers.id),
  phase: text("phase").notNull(),
  actionType: text("action_type", {
    enum: ["fold", "check", "bet", "call", "raise", "all_in"],
  }).notNull(),
  amount: integer("amount").notNull().default(0),
  sequence: integer("sequence").notNull(),
  createdAt: integer("created_at").notNull(),
});
```

---

## 5. TypeScript Types

```typescript
// lib/poker/types.ts

// ── Cards ──────────────────────────────────────────────

export type Suit = "s" | "h" | "d" | "c"; // spades, hearts, diamonds, clubs
export type Rank =
  | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
  | "T" | "J" | "Q" | "K" | "A";

/** Two-character string, e.g. "Ah", "Td", "2c" */
export type Card = `${Rank}${Suit}`;

// ── Hand Evaluation ────────────────────────────────────

export enum HandRank {
  RoyalFlush = 1,
  StraightFlush = 2,
  FourOfAKind = 3,
  FullHouse = 4,
  Flush = 5,
  Straight = 6,
  ThreeOfAKind = 7,
  TwoPair = 8,
  OnePair = 9,
  HighCard = 10,
}

export interface EvaluatedHand {
  rank: HandRank;
  /** Cards composing the best 5-card hand, ordered for display. */
  cards: [Card, Card, Card, Card, Card];
  /**
   * Numeric score for comparison. Lower = better.
   * Format: rank * 10^10 + tiebreaker encoding.
   * Two hands with the same score are an exact tie (split pot).
   */
  score: number;
}

// ── Game State ─────────────────────────────────────────

export type Phase =
  | "preflop"
  | "flop"
  | "turn"
  | "river"
  | "showdown"
  | "complete";

export type ActionType =
  | "fold"
  | "check"
  | "bet"
  | "call"
  | "raise"
  | "all_in";

export type GameStatus = "waiting" | "active" | "finished";

export type PlayerStatus = "active" | "sitting_out" | "eliminated";

export type HandPlayerStatus = "active" | "folded" | "all_in";

export interface Pot {
  amount: number;
  /** game_player IDs eligible to win this pot. */
  eligible: string[];
}

// ── API Request / Response ─────────────────────────────

export interface CreateGameRequest {
  smallBlind: number;
  bigBlind: number;
}

export interface JoinGameRequest {
  playerId: string;
  buyIn: number;
}

export interface PlayerActionRequest {
  playerId: string;
  action: ActionType;
  amount?: number; // required for bet/raise
}

export interface GameStateResponse {
  id: string;
  status: GameStatus;
  smallBlind: number;
  bigBlind: number;
  players: {
    id: string;
    name: string;
    seat: number;
    chips: number;
    status: PlayerStatus;
  }[];
  currentHandId: string | null;
}

export interface HandStateResponse {
  id: string;
  handNumber: number;
  phase: Phase;
  communityCards: Card[];
  pots: Pot[];
  currentSeat: number | null;
  players: {
    gamePlayerId: string;
    name: string;
    seat: number;
    status: HandPlayerStatus;
    bet: number;
    /** Only included for the requesting player. */
    holeCards?: Card[];
  }[];
  /** Available actions for the current player, if it's their turn. */
  availableActions?: {
    action: ActionType;
    minAmount?: number;
    maxAmount?: number;
  }[];
  /** Populated after showdown. */
  results?: {
    gamePlayerId: string;
    holeCards: Card[];
    bestHand: EvaluatedHand | null; // null if folded
    winnings: number;
  }[];
}
```

---

## 6. Engine Modules

### 6.1 `deck.ts` — Deck Management

```typescript
export function createDeck(): Card[];          // Ordered 52-card deck
export function shuffle(deck: Card[]): Card[]; // Fisher-Yates shuffle
export function deal(deck: Card[], n: number): { dealt: Card[]; remaining: Card[] };
```

- `shuffle` uses `crypto.getRandomValues` for uniform randomness.
- `deal` takes from the front of the array (top of deck).

### 6.2 `hand-evaluator.ts` — Hand Evaluation

```typescript
export function evaluate(cards: Card[]): EvaluatedHand;
export function compareHands(a: EvaluatedHand, b: EvaluatedHand): number;
```

**Algorithm** — brute-force C(7,5) = 21 combinations:

1. Receive 7 cards (2 hole + 5 community).
2. Generate all 21 five-card combinations.
3. Classify each combination (see ranking logic below).
4. Return the combination with the lowest (best) score.

**Scoring scheme** (`score` field):

```
score = rank * 10_000_000_000
      + primary   * 100_000_000
      + secondary *   1_000_000
      + kicker1   *      10_000
      + kicker2   *         100
      + kicker3
```

Each component is the rank value (2=2, 3=3, ..., T=10, J=11, Q=12, K=13,
A=14, except A=1 in a wheel straight).

| Hand            | primary         | secondary     | kickers (up to 3) |
| --------------- | --------------- | ------------- | ------------------ |
| Royal Flush     | 14 (ace)        | 0             | — |
| Straight Flush  | high card       | 0             | — |
| Four of a Kind  | quad rank       | 0             | kicker1 |
| Full House      | trips rank      | pair rank     | — |
| Flush           | highest card    | 2nd           | 3rd, 4th, 5th |
| Straight        | high card       | 0             | — |
| Three of a Kind | trips rank      | 0             | kicker1, kicker2 |
| Two Pair        | higher pair     | lower pair    | kicker1 |
| One Pair        | pair rank       | 0             | kicker1, kicker2, kicker3 |
| High Card       | highest card    | 2nd           | 3rd, 4th, 5th |

`compareHands(a, b)` returns negative if `a` wins, positive if `b` wins, 0 for
a tie (since lower score = better hand).

### 6.3 `betting.ts` — Betting Logic

```typescript
export interface BettingState {
  players: HandPlayerState[];
  phase: Phase;
  bigBlind: number;
  lastRaise: number;
  currentSeat: number;
}

export function getAvailableActions(state: BettingState): AvailableAction[];
export function applyAction(
  state: BettingState,
  action: ActionType,
  amount: number
): BettingState;
export function isRoundComplete(state: BettingState): boolean;
export function buildPots(players: HandPlayerState[]): Pot[];
```

**`getAvailableActions`** returns the legal actions for `currentSeat`:

- **fold**: always available (unless checked around).
- **check**: if player's bet matches the current max bet.
- **call**: if player's bet < max bet. Amount = max bet − player's bet,
  capped at player's remaining chips.
- **bet**: if no bet has been made this round. Min = big blind, max = player's
  stack.
- **raise**: if a bet exists. Min raise = last raise increment (or big blind),
  max = player's stack.
- **all_in**: always available. Subsumes bet/call/raise when the amount equals
  the player's remaining chips.

**`applyAction`** validates the action, mutates chip counts and bet amounts,
and advances `currentSeat` to the next active player.

**`isRoundComplete`** returns `true` when all active/non-all-in players have
acted and their bets are equal.

**`buildPots`** — side pot algorithm (see §8).

### 6.4 `game-controller.ts` — Hand Lifecycle

```typescript
export async function startHand(gameId: string): Promise<HandStateResponse>;
export async function handleAction(
  handId: string,
  playerId: string,
  action: ActionType,
  amount?: number
): Promise<HandStateResponse>;
```

**`startHand`**:

1. Validate game has ≥ 2 active players.
2. Advance dealer button.
3. Create & shuffle deck.
4. Post blinds (respecting heads-up rules per `rules.md` §11).
5. Deal 2 hole cards to each active player.
6. Set phase to `preflop`, current seat to UTG (or dealer in heads-up).
7. Persist to DB and return state.

**`handleAction`**:

1. Validate it's this player's turn.
2. Validate the action is legal (`getAvailableActions`).
3. Apply action (`applyAction`).
4. Check if betting round is complete (`isRoundComplete`).
   - **Yes, and phase < river**: advance phase, deal community cards, reset
     bets, set next current seat.
   - **Yes, and phase = river**: go to showdown.
   - **Yes, and only 1 active player**: award pot, go to complete.
   - **No**: persist and return state.
5. On showdown: evaluate hands, determine winners per pot, distribute chips,
   set phase to `complete`.
6. Persist to DB and return state.

---

## 7. API Routes

All routes return JSON. Errors return `{ error: string }` with appropriate
HTTP status codes.

### 7.1 `POST /api/poker/games`

Create a new game.

- **Body**: `CreateGameRequest`
- **Response**: `GameStateResponse` (201)

### 7.2 `POST /api/poker/games/[gameId]/join`

Join an existing game.

- **Body**: `JoinGameRequest`
- **Response**: `GameStateResponse` (200)
- **Errors**: 404 (game not found), 400 (game full / already joined)

### 7.3 `GET /api/poker/games/[gameId]`

Get current game state.

- **Query**: `?playerId=...` (optional, to include private info)
- **Response**: `GameStateResponse` (200)

### 7.4 `POST /api/poker/games/[gameId]/hands`

Start a new hand. Only valid when no hand is in progress.

- **Response**: `HandStateResponse` (201)
- **Errors**: 400 (hand in progress), 400 (< 2 players)

### 7.5 `GET /api/poker/games/[gameId]/hands/[handId]`

Get hand state.

- **Query**: `?playerId=...` (to include hole cards for that player)
- **Response**: `HandStateResponse` (200)

### 7.6 `POST /api/poker/games/[gameId]/hands/[handId]/actions`

Submit a player action.

- **Body**: `PlayerActionRequest`
- **Response**: `HandStateResponse` (200)
- **Errors**: 400 (not your turn / invalid action), 404

---

## 8. Side Pot Algorithm

Implements `rules.md` §10.

```
function buildPots(players):
  activePlayers = players not folded, sorted by totalBet ascending
  pots = []
  previousLevel = 0

  for each player in activePlayers:
    if player.totalBet > previousLevel:
      potAmount = 0
      eligible = []

      for each p in all non-folded players:
        contribution = min(p.totalBet, player.totalBet) - previousLevel
        if contribution > 0:
          potAmount += contribution
        if p.status != "folded" and p.totalBet >= player.totalBet:
          eligible.push(p.id)

      if potAmount > 0:
        pots.push({ amount: potAmount, eligible })
      previousLevel = player.totalBet

  return pots
```

---

## 9. Game Flow State Machine

```
                    ┌─────────────┐
                    │   WAITING   │ ← create game
                    └──────┬──────┘
                           │ start hand (≥2 players)
                           ▼
                    ┌─────────────┐
          ┌────────│   PREFLOP   │◄──── deal hole cards, post blinds
          │        └──────┬──────┘
          │               │ round complete
          │               ▼
          │        ┌─────────────┐
          │   ┌────│    FLOP     │◄──── deal 3 community cards
          │   │    └──────┬──────┘
          │   │           │ round complete
          │   │           ▼
          │   │    ┌─────────────┐
          │   │ ┌──│    TURN     │◄──── deal 1 community card
          │   │ │  └──────┬──────┘
          │   │ │         │ round complete
          │   │ │         ▼
          │   │ │  ┌─────────────┐
          │   │ │  │    RIVER    │◄──── deal 1 community card
          │   │ │  └──────┬──────┘
          │   │ │         │ round complete
          │   │ │         ▼
          │   │ │  ┌─────────────┐
          │   │ │  │  SHOWDOWN   │──── evaluate hands, award pots
          │   │ │  └──────┬──────┘
          │   │ │         │
          ▼   ▼ ▼         ▼
        ┌───────────────────────┐
        │       COMPLETE        │──── update chips, rotate button
        └───────────┬───────────┘
                    │ start next hand
                    ▼
              (back to PREFLOP)

  * Any street: if only 1 player remains → skip to COMPLETE
  * Any street: if all remaining players are all-in → deal remaining
    community cards, skip to SHOWDOWN (no further betting rounds)
```

---

## 10. Hand Evaluation — Classification Logic

For a given 5-card combination:

1. **Check flush**: all 5 cards share a suit.
2. **Check straight**: 5 consecutive ranks (handle A-low: A,2,3,4,5).
3. **Count rank frequencies**: e.g., `{K: 3, 7: 2}` → full house.

Decision tree:

```
if flush AND straight:
  if high card == A → Royal Flush
  else → Straight Flush
else if 4-of-a-kind → Four of a Kind
else if 3-of-a-kind AND pair → Full House
else if flush → Flush
else if straight → Straight
else if 3-of-a-kind → Three of a Kind
else if two pairs → Two Pair
else if one pair → One Pair
else → High Card
```

---

## 11. Test Plan

### Unit Tests (~35 cases)

#### `deck.test.ts`

| # | Test | Assertion |
|---|------|-----------|
| 1 | `createDeck` returns 52 unique cards | length = 52, no duplicates |
| 2 | `shuffle` returns all 52 cards | same set, different order |
| 3 | `shuffle` is not identical to input | order differs (statistical) |
| 4 | `deal(deck, 2)` returns 2 cards and 50 remaining | lengths correct |
| 5 | `deal(deck, 52)` empties the deck | remaining = [] |

#### `hand-evaluator.test.ts`

| # | Test | Assertion |
|---|------|-----------|
| 6  | Royal flush detected           | rank = RoyalFlush |
| 7  | Straight flush detected         | rank = StraightFlush |
| 8  | Four of a kind detected         | rank = FourOfAKind |
| 9  | Full house detected             | rank = FullHouse |
| 10 | Flush detected                  | rank = Flush |
| 11 | Straight detected               | rank = Straight |
| 12 | Three of a kind detected        | rank = ThreeOfAKind |
| 13 | Two pair detected               | rank = TwoPair |
| 14 | One pair detected               | rank = OnePair |
| 15 | High card detected              | rank = HighCard |
| 16 | Ace-low straight (wheel)        | rank = Straight, high card = 5 |
| 17 | Broadway straight               | rank = Straight, high card = A |
| 18 | Best 5 of 7 selected            | full house chosen over two pair |
| 19 | Kicker comparison: higher kicker wins | compareHands < 0 |
| 20 | Exact tie returns 0             | compareHands = 0 |
| 21 | Full house beats flush          | compareHands < 0 |
| 22 | Higher flush beats lower flush  | compare top cards |
| 23 | Two pair tiebreak by kicker     | compareHands reflects kicker |

#### `betting.test.ts`

| # | Test | Assertion |
|---|------|-----------|
| 24 | Fold removes player from active     | status = folded |
| 25 | Check valid when no bet to call     | action succeeds |
| 26 | Check invalid when facing a bet     | error thrown |
| 27 | Bet below minimum rejected          | error thrown |
| 28 | Raise below minimum increment rejected | error thrown |
| 29 | Call deducts correct amount          | chips reduced by difference |
| 30 | All-in for less than call is valid   | does not reopen action |
| 31 | All-in for less than min raise does not reopen | next player skipped |
| 32 | Round complete after all players act | isRoundComplete = true |
| 33 | Round not complete mid-action        | isRoundComplete = false |
| 34 | Side pot: 2 all-ins at different amounts | correct pot structure |
| 35 | Side pot: 3 players, 1 all-in       | main pot + side pot |
| 36 | Side pot: all equal bets = 1 pot    | single pot, all eligible |

### Integration Tests (~15 cases)

#### `game-controller.test.ts`

| # | Test | Assertion |
|---|------|-----------|
| 37 | Start hand with 2 players (heads-up) | dealer = SB, correct positions |
| 38 | Start hand with 3+ players           | blinds posted correctly |
| 39 | Full hand: everyone folds to BB       | BB wins pot |
| 40 | Full hand: call to showdown           | best hand wins |
| 41 | Full hand: all-in and side pot        | pots awarded correctly |
| 42 | Consecutive hands: button rotates     | dealer seat advances |
| 43 | Player eliminated when chips = 0     | status = eliminated, skipped next hand |
| 44 | All community cards dealt when all-in on flop | river reached |

#### `api.test.ts`

| # | Test | Assertion |
|---|------|-----------|
| 45 | POST /games creates a game             | 201, valid response |
| 46 | POST /games/.../join adds player       | player in response |
| 47 | POST /games/.../join when full         | 400 error |
| 48 | POST /games/.../hands starts hand      | 201, phase = preflop |
| 49 | POST .../actions with valid fold       | 200, player folded |
| 50 | POST .../actions when not your turn    | 400 error |
| 51 | GET /games/.../hands/[id] hides others' cards | holeCards absent |
| 52 | GET /games/.../hands/[id] shows own cards     | holeCards present |

---

## 12. Implementation Sequence

Build in this order — each step is independently testable.

| Step | Module | Description | Tests to pass |
| ---- | ------ | ----------- | ------------- |
| 1 | Setup | Install deps, configure Drizzle, create schema, run first migration | DB connects |
| 2 | `deck.ts` | Implement deck creation, shuffle, deal | #1–5 |
| 3 | `hand-evaluator.ts` | Implement evaluation + comparison | #6–23 |
| 4 | `betting.ts` — actions | Implement getAvailableActions, applyAction | #24–33 |
| 5 | `betting.ts` — pots | Implement buildPots (side pots) | #34–36 |
| 6 | `game-controller.ts` | Implement startHand + handleAction | #37–44 |
| 7 | API routes | Wire up all 6 routes | #45–52 |
| 8 | Heads-up edge cases | Verify 2-player blind/position logic | #37 revisited |
| 9 | Polish | Error messages, input validation, edge cases | All pass |
| 10 | Deploy | Configure Turso, env vars, verify prod | Manual smoke test |

---

## 13. Configuration Changes

### `tsconfig.json`

Change `target` from `"es5"` to `"es2022"` (needed for `crypto.getRandomValues`
and modern features used by Drizzle):

```jsonc
{
  "compilerOptions": {
    "target": "es2022"
    // ... rest unchanged
  }
}
```

### `drizzle.config.ts` (new file)

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/poker/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:data/poker.db",
  },
});
```

### `.gitignore` additions

```
data/
drizzle/
```

### `package.json` script additions

See §2 for the full list.

### Environment variables

| Variable       | Required | Default | Notes |
| -------------- | -------- | ------- | ----- |
| `DATABASE_URL` | No       | `file:data/poker.db` | Use `libsql://...` for Turso |
| `TURSO_AUTH_TOKEN` | Prod only | — | Auth token for Turso remote DB |
