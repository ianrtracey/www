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
  status: text("status", {
    enum: ["waiting", "active", "finished"],
  }).notNull(),
  createdAt: integer("created_at").notNull(),
});

export const gamePlayers = sqliteTable("game_players", {
  id: text("id").primaryKey(),
  gameId: text("game_id")
    .notNull()
    .references(() => games.id),
  playerId: text("player_id")
    .notNull()
    .references(() => players.id),
  seat: integer("seat").notNull(),
  chips: integer("chips").notNull(),
  status: text("status", {
    enum: ["active", "sitting_out", "eliminated"],
  }).notNull(),
});

export const hands = sqliteTable("hands", {
  id: text("id").primaryKey(),
  gameId: text("game_id")
    .notNull()
    .references(() => games.id),
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
  handId: text("hand_id")
    .notNull()
    .references(() => hands.id),
  gamePlayerId: text("game_player_id")
    .notNull()
    .references(() => gamePlayers.id),
  seat: integer("seat").notNull(),
  holeCards: text("hole_cards").notNull(),
  status: text("status", {
    enum: ["active", "folded", "all_in"],
  }).notNull(),
  bet: integer("bet").notNull().default(0),
  totalBet: integer("total_bet").notNull().default(0),
  hasActed: integer("has_acted").notNull().default(0),
});

export const actions = sqliteTable("actions", {
  id: text("id").primaryKey(),
  handId: text("hand_id")
    .notNull()
    .references(() => hands.id),
  handPlayerId: text("hand_player_id")
    .notNull()
    .references(() => handPlayers.id),
  phase: text("phase").notNull(),
  actionType: text("action_type", {
    enum: ["fold", "check", "bet", "call", "raise", "all_in"],
  }).notNull(),
  amount: integer("amount").notNull().default(0),
  sequence: integer("sequence").notNull(),
  createdAt: integer("created_at").notNull(),
});
