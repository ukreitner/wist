import type { GameEvent } from "@wist/core";
import type { PlayerSession, RoomState } from "./types.js";

export interface RoomStore {
  loadRooms(): Promise<RoomState[]>;
  saveRoom(room: RoomState): Promise<void>;
  appendGameEvent?(room: RoomState, event: GameEvent): Promise<void>;
  updateSessionConnection?(room: RoomState, session: PlayerSession): Promise<void>;
  deleteRoom(roomId: string): Promise<void>;
  close(): Promise<void>;
}
