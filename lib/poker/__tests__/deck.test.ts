import { createDeck, shuffle, deal } from "@/lib/poker/engine/deck";

describe("createDeck", () => {
  it("returns 52 unique cards", () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck).size).toBe(52);
  });
});

describe("shuffle", () => {
  it("returns all 52 cards", () => {
    const deck = createDeck();
    const shuffled = shuffle(deck);
    expect(shuffled).toHaveLength(52);
    expect(new Set(shuffled)).toEqual(new Set(deck));
  });

  it("is not identical to the input order", () => {
    const deck = createDeck();
    const shuffled = shuffle(deck);
    // Extremely unlikely to be identical after a proper shuffle
    expect(shuffled).not.toEqual(deck);
  });
});

describe("deal", () => {
  it("deal(deck, 2) returns 2 cards and 50 remaining", () => {
    const deck = createDeck();
    const { dealt, remaining } = deal(deck, 2);
    expect(dealt).toHaveLength(2);
    expect(remaining).toHaveLength(50);
  });

  it("deal(deck, 52) empties the deck", () => {
    const deck = createDeck();
    const { dealt, remaining } = deal(deck, 52);
    expect(dealt).toHaveLength(52);
    expect(remaining).toEqual([]);
  });
});
