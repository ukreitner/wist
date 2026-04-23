import type { Card } from './WistCard';

export type VisibleCard = Card & { code?: string };

const suitOrder: Record<VisibleCard['suit'], number> = {
  C: 0,
  D: 1,
  H: 2,
  S: 3,
};

export const displayCardKey = (card: VisibleCard): string => card.code ?? `${card.rank}-${card.suit}`;

export const visualCardKey = (card: VisibleCard): string => `${card.rank}-${card.suit}`;

export const sortCardsForDisplay = <T extends VisibleCard>(cards: T[]): T[] =>
  [...cards].sort((left, right) => {
    const suitDelta = suitOrder[left.suit] - suitOrder[right.suit];

    if (suitDelta !== 0) {
      return suitDelta;
    }

    return left.rank - right.rank;
  });
