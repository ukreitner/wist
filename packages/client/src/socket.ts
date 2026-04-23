import { io, type Socket } from "socket.io-client";
import type { RoomSnapshot, SessionHandle, SnapshotPlayer } from "./types.js";

export type ConnectState = "disconnected" | "connecting" | "connected";

export interface RoomSocketOptions {
  serverUrl?: string;
  session: SessionHandle;
  onConnectStateChange?: (state: ConnectState) => void;
  onSnapshot?: (snapshot: RoomSnapshot) => void;
  onPresence?: (players: SnapshotPlayer[]) => void;
  onError?: (message: string) => void;
}

export const connectRoomSocket = ({
  serverUrl,
  session,
  onConnectStateChange,
  onSnapshot,
  onPresence,
  onError
}: RoomSocketOptions): Socket => {
  onConnectStateChange?.("connecting");

  const socket = serverUrl
    ? io(serverUrl, {
        transports: ["websocket"],
        auth: {
          roomCode: session.roomCode,
          token: session.token
        }
      })
    : io({
        transports: ["websocket"],
        auth: {
          roomCode: session.roomCode,
          token: session.token
        }
      });

  socket.on("connect", () => {
    onConnectStateChange?.("connected");
  });

  socket.on("disconnect", () => {
    onConnectStateChange?.("disconnected");
  });

  socket.on("snapshot", (snapshot: RoomSnapshot) => {
    onSnapshot?.(snapshot);
  });

  socket.on("presence", (players: SnapshotPlayer[]) => {
    onPresence?.(players);
  });

  socket.on("error", (payload: { message: string }) => {
    onError?.(payload.message);
  });

  return socket;
};
