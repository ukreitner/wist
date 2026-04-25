import {
  SEATS,
  TRUMPS,
  type AuctionActionEntry,
  type AuctionBid,
  type Card,
  type CreateMatchOptions,
  type GameEvent,
  type HandStartEvent,
  type HandState,
  type HandSummary,
  type MatchState,
  type PassRecord,
  type PlayedCard,
  type PublicHandState,
  type PublicMatchState,
  type PrivatePlayerView,
  type ScoreMap,
  type Seat,
  type Trick,
  type TrickInProgress,
  type Trump,
  type UndoValidationResult,
  type UndoWindow
} from "./types.js";
import { dealHands, deriveSeed, sortCards } from "./cards.js";

const zeroScores = (): ScoreMap => ({
  N: 0,
  E: 0,
  S: 0,
  W: 0
});

const cloneState = <Value>(value: Value): Value => structuredClone(value);

const nextSeatInternal = (seat: Seat): Seat => {
  const index = SEATS.indexOf(seat);
  return SEATS[(index + 1) % SEATS.length];
};

const seatsFrom = (seat: Seat): Seat[] => {
  const ordered: Seat[] = [seat];

  while (ordered.length < SEATS.length) {
    ordered.push(nextSeatInternal(ordered[ordered.length - 1]));
  }

  return ordered;
};

const createHandState = (event: HandStartEvent): HandState => {
  const hands = event.presetHands
    ? {
        N: sortCards(event.presetHands.N),
        E: sortCards(event.presetHands.E),
        S: sortCards(event.presetHands.S),
        W: sortCards(event.presetHands.W)
      }
    : dealHands(event.seed);

  return {
    id: event.handId,
    dealer: event.dealer,
    phase: "auction",
    shuffleSeed: event.seed,
    reshuffles: 0,
    allPassCycles: 0,
    hands,
    passSelections: {
      N: null,
      E: null,
      S: null,
      W: null
    },
    passHistory: [],
    auctionTurn: nextSeatInternal(event.dealer),
    auctionLog: [],
    highestBid: null,
    highestBidder: null,
    consecutivePasses: 0,
    contract: null,
    bets: {},
    betOrder: [],
    betTurn: null,
    trickTurn: null,
    currentTrick: null,
    completedTricks: [],
    taken: zeroScores()
  };
};

const getCardFromHand = (cards: Card[], code: string): Card | undefined =>
  cards.find((card) => card.code === code);

const removeCardFromHand = (cards: Card[], code: string): Card[] => {
  const nextCards = [...cards];
  const index = nextCards.findIndex((card) => card.code === code);

  if (index < 0) {
    throw new Error(`Card ${code} not found in hand.`);
  }

  nextCards.splice(index, 1);
  return sortCards(nextCards);
};

const eligibleUndoType = (event: GameEvent): UndoWindow["actionKind"] | null => {
  switch (event.type) {
    case "auction.bid":
    case "auction.pass":
      return "auction";
    case "bet.submitted":
      return "bet";
    case "card.played":
      return "play";
    default:
      return null;
  }
};

const eventSeat = (event: GameEvent): Seat | null => ("seat" in event ? event.seat : null);

export const deriveUndoWindow = (events: GameEvent[]): UndoWindow | null => {
  const undoneTargets = new Set(
    events
      .filter((event): event is Extract<GameEvent, { type: "undo.requested" }> => event.type === "undo.requested")
      .map((event) => event.targetEventId)
  );
  const lastEvent = events.at(-1);

  if (!lastEvent || lastEvent.type === "undo.requested" || undoneTargets.has(lastEvent.id)) {
    return null;
  }

  const actionKind = eligibleUndoType(lastEvent);

  if (!actionKind) {
    return null;
  }

  const seat = eventSeat(lastEvent);

  if (!seat) {
    return null;
  }

  return {
    actor: seat,
    targetEventId: lastEvent.id,
    actionKind
  };
};

