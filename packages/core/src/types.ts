export const SEATS = ["N", "E", "S", "W"] as const;
export const SUITS = ["C", "D", "H", "S"] as const;
export const TRUMPS = ["C", "D", "H", "S", "NT"] as const;
export const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const;

export type Seat = (typeof SEATS)[number];
export type Suit = (typeof SUITS)[number];
export type Trump = (typeof TRUMPS)[number];
export type Rank = (typeof RANKS)[number];

export interface Card {
  code: string;
  suit: Suit;
  rank: Rank;
}

export interface AuctionBid {
  tricks: number;
  trump: Trump;
}

export interface Contract extends AuctionBid {
  bidder: Seat;
}

export interface PlayedCard {
  seat: Seat;
  card: Card;
}

export interface Trick {
  leader: Seat;
  ledSuit: Suit;
  winner: Seat;
  plays: PlayedCard[];
}

export interface TrickInProgress {
  leader: Seat;
  plays: PlayedCard[];
}

export interface PassRecord {
  from: Seat;
  to: Seat;
  cards: Card[];
}

export interface AuctionActionEntry {
  eventId: string;
  at: string;
  seat: Seat;
  kind: "bid" | "pass";
  bid?: AuctionBid;
}

export interface UndoWindow {
  actor: Seat;
  targetEventId: string;
  actionKind: "auction" | "bet" | "play";
}

export type ScoreMap = Record<Seat, number>;

export interface HandSummary {
  id: number;
  dealer: Seat;
  contract: Contract;
  bets: Record<Seat, number>;
  taken: ScoreMap;
  scoreDelta: ScoreMap;
  cumulativeScores: ScoreMap;
  auctionLog: AuctionActionEntry[];
  trickLog: Trick[];
  passHistory: PassRecord[][];
  allPassCycles: number;
  reshuffles: number;
}

export type HandPhase = "auction" | "passing" | "betting" | "playing";

export interface HandState {
  id: number;
  dealer: Seat;
  phase: HandPhase;
  shuffleSeed: string;
  reshuffles: number;
  allPassCycles: number;
  hands: Record<Seat, Card[]>;
  passSelections: Record<Seat, Card[] | null>;
  passHistory: PassRecord[][];
  auctionTurn: Seat | null;
  auctionLog: AuctionActionEntry[];
  highestBid: AuctionBid | null;
  highestBidder: Seat | null;
  consecutivePasses: number;
  contract: Contract | null;
  bets: Partial<Record<Seat, number>>;
  betOrder: Seat[];
  betTurn: Seat | null;
  trickTurn: Seat | null;
  currentTrick: TrickInProgress | null;
  completedTricks: Trick[];
  taken: ScoreMap;
}

export interface MatchState {
  version: 1;
  status: "waiting" | "active" | "ended";
  dealer: Seat;
  nextDealer: Seat;
  handNumber: number;
  scores: ScoreMap;
  currentHand: HandState | null;
  completedHands: HandSummary[];
  awaitingNextHand: boolean;
  undoWindow: UndoWindow | null;
  createdAt: string;
  endedAt: string | null;
}

export interface CreateMatchOptions {
  initialDealer: Seat;
  initialScores?: ScoreMap;
  createdAt?: string;
}

export interface HandStartEvent {
  type: "hand.started";
  id: string;
  at: string;
  handId: number;
  dealer: Seat;
  seed: string;
  presetHands?: Record<Seat, Card[]>;
}

export interface PassSelectedEvent {
  type: "pass.selected";
  id: string;
  at: string;
  seat: Seat;
  cardCodes: string[];
}

export interface AuctionBidEvent {
  type: "auction.bid";
  id: string;
  at: string;
  seat: Seat;
  bid: AuctionBid;
}

export interface AuctionPassEvent {
  type: "auction.pass";
  id: string;
  at: string;
  seat: Seat;
}

export interface BetSubmittedEvent {
  type: "bet.submitted";
  id: string;
  at: string;
  seat: Seat;
  value: number;
}

export interface CardPlayedEvent {
  type: "card.played";
  id: string;
  at: string;
  seat: Seat;
  cardCode: string;
}

export interface UndoRequestedEvent {
  type: "undo.requested";
  id: string;
  at: string;
  seat: Seat;
  targetEventId: string;
}

export interface MatchEndedEvent {
  type: "match.ended";
  id: string;
  at: string;
  seat: Seat;
}

export type GameEvent =
  | HandStartEvent
  | PassSelectedEvent
  | AuctionBidEvent
  | AuctionPassEvent
  | BetSubmittedEvent
  | CardPlayedEvent
  | UndoRequestedEvent
  | MatchEndedEvent;

export interface UndoValidationResult {
  valid: boolean;
  targetEventId?: string;
  actionKind?: UndoWindow["actionKind"];
  reason?: string;
}

export interface PublicHandState {
  id: number;
  dealer: Seat;
  phase: HandPhase;
  reshuffles: number;
  allPassCycles: number;
  currentTurn: Seat | null;
  highestBid: AuctionBid | null;
  highestBidder: Seat | null;
  contract: Contract | null;
  auctionLog: AuctionActionEntry[];
  pendingPassCount: number;
  passCycles: number;
  bets: Partial<Record<Seat, number>>;
  betOrder: Seat[];
  currentTrick: TrickInProgress | null;
  completedTricks: Trick[];
  taken: ScoreMap;
  cardCounts: ScoreMap;
}

export interface LegalActions {
  canUndo: boolean;
  undoTargetEventId: string | null;
  passSelection: {
    requiredCount: 3;
    selectableCardCodes: string[];
  } | null;
  auction: {
    canPass: boolean;
    bids: AuctionBid[];
  } | null;
  betting: {
    values: number[];
    min: number;
  } | null;
  playing: {
    cardCodes: string[];
  } | null;
}

export interface PublicMatchState {
  status: MatchState["status"];
  dealer: Seat;
  nextDealer: Seat;
  handNumber: number;
  scores: ScoreMap;
  currentHand: PublicHandState | null;
  completedHands: HandSummary[];
  awaitingNextHand: boolean;
}

export interface PrivatePlayerView extends PublicMatchState {
  viewerSeat: Seat;
  hand: Card[];
  pendingPassSelection: Card[] | null;
  legalActions: LegalActions;
}

export interface MaterializeOptions {
  match?: MatchState;
}
