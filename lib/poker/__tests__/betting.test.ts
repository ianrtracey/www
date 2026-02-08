import {
  getAvailableActions,
  applyAction,
  isRoundComplete,
  buildPots,
  type HandPlayerState,
  type BettingState,
} from "@/lib/poker/engine/betting";

function makePlayer(overrides: Partial<HandPlayerState> = {}): HandPlayerState {
  return {
    id: "player-1",
    seat: 0,
    chips: 1000,
    bet: 0,
    totalBet: 0,
    status: "active",
    hasActed: false,
    ...overrides,
  };
}

function makeState(overrides: Partial<BettingState> = {}): BettingState {
  return {
    players: [
      makePlayer({ id: "p1", seat: 0 }),
      makePlayer({ id: "p2", seat: 1 }),
      makePlayer({ id: "p3", seat: 2 }),
    ],
    phase: "flop",
    bigBlind: 20,
    lastRaise: 0,
    currentSeat: 0,
    ...overrides,
  };
}

// ── Test 24 ───────────────────────────────────────────

describe("applyAction - fold", () => {
  it("sets player status to folded", () => {
    const state = makeState();
    const next = applyAction(state, "fold", 0);
    const folded = next.players.find((p) => p.id === "p1")!;
    expect(folded.status).toBe("folded");
  });
});

// ── Test 25 ───────────────────────────────────────────

describe("applyAction - check", () => {
  it("is valid when no bet to call", () => {
    const state = makeState();
    const next = applyAction(state, "check", 0);
    const player = next.players.find((p) => p.id === "p1")!;
    expect(player.hasActed).toBe(true);
    expect(player.chips).toBe(1000);
  });
});

// ── Test 26 ───────────────────────────────────────────

describe("getAvailableActions - check invalid when facing a bet", () => {
  it("does NOT include check when player faces a bet", () => {
    const state = makeState({
      players: [
        makePlayer({ id: "p1", seat: 0, bet: 0 }),
        makePlayer({ id: "p2", seat: 1, bet: 50 }),
        makePlayer({ id: "p3", seat: 2, bet: 0 }),
      ],
      currentSeat: 0,
    });
    const actions = getAvailableActions(state);
    const actionTypes = actions.map((a) => a.action);
    expect(actionTypes).not.toContain("check");
  });
});

// ── Test 27 ───────────────────────────────────────────

describe("getAvailableActions - bet minimum", () => {
  it("shows min = bigBlind for bet action", () => {
    const state = makeState({ bigBlind: 20, currentSeat: 0 });
    const actions = getAvailableActions(state);
    const betAction = actions.find((a) => a.action === "bet");
    expect(betAction).toBeDefined();
    expect(betAction!.minAmount).toBe(20);
  });
});

// ── Test 28 ───────────────────────────────────────────

describe("getAvailableActions - raise minimum increment", () => {
  it("shows correct min for raise after a bet", () => {
    // Player 2 bet 40. lastRaise = 40. Min raise to = 40 + max(40, 20) = 80.
    // Player 1 has bet 0, so min raise amount = 80 - 0 = 80.
    const state = makeState({
      players: [
        makePlayer({ id: "p1", seat: 0, bet: 0 }),
        makePlayer({ id: "p2", seat: 1, bet: 40, hasActed: true }),
        makePlayer({ id: "p3", seat: 2, bet: 0 }),
      ],
      lastRaise: 40,
      currentSeat: 0,
    });
    const actions = getAvailableActions(state);
    const raiseAction = actions.find((a) => a.action === "raise");
    expect(raiseAction).toBeDefined();
    expect(raiseAction!.minAmount).toBe(80);
  });
});

// ── Test 29 ───────────────────────────────────────────

describe("applyAction - call", () => {
  it("deducts correct amount (maxBet - playerBet)", () => {
    const state = makeState({
      players: [
        makePlayer({ id: "p1", seat: 0, bet: 0, chips: 1000 }),
        makePlayer({ id: "p2", seat: 1, bet: 50, chips: 950 }),
        makePlayer({ id: "p3", seat: 2, bet: 0, chips: 1000 }),
      ],
      currentSeat: 0,
    });
    const next = applyAction(state, "call", 0);
    const player = next.players.find((p) => p.id === "p1")!;
    expect(player.chips).toBe(950);
    expect(player.bet).toBe(50);
    expect(player.totalBet).toBe(50);
  });
});

// ── Test 30 ───────────────────────────────────────────

describe("applyAction - all-in for less than call", () => {
  it("is valid and sets player status to all_in", () => {
    const state = makeState({
      players: [
        makePlayer({ id: "p1", seat: 0, bet: 0, chips: 30 }),
        makePlayer({ id: "p2", seat: 1, bet: 50, chips: 950 }),
        makePlayer({ id: "p3", seat: 2, bet: 0, chips: 1000 }),
      ],
      currentSeat: 0,
      lastRaise: 50,
      bigBlind: 20,
    });
    const next = applyAction(state, "all_in", 0);
    const player = next.players.find((p) => p.id === "p1")!;
    expect(player.status).toBe("all_in");
    expect(player.chips).toBe(0);
    expect(player.bet).toBe(30);
  });
});