const createAuctionEntry = (
  event: Extract<GameEvent, { type: "auction.bid" | "auction.pass" }>
): AuctionActionEntry => ({
  eventId: event.id,
  at: event.at,
  seat: event.seat,
  kind: event.type === "auction.bid" ? "bid" : "pass",
  bid: event.type === "auction.bid" ? event.bid : undefined
});

const assertHand = (state: MatchState): HandState => {
  if (!state.currentHand) {
    throw new Error("No active hand.");
  }

  return state.currentHand;
};

const assertAuctionTurn = (hand: HandState, seat: Seat): void => {
  if (hand.phase !== "auction" || hand.auctionTurn !== seat) {
    throw new Error("Not this seat's auction turn.");
  }
};

const assertBetTurn = (hand: HandState, seat: Seat): void => {
  if (hand.phase !== "betting" || hand.betTurn !== seat) {
    throw new Error("Not this seat's betting turn.");
  }
};

const assertPlayTurn = (hand: HandState, seat: Seat): void => {
  if (hand.phase !== "playing" || hand.trickTurn !== seat) {
    throw new Error("Not this seat's play turn.");
  }
};

const legalPlayableCards = (hand: HandState, seat: Seat): Card[] => {
  const playerCards = hand.hands[seat];
  const ledSuit = hand.currentTrick?.plays[0]?.card.suit;

  if (!ledSuit) {
    return playerCards;
  }

  const matchingSuit = playerCards.filter((card) => card.suit === ledSuit);
  return matchingSuit.length > 0 ? matchingSuit : playerCards;
};

const applyPassSelections = (hand: HandState): HandState => {
  if (SEATS.some((seat) => hand.passSelections[seat] === null)) {
    return hand;
  }

  const hands = cloneState(hand.hands);
  const passRecords: PassRecord[] = [];

  for (const seat of SEATS) {
    const cards = hand.passSelections[seat];

    if (!cards) {
      throw new Error("Missing pass selection.");
    }

    for (const card of cards) {
      hands[seat] = removeCardFromHand(hands[seat], card.code);
    }
  }

  for (const seat of SEATS) {
    const cards = hand.passSelections[seat];

    if (!cards) {
      throw new Error("Missing pass selection.");
    }

    const recipient = nextSeatInternal(seat);
    hands[recipient] = sortCards([...hands[recipient], ...cards]);
    passRecords.push({ from: seat, to: recipient, cards });
  }

  return {
    ...hand,
    phase: "auction",
    allPassCycles: hand.allPassCycles + 1,
    hands,
    passSelections: {
      N: null,
      E: null,
      S: null,
      W: null
    },
    passHistory: [...hand.passHistory, passRecords],
    auctionLog: [],
    auctionTurn: nextSeatInternal(hand.dealer),
    highestBid: null,
    highestBidder: null,
    consecutivePasses: 0
  };
};

const resetAfterRedeal = (hand: HandState): HandState => {
  const nextReshuffleCount = hand.reshuffles + 1;
  const nextSeed = deriveSeed(hand.shuffleSeed, `redeal-${nextReshuffleCount}`);

  return {
    id: hand.id,
    dealer: hand.dealer,
    phase: "auction",
    shuffleSeed: nextSeed,
    reshuffles: nextReshuffleCount,
    allPassCycles: 0,
    hands: dealHands(nextSeed),
    passSelections: {
      N: null,
      E: null,
      S: null,
      W: null
    },
    passHistory: [],
    auctionTurn: nextSeatInternal(hand.dealer),
    auctionLog: [],
    highestBid: null,
    highestBidder: null,
    consecutivePasses: 0,
    contract: null,
    bets: {},
    betOrder: [],
    betTurn: null,
    trickTurn: null,
    currentTrick: null,
    completedTricks: [],
    taken: zeroScores()
  };
};

