import type { Card, GameEvent, MatchState, PrivatePlayerView, PublicMatchState, Seat } from "@wist/core";
import type { RoomStore } from "./room-store.js";

export interface PlayerSession {
  id: string;
  token: string;
  nickname: string;
  seat: Seat | null;
  connected: boolean;
  createdAt: string;
  lastSeenAt: string;
}

export interface TestHandDefinition {
  seed: string;
  dealer?: Seat;
  presetHands?: Record<Seat, Card[]>;
}

export interface TestScenario {
  initialDealer?: Seat;
  hands: TestHandDefinition[];
}

export interface RoomState {
  id: string;
  code: string;
  hostSessionId: string;
  createdAt: string;
  updatedAt: string;
  status: "lobby" | "active" | "ended";
  sessions: PlayerSession[];
  events: GameEvent[];
  match: MatchState;
  testPresetKey: string | null;
  testPresetCursor: number;
}

export interface RoomSummaryPlayer {
  id: string;
  nickname: string;
  seat: Seat | null;
  connected: boolean;
  isHost: boolean;
}

export interface RoomSnapshot {
  roomCode: string;
  roomStatus: RoomState["status"];
  me: {
    sessionId: string;
    nickname: string;
    seat: Seat | null;
    isHost: boolean;
  };
  players: RoomSummaryPlayer[];
  match: PublicMatchState;
  view: PrivatePlayerView | PublicMatchState;
  controls: {
    canStartMatch: boolean;
    canStartNextHand: boolean;
    canEndMatch: boolean;
    canAssignSeats: boolean;
  };
}

export interface StartMatchOptions {
  initialScores?: Partial<Record<Seat, number>>;
}

export interface RoomManagerConfig {
  dbPath?: string;
  databaseUrl?: string;
  roomTtlMs: number;
  allowTestPresets: boolean;
  testPresets: Record<string, TestScenario>;
  store?: RoomStore;
}

export interface PersistedRoomRow {
  id: string;
  code: string;
  hostSessionId: string;
  createdAt: string;
  updatedAt: string;
  status: RoomState["status"];
  snapshotJson: string;
  testPresetKey: string | null;
  testPresetCursor: number;
}
