#!/usr/bin/env npx tsx

import { createDeck, shuffle, deal } from "../lib/poker/engine/deck.js";
import {
  getAvailableActions,
  applyAction,
  isRoundComplete,
  buildPots,
  type HandPlayerState,
  type BettingState,
  type AvailableAction,
} from "../lib/poker/engine/betting.js";
import { evaluate, compareHands } from "../lib/poker/engine/hand-evaluator.js";
import type {
  Card,
  Phase,
  ActionType,
  Pot,
  EvaluatedHand,
  HandRank,
} from "../lib/poker/types.js";

// ── Configuration ────────────────────────────────────────

const CONFIG = {
  players: ["Claude", "Gemini", "GPT", "Grok"],
  startingChips: 10_000,
  smallBlind: 25,
  bigBlind: 50,
  maxHands: parseInt(process.env.MAX_HANDS ?? "100", 10),
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
};

// ── Types ────────────────────────────────────────────────

interface Player {
  id: string;
  name: string;
  seat: number;
  chips: number;
  holeCards: Card[];
  isEliminated: boolean;
}

interface GameState {
  players: Player[];
  dealerSeat: number;
  handNumber: number;
}

interface HandState {
  phase: Phase;
  communityCards: Card[];
  deck: Card[];
  bettingState: BettingState;
  pots: Pot[];
  actions: ActionLog[];
}

interface ActionLog {
  playerName: string;
  action: ActionType;
  amount: number;
  phase: Phase;
}

interface HandResult {
  handNumber: number;
  communityCards: Card[];
  actions: ActionLog[];
  showdown: {
    playerName: string;
    holeCards: Card[];
    bestHand: EvaluatedHand | null;
    winnings: number;
  }[];
}

// ── Logging ──────────────────────────────────────────────

function log(message: string) {
  console.log(message);
}

function logSection(title: string) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${title}`);
  console.log("=".repeat(60));
}

function handRankName(rank: HandRank): string {
  const names: Record<number, string> = {
    1: "Royal Flush",
    2: "Straight Flush",
    3: "Four of a Kind",
    4: "Full House",
    5: "Flush",
    6: "Straight",
    7: "Three of a Kind",
    8: "Two Pair",
    9: "One Pair",
    10: "High Card",
  };
  return names[rank] ?? "Unknown";
}

function formatCards(cards: Card[]): string {
  return cards.join(" ");
}

function formatChips(amount: number): string {
  return `$${amount.toLocaleString()}`;
}

// ── LLM Decision Making ──────────────────────────────────

async function getPlayerDecision(
  playerName: string,
  gameContext: {
    holeCards: Card[];
    communityCards: Card[];
    phase: Phase;
    potTotal: number;
    playerChips: number;
    currentBet: number;
    toCall: number;
    availableActions: AvailableAction[];
    opponents: { name: string; chips: number; bet: number; status: string }[];
    recentActions: ActionLog[];
  }
): Promise<{ action: ActionType; amount: number }> {
  const prompt = buildPrompt(playerName, gameContext);

  try {
    const response = await callLLM(prompt);
    return parseDecision(response, gameContext.availableActions);
  } catch (error) {
    log(`  [${playerName}] LLM error, defaulting to fold: ${error}`);
    return { action: "fold", amount: 0 };
  }
}

function buildPrompt(
  playerName: string,
  ctx: {
    holeCards: Card[];
    communityCards: Card[];
    phase: Phase;
    potTotal: number;
    playerChips: number;
    currentBet: number;
    toCall: number;
    availableActions: AvailableAction[];
    opponents: { name: string; chips: number; bet: number; status: string }[];
    recentActions: ActionLog[];
  }
): string {
  const actionsDesc = ctx.availableActions
    .map((a) => {
      if (a.minAmount !== undefined && a.maxAmount !== undefined) {
        if (a.minAmount === a.maxAmount) {
          return `${a.action} (${formatChips(a.minAmount)})`;
        }
        return `${a.action} (${formatChips(a.minAmount)} - ${formatChips(a.maxAmount)})`;
      }
      return a.action;
    })
    .join(", ");

  const opponentsDesc = ctx.opponents
    .map(
      (o) =>
        `  - ${o.name}: ${formatChips(o.chips)} chips, bet ${formatChips(o.bet)}, ${o.status}`
    )
    .join("\n");

  const recentActionsDesc =
    ctx.recentActions.length > 0
      ? ctx.recentActions
          .slice(-8)
          .map(
            (a) =>
              `  - ${a.playerName} ${a.action}${a.amount > 0 ? ` ${formatChips(a.amount)}` : ""}`
          )
          .join("\n")
      : "  (none yet)";

  return `You are ${playerName}, playing No-Limit Texas Hold'em poker.

