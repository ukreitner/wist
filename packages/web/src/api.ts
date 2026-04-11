import type { RoomSnapshot, SessionHandle } from "./types.js";

const API_BASE = import.meta.env.VITE_SERVER_URL ?? "http://127.0.0.1:4100";

const jsonRequest = async <Response>(
  path: string,
  init?: RequestInit
): Promise<Response> => {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json"
    },
    ...init
  });
  const body = (await response.json()) as Response & { message?: string };

  if (!response.ok) {
    throw new Error(body.message ?? "Request failed.");
  }

  return body;
};

export const createRoom = async (nickname: string): Promise<{ snapshot: RoomSnapshot; session: SessionHandle }> => {
  const payload = await jsonRequest<{ roomCode: string; playerToken: string; snapshot: RoomSnapshot }>("/api/rooms", {
    method: "POST",
    body: JSON.stringify({ nickname })
  });

  return {
    snapshot: payload.snapshot,
    session: {
      roomCode: payload.roomCode,
      token: payload.playerToken,
      nickname
    }
  };
};

export const joinRoom = async (
  roomCode: string,
  nickname: string
): Promise<{ snapshot: RoomSnapshot; session: SessionHandle }> => {
  const payload = await jsonRequest<{ roomCode: string; playerToken: string; snapshot: RoomSnapshot }>(
    `/api/rooms/${roomCode}/join`,
    {
      method: "POST",
      body: JSON.stringify({ nickname })
    }
  );

  return {
    snapshot: payload.snapshot,
    session: {
      roomCode: payload.roomCode,
      token: payload.playerToken,
      nickname
    }
  };
};

export const rejoinRoom = async (
  roomCode: string,
  token: string
): Promise<{ snapshot: RoomSnapshot; session: SessionHandle }> => {
  const payload = await jsonRequest<{ roomCode: string; playerToken: string; snapshot: RoomSnapshot }>(
    `/api/rooms/${roomCode}/rejoin`,
    {
      method: "POST",
      body: JSON.stringify({ token })
    }
  );

  return {
    snapshot: payload.snapshot,
    session: {
      roomCode: payload.roomCode,
      token: payload.playerToken,
      nickname: payload.snapshot.me.nickname
    }
  };
};

export const bootstrapRoom = async (roomCode: string, token: string): Promise<RoomSnapshot> => {
  const payload = await jsonRequest<{ roomCode: string; snapshot: RoomSnapshot }>(
    `/api/rooms/${roomCode}/bootstrap?token=${encodeURIComponent(token)}`
  );
  return payload.snapshot;
};

export const sessionKey = (roomCode: string): string => `wist.session.${roomCode.toUpperCase()}`;
