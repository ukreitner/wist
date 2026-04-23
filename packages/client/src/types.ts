import type { PrivatePlayerView, PublicMatchState, Seat } from "@wist/core";

export interface SnapshotPlayer {
  id: string;
  nickname: string;
  seat: Seat | null;
  connected: boolean;
  isHost: boolean;
}

export interface RoomSnapshot {
  roomCode: string;
  roomStatus: "lobby" | "active" | "ended";
  me: {
    sessionId: string;
    nickname: string;
    seat: Seat | null;
    isHost: boolean;
  };
  players: SnapshotPlayer[];
  match: PublicMatchState;
  view: PrivatePlayerView | PublicMatchState;
  controls: {
    canStartMatch: boolean;
    canStartNextHand: boolean;
    canEndMatch: boolean;
    canAssignSeats: boolean;
  };
}

export interface SessionHandle {
  roomCode: string;
  token: string;
  nickname: string;
}

export interface ClientConfig {
  publicAppUrl: string | null;
}