CURRENT SITUATION:
- Phase: ${ctx.phase}
- Your hole cards: ${formatCards(ctx.holeCards)}
- Community cards: ${ctx.communityCards.length > 0 ? formatCards(ctx.communityCards) : "(none yet)"}
- Pot: ${formatChips(ctx.potTotal)}
- Your chips: ${formatChips(ctx.playerChips)}
- Your current bet: ${formatChips(ctx.currentBet)}
- Amount to call: ${formatChips(ctx.toCall)}

OPPONENTS:
${opponentsDesc}

RECENT ACTIONS:
${recentActionsDesc}

AVAILABLE ACTIONS: ${actionsDesc}

Decide your action. Consider:
1. Your hand strength and potential
2. Position and opponent tendencies
3. Pot odds and implied odds
4. Stack sizes

Respond with ONLY a JSON object in this exact format:
{"action": "fold|check|call|bet|raise|all_in", "amount": <number or 0>}

For fold/check, amount should be 0.
For call, amount should be the call amount.
For bet/raise, amount should be your total bet amount (not the raise increment).
For all_in, amount should be your remaining chips.`;
}

async function callLLM(prompt: string): Promise<string> {
  if (!CONFIG.openaiApiKey) {
    throw new Error("OPENAI_API_KEY not set");
  }

  const response = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CONFIG.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 100,
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

function parseDecision(
  response: string,
  availableActions: AvailableAction[]
): { action: ActionType; amount: number } {
  // Try to extract JSON from response
  const jsonMatch = response.match(/\{[^}]+\}/);
  if (!jsonMatch) {
    throw new Error(`No JSON found in response: ${response}`);
  }

  const parsed = JSON.parse(jsonMatch[0]);
  const action = parsed.action as ActionType;
  let amount = parsed.amount ?? 0;

  // Validate action is available
  const availableAction = availableActions.find((a) => a.action === action);
  if (!availableAction) {
    // Default to first available action
    const fallback = availableActions[0];
    return {
      action: fallback.action,
      amount: fallback.minAmount ?? 0,
    };
  }

  // Clamp amount to valid range
  if (availableAction.minAmount !== undefined) {
    amount = Math.max(amount, availableAction.minAmount);
  }
  if (availableAction.maxAmount !== undefined) {
    amount = Math.min(amount, availableAction.maxAmount);
  }

  return { action, amount };
}

// ── Game Logic ───────────────────────────────────────────

function initializeGame(): GameState {
  return {
    players: CONFIG.players.map((name, i) => ({
      id: `player-${i}`,
      name,
      seat: i,
      chips: CONFIG.startingChips,
      holeCards: [],
      isEliminated: false,
    })),
    dealerSeat: 0,
    handNumber: 0,
  };
}

function getActivePlayers(game: GameState): Player[] {
  return game.players.filter((p) => !p.isEliminated && p.chips > 0);
}

function initializeHand(game: GameState): HandState {
  const activePlayers = getActivePlayers(game);
  const deck = shuffle(createDeck());

  // Deal hole cards
  let remainingDeck = deck;
  for (const player of activePlayers) {
    const { dealt, remaining } = deal(remainingDeck, 2);
    player.holeCards = dealt;
    remainingDeck = remaining;
  }

  // Set up betting state with blinds
  const dealerIdx = activePlayers.findIndex((p) => p.seat === game.dealerSeat);
  const sbIdx = (dealerIdx + 1) % activePlayers.length;
  const bbIdx = (dealerIdx + 2) % activePlayers.length;

  // Heads-up special case: dealer is SB
  const sbSeat =
    activePlayers.length === 2
      ? activePlayers[dealerIdx].seat
      : activePlayers[sbIdx].seat;
  const bbSeat =
    activePlayers.length === 2
      ? activePlayers[(dealerIdx + 1) % 2].seat
      : activePlayers[bbIdx].seat;

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
      status: chips === 0 && bet > 0 ? "all_in" : "active",
      hasActed: false,
    };
  });

  // UTG acts first preflop (or dealer in heads-up)
  const utgIdx =
    activePlayers.length === 2
      ? dealerIdx
      : (bbIdx + 1) % activePlayers.length;
  const firstSeat = activePlayers[utgIdx].seat;

  return {
    phase: "preflop",
    communityCards: [],
    deck: remainingDeck,
    bettingState: {
      players: handPlayers,
      phase: "preflop",
      bigBlind: CONFIG.bigBlind,
      lastRaise: CONFIG.bigBlind,
      currentSeat: firstSeat,
    },
    pots: [],
    actions: [],
  };
}

function advancePhase(hand: HandState, game: GameState): void {
  const phases: Phase[] = ["preflop", "flop", "turn", "river", "showdown"];
  const currentIdx = phases.indexOf(hand.phase);

  if (currentIdx < 4) {
    hand.phase = phases[currentIdx + 1] as Phase;

    // Deal community cards
    if (hand.phase === "flop") {
      const { dealt, remaining } = deal(hand.deck, 3);
      hand.communityCards = dealt;
      hand.deck = remaining;
    } else if (hand.phase === "turn" || hand.phase === "river") {
      const { dealt, remaining } = deal(hand.deck, 1);
      hand.communityCards.push(...dealt);
      hand.deck = remaining;
    }

    // Reset betting for new round
    if (hand.phase !== "showdown") {
      for (const p of hand.bettingState.players) {
        p.bet = 0;
        p.hasActed = false;
      }
      hand.bettingState.lastRaise = CONFIG.bigBlind;
      hand.bettingState.phase = hand.phase;

      // Find first active player after dealer
      const activePlayers = getActivePlayers(game);
      const dealerIdx = activePlayers.findIndex(
        (p) => p.seat === game.dealerSeat
      );
      for (let i = 1; i <= activePlayers.length; i++) {
        const idx = (dealerIdx + i) % activePlayers.length;
        const player = activePlayers[idx];
        const handPlayer = hand.bettingState.players.find(
          (p) => p.seat === player.seat
        );
        if (handPlayer && handPlayer.status === "active") {
          hand.bettingState.currentSeat = player.seat;
          break;
        }
      }
    }
  }
}

function getPotTotal(bettingState: BettingState): number {
  return bettingState.players.reduce((sum, p) => sum + p.totalBet, 0);
}

async function playHand(game: GameState): Promise<HandResult> {
  game.handNumber++;
  logSection(`HAND #${game.handNumber}`);

  const activePlayers = getActivePlayers(game);
  log(`\nPlayers: ${activePlayers.map((p) => `${p.name} (${formatChips(p.chips)})`).join(", ")}`);
  log(`Dealer: ${game.players[game.dealerSeat].name}`);

  const hand = initializeHand(game);

  // Log hole cards
  log(`\nHole Cards:`);
  for (const player of activePlayers) {
    log(`  ${player.name}: ${formatCards(player.holeCards)}`);
  }

  // Betting rounds
  while (hand.phase !== "showdown" && hand.phase !== "complete") {
    log(`\n--- ${hand.phase.toUpperCase()} ---`);
    if (hand.communityCards.length > 0) {
      log(`Community: ${formatCards(hand.communityCards)}`);
    }

    // Check if only one player remains
    const activeBettingPlayers = hand.bettingState.players.filter(
      (p) => p.status !== "folded"
    );
    if (activeBettingPlayers.length === 1) {
      hand.phase = "complete";
      break;
    }

    // Check if all remaining players are all-in
    const nonAllInActive = hand.bettingState.players.filter(
      (p) => p.status === "active"
    );
    if (nonAllInActive.length <= 1) {
      // Deal remaining community cards and go to showdown
      while (hand.communityCards.length < 5) {
        const { dealt, remaining } = deal(hand.deck, 1);
        hand.communityCards.push(...dealt);
        hand.deck = remaining;
      }
      hand.phase = "showdown";
      break;
    }

    // Play betting round
    while (!isRoundComplete(hand.bettingState)) {
      const currentPlayer = hand.bettingState.players.find(
        (p) => p.seat === hand.bettingState.currentSeat
      );
      if (!currentPlayer || currentPlayer.status !== "active") {
        // Skip non-active players
        hand.bettingState.currentSeat =
          (hand.bettingState.currentSeat + 1) % game.players.length;
        continue;
      }

      const gamePlayer = game.players.find((p) => p.seat === currentPlayer.seat)!;
      const availableActions = getAvailableActions(hand.bettingState);

      if (availableActions.length === 0) {
        break;
      }

      const maxBet = Math.max(...hand.bettingState.players.map((p) => p.bet));
      const toCall = maxBet - currentPlayer.bet;

      const opponents = hand.bettingState.players
        .filter((p) => p.seat !== currentPlayer.seat)
        .map((p) => {
          const gp = game.players.find((g) => g.seat === p.seat)!;
          return {
            name: gp.name,
            chips: p.chips,
            bet: p.bet,
            status: p.status,
          };
        });

      const decision = await getPlayerDecision(gamePlayer.name, {
        holeCards: gamePlayer.holeCards,
        communityCards: hand.communityCards,
        phase: hand.phase,
        potTotal: getPotTotal(hand.bettingState),
        playerChips: currentPlayer.chips,
        currentBet: currentPlayer.bet,
        toCall,
        availableActions,
        opponents,
        recentActions: hand.actions,
      });

      // Apply action
      hand.bettingState = applyAction(
        hand.bettingState,
        decision.action,
        decision.amount
      );

      hand.actions.push({
        playerName: gamePlayer.name,
        action: decision.action,
        amount: decision.amount,
        phase: hand.phase,
      });

      log(
        `  ${gamePlayer.name} ${decision.action}${decision.amount > 0 ? ` ${formatChips(decision.amount)}` : ""}`
      );
    }

    // Advance to next phase
    if (hand.phase !== "complete") {
      advancePhase(hand, game);
    }
  }

  // Showdown / Award pots
  const pots = buildPots(hand.bettingState.players);
  const results: HandResult["showdown"] = [];

  log(`\n--- SHOWDOWN ---`);
  log(`Community: ${formatCards(hand.communityCards)}`);
  log(`Pot: ${formatChips(pots.reduce((sum, p) => sum + p.amount, 0))}`);

  // Evaluate hands for non-folded players
  const showdownPlayers = hand.bettingState.players.filter(
    (p) => p.status !== "folded"
  );

  const evaluations: {
    playerId: string;
    playerName: string;
    holeCards: Card[];
    bestHand: EvaluatedHand | null;
  }[] = [];

  for (const hp of showdownPlayers) {
    const gamePlayer = game.players.find((p) => p.id === hp.id)!;
    const allCards = [...gamePlayer.holeCards, ...hand.communityCards];
    const bestHand = allCards.length >= 5 ? evaluate(allCards) : null;

    evaluations.push({
      playerId: hp.id,
      playerName: gamePlayer.name,
      holeCards: gamePlayer.holeCards,
      bestHand,
    });

    if (bestHand) {
      log(
        `  ${gamePlayer.name}: ${formatCards(gamePlayer.holeCards)} -> ${handRankName(bestHand.rank)} (${formatCards(bestHand.cards)})`
      );
    }
  }

  // Award pots
  const winnings: Record<string, number> = {};

  for (const pot of pots) {
    const eligibleEvals = evaluations.filter((e) =>
      pot.eligible.includes(e.playerId)
    );

    if (eligibleEvals.length === 0) continue;

    if (eligibleEvals.length === 1) {
      // Single player wins
      winnings[eligibleEvals[0].playerId] =
        (winnings[eligibleEvals[0].playerId] ?? 0) + pot.amount;
    } else {
      // Find best hand(s)
      let bestScore = Infinity;
      let winners: typeof eligibleEvals = [];

      for (const e of eligibleEvals) {
        if (!e.bestHand) continue;
        if (e.bestHand.score < bestScore) {
          bestScore = e.bestHand.score;
          winners = [e];
        } else if (e.bestHand.score === bestScore) {
          winners.push(e);
        }
      }

      // Split pot among winners
      const share = Math.floor(pot.amount / winners.length);
      for (const winner of winners) {
        winnings[winner.playerId] = (winnings[winner.playerId] ?? 0) + share;
      }
    }
  }

  // Update chip counts and build results
  log(`\nResults:`);
  for (const hp of hand.bettingState.players) {
    const gamePlayer = game.players.find((p) => p.id === hp.id)!;
    const won = winnings[hp.id] ?? 0;
    const eval_ = evaluations.find((e) => e.playerId === hp.id);

    // Update chips: current chips + winnings
    gamePlayer.chips = hp.chips + won;

    results.push({
      playerName: gamePlayer.name,
      holeCards: gamePlayer.holeCards,
      bestHand: eval_?.bestHand ?? null,
      winnings: won,
    });

    if (won > 0) {
      log(`  ${gamePlayer.name} wins ${formatChips(won)}`);
    }
  }

  // Check for eliminations
  for (const player of game.players) {
    if (player.chips <= 0 && !player.isEliminated) {
      player.isEliminated = true;
      log(`  ${player.name} has been eliminated!`);
    }
  }

  // Rotate dealer
  const activeSeats = getActivePlayers(game).map((p) => p.seat).sort((a, b) => a - b);
  const currentDealerIdx = activeSeats.indexOf(game.dealerSeat);
  game.dealerSeat = activeSeats[(currentDealerIdx + 1) % activeSeats.length];

  // Clear hole cards
  for (const player of game.players) {
    player.holeCards = [];
  }

  return {
    handNumber: game.handNumber,
    communityCards: hand.communityCards,
    actions: hand.actions,
    showdown: results,
  };
}

