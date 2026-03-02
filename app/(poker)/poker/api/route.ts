import { createDeck, shuffle, deal } from "@/lib/poker/engine/deck";
import {
  getAvailableActions,
  applyAction,
  isRoundComplete,
  buildPots,
  type HandPlayerState,
  type BettingState,
  type AvailableAction,
} from "@/lib/poker/engine/betting";
import { evaluate } from "@/lib/poker/engine/hand-evaluator";
import type { Card, Phase, ActionType, HandRank } from "@/lib/poker/types";

// ── Configuration ─────────────────────────────────────────

const CONFIG = {
  players: [
    { name: "Claude", color: "#E8764B", icon: "C" },
    { name: "Gemini", color: "#7B61FF", icon: "G" },
    { name: "GPT", color: "#10A37F", icon: "O" },
    { name: "Grok", color: "#A1A1AA", icon: "X" },
  ],
  startingChips: 10_000,
  smallBlind: 50,
  bigBlind: 100,
  actionDelayMs: 800,
  phaseDelayMs: 1500,
  handDelayMs: 2500,
};

// ── Types ─────────────────────────────────────────────────

interface Player {
  id: string;
  name: string;
  seat: number;
  chips: number;
  holeCards: Card[];
  isEliminated: boolean;
  color: string;
  icon: string;
}

interface GameState {
  players: Player[];
  dealerSeat: number;
  handNumber: number;
  pnl: Record<string, number>;
}

interface ActionLog {
  playerName: string;
  action: ActionType;
  amount: number;
  phase: Phase;
}

interface SSEPayload {
  type: "state_update" | "hand_result" | "game_over";
  hand: {
    number: number;
    phase: Phase;
    communityCards: Card[];
    potTotal: number;
  };
  players: {
    name: string;
    chips: number;
    holeCards: Card[];
    bet: number;
    status: string;
    color: string;
    icon: string;
    isEliminated: boolean;
  }[];
  dealerSeat: number;
  blinds: { small: number; big: number };
  actions: ActionLog[];
  pnl: Record<string, number>;
  winners?: { playerName: string; amount: number }[];
}

// ── Heuristic bot ─────────────────────────────────────────

function handStrength(holeCards: Card[], communityCards: Card[]): number {
  if (communityCards.length >= 3) {
    const allCards = [...holeCards, ...communityCards];
    try {
      const hand = evaluate(allCards);
      // Normalize score: lower is better in the evaluator, map to 0-1 where 1 is best
      // Scores range roughly from 1e10 (royal flush) to 10e10 (high card)
      return Math.max(0, 1 - hand.score / 11_000_000_000);
    } catch {
      // Fall through to preflop logic
    }
  }

  // Preflop heuristic: rank-based
  const r1 = rankVal(holeCards[0][0]);
  const r2 = rankVal(holeCards[1][0]);
  const suited = holeCards[0][1] === holeCards[1][1];
  const pair = r1 === r2;
  const highCard = Math.max(r1, r2);
  const gap = Math.abs(r1 - r2);

  let strength = 0.3;
  if (pair) strength = 0.5 + highCard / 30;
  else {
    strength = 0.2 + highCard / 40 + (suited ? 0.05 : 0) - gap * 0.02;
  }
  return Math.min(1, Math.max(0, strength));
}

function rankVal(r: string): number {
  const map: Record<string, number> = {
    "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
    T: 10, J: 11, Q: 12, K: 13, A: 14,
  };
  return map[r] ?? 0;
}

