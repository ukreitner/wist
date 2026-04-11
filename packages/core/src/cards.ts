import { RANKS, SEATS, SUITS, type Card, type Rank, type Seat } from "./types.js";

const rankToCode = (rank: Rank): string => {
  if (rank <= 10) {
    return String(rank);
  }

  if (rank === 11) {
    return "J";
  }

  if (rank === 12) {
    return "Q";
  }

  if (rank === 13) {
    return "K";
  }

  return "A";
};

const hashSeed = (seed: string): number => {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const mulberry32 = (seed: number): (() => number) => {
  let value = seed;

  return () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let output = Math.imul(value ^ (value >>> 15), 1 | value);
    output = (output + Math.imul(output ^ (output >>> 7), 61 | output)) ^ output;
    return ((output ^ (output >>> 14)) >>> 0) / 4294967296;
  };
};

export const createDeck = (): Card[] =>
  SUITS.flatMap((suit) =>
    RANKS.map((rank) => ({
      code: `${rankToCode(rank)}${suit}`,
      suit,
      rank
    }))
  );

export const sortCards = (cards: Card[]): Card[] =>
  [...cards].sort((left, right) => {
    if (left.suit !== right.suit) {
      return SUITS.indexOf(left.suit) - SUITS.indexOf(right.suit);
    }

    return right.rank - left.rank;
  });

export const deriveSeed = (seed: string, label: string): string => `${seed}:${label}`;

export const shuffleDeck = (seed: string): Card[] => {
  const cards = [...createDeck()];
  const random = mulberry32(hashSeed(seed));

  for (let index = cards.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [cards[index], cards[swapIndex]] = [cards[swapIndex], cards[index]];
  }

  return cards;
};

export const dealHandsFromDeck = (deck: Card[]): Record<Seat, Card[]> => {
  const hands = {
    N: [] as Card[],
    E: [] as Card[],
    S: [] as Card[],
    W: [] as Card[]
  };

  for (let index = 0; index < deck.length; index += 1) {
    const seat = SEATS[index % SEATS.length];
    hands[seat].push(deck[index]);
  }

  return {
    N: sortCards(hands.N),
    E: sortCards(hands.E),
    S: sortCards(hands.S),
    W: sortCards(hands.W)
  };
};

export const dealHands = (seed: string): Record<Seat, Card[]> => dealHandsFromDeck(shuffleDeck(seed));
