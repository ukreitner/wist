import type { ClientConfig, RoomSnapshot, SessionHandle } from "./types";

const normalizeServerUrl = (serverUrl?: string): string => serverUrl?.replace(/\/+$/, "") ?? "";

const jsonRequest = async <Response>(
  serverUrl: string | undefined,
  path: string,
  init?: RequestInit
): Promise<Response> => {
  const response = await fetch(`${normalizeServerUrl(serverUrl)}${path}`, {
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

export const createRoom = async (
  nickname: string,
  options?: { serverUrl?: string }
): Promise<{ snapshot: RoomSnapshot; session: SessionHandle }> => {
  const payload = await jsonRequest<{ roomCode: string; playerToken: string; snapshot: RoomSnapshot }>(
    options?.serverUrl,
    "/api/rooms",
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

export const joinRoom = async (
  roomCode: string,
  nickname: string,
  options?: { serverUrl?: string }
): Promise<{ snapshot: RoomSnapshot; session: SessionHandle }> => {
  const payload = await jsonRequest<{ roomCode: string; playerToken: string; snapshot: RoomSnapshot }>(
    options?.serverUrl,
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
  token: string,
  options?: { serverUrl?: string }
): Promise<{ snapshot: RoomSnapshot; session: SessionHandle }> => {
  const payload = await jsonRequest<{ roomCode: string; playerToken: string; snapshot: RoomSnapshot }>(
    options?.serverUrl,
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

export const bootstrapRoom = async (
  roomCode: string,
  token: string,
  options?: { serverUrl?: string }
): Promise<RoomSnapshot> => {
  const payload = await jsonRequest<{ roomCode: string; snapshot: RoomSnapshot }>(
    options?.serverUrl,
    `/api/rooms/${roomCode}/bootstrap?token=${encodeURIComponent(token)}`
  );
  return payload.snapshot;
};

export const getClientConfig = async (options?: { serverUrl?: string }): Promise<ClientConfig> =>
  jsonRequest<ClientConfig>(options?.serverUrl, "/api/config");
