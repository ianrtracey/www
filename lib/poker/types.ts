// ── Cards ──────────────────────────────────────────────

export type Suit = "s" | "h" | "d" | "c";
export type Rank =
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "T"
  | "J"
  | "Q"
  | "K"
  | "A";

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
  cards: [Card, Card, Card, Card, Card];
  /**
   * Numeric score for comparison. Lower = better.
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
  amount?: number;
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
    holeCards?: Card[];
  }[];
  availableActions?: {
    action: ActionType;
    minAmount?: number;
    maxAmount?: number;
  }[];
  results?: {
    gamePlayerId: string;
    holeCards: Card[];
    bestHand: EvaluatedHand | null;
    winnings: number;
  }[];
}
