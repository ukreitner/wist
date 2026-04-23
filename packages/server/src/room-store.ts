import type { RoomState } from "./types.js";

export interface RoomStore {
  loadRooms(): Promise<RoomState[]>;
  saveRoom(room: RoomState): Promise<void>;
  deleteRoom(roomId: string): Promise<void>;
  close(): Promise<void>;
}