// ── Main ─────────────────────────────────────────────────

async function main() {
  if (!CONFIG.openaiApiKey) {
    console.error("Error: OPENAI_API_KEY environment variable is required");
    console.error("Set it in .env.local and run: npm run poker");
    process.exit(1);
  }

  logSection("POKER SIMULATION");
  log(`Players: ${CONFIG.players.join(", ")}`);
  log(`Starting chips: ${formatChips(CONFIG.startingChips)}`);
  log(`Blinds: ${formatChips(CONFIG.smallBlind)}/${formatChips(CONFIG.bigBlind)}`);
  log(`Max hands: ${CONFIG.maxHands}`);

  const game = initializeGame();
  const allResults: HandResult[] = [];

  while (game.handNumber < CONFIG.maxHands) {
    const activePlayers = getActivePlayers(game);

    if (activePlayers.length < 2) {
      log(`\nGame over - only ${activePlayers.length} player(s) remaining`);
      break;
    }

    const result = await playHand(game);
    allResults.push(result);

    // Brief pause between hands
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Final summary
  logSection("FINAL RESULTS");
  const sortedPlayers = [...game.players].sort((a, b) => b.chips - a.chips);
  for (let i = 0; i < sortedPlayers.length; i++) {
    const p = sortedPlayers[i];
    const status = p.isEliminated ? " (eliminated)" : "";
    log(`${i + 1}. ${p.name}: ${formatChips(p.chips)}${status}`);
  }

  log(`\nTotal hands played: ${game.handNumber}`);
}

main().catch(console.error);
