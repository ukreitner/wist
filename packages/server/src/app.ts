import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import cors from "cors";
import express from "express";
import { Server as SocketServer } from "socket.io";
import { RoomManager } from "./room-manager.js";
import { TEST_PRESETS } from "./test-presets.js";
import type { RoomSnapshot } from "./types.js";

export interface AppServerConfig {
  port?: number;
  dbPath?: string;
  databaseUrl?: string;
  origin?: string;
  staticDir?: string;
  publicAppUrl?: string;
  roomTtlMs?: number;
  hostTransferGraceMs?: number;
  allowTestPresets?: boolean;
  store?: Parameters<typeof RoomManager.create>[0]["store"];
}

export const createAppServer = async (config: AppServerConfig = {}) => {
  const roomManager = await RoomManager.create({
    dbPath: config.dbPath ?? ".data/wist.sqlite",
    databaseUrl: config.databaseUrl ?? process.env.DATABASE_URL,
    roomTtlMs: config.roomTtlMs ?? 24 * 60 * 60 * 1000,
    allowTestPresets: config.allowTestPresets ?? process.env.ALLOW_TEST_PRESETS === "1",
    testPresets: TEST_PRESETS,
    store: config.store
  });
  const app = express();
  const httpServer = http.createServer(app);
  const io = new SocketServer(httpServer, {
    cors: {
      origin: config.origin ?? true,
      credentials: true
    }
  });
  const socketIdsByToken = new Map<string, string>();
  const hostTransferTimers = new Map<string, ReturnType<typeof setTimeout>>();

  const buildPresence = (roomCode: string): RoomSnapshot["players"] => roomManager.getRoom(roomCode).sessions.map((session) => ({
    id: session.id,
    nickname: session.nickname,
    seat: session.seat,
    connected: session.connected,
    isHost: roomManager.getRoom(roomCode).hostSessionId === session.id
  }));

  const pushRoomSnapshot = (roomCode: string): void => {
    const room = roomManager.getRoom(roomCode);

    for (const session of room.sessions) {
      const socketId = socketIdsByToken.get(session.token);

      if (!socketId) {
        continue;
      }

      io.to(socketId).emit("snapshot", roomManager.buildSnapshot(roomCode, session.token));
    }

    io.to(roomCode).emit("presence", buildPresence(roomCode));
  };

  const emitError = (socketId: string, error: unknown): void => {
    const message = error instanceof Error ? error.message : "Unknown server error.";
    io.to(socketId).emit("error", { message });
  };

  const clearTransferTimer = (roomCode: string): void => {
    const timer = hostTransferTimers.get(roomCode);

    if (timer) {
      clearTimeout(timer);
      hostTransferTimers.delete(roomCode);
    }
  };

  const scheduleHostTransfer = (roomCode: string): void => {
    clearTransferTimer(roomCode);
    const timer = setTimeout(() => {
      void (async () => {
        try {
          await roomManager.transferHost(roomCode);
          pushRoomSnapshot(roomCode);
        } catch {
          hostTransferTimers.delete(roomCode);
        }
      })();
    }, config.hostTransferGraceMs ?? 30_000);

    hostTransferTimers.set(roomCode, timer);
  };

  app.use(cors());
  app.use(express.json());

  const configuredStaticDir = config.staticDir ?? process.env.WIST_STATIC_DIR;
  const publicAppUrl = config.publicAppUrl ?? process.env.PUBLIC_APP_URL ?? null;
  const staticDir = configuredStaticDir
    ? path.resolve(configuredStaticDir)
    : path.resolve(process.cwd(), "packages/web/dist");

  app.get("/health", (_request, response) => {
    response.json({ ok: true });
  });

  app.get("/api/config", (_request, response) => {
    response.json({
      publicAppUrl
    });
  });

  app.post("/api/rooms", async (request, response) => {
    try {
      const { nickname, testPresetKey } = request.body as { nickname?: string; testPresetKey?: string };
      const { room, session } = await roomManager.createRoom(nickname ?? "", testPresetKey);

      response.status(201).json({
        roomCode: room.code,
        playerToken: session.token,
        snapshot: roomManager.buildSnapshot(room.code, session.token)
      });
    } catch (error) {
      response.status(400).json({ message: error instanceof Error ? error.message : "Unable to create room." });
    }
  });

  app.post("/api/rooms/:code/join", async (request, response) => {
    try {
      const { nickname } = request.body as { nickname?: string };
      const { room, session } = await roomManager.joinRoom(request.params.code, nickname ?? "");

      response.status(201).json({
        roomCode: room.code,
        playerToken: session.token,
        snapshot: roomManager.buildSnapshot(room.code, session.token)
      });
    } catch (error) {
      response.status(400).json({ message: error instanceof Error ? error.message : "Unable to join room." });
    }
  });

  app.post("/api/rooms/:code/rejoin", (request, response) => {
    try {
      const { token } = request.body as { token?: string };
      const { room, session } = roomManager.rejoinRoom(request.params.code, token ?? "");

      response.json({
        roomCode: room.code,
        playerToken: session.token,
        snapshot: roomManager.buildSnapshot(room.code, session.token)
      });
    } catch (error) {
      response.status(400).json({ message: error instanceof Error ? error.message : "Unable to rejoin room." });
    }
  });

  app.get("/api/rooms/:code/bootstrap", (request, response) => {
    try {
      const token = String(request.query.token ?? "");
      response.json({
        roomCode: request.params.code.toUpperCase(),
        snapshot: roomManager.buildSnapshot(request.params.code, token)
      });
    } catch (error) {
      response.status(400).json({ message: error instanceof Error ? error.message : "Unable to load room." });
    }
  });

  if (fs.existsSync(staticDir)) {
    app.use(express.static(staticDir));
    app.get(/^(?!\/api\/|\/health).*/, (_request, response) => {
      response.sendFile(path.join(staticDir, "index.html"));
    });
  }

  io.use((socket, next) => {
    try {
      const auth = socket.handshake.auth as { roomCode?: string; token?: string };

      if (!auth.roomCode || !auth.token) {
        throw new Error("Missing room credentials.");
      }

      roomManager.rejoinRoom(auth.roomCode, auth.token);
      next();
    } catch (error) {
      next(error instanceof Error ? error : new Error("Socket authorization failed."));
    }
  });

  io.on("connection", (socket) => {
    const auth = socket.handshake.auth as { roomCode: string; token: string };
    const roomCode = auth.roomCode.toUpperCase();
    const token = auth.token;

    void (async () => {
      try {
        const previousSocketId = socketIdsByToken.get(token);

        if (previousSocketId && previousSocketId !== socket.id) {
          io.sockets.sockets.get(previousSocketId)?.disconnect(true);
        }

        socketIdsByToken.set(token, socket.id);
        socket.join(roomCode);
        clearTransferTimer(roomCode);
        await roomManager.setSessionConnected(token, true);
        socket.emit("snapshot", roomManager.buildSnapshot(roomCode, token));
        io.to(roomCode).emit("presence", buildPresence(roomCode));
      } catch (error) {
        emitError(socket.id, error);
        socket.disconnect(true);
      }
    })();

    const guarded = <Payload>(handler: (payload: Payload) => Promise<void> | void) => (payload: Payload): void => {
      void Promise.resolve(handler(payload))
        .then(() => {
          pushRoomSnapshot(roomCode);
        })
        .catch((error) => {
          emitError(socket.id, error);
        });
    };

    socket.on(
      "seat.assign",
      guarded<{ sessionId: string; seat: "N" | "E" | "S" | "W" }>(async ({ sessionId, seat }) => {
        await roomManager.assignSeat(token, sessionId, seat);
      })
    );

    socket.on("match.start", guarded<void>(async () => {
      await roomManager.startMatch(token);
    }));

    socket.on("match.nextHand", guarded<void>(async () => {
      await roomManager.startNextHand(token);
    }));

    socket.on("match.end", guarded<void>(async () => {
      await roomManager.endMatch(token);
    }));

    socket.on(
      "pass.submit",
      guarded<{ cardCodes: string[] }>(async ({ cardCodes }) => {
        const { appended } = await roomManager.appendGameEvent(token, {
          type: "pass.selected",
          cardCodes
        });
        io.to(roomCode).emit("event.appended", { id: appended.id, type: appended.type });
      })
    );

    socket.on(
      "auction.action",
      guarded<{ kind: "pass" | "bid"; bid?: { tricks: number; trump: "C" | "D" | "H" | "S" | "NT" } }>(
        async ({ kind, bid }) => {
          const { appended } =
            kind === "pass"
              ? await roomManager.appendGameEvent(token, { type: "auction.pass" })
              : await roomManager.appendGameEvent(token, {
                  type: "auction.bid",
                  bid: {
                    tricks: bid?.tricks ?? 0,
                    trump: bid?.trump ?? "C"
                  }
                });
          io.to(roomCode).emit("event.appended", { id: appended.id, type: appended.type });
        }
      )
    );

    socket.on(
      "bet.submit",
      guarded<{ value: number }>(async ({ value }) => {
        const { appended } = await roomManager.appendGameEvent(token, {
          type: "bet.submitted",
          value
        });
        io.to(roomCode).emit("event.appended", { id: appended.id, type: appended.type });
      })
    );

    socket.on(
      "play.card",
      guarded<{ cardCode: string }>(async ({ cardCode }) => {
        const { appended } = await roomManager.appendGameEvent(token, {
          type: "card.played",
          cardCode
        });
        io.to(roomCode).emit("event.appended", { id: appended.id, type: appended.type });
      })
    );

    socket.on("undo.request", guarded<void>(async () => {
      const { appended } = await roomManager.requestUndo(token);
      io.to(roomCode).emit("event.appended", { id: appended.id, type: appended.type });
    }));

    socket.on("leave", () => {
      void (async () => {
        try {
          const room = await roomManager.leaveRoom(token);

          if (!room) {
            io.to(roomCode).emit("presence", []);
            return;
          }

          pushRoomSnapshot(roomCode);
        } catch (error) {
          emitError(socket.id, error);
        }
      })();
    });

    socket.on("disconnect", () => {
      socketIdsByToken.delete(token);

      void (async () => {
        try {
          const room = await roomManager.setSessionConnected(token, false);

          if (room.hostSessionId === room.sessions.find((session) => session.token === token)?.id) {
            scheduleHostTransfer(roomCode);
          }

          io.to(roomCode).emit("presence", buildPresence(roomCode));
          pushRoomSnapshot(roomCode);
        } catch {
          clearTransferTimer(roomCode);
        }
      })();
    });
  });

  const close = async (): Promise<void> => {
    await io.close();
    await roomManager.close();
    if (!httpServer.listening) {
      return;
    }
    await new Promise<void>((resolve, reject) => {
      httpServer.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  };

  return {
    app,
    httpServer,
    io,
    roomManager,
    close
  };
};