const resolveCurrentTrick = (trick: TrickInProgress, trump: Trump): Trick => {
  const leaderPlay = trick.plays[0];

  if (!leaderPlay) {
    throw new Error("Cannot resolve an empty trick.");
  }

  const ledSuit = leaderPlay.card.suit;
  const trumpPlays = trump === "NT" ? [] : trick.plays.filter((play) => play.card.suit === trump);
  const candidates = trumpPlays.length > 0 ? trumpPlays : trick.plays.filter((play) => play.card.suit === ledSuit);
  const winner = [...candidates].sort((left, right) => right.card.rank - left.card.rank)[0];

  if (!winner) {
    throw new Error("Unable to determine the trick winner.");
  }

  return {
    leader: trick.leader,
    ledSuit,
    winner: winner.seat,
    plays: trick.plays
  };
};

const copyScores = (scores: ScoreMap): ScoreMap => ({
  N: scores.N,
  E: scores.E,
  S: scores.S,
  W: scores.W
});

const scoreMiss = (totalBids: number, bet: number, taken: number): number => {
  const difference = Math.abs(taken - bet);

  if (totalBids < 13 && taken < bet) {
    return -2 * difference;
  }

  if (totalBids > 13 && taken > bet) {
    return -2 * difference;
  }

  return -difference;
};

const calculateScoreDelta = (bets: Record<Seat, number>, taken: ScoreMap): ScoreMap => {
  const results = zeroScores();
  const allPlayersMissed = SEATS.every((seat) => bets[seat] !== taken[seat]);

  if (allPlayersMissed) {
    return results;
  }

  const totalBids = Object.values(bets).reduce((sum, value) => sum + value, 0);

  for (const seat of SEATS) {
    const bet = bets[seat];
    const tricksTaken = taken[seat];

    if (bet === 0 && tricksTaken === 0) {
      results[seat] = 7;
    } else if (bet === tricksTaken) {
      results[seat] = bet + 2;
    } else {
      results[seat] = scoreMiss(totalBids, bet, tricksTaken);
    }
  }

  return results;
};

const finalizeHand = (state: MatchState, hand: HandState): MatchState => {
  if (!hand.contract) {
    throw new Error("Cannot finalize a hand without a contract.");
  }

  const bets = SEATS.reduce<Record<Seat, number>>(
    (accumulator, seat) => ({
      ...accumulator,
      [seat]: hand.bets[seat] ?? 0
    }),
    { N: 0, E: 0, S: 0, W: 0 }
  );
  const scoreDelta = calculateScoreDelta(bets, hand.taken);

  const cumulativeScores = copyScores(state.scores);

  for (const seat of SEATS) {
    cumulativeScores[seat] += scoreDelta[seat];
  }

  const summary: HandSummary = {
    id: hand.id,
    dealer: hand.dealer,
    contract: hand.contract,
    bets,
    taken: hand.taken,
    scoreDelta,
    cumulativeScores,
    auctionLog: hand.auctionLog,
    trickLog: hand.completedTricks,
    passHistory: hand.passHistory,
    allPassCycles: hand.allPassCycles,
    reshuffles: hand.reshuffles
  };

  return {
    ...state,
    scores: cumulativeScores,
    completedHands: [...state.completedHands, summary],
    currentHand: null,
    awaitingNextHand: true
  };
};

export const nextDealer = (seat: Seat): Seat => nextSeatInternal(seat);

export const compareAuctionBid = (left: AuctionBid, right: AuctionBid): number => {
  if (left.tricks !== right.tricks) {
    return left.tricks - right.tricks;
  }

  return TRUMPS.indexOf(left.trump) - TRUMPS.indexOf(right.trump);
};

export const resolveTrick = (plays: PlayedCard[], leader: Seat, trump: Trump): Trick =>
  resolveCurrentTrick({ leader, plays }, trump);

export const scoreHand = (bets: Record<Seat, number>, taken: ScoreMap): ScoreMap => calculateScoreDelta(bets, taken);

