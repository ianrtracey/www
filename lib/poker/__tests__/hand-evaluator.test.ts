import { evaluate, compareHands } from "@/lib/poker/engine/hand-evaluator";
import { HandRank } from "@/lib/poker/types";
import type { Card } from "@/lib/poker/types";

describe("hand-evaluator", () => {
  // ── Detection tests (each provides 7 cards) ────────

  it("6: Royal flush detected", () => {
    const cards: Card[] = ["As", "Ks", "Qs", "Js", "Ts", "3d", "7c"];
    const result = evaluate(cards);
    expect(result.rank).toBe(HandRank.RoyalFlush);
  });

  it("7: Straight flush detected", () => {
    const cards: Card[] = ["9h", "8h", "7h", "6h", "5h", "Kd", "2c"];
    const result = evaluate(cards);
    expect(result.rank).toBe(HandRank.StraightFlush);
  });

  it("8: Four of a kind detected", () => {
    const cards: Card[] = ["9s", "9h", "9d", "9c", "Ks", "3d", "7c"];
    const result = evaluate(cards);
    expect(result.rank).toBe(HandRank.FourOfAKind);
  });

  it("9: Full house detected", () => {
    const cards: Card[] = ["Ks", "Kh", "Kd", "7s", "7c", "3d", "2c"];
    const result = evaluate(cards);
    expect(result.rank).toBe(HandRank.FullHouse);
  });

  it("10: Flush detected", () => {
    const cards: Card[] = ["As", "Js", "8s", "5s", "3s", "Kd", "2c"];
    const result = evaluate(cards);
    expect(result.rank).toBe(HandRank.Flush);
  });

  it("11: Straight detected", () => {
    const cards: Card[] = ["9s", "8h", "7d", "6c", "5s", "Kd", "2c"];
    const result = evaluate(cards);
    expect(result.rank).toBe(HandRank.Straight);
  });

  it("12: Three of a kind detected", () => {
    const cards: Card[] = ["Qs", "Qh", "Qd", "9c", "6s", "3d", "2c"];
    const result = evaluate(cards);
    expect(result.rank).toBe(HandRank.ThreeOfAKind);
  });

  it("13: Two pair detected", () => {
    const cards: Card[] = ["Ks", "Kh", "7d", "7c", "9s", "3d", "2c"];
    const result = evaluate(cards);
    expect(result.rank).toBe(HandRank.TwoPair);
  });

  it("14: One pair detected", () => {
    const cards: Card[] = ["As", "Ah", "9d", "7c", "5s", "3d", "2c"];
    const result = evaluate(cards);
    expect(result.rank).toBe(HandRank.OnePair);
  });

  it("15: High card detected", () => {
    const cards: Card[] = ["As", "Jh", "9d", "7c", "5s", "3d", "2c"];
    const result = evaluate(cards);
    expect(result.rank).toBe(HandRank.HighCard);
  });

  // ── Special straight cases ──────────────────────────

  it("16: Ace-low straight (wheel)", () => {
    const cards: Card[] = ["As", "2h", "3d", "4c", "5s", "9d", "Kc"];
    const result = evaluate(cards);
    expect(result.rank).toBe(HandRank.Straight);
    // High card of the wheel is 5. Inverted: 15 - 5 = 10.
    // score = rank * 10B + invert(primary) * 100M
    // For a straight with high=5: 6 * 10B + 10 * 100M
    expect(result.score).toBe(6 * 10_000_000_000 + 10 * 100_000_000);
  });

  it("17: Broadway straight", () => {
    const cards: Card[] = ["Ah", "Kd", "Qs", "Jc", "Ts", "3d", "2c"];
    const result = evaluate(cards);
    expect(result.rank).toBe(HandRank.Straight);
    // High card is Ace (14). Inverted: 15 - 14 = 1.
    // Broadway beats the wheel — lower score is better
    expect(result.score).toBe(6 * 10_000_000_000 + 1 * 100_000_000);
  });

  // ── Best 5 of 7 ────────────────────────────────────

  it("18: Best 5 of 7 selected — full house chosen over two pair", () => {
    // Two hole cards complete a full house when combined with community
    // Community: Ks Kh 7d 7c 3s
    // Hole: Kd 2c
    // Best 5: Ks Kh Kd 7d 7c = Full house (Kings full of Sevens)
    // Without the third K, best is two pair
    const cards: Card[] = ["Kd", "2c", "Ks", "Kh", "7d", "7c", "3s"];
    const result = evaluate(cards);
    expect(result.rank).toBe(HandRank.FullHouse);
  });

  // ── Comparison tests ────────────────────────────────

  it("19: Kicker comparison — higher kicker wins", () => {
    // Both have pair of Aces, different kickers
    const handA = evaluate([
      "As",
      "Ah",
      "Kd",
      "9c",
      "5s",
      "3d",
      "2c",
    ] as Card[]);
    const handB = evaluate([
      "Ad",
      "Ac",
      "Qd",
      "9h",
      "5d",
      "3c",
      "2h",
    ] as Card[]);
    // A has K kicker, B has Q kicker — A wins
    expect(compareHands(handA, handB)).toBeLessThan(0);
  });

  it("20: Exact tie returns 0", () => {
    // Same hand ranks & kickers, different suits
    const handA = evaluate([
      "As",
      "Kh",
      "Qd",
      "Jc",
      "9s",
      "5d",
      "2c",
    ] as Card[]);
    const handB = evaluate([
      "Ah",
      "Kd",
      "Qs",
      "Jd",
      "9c",
      "5h",
      "2d",
    ] as Card[]);
    expect(compareHands(handA, handB)).toBe(0);
  });

  it("21: Full house beats flush", () => {
    const fullHouse = evaluate([
      "Ks",
      "Kh",
      "Kd",
      "7s",
      "7c",
      "3d",
      "2c",
    ] as Card[]);
    const flush = evaluate([
      "As",
      "Js",
      "8s",
      "5s",
      "3s",
      "Kd",
      "2c",
    ] as Card[]);
    // Full house (rank 4) beats flush (rank 5) — lower score wins
    expect(compareHands(fullHouse, flush)).toBeLessThan(0);
  });

  it("22: Higher flush beats lower flush", () => {
    const higherFlush = evaluate([
      "As",
      "Ks",
      "8s",
      "5s",
      "3s",
      "2d",
      "4c",
    ] as Card[]);
    const lowerFlush = evaluate([
      "Qh",
      "Jh",
      "8h",
      "5h",
      "3h",
      "2d",
      "4c",
    ] as Card[]);
    // A-K flush beats Q-J flush
    expect(compareHands(higherFlush, lowerFlush)).toBeLessThan(0);
  });

  it("23: Two pair tiebreak by kicker", () => {
    // Both have Kings and Sevens, different kickers
    const handA = evaluate([
      "Ks",
      "Kh",
      "7d",
      "7c",
      "As",
      "3d",
      "2c",
    ] as Card[]);
    const handB = evaluate([
      "Kd",
      "Kc",
      "7s",
      "7h",
      "Js",
      "3h",
      "2d",
    ] as Card[]);
    // A has Ace kicker, B has Jack kicker — A wins
    expect(compareHands(handA, handB)).toBeLessThan(0);
  });
});
