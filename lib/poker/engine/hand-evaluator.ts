import type { Card, Rank, Suit, EvaluatedHand } from "@/lib/poker/types";
import { HandRank } from "@/lib/poker/types";

// ── Helpers ───────────────────────────────────────────

/** Map a rank character to its numeric value (A=14 normally). */
export function rankValue(r: Rank): number {
  switch (r) {
    case "2":
      return 2;
    case "3":
      return 3;
    case "4":
      return 4;
    case "5":
      return 5;
    case "6":
      return 6;
    case "7":
      return 7;
    case "8":
      return 8;
    case "9":
      return 9;
    case "T":
      return 10;
    case "J":
      return 11;
    case "Q":
      return 12;
    case "K":
      return 13;
    case "A":
      return 14;
  }
}

function cardRank(card: Card): Rank {
  return card[0] as Rank;
}

function cardSuit(card: Card): Suit {
  return card[1] as Suit;
}

// ── Scoring ───────────────────────────────────────────

/**
 * Invert a rank value so that higher poker values produce lower (better)
 * scores. Ace (14) → 1, King (13) → 2, ..., 2 → 13.
 * A value of 0 (unused slot) stays 0.
 */
function invert(v: number): number {
  return v === 0 ? 0 : 15 - v;
}

function computeScore(
  rank: HandRank,
  primary: number,
  secondary: number,
  kicker1: number,
  kicker2: number,
  kicker3: number,
): number {
  return (
    rank * 10_000_000_000 +
    invert(primary) * 100_000_000 +
    invert(secondary) * 1_000_000 +
    invert(kicker1) * 10_000 +
    invert(kicker2) * 100 +
    invert(kicker3)
  );
}

// ── Five-Card Classification ──────────────────────────