function heuristicDecision(
  holeCards: Card[],
  communityCards: Card[],
  potTotal: number,
  playerChips: number,
  toCall: number,
  availableActions: AvailableAction[]
): { action: ActionType; amount: number } {
  const strength = handStrength(holeCards, communityCards);
  const potOdds = toCall > 0 ? toCall / (potTotal + toCall) : 0;

  const canCheck = availableActions.some((a) => a.action === "check");
  const canCall = availableActions.some((a) => a.action === "call");
  const canRaise = availableActions.some((a) => a.action === "raise");
  const canBet = availableActions.some((a) => a.action === "bet");

  // Strong hand: raise/bet
  if (strength > 0.7) {
    if (canRaise) {
      const raiseAction = availableActions.find((a) => a.action === "raise")!;
      const raiseAmount = Math.min(
        raiseAction.maxAmount!,
        Math.max(raiseAction.minAmount!, Math.floor(potTotal * 0.6 + toCall))
      );
      return { action: "raise", amount: raiseAmount };
    }
    if (canBet) {
      const betAction = availableActions.find((a) => a.action === "bet")!;
      const betAmount = Math.min(
        betAction.maxAmount!,
        Math.max(betAction.minAmount!, Math.floor(potTotal * 0.5))
      );
      return { action: "bet", amount: betAmount };
    }
    if (canCall) {
      const callAction = availableActions.find((a) => a.action === "call")!;
      return { action: "call", amount: callAction.minAmount! };
    }
    if (canCheck) return { action: "check", amount: 0 };
  }

  // Medium hand: call or check
  if (strength > 0.4) {
    if (canCheck) return { action: "check", amount: 0 };
    if (canCall && potOdds < strength) {
      const callAction = availableActions.find((a) => a.action === "call")!;
      return { action: "call", amount: callAction.minAmount! };
    }
    // Sometimes bet with medium hand
    if (canBet && Math.random() > 0.5) {
      const betAction = availableActions.find((a) => a.action === "bet")!;
      return { action: "bet", amount: betAction.minAmount! };
    }
    if (canCall && toCall < playerChips * 0.1) {
      const callAction = availableActions.find((a) => a.action === "call")!;
      return { action: "call", amount: callAction.minAmount! };
    }
  }

  // Weak hand: check or fold
  if (canCheck) return { action: "check", amount: 0 };
  // Occasionally bluff
  if (canBet && Math.random() > 0.85) {
    const betAction = availableActions.find((a) => a.action === "bet")!;
    return { action: "bet", amount: betAction.minAmount! };
  }
  return { action: "fold", amount: 0 };
}

// ── Game Logic ────────────────────────────────────────────

function initGame(): GameState {
  const pnl: Record<string, number> = {};
  const players = CONFIG.players.map((p, i) => {
    pnl[p.name] = 0;
    return {
      id: `player-${i}`,
      name: p.name,
      seat: i,
      chips: CONFIG.startingChips,
      holeCards: [] as Card[],
      isEliminated: false,
      color: p.color,
      icon: p.icon,
    };
  });
  return { players, dealerSeat: 0, handNumber: 0, pnl };
}