export const createMatch = (options: CreateMatchOptions): MatchState => ({
  version: 1,
  status: "waiting",
  dealer: options.initialDealer,
  nextDealer: nextSeatInternal(options.initialDealer),
  handNumber: 0,
  scores: options.initialScores ? copyScores(options.initialScores) : zeroScores(),
  currentHand: null,
  completedHands: [],
  awaitingNextHand: false,
  undoWindow: null,
  createdAt: options.createdAt ?? new Date().toISOString(),
  endedAt: null
});

export const applyEvent = (state: MatchState, event: Exclude<GameEvent, { type: "undo.requested" }>): MatchState => {
  switch (event.type) {
    case "hand.started": {
      return {
        ...state,
        status: "active",
        dealer: event.dealer,
        nextDealer: nextSeatInternal(event.dealer),
        handNumber: event.handId,
        currentHand: createHandState(event),
        awaitingNextHand: false
      };
    }
    case "auction.bid": {
      const hand = cloneState(assertHand(state));
      assertAuctionTurn(hand, event.seat);

      if (event.bid.tricks < 5 || event.bid.tricks > 13) {
        throw new Error("Auction bid must be between 5 and 13 tricks.");
      }

      if (hand.highestBid && compareAuctionBid(event.bid, hand.highestBid) <= 0) {
        throw new Error("Auction bid is not high enough.");
      }

      hand.auctionLog.push(createAuctionEntry(event));
      hand.highestBid = event.bid;
      hand.highestBidder = event.seat;
      hand.consecutivePasses = 0;
      hand.auctionTurn = nextSeatInternal(event.seat);

      return { ...state, currentHand: hand };
    }
    case "auction.pass": {
      const hand = cloneState(assertHand(state));
      assertAuctionTurn(hand, event.seat);
      hand.auctionLog.push(createAuctionEntry(event));
      hand.consecutivePasses += 1;

      if (hand.highestBid && hand.highestBidder && hand.consecutivePasses >= 3) {
        hand.phase = "betting";
        hand.contract = {
          ...hand.highestBid,
          bidder: hand.highestBidder
        };
        hand.betOrder = seatsFrom(hand.highestBidder);
        hand.betTurn = hand.highestBidder;
        hand.auctionTurn = null;
        return { ...state, currentHand: hand };
      }

      if (!hand.highestBid && hand.consecutivePasses >= 4) {
        if (hand.allPassCycles < 2) {
          hand.phase = "passing";
          hand.passSelections = {
            N: null,
            E: null,
            S: null,
            W: null
          };
          hand.auctionTurn = null;
          hand.consecutivePasses = 0;
          return { ...state, currentHand: hand };
        }

        return {
          ...state,
          currentHand: resetAfterRedeal(hand)
        };
      }

      hand.auctionTurn = nextSeatInternal(event.seat);
      return { ...state, currentHand: hand };
    }
    case "pass.selected": {
      const hand = cloneState(assertHand(state));

      if (hand.phase !== "passing") {
        throw new Error("Pass selections are only allowed during the pass-left phase.");
      }

      if (hand.passSelections[event.seat]) {
        throw new Error("This seat already selected pass cards.");
      }

      if (event.cardCodes.length !== 3 || new Set(event.cardCodes).size !== 3) {
        throw new Error("Exactly three unique cards must be passed.");
      }

      const selectedCards = event.cardCodes.map((code) => {
        const card = getCardFromHand(hand.hands[event.seat], code);

        if (!card) {
          throw new Error(`Seat ${event.seat} does not hold card ${code}.`);
        }

        return card;
      });

      hand.passSelections[event.seat] = sortCards(selectedCards);

      return {
        ...state,
        currentHand: applyPassSelections(hand)
      };
    }
    case "bet.submitted": {
      const hand = cloneState(assertHand(state));
      assertBetTurn(hand, event.seat);

      if (event.value < 0 || event.value > 13) {
        throw new Error("Bet must be between 0 and 13.");
      }

      if (!hand.contract) {
        throw new Error("Contract is required before betting.");
      }

      if (event.seat === hand.contract.bidder && event.value < hand.contract.tricks) {
        throw new Error("The contract winner must bet at least the contract number.");
      }

      const isLastBettor = hand.betOrder[hand.betOrder.length - 1] === event.seat;
      const currentTotal = Object.values(hand.bets).reduce((sum, value) => sum + (value ?? 0), 0);

      if (isLastBettor && currentTotal + event.value === 13) {
        throw new Error("The final bettor cannot make the total bets equal 13.");
      }

      hand.bets[event.seat] = event.value;
      const nextSeat = hand.betOrder.find((candidate) => hand.bets[candidate] === undefined) ?? null;

      if (!nextSeat) {
        hand.phase = "playing";
        hand.betTurn = null;
        hand.trickTurn = hand.contract.bidder;
        hand.currentTrick = {
          leader: hand.contract.bidder,
          plays: []
        };
      } else {
        hand.betTurn = nextSeat;
      }

      return { ...state, currentHand: hand };
    }
    case "card.played": {
      const hand = cloneState(assertHand(state));
      assertPlayTurn(hand, event.seat);

      if (!hand.currentTrick || !hand.contract) {
        throw new Error("No active trick.");
      }

      const legalCards = legalPlayableCards(hand, event.seat);
      const playedCard = legalCards.find((card) => card.code === event.cardCode);

      if (!playedCard) {
        throw new Error("Illegal card play.");
      }

      hand.hands[event.seat] = removeCardFromHand(hand.hands[event.seat], event.cardCode);
      hand.currentTrick.plays.push({
        seat: event.seat,
        card: playedCard
      });

      if (hand.currentTrick.plays.length < 4) {
        hand.trickTurn = nextSeatInternal(event.seat);
        return { ...state, currentHand: hand };
      }

      const resolvedTrick = resolveCurrentTrick(hand.currentTrick, hand.contract.trump);
      hand.completedTricks.push(resolvedTrick);
      hand.taken[resolvedTrick.winner] += 1;

      if (hand.completedTricks.length >= 13) {
        return finalizeHand(
          { ...state, currentHand: hand },
          {
            ...hand,
            currentTrick: null,
            trickTurn: null
          }
        );
      }

      hand.currentTrick = {
        leader: resolvedTrick.winner,
        plays: []
      };
      hand.trickTurn = resolvedTrick.winner;

      return { ...state, currentHand: hand };
    }
    case "match.ended": {
      return {
        ...state,
        status: "ended",
        currentHand: null,
        awaitingNextHand: false,
        endedAt: event.at
      };
    }
  }
};

