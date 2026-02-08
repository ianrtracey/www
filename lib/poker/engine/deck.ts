import type { Card, Rank, Suit } from "@/lib/poker/types";

const SUITS: Suit[] = ["s", "h", "d", "c"];
const RANKS: Rank[] = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "T",
  "J",
  "Q",
  "K",
  "A",
];

/** Returns an ordered 52-card deck. */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const rank of RANKS) {
    for (const suit of SUITS) {
      deck.push(`${rank}${suit}` as Card);
    }
  }
  return deck;
}

/** Fisher-Yates shuffle using crypto.getRandomValues. Returns a new array. */
export function shuffle(deck: Card[]): Card[] {
  const shuffled = [...deck];
  const randomValues = new Uint32Array(shuffled.length);
  crypto.getRandomValues(randomValues);

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randomValues[i] % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

/** Deal `n` cards from the front of the deck. */
export function deal(
  deck: Card[],
  n: number,
): { dealt: Card[]; remaining: Card[] } {
  return {
    dealt: deck.slice(0, n),
    remaining: deck.slice(n),
  };
}