function getActive(game: GameState): Player[] {
  return game.players.filter((p) => !p.isEliminated && p.chips > 0);
}

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(payload: SSEPayload) {
        const data = `data: ${JSON.stringify(payload)}\n\n`;
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          // Stream closed
        }
      }

      const game = initGame();

      function buildPayload(
        type: SSEPayload["type"],
        phase: Phase,
        communityCards: Card[],
        bettingState: BettingState | null,
        actions: ActionLog[],
        winners?: { playerName: string; amount: number }[]
      ): SSEPayload {
        return {
          type,
          hand: {
            number: game.handNumber,
            phase,
            communityCards,
            potTotal: bettingState
              ? bettingState.players.reduce((sum, p) => sum + p.totalBet, 0)
              : 0,
          },
          players: game.players.map((p) => {
            const hp = bettingState?.players.find((bp) => bp.seat === p.seat);
            return {
              name: p.name,
              chips: hp ? hp.chips : p.chips,
              holeCards: p.holeCards,
              bet: hp?.bet ?? 0,
              status: hp?.status ?? (p.isEliminated ? "eliminated" : "active"),
              color: p.color,
              icon: p.icon,
              isEliminated: p.isEliminated,
            };
          }),
          dealerSeat: game.dealerSeat,
          blinds: { small: CONFIG.smallBlind, big: CONFIG.bigBlind },
          actions,
          pnl: { ...game.pnl },
          winners,
        };
      }

      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

      // Play hands continuously
      while (true) {
        const activePlayers = getActive(game);
        if (activePlayers.length < 2) {
          send(buildPayload("game_over", "complete", [], null, []));
          break;
        }

        game.handNumber++;

        // Initialize hand
        const deck = shuffle(createDeck());
        let remainingDeck = deck;
        for (const player of activePlayers) {
          const { dealt, remaining } = deal(remainingDeck, 2);
          player.holeCards = dealt;
          remainingDeck = remaining;
        }

        // Set up blinds
        const dealerIdx = activePlayers.findIndex(
          (p) => p.seat === game.dealerSeat
        );
        const sbSeat =
          activePlayers.length === 2
            ? activePlayers[dealerIdx].seat
            : activePlayers[(dealerIdx + 1) % activePlayers.length].seat;
        const bbSeat =
          activePlayers.length === 2
            ? activePlayers[(dealerIdx + 1) % 2].seat
            : activePlayers[(dealerIdx + 2) % activePlayers.length].seat;

        const handPlayers: HandPlayerState[] = activePlayers.map((p) => {
          let bet = 0;
          let chips = p.chips;
          if (p.seat === sbSeat) {
            bet = Math.min(CONFIG.smallBlind, chips);
            chips -= bet;
          } else if (p.seat === bbSeat) {
            bet = Math.min(CONFIG.bigBlind, chips);
            chips -= bet;
          }
          return {
            id: p.id,
            seat: p.seat,
            chips,
            bet,
            totalBet: bet,
            status: (chips === 0 && bet > 0 ? "all_in" : "active") as "active" | "all_in" | "folded",
            hasActed: false,
          };
        });

        const bbIdx = activePlayers.findIndex((p) => p.seat === bbSeat);
        const utgIdx =
          activePlayers.length === 2
            ? dealerIdx
            : (bbIdx + 1) % activePlayers.length;

        let bettingState: BettingState = {
          players: handPlayers,
          phase: "preflop",
          bigBlind: CONFIG.bigBlind,
          lastRaise: CONFIG.bigBlind,
          currentSeat: activePlayers[utgIdx].seat,
        };

        let communityCards: Card[] = [];
        let phase: Phase = "preflop";
        const actions: ActionLog[] = [];

        // Send initial state
        send(buildPayload("state_update", phase, communityCards, bettingState, actions));
        await sleep(CONFIG.phaseDelayMs);

        // Betting rounds
        while (phase !== "showdown" && phase !== "complete") {
          const nonFolded = bettingState.players.filter(
            (p) => p.status !== "folded"
          );
          if (nonFolded.length === 1) {
            phase = "complete";
            break;
          }

          const nonAllInActive = bettingState.players.filter(
            (p) => p.status === "active"
          );
          if (nonAllInActive.length <= 1) {
            while (communityCards.length < 5) {
              const { dealt, remaining } = deal(remainingDeck, 1);
              communityCards.push(...dealt);
              remainingDeck = remaining;
            }
            phase = "showdown";
            send(buildPayload("state_update", phase, communityCards, bettingState, actions));
            break;
          }

          // Play betting round
          let loopGuard = 0;
          while (!isRoundComplete(bettingState) && loopGuard < 40) {
            loopGuard++;
            const currentP = bettingState.players.find(
              (p) => p.seat === bettingState.currentSeat
            );
            if (!currentP || currentP.status !== "active") {
              const seats = bettingState.players
                .filter((p) => p.status === "active")
                .map((p) => p.seat)
                .sort((a, b) => a - b);
              if (seats.length === 0) break;
              const nextSeat = seats.find((s) => s > bettingState.currentSeat) ?? seats[0];
              bettingState = { ...bettingState, currentSeat: nextSeat };
              continue;
            }

            const gamePlayer = game.players.find(
              (p) => p.seat === currentP.seat
            )!;
            const availActions = getAvailableActions(bettingState);
            if (availActions.length === 0) break;

            const maxBet = Math.max(
              ...bettingState.players.map((p) => p.bet)
            );
            const toCall = maxBet - currentP.bet;
            const potTotal = bettingState.players.reduce(
              (sum, p) => sum + p.totalBet,
              0
            );

            const decision = heuristicDecision(
              gamePlayer.holeCards,
              communityCards,
              potTotal,
              currentP.chips,
              toCall,
              availActions
            );

            bettingState = applyAction(
              bettingState,
              decision.action,
              decision.amount
            );

            actions.push({
              playerName: gamePlayer.name,
              action: decision.action,
              amount: decision.amount,
              phase,
            });

            send(buildPayload("state_update", phase, communityCards, bettingState, actions));
            await sleep(CONFIG.actionDelayMs);
          }

          // Advance phase
          const phases: Phase[] = ["preflop", "flop", "turn", "river", "showdown"];
          const phaseIdx = phases.indexOf(phase);
          if (phaseIdx < 4) {
            phase = phases[phaseIdx + 1] as Phase;

            if (phase === "flop") {
              const { dealt, remaining } = deal(remainingDeck, 3);
              communityCards = dealt;
              remainingDeck = remaining;
            } else if (phase === "turn" || phase === "river") {
              const { dealt, remaining } = deal(remainingDeck, 1);
              communityCards.push(...dealt);
              remainingDeck = remaining;
            }

            if (phase !== "showdown") {
              bettingState = {
                ...bettingState,
                players: bettingState.players.map((p) => ({
                  ...p,
                  bet: 0,
                  hasActed: false,
                })),
                phase,
                lastRaise: CONFIG.bigBlind,
              };

              // Find first active player after dealer
              for (let i = 1; i <= activePlayers.length; i++) {
                const idx = (dealerIdx + i) % activePlayers.length;
                const player = activePlayers[idx];
                const hp = bettingState.players.find(
                  (p) => p.seat === player.seat
                );
                if (hp && hp.status === "active") {
                  bettingState = { ...bettingState, currentSeat: player.seat };
                  break;
                }
              }
            }

            send(buildPayload("state_update", phase, communityCards, bettingState, actions));
            await sleep(CONFIG.phaseDelayMs);
          }
        }

        // Showdown / Award pots
        const pots = buildPots(bettingState.players);
        const showdownPlayers = bettingState.players.filter(
          (p) => p.status !== "folded"
        );

        const winnings: Record<string, number> = {};
        const winners: { playerName: string; amount: number }[] = [];

        for (const pot of pots) {
          const eligible = showdownPlayers.filter((p) =>
            pot.eligible.includes(p.id)
          );

          if (eligible.length === 0) continue;

          if (eligible.length === 1) {
            winnings[eligible[0].id] =
              (winnings[eligible[0].id] ?? 0) + pot.amount;
          } else {
            let bestScore = Infinity;
            let potWinners: typeof eligible = [];

            for (const hp of eligible) {
              const gp = game.players.find((p) => p.id === hp.id)!;
              const allCards = [...gp.holeCards, ...communityCards];
              if (allCards.length >= 5) {
                const hand = evaluate(allCards);
                if (hand.score < bestScore) {
                  bestScore = hand.score;
                  potWinners = [hp];
                } else if (hand.score === bestScore) {
                  potWinners.push(hp);
                }
              }
            }

            const share = Math.floor(pot.amount / Math.max(1, potWinners.length));
            for (const w of potWinners) {
              winnings[w.id] = (winnings[w.id] ?? 0) + share;
            }
          }
        }

        // Update chip counts and P&L
        for (const hp of bettingState.players) {
          const gp = game.players.find((p) => p.id === hp.id)!;
          const won = winnings[hp.id] ?? 0;
          const netChange = won - hp.totalBet;
          gp.chips = hp.chips + won;
          game.pnl[gp.name] = (game.pnl[gp.name] ?? 0) + netChange;

          if (won > 0) {
            winners.push({ playerName: gp.name, amount: won });
          }
        }

        // Check eliminations
        for (const p of game.players) {
          if (p.chips <= 0 && !p.isEliminated) {
            p.isEliminated = true;
          }
        }

        send(
          buildPayload(
            "hand_result",
            phase,
            communityCards,
            bettingState,
            actions,
            winners
          )
        );

        // Rotate dealer
        const activeSeats = getActive(game)
          .map((p) => p.seat)
          .sort((a, b) => a - b);
        const curDealerIdx = activeSeats.indexOf(game.dealerSeat);
        game.dealerSeat =
          activeSeats[(curDealerIdx + 1) % activeSeats.length];

        // Clear hole cards
        for (const p of game.players) {
          p.holeCards = [];
        }

        await sleep(CONFIG.handDelayMs);
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