export const materializeMatch = (events: GameEvent[], options: { match?: MatchState } = {}): MatchState => {
  const baseMatch =
    options.match ??
    createMatch({
      initialDealer: "N"
    });
  const undoneTargets = new Set(
    events
      .filter((event): event is Extract<GameEvent, { type: "undo.requested" }> => event.type === "undo.requested")
      .map((event) => event.targetEventId)
  );
  let state = cloneState(baseMatch);

  for (const event of events) {
    if (event.type === "undo.requested" || undoneTargets.has(event.id)) {
      continue;
    }

    state = applyEvent(state, event);
  }

  state.undoWindow = deriveUndoWindow(events);
  return state;
};

export const listLegalActions = (state: MatchState, seat: Seat): PrivatePlayerView["legalActions"] => {
  const canUndo = state.undoWindow?.actor === seat;
  const legalActions: PrivatePlayerView["legalActions"] = {
    canUndo,
    undoTargetEventId: canUndo ? state.undoWindow?.targetEventId ?? null : null,
    passSelection: null,
    auction: null,
    betting: null,
    playing: null
  };

  const hand = state.currentHand;

  if (!hand) {
    return legalActions;
  }

  if (hand.phase === "passing" && !hand.passSelections[seat]) {
    legalActions.passSelection = {
      requiredCount: 3,
      selectableCardCodes: hand.hands[seat].map((card) => card.code)
    };
  }

  if (hand.phase === "auction" && hand.auctionTurn === seat) {
    const bids: AuctionBid[] = [];

    for (let tricks = 5; tricks <= 13; tricks += 1) {
      for (const trump of TRUMPS) {
        const bid = { tricks, trump };

        if (!hand.highestBid || compareAuctionBid(bid, hand.highestBid) > 0) {
          bids.push(bid);
        }
      }
    }

    legalActions.auction = {
      canPass: true,
      bids
    };
  }

  if (hand.phase === "betting" && hand.betTurn === seat && hand.contract) {
    const min = seat === hand.contract.bidder ? hand.contract.tricks : 0;
    const currentTotal = Object.values(hand.bets).reduce((sum, value) => sum + (value ?? 0), 0);
    const isLastBettor = hand.betOrder[hand.betOrder.length - 1] === seat;
    const values: number[] = [];

    for (let value = min; value <= 13; value += 1) {
      if (isLastBettor && currentTotal + value === 13) {
        continue;
      }

      values.push(value);
    }

    legalActions.betting = {
      values,
      min
    };
  }

  if (hand.phase === "playing" && hand.trickTurn === seat) {
    legalActions.playing = {
      cardCodes: legalPlayableCards(hand, seat).map((card) => card.code)
    };
  }

  return legalActions;
};