function classifyFive(cards: [Card, Card, Card, Card, Card]): EvaluatedHand {
  const ranks = cards.map(cardRank);
  const suits = cards.map(cardSuit);
  const values = ranks.map(rankValue).sort((a, b) => b - a); // descending

  // Check flush: all same suit
  const isFlush = suits.every((s) => s === suits[0]);

  // Check straight: 5 consecutive ranks (descending sorted values)
  let isStraight = false;
  let straightHigh = 0;

  // Normal straight check
  if (
    values[0] - values[1] === 1 &&
    values[1] - values[2] === 1 &&
    values[2] - values[3] === 1 &&
    values[3] - values[4] === 1
  ) {
    isStraight = true;
    straightHigh = values[0];
  }

  // Wheel: A-2-3-4-5 (values sorted desc: [14, 5, 4, 3, 2])
  if (
    !isStraight &&
    values[0] === 14 &&
    values[1] === 5 &&
    values[2] === 4 &&
    values[3] === 3 &&
    values[4] === 2
  ) {
    isStraight = true;
    straightHigh = 5; // Ace counts as 1
  }

  // Count rank frequencies
  const freqMap = new Map<number, number>();
  for (const v of values) {
    freqMap.set(v, (freqMap.get(v) ?? 0) + 1);
  }

  // Sort by frequency desc, then by rank value desc
  const freqs = Array.from(freqMap.entries()).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return b[0] - a[0];
  });

  // Decision tree
  if (isFlush && isStraight) {
    if (straightHigh === 14) {
      // Royal Flush
      return {
        rank: HandRank.RoyalFlush,
        cards,
        score: computeScore(HandRank.RoyalFlush, 14, 0, 0, 0, 0),
      };
    }
    // Straight Flush
    return {
      rank: HandRank.StraightFlush,
      cards,
      score: computeScore(HandRank.StraightFlush, straightHigh, 0, 0, 0, 0),
    };
  }

  if (freqs[0][1] === 4) {
    // Four of a Kind
    const quadRank = freqs[0][0];
    const kicker = freqs[1][0];
    return {
      rank: HandRank.FourOfAKind,
      cards,
      score: computeScore(HandRank.FourOfAKind, quadRank, 0, kicker, 0, 0),
    };
  }

  if (freqs[0][1] === 3 && freqs[1][1] === 2) {
    // Full House
    const tripsRank = freqs[0][0];
    const pairRank = freqs[1][0];
    return {
      rank: HandRank.FullHouse,
      cards,
      score: computeScore(HandRank.FullHouse, tripsRank, pairRank, 0, 0, 0),
    };
  }

  if (isFlush) {
    return {
      rank: HandRank.Flush,
      cards,
      score: computeScore(
        HandRank.Flush,
        values[0],
        values[1],
        values[2],
        values[3],
        values[4],
      ),
    };
  }

  if (isStraight) {
    return {
      rank: HandRank.Straight,
      cards,
      score: computeScore(HandRank.Straight, straightHigh, 0, 0, 0, 0),
    };
  }

  if (freqs[0][1] === 3) {
    // Three of a Kind
    const tripsRank = freqs[0][0];
    // Remaining two cards sorted desc
    const kickers = freqs
      .slice(1)
      .map((f) => f[0])
      .sort((a, b) => b - a);
    return {
      rank: HandRank.ThreeOfAKind,
      cards,
      score: computeScore(
        HandRank.ThreeOfAKind,
        tripsRank,
        0,
        kickers[0],
        kickers[1],
        0,
      ),
    };
  }

  if (freqs[0][1] === 2 && freqs[1][1] === 2) {
    // Two Pair
    const higherPair = Math.max(freqs[0][0], freqs[1][0]);
    const lowerPair = Math.min(freqs[0][0], freqs[1][0]);
    const kicker = freqs[2][0];
    return {
      rank: HandRank.TwoPair,
      cards,
      score: computeScore(
        HandRank.TwoPair,
        higherPair,
        lowerPair,
        kicker,
        0,
        0,
      ),
    };
  }

  if (freqs[0][1] === 2) {
    // One Pair
    const pairRank = freqs[0][0];
    const kickers = freqs
      .slice(1)
      .map((f) => f[0])
      .sort((a, b) => b - a);
    return {
      rank: HandRank.OnePair,
      cards,
      score: computeScore(
        HandRank.OnePair,
        pairRank,
        0,
        kickers[0],
        kickers[1],
        kickers[2],
      ),
    };
  }

  // High Card
  return {
    rank: HandRank.HighCard,
    cards,
    score: computeScore(
      HandRank.HighCard,
      values[0],
      values[1],
      values[2],
      values[3],
      values[4],
    ),
  };
}

// ── Combinations ──────────────────────────────────────

/** Generate all C(n, 5) five-card combinations from the input array. */
function combinations5(cards: Card[]): [Card, Card, Card, Card, Card][] {
  const result: [Card, Card, Card, Card, Card][] = [];
  const n = cards.length;
  for (let i = 0; i < n - 4; i++) {
    for (let j = i + 1; j < n - 3; j++) {
      for (let k = j + 1; k < n - 2; k++) {
        for (let l = k + 1; l < n - 1; l++) {
          for (let m = l + 1; m < n; m++) {
            result.push([cards[i], cards[j], cards[k], cards[l], cards[m]]);
          }
        }
      }
    }
  }
  return result;
}

// ── Public API ────────────────────────────────────────

/**
 * Evaluate 7 cards (2 hole + 5 community) and return the best 5-card hand.
 * Generates all C(7,5) = 21 combinations and picks the one with the lowest
 * (best) score.
 */
export function evaluate(cards: Card[]): EvaluatedHand {
  if (cards.length < 5) {
    throw new Error(`Need at least 5 cards, got ${cards.length}`);
  }

  const combos = combinations5(cards);
  let best: EvaluatedHand | null = null;

  for (const combo of combos) {
    const hand = classifyFive(combo);
    if (best === null || hand.score < best.score) {
      best = hand;
    }
  }

  return best!;
}

/**
 * Compare two evaluated hands.
 * Returns negative if `a` wins, positive if `b` wins, 0 for a tie.
 */
export function compareHands(a: EvaluatedHand, b: EvaluatedHand): number {
  return a.score - b.score;
}
