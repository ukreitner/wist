import { createDeck, type Card, type Seat } from "@wist/core";
import type { TestScenario } from "./types.js";

const deck = createDeck();

const card = (code: string): Card => {
  const found = deck.find((candidate) => candidate.code === code);

  if (!found) {
    throw new Error(`Missing preset card ${code}`);
  }

  return found;
};

const hand = (codes: string[]): Card[] => codes.map(card);

export const TEST_PRESETS: Record<string, TestScenario> = {
  "single-suit-hand": {
    initialDealer: "N",
    hands: [
      {
        dealer: "N",
        seed: "preset-single-suit",
        presetHands: {
          N: hand(["AC", "KC", "QC", "JC", "10C", "9C", "8C", "7C", "6C", "5C", "4C", "3C", "2C"]),
          E: hand(["AD", "KD", "QD", "JD", "10D", "9D", "8D", "7D", "6D", "5D", "4D", "3D", "2D"]),
          S: hand(["AH", "KH", "QH", "JH", "10H", "9H", "8H", "7H", "6H", "5H", "4H", "3H", "2H"]),
          W: hand(["AS", "KS", "QS", "JS", "10S", "9S", "8S", "7S", "6S", "5S", "4S", "3S", "2S"])
        }
      }
    ]
  },
  "simple-sequence": {
    initialDealer: "N",
    hands: [
      {
        dealer: "N",
        seed: "preset-simple-1"
      },
      {
        dealer: "E",
        seed: "preset-simple-2"
      }
    ]
  }
};