export const validateUndo = (events: GameEvent[], state: MatchState, seat: Seat): UndoValidationResult => {
  if (state.status === "ended") {
    return {
      valid: false,
      reason: "The match has ended."
    };
  }

  const lastEvent = events.at(-1);

  if (!lastEvent) {
    return {
      valid: false,
      reason: "There is nothing to undo."
    };
  }

  if (lastEvent.type === "undo.requested") {
    return {
      valid: false,
      reason: "The latest event is already an undo."
    };
  }

  const actionKind = eligibleUndoType(lastEvent);

  if (!actionKind) {
    return {
      valid: false,
      reason: "The latest action is not undoable."
    };
  }

  if (eventSeat(lastEvent) !== seat) {
    return {
      valid: false,
      reason: "Only the player who made the latest eligible action can undo."
    };
  }

  return {
    valid: true,
    targetEventId: lastEvent.id,
    actionKind
  };
};

const toPublicHand = (hand: HandState): PublicHandState => ({
  id: hand.id,
  dealer: hand.dealer,
  phase: hand.phase,
  reshuffles: hand.reshuffles,
  allPassCycles: hand.allPassCycles,
  currentTurn: hand.phase === "auction" ? hand.auctionTurn : hand.phase === "betting" ? hand.betTurn : hand.trickTurn,
  highestBid: hand.highestBid,
  highestBidder: hand.highestBidder,
  contract: hand.contract,
  auctionLog: hand.auctionLog,
  pendingPassCount: SEATS.filter((seat) => hand.passSelections[seat] !== null).length,
  passCycles: hand.passHistory.length,
  bets: hand.bets,
  betOrder: hand.betOrder,
  currentTrick: hand.currentTrick,
  completedTricks: hand.completedTricks,
  taken: hand.taken,
  cardCounts: {
    N: hand.hands.N.length,
    E: hand.hands.E.length,
    S: hand.hands.S.length,
    W: hand.hands.W.length
  }
});

export const toPublicState = (state: MatchState): PublicMatchState => ({
  status: state.status,
  dealer: state.dealer,
  nextDealer: state.nextDealer,
  handNumber: state.handNumber,
  scores: state.scores,
  currentHand: state.currentHand ? toPublicHand(state.currentHand) : null,
  completedHands: state.completedHands,
  awaitingNextHand: state.awaitingNextHand
});

export const toPlayerView = (state: MatchState, seat: Seat): PrivatePlayerView => {
  const publicState = toPublicState(state);

  return {
    ...publicState,
    viewerSeat: seat,
    hand: state.currentHand ? state.currentHand.hands[seat] : [],
    pendingPassSelection: state.currentHand?.passSelections[seat] ?? null,
    legalActions: listLegalActions(state, seat)
  };
};
