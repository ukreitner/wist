import assert from "node:assert/strict";
import {
  compareAuctionBid,
  createDeck,
  createMatch,
  deriveSeed,
  listLegalActions,
  materializeMatch,
  nextDealer,
  resolveTrick,
  scoreHand,
  validateUndo
} from "../dist/index.js";

const makeEventId = (() => {
  let current = 0;
  return () => `event-${++current}`;
})();

const eventAt = (offset) => `2026-04-09T12:00:${String(offset).padStart(2, "0")}.000Z`;

const sampleCard = (code) => {
  const deck = createDeck();
  const card = deck.find((candidate) => candidate.code === code);

  if (!card) {
    throw new Error(`Missing sample card ${code}`);
  }

  return card;
};

const baseStartEvent = {
  type: "hand.started",
  id: makeEventId(),
  at: eventAt(0),
  handId: 1,
  dealer: "N",
  seed: "seed-1"
};

const tests = [
  {
    name: "auction bid ordering",
    run() {
      assert.ok(compareAuctionBid({ tricks: 5, trump: "H" }, { tricks: 5, trump: "S" }) < 0);
      assert.ok(compareAuctionBid({ tricks: 5, trump: "NT" }, { tricks: 6, trump: "C" }) < 0);
      assert.ok(compareAuctionBid({ tricks: 6, trump: "D" }, { tricks: 5, trump: "NT" }) > 0);
    }
  },
  {
    name: "hand scoring variants",
    run() {
      assert.deepEqual(
        scoreHand(
          { N: 0, E: 4, S: 5, W: 2 },
          { N: 0, E: 2, S: 5, W: 6 }
        ),
        { N: 2, E: -4, S: 7, W: -4 }
      );
      assert.equal(scoreHand({ N: 4, E: 4, S: 4, W: 4 }, { N: 4, E: 4, S: 4, W: 1 }).W, -3);
      assert.deepEqual(
        scoreHand(
          { N: 1, E: 5, S: 3, W: 3 },
          { N: 0, E: 13, S: 0, W: 0 }
        ),
        { N: 0, E: 0, S: 0, W: 0 }
      );
    }
  },
  {
    name: "trick resolution",
    run() {
      const trumpTrick = resolveTrick(
        [
          { seat: "N", card: sampleCard("10H") },
          { seat: "E", card: sampleCard("AS") },
          { seat: "S", card: sampleCard("KH") },
          { seat: "W", card: sampleCard("2H") }
        ],
        "N",
        "S"
      );
      assert.equal(trumpTrick.winner, "E");

      const noTrumpTrick = resolveTrick(
        [
          { seat: "N", card: sampleCard("10H") },
          { seat: "E", card: sampleCard("AS") },
          { seat: "S", card: sampleCard("KH") },
          { seat: "W", card: sampleCard("2H") }
        ],
        "N",
        "NT"
      );
      assert.equal(noTrumpTrick.winner, "S");
    }
  },
  {
    name: "full deterministic hand flow",
    run() {
      const cardsBySeat = {
        N: ["AC", "KC", "QC", "JC", "10C", "9C", "8C", "7C", "6C", "5C", "4C", "3C", "2C"].map(sampleCard),
        E: ["AD", "KD", "QD", "JD", "10D", "9D", "8D", "7D", "6D", "5D", "4D", "3D", "2D"].map(sampleCard),
        S: ["AH", "KH", "QH", "JH", "10H", "9H", "8H", "7H", "6H", "5H", "4H", "3H", "2H"].map(sampleCard),
        W: ["AS", "KS", "QS", "JS", "10S", "9S", "8S", "7S", "6S", "5S", "4S", "3S", "2S"].map(sampleCard)
      };
      const events = [
        { ...baseStartEvent, id: makeEventId(), seed: "fixed-seed", presetHands: cardsBySeat },
        { type: "auction.bid", id: makeEventId(), at: eventAt(1), seat: "E", bid: { tricks: 5, trump: "NT" } },
        { type: "auction.pass", id: makeEventId(), at: eventAt(2), seat: "S" },
        { type: "auction.pass", id: makeEventId(), at: eventAt(3), seat: "W" },
        { type: "auction.pass", id: makeEventId(), at: eventAt(4), seat: "N" },
        { type: "bet.submitted", id: makeEventId(), at: eventAt(5), seat: "E", value: 5 },
        { type: "bet.submitted", id: makeEventId(), at: eventAt(6), seat: "S", value: 3 },
        { type: "bet.submitted", id: makeEventId(), at: eventAt(7), seat: "W", value: 3 },
        { type: "bet.submitted", id: makeEventId(), at: eventAt(8), seat: "N", value: 1 }
      ];
      const diamonds = ["AD", "KD", "QD", "JD", "10D", "9D", "8D", "7D", "6D", "5D", "4D", "3D", "2D"];
      const hearts = ["AH", "KH", "QH", "JH", "10H", "9H", "8H", "7H", "6H", "5H", "4H", "3H", "2H"];
      const spades = ["AS", "KS", "QS", "JS", "10S", "9S", "8S", "7S", "6S", "5S", "4S", "3S", "2S"];
      const clubs = ["AC", "KC", "QC", "JC", "10C", "9C", "8C", "7C", "6C", "5C", "4C", "3C", "2C"];

      for (let index = 0; index < 13; index += 1) {
        events.push({ type: "card.played", id: makeEventId(), at: eventAt(9 + index * 4), seat: "E", cardCode: diamonds[index] });
        events.push({ type: "card.played", id: makeEventId(), at: eventAt(10 + index * 4), seat: "S", cardCode: hearts[index] });
        events.push({ type: "card.played", id: makeEventId(), at: eventAt(11 + index * 4), seat: "W", cardCode: spades[index] });
        events.push({ type: "card.played", id: makeEventId(), at: eventAt(12 + index * 4), seat: "N", cardCode: clubs[index] });
      }

      const state = materializeMatch(events, { match: createMatch({ initialDealer: "N", createdAt: eventAt(0) }) });

      assert.equal(state.awaitingNextHand, true);
      assert.equal(state.completedHands.length, 1);
      assert.deepEqual(state.completedHands[0].taken, { N: 0, E: 13, S: 0, W: 0 });
      assert.deepEqual(state.completedHands[0].scoreDelta, { N: 0, E: 0, S: 0, W: 0 });
    }
  },
  {
    name: "pass-left cycles and third all-pass reshuffle",
    run() {
      const events = [
        { ...baseStartEvent, id: makeEventId(), seed: "pass-seed" },
        { type: "auction.pass", id: makeEventId(), at: eventAt(1), seat: "E" },
        { type: "auction.pass", id: makeEventId(), at: eventAt(2), seat: "S" },
        { type: "auction.pass", id: makeEventId(), at: eventAt(3), seat: "W" },
        { type: "auction.pass", id: makeEventId(), at: eventAt(4), seat: "N" }
      ];
      let state = materializeMatch(events, { match: createMatch({ initialDealer: "N", createdAt: eventAt(0) }) });
      assert.equal(state.currentHand.phase, "passing");

      const passCards = (seat, codes) => ({ type: "pass.selected", id: makeEventId(), at: eventAt(10 + events.length), seat, cardCodes: codes });
      const firstPassHand = state.currentHand;
      events.push(passCards("N", firstPassHand.hands.N.slice(0, 3).map((card) => card.code)));
      events.push(passCards("E", firstPassHand.hands.E.slice(0, 3).map((card) => card.code)));
      events.push(passCards("S", firstPassHand.hands.S.slice(0, 3).map((card) => card.code)));
      events.push(passCards("W", firstPassHand.hands.W.slice(0, 3).map((card) => card.code)));
      events.push({ type: "auction.pass", id: makeEventId(), at: eventAt(20), seat: "E" });
      events.push({ type: "auction.pass", id: makeEventId(), at: eventAt(21), seat: "S" });
      events.push({ type: "auction.pass", id: makeEventId(), at: eventAt(22), seat: "W" });
      events.push({ type: "auction.pass", id: makeEventId(), at: eventAt(23), seat: "N" });
      state = materializeMatch(events, { match: createMatch({ initialDealer: "N", createdAt: eventAt(0) }) });
      assert.equal(state.currentHand.phase, "passing");
      assert.equal(state.currentHand.allPassCycles, 1);

      const secondPassHand = state.currentHand;
      events.push(passCards("N", secondPassHand.hands.N.slice(0, 3).map((card) => card.code)));
      events.push(passCards("E", secondPassHand.hands.E.slice(0, 3).map((card) => card.code)));
      events.push(passCards("S", secondPassHand.hands.S.slice(0, 3).map((card) => card.code)));
      events.push(passCards("W", secondPassHand.hands.W.slice(0, 3).map((card) => card.code)));
      const seedBeforeRedeal = secondPassHand.shuffleSeed;
      events.push({ type: "auction.pass", id: makeEventId(), at: eventAt(30), seat: "E" });
      events.push({ type: "auction.pass", id: makeEventId(), at: eventAt(31), seat: "S" });
      events.push({ type: "auction.pass", id: makeEventId(), at: eventAt(32), seat: "W" });
      events.push({ type: "auction.pass", id: makeEventId(), at: eventAt(33), seat: "N" });
      state = materializeMatch(events, { match: createMatch({ initialDealer: "N", createdAt: eventAt(0) }) });
      assert.equal(state.currentHand.phase, "auction");
      assert.equal(state.currentHand.reshuffles, 1);
      assert.equal(state.currentHand.shuffleSeed, deriveSeed(seedBeforeRedeal, "redeal-1"));
    }
  },
  {
    name: "legal actions, undo, and dealer rotation",
    run() {
      const events = [
        { ...baseStartEvent, id: makeEventId(), seed: "undo-seed" },
        { type: "auction.bid", id: makeEventId(), at: eventAt(1), seat: "E", bid: { tricks: 5, trump: "H" } }
      ];
      const state = materializeMatch(events, { match: createMatch({ initialDealer: "N", createdAt: eventAt(0) }) });
      const southActions = listLegalActions(state, "S");

      assert.equal(southActions.auction.canPass, true);
      assert.equal(southActions.auction.bids.some((bid) => bid.tricks === 5 && bid.trump === "S"), true);
      assert.equal(validateUndo(events, state, "E").valid, true);
      assert.equal(nextDealer("N"), "E");
      assert.equal(nextDealer("E"), "S");
      assert.equal(nextDealer("S"), "W");
      assert.equal(nextDealer("W"), "N");
    }
  }
];

for (const test of tests) {
  test.run();
  console.log(`ok - ${test.name}`);
}
