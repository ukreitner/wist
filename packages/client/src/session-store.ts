import type { SessionHandle } from "./types";

type MaybePromise<Value> = Value | Promise<Value>;

export interface SessionStorageAdapter {
  getItem(key: string): MaybePromise<string | null>;
  setItem(key: string, value: string): MaybePromise<void>;
  removeItem?(key: string): MaybePromise<void>;
}

export const sessionKey = (roomCode: string): string => `wist.session.${roomCode.toUpperCase()}`;

export const createSessionStore = (storage: SessionStorageAdapter) => ({
  save: async (session: SessionHandle): Promise<void> => {
    await storage.setItem(sessionKey(session.roomCode), JSON.stringify(session));
  },
  load: async (roomCode: string): Promise<SessionHandle | null> => {
    const raw = await storage.getItem(sessionKey(roomCode));

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as SessionHandle;
    } catch {
      return null;
    }
  },
  clear: async (roomCode: string): Promise<void> => {
    if (!storage.removeItem) {
      return;
    }

    await storage.removeItem(sessionKey(roomCode));
  }
});