// ── Test 31 ───────────────────────────────────────────

describe("applyAction - all-in for less than min raise does not reopen", () => {
  it("does not reset hasActed on other players", () => {
    // p2 has bet 100 (lastRaise = 100, bigBlind = 20).
    // p3 has already acted (called).
    // p1 goes all-in for 120 total (bet=0, chips=120).
    // 120 - 100 = 20, which is less than max(100, 20) = 100. Not a full raise.
    const state = makeState({
      players: [
        makePlayer({ id: "p1", seat: 0, bet: 0, chips: 120 }),
        makePlayer({ id: "p2", seat: 1, bet: 100, chips: 900, hasActed: true }),
        makePlayer({ id: "p3", seat: 2, bet: 100, chips: 900, hasActed: true }),
      ],
      lastRaise: 100,
      bigBlind: 20,
      currentSeat: 0,
    });
    const next = applyAction(state, "all_in", 0);
    const p2 = next.players.find((p) => p.id === "p2")!;
    const p3 = next.players.find((p) => p.id === "p3")!;
    expect(p2.hasActed).toBe(true);
    expect(p3.hasActed).toBe(true);
  });
});

// ── Test 32 ───────────────────────────────────────────

describe("isRoundComplete", () => {
  it("returns true after all players act with equal bets", () => {
    const state = makeState({
      players: [
        makePlayer({ id: "p1", seat: 0, bet: 50, hasActed: true }),
        makePlayer({ id: "p2", seat: 1, bet: 50, hasActed: true }),
        makePlayer({ id: "p3", seat: 2, bet: 50, hasActed: true }),
      ],
    });
    expect(isRoundComplete(state)).toBe(true);
  });
});

// ── Test 33 ───────────────────────────────────────────

describe("isRoundComplete - mid action", () => {
  it("returns false when not all players have acted", () => {
    const state = makeState({
      players: [
        makePlayer({ id: "p1", seat: 0, bet: 50, hasActed: true }),
        makePlayer({ id: "p2", seat: 1, bet: 50, hasActed: true }),
        makePlayer({ id: "p3", seat: 2, bet: 0, hasActed: false }),
      ],
    });
    expect(isRoundComplete(state)).toBe(false);
  });
});

// ── Test 34 ───────────────────────────────────────────

describe("buildPots - 2 all-ins at different amounts", () => {
  it("returns 2 pots with correct amounts and eligibility", () => {
    const players = [
      makePlayer({ id: "p1", seat: 0, totalBet: 100, status: "all_in", chips: 0 }),
      makePlayer({ id: "p2", seat: 1, totalBet: 300, status: "all_in", chips: 0 }),
      makePlayer({ id: "p3", seat: 2, totalBet: 300, status: "active", chips: 700 }),
    ];
    const pots = buildPots(players);
    expect(pots).toHaveLength(2);

    // Main pot: 100 * 3 = 300, all eligible (non-folded with totalBet >= 100)
    expect(pots[0].amount).toBe(300);
    expect(pots[0].eligible).toEqual(expect.arrayContaining(["p1", "p2", "p3"]));

    // Side pot: (300 - 100) * 2 = 400, only p2 and p3 eligible
    expect(pots[1].amount).toBe(400);
    expect(pots[1].eligible).toEqual(expect.arrayContaining(["p2", "p3"]));
    expect(pots[1].eligible).not.toContain("p1");
  });
});

// ── Test 35 ───────────────────────────────────────────

describe("buildPots - 3 players, 1 all-in", () => {
  it("creates main pot + side pot", () => {
    const players = [
      makePlayer({ id: "p1", seat: 0, totalBet: 50, status: "all_in", chips: 0 }),
      makePlayer({ id: "p2", seat: 1, totalBet: 200, status: "active", chips: 800 }),
      makePlayer({ id: "p3", seat: 2, totalBet: 200, status: "active", chips: 800 }),
    ];
    const pots = buildPots(players);
    expect(pots).toHaveLength(2);

    // Main pot: 50 * 3 = 150
    expect(pots[0].amount).toBe(150);
    expect(pots[0].eligible).toEqual(expect.arrayContaining(["p1", "p2", "p3"]));

    // Side pot: (200 - 50) * 2 = 300
    expect(pots[1].amount).toBe(300);
    expect(pots[1].eligible).toEqual(expect.arrayContaining(["p2", "p3"]));
    expect(pots[1].eligible).not.toContain("p1");
  });
});

// ── Test 36 ───────────────────────────────────────────

describe("buildPots - all equal bets", () => {
  it("returns a single pot with all players eligible", () => {
    const players = [
      makePlayer({ id: "p1", seat: 0, totalBet: 100, status: "active" }),
      makePlayer({ id: "p2", seat: 1, totalBet: 100, status: "active" }),
      makePlayer({ id: "p3", seat: 2, totalBet: 100, status: "active" }),
    ];
    const pots = buildPots(players);
    expect(pots).toHaveLength(1);
    expect(pots[0].amount).toBe(300);
    expect(pots[0].eligible).toEqual(expect.arrayContaining(["p1", "p2", "p3"]));
  });
});
