import type { ActionType, HandPlayerStatus, Phase, Pot } from "@/lib/poker/types";

// ── Interfaces ────────────────────────────────────────

export interface HandPlayerState {
  id: string;
  seat: number;
  chips: number;
  bet: number;
  totalBet: number;
  status: HandPlayerStatus;
  hasActed: boolean;
}

export interface AvailableAction {
  action: ActionType;
  minAmount?: number;
  maxAmount?: number;
}

export interface BettingState {
  players: HandPlayerState[];
  phase: Phase;
  bigBlind: number;
  lastRaise: number;
  currentSeat: number;
}

// ── Helpers ───────────────────────────────────────────

function currentPlayer(state: BettingState): HandPlayerState | undefined {
  return state.players.find((p) => p.seat === state.currentSeat);
}

function maxBet(state: BettingState): number {
  return Math.max(0, ...state.players.map((p) => p.bet));
}

function nextActiveSeat(state: BettingState, afterSeat: number): number {
  const sorted = [...state.players]
    .filter((p) => p.status === "active")
    .sort((a, b) => a.seat - b.seat);

  if (sorted.length === 0) return afterSeat;

  // Find first player whose seat is greater than afterSeat (clockwise)
  for (const p of sorted) {
    if (p.seat > afterSeat) return p.seat;
  }
  // Wrap around
  return sorted[0].seat;
}

// ── getAvailableActions ───────────────────────────────

export function getAvailableActions(state: BettingState): AvailableAction[] {
  const player = currentPlayer(state);
  if (!player || player.status !== "active" || player.chips === 0) return [];

  const currentMax = maxBet(state);
  const actions: AvailableAction[] = [];

  // Fold is always available
  actions.push({ action: "fold" });

  if (player.bet === currentMax) {
    // Check is available when player already matches the max bet
    actions.push({ action: "check" });
  } else {
    // Call
    const callAmount = Math.min(currentMax - player.bet, player.chips);
    if (callAmount < player.chips) {
      actions.push({
        action: "call",
        minAmount: callAmount,
        maxAmount: callAmount,
      });
    }
    // If callAmount == player.chips, the call becomes an all-in (handled below)
  }

  if (currentMax === 0) {
    // Bet (only when no bet exists in this round)
    const minBet = state.bigBlind;
    const maxBetAmount = player.chips;
    if (maxBetAmount > minBet) {
      actions.push({
        action: "bet",
        minAmount: minBet,
        maxAmount: maxBetAmount,
      });
    } else if (maxBetAmount === minBet) {
      // Exact min bet equals all chips — only all_in, handled below
    }
    // If chips < minBet, can only go all-in, handled below
  } else {
    // Raise
    const minRaiseIncrement = Math.max(state.lastRaise, state.bigBlind);
    const minRaiseTo = currentMax + minRaiseIncrement;
    const minRaiseAmount = minRaiseTo - player.bet;
    const maxRaiseAmount = player.chips;

    if (maxRaiseAmount > minRaiseAmount) {
      actions.push({
        action: "raise",
        minAmount: minRaiseAmount,
        maxAmount: maxRaiseAmount,
      });
    } else if (maxRaiseAmount === minRaiseAmount) {
      // Exact min raise equals all chips — only all_in, handled below
    }
    // If chips < minRaiseAmount, can only go all-in, handled below
  }

  // All-in is always available
  actions.push({
    action: "all_in",
    minAmount: player.chips,
    maxAmount: player.chips,
  });

  return actions;
}

// ── applyAction ───────────────────────────────────────

export function applyAction(
  state: BettingState,
  action: ActionType,
  amount: number,
): BettingState {
  const playerIndex = state.players.findIndex(
    (p) => p.seat === state.currentSeat,
  );
  if (playerIndex === -1) throw new Error("No player at current seat");

  const players = state.players.map((p) => ({ ...p }));
  const player = players[playerIndex];
  const currentMax = Math.max(0, ...players.map((p) => p.bet));
  let { lastRaise } = state;
  let reopenAction = false;

  switch (action) {
    case "fold": {
      player.status = "folded";
      break;
    }

    case "check": {
      if (player.bet !== currentMax) {
        throw new Error("Cannot check when facing a bet");
      }
      break;
    }

    case "bet": {
      if (amount <= 0) throw new Error("Bet amount must be positive");
      player.chips -= amount;
      player.bet += amount;
      player.totalBet += amount;
      lastRaise = amount;
      reopenAction = true;
      break;
    }

    case "call": {
      const callAmount = Math.min(currentMax - player.bet, player.chips);
      player.chips -= callAmount;
      player.bet += callAmount;
      player.totalBet += callAmount;
      break;
    }

    case "raise": {
      if (amount <= 0) throw new Error("Raise amount must be positive");
      const prevMax = currentMax;
      player.chips -= amount;
      player.bet += amount;
      player.totalBet += amount;
      const raiseIncrement = player.bet - prevMax;
      lastRaise = raiseIncrement;
      reopenAction = true;
      break;
    }

    case "all_in": {
      const allInAmount = player.chips;
      const prevMaxBet = currentMax;
      player.bet += allInAmount;
      player.totalBet += allInAmount;
      player.chips = 0;
      player.status = "all_in";

      // Check if this constitutes a raise (exceeds max by at least the min raise increment)
      const raiseOver = player.bet - prevMaxBet;
      if (raiseOver > 0 && raiseOver >= Math.max(lastRaise, state.bigBlind)) {
        lastRaise = raiseOver;
        reopenAction = true;
      }
      break;
    }
  }

  player.hasActed = true;

  // If action reopens betting, reset hasActed for all other active players
  if (reopenAction) {
    for (const p of players) {
      if (p.seat !== player.seat && p.status === "active") {
        p.hasActed = false;
      }
    }
  }

  // Advance to next active seat
  const nextSeat = nextActiveSeat(
    { ...state, players },
    state.currentSeat,
  );

  return {
    ...state,
    players,
    lastRaise,
    currentSeat: nextSeat,
  };
}

// ── isRoundComplete ───────────────────────────────────

export function isRoundComplete(state: BettingState): boolean {
  const activePlayers = state.players.filter(
    (p) => p.status === "active",
  );

  // If 0 or 1 active players remain, round is complete
  if (activePlayers.length <= 1) return true;

  // All active players must have acted and have equal bets
  const allActed = activePlayers.every((p) => p.hasActed);
  const allEqualBets = activePlayers.every(
    (p) => p.bet === activePlayers[0].bet,
  );

  return allActed && allEqualBets;
}

// ── buildPots ─────────────────────────────────────────

export function buildPots(players: HandPlayerState[]): Pot[] {
  const nonFolded = players.filter((p) => p.status !== "folded");
  const activeSorted = [...nonFolded].sort((a, b) => a.totalBet - b.totalBet);

  const pots: Pot[] = [];
  let previousLevel = 0;

  for (const player of activeSorted) {
    if (player.totalBet > previousLevel) {
      let potAmount = 0;
      const eligible: string[] = [];

      for (const p of players) {
        if (p.status === "folded") {
          // Folded players still contribute chips but aren't eligible
          const contribution =
            Math.min(p.totalBet, player.totalBet) - previousLevel;
          if (contribution > 0) potAmount += contribution;
        } else {
          const contribution =
            Math.min(p.totalBet, player.totalBet) - previousLevel;
          if (contribution > 0) potAmount += contribution;
          if (p.totalBet >= player.totalBet) {
            eligible.push(p.id);
          }
        }
      }

      if (potAmount > 0) {
        pots.push({ amount: potAmount, eligible });
      }
      previousLevel = player.totalBet;
    }
  }

  return pots;
}
