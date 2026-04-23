import crypto from "node:crypto";
import {
  SEATS,
  createMatch,
  materializeMatch,
  nextDealer,
  toPlayerView,
  toPublicState,
  validateUndo,
  type GameEvent,
  type HandStartEvent,
  type MatchState,
  type Seat
} from "@wist/core";
import { PostgresRoomStore } from "./postgres-store.js";
import type { RoomStore } from "./room-store.js";
import { SqliteRoomStore } from "./store.js";
import type {
  PlayerSession,
  RoomManagerConfig,
  RoomSnapshot,
  RoomState,
  RoomSummaryPlayer,
  TestHandDefinition,
  TestScenario
} from "./types.js";

const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const randomId = (): string => crypto.randomUUID();

const randomRoomCode = (): string =>
  Array.from({ length: 6 }, () => ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]).join("");

const nowIso = (): string => new Date().toISOString();

const randomSeat = (): Seat => SEATS[Math.floor(Math.random() * SEATS.length)]!;

const cloneMatch = (match: MatchState): MatchState => structuredClone(match);

const normalizeCode = (code: string): string => code.trim().toUpperCase();
const normalizeNickname = (nickname: string): string => nickname.trim().toLocaleLowerCase();

const buildRoomPlayers = (room: RoomState): RoomSummaryPlayer[] =>
  [...room.sessions]
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .map((session) => ({
      id: session.id,
      nickname: session.nickname,
      seat: session.seat,
      connected: session.connected,
      isHost: room.hostSessionId === session.id
    }));

const ensure = <Value>(value: Value | undefined, message: string): Value => {
  if (value === undefined) {
    throw new Error(message);
  }

  return value;
};

type PlayerGameInput =
  | { type: "pass.selected"; cardCodes: string[] }
  | { type: "auction.bid"; bid: { tricks: number; trump: "C" | "D" | "H" | "S" | "NT" } }
  | { type: "auction.pass" }
  | { type: "bet.submitted"; value: number }
  | { type: "card.played"; cardCode: string }
  | { type: "undo.requested"; targetEventId: string };

export class RoomManager {
  private readonly roomsByCode = new Map<string, RoomState>();
  private readonly roomCodeByToken = new Map<string, string>();

  private constructor(
    private readonly store: RoomStore,
    private readonly config: RoomManagerConfig
  ) {}

  static async create(config: RoomManagerConfig): Promise<RoomManager> {
    const store =
      config.store ??
      (config.databaseUrl
        ? await PostgresRoomStore.create({ connectionString: config.databaseUrl })
        : await SqliteRoomStore.create(config.dbPath ?? ".data/wist.sqlite"));
    const manager = new RoomManager(store, config);

    for (const room of await store.loadRooms()) {
      if (room.events.length > 0) {
        room.match = manager.rebuildMatch(room);
        room.status = room.match.status === "ended" ? "ended" : "active";
        await store.saveRoom(room);
      }

      manager.roomsByCode.set(room.code, room);

      for (const session of room.sessions) {
        manager.roomCodeByToken.set(session.token, room.code);
      }
    }

    return manager;
  }

  async close(): Promise<void> {
    await this.store.close();
  }

  private async persist(room: RoomState): Promise<RoomState> {
    room.updatedAt = nowIso();
    await this.store.saveRoom(room);
    this.roomsByCode.set(room.code, room);

    for (const session of room.sessions) {
      this.roomCodeByToken.set(session.token, room.code);
    }

    return room;
  }

  private baseMatchForRoom(room: RoomState, dealer: Seat): MatchState {
    return createMatch({
      initialDealer: dealer,
      createdAt: room.createdAt
    });
  }

  private rebuildMatch(room: RoomState): MatchState {
    const baseDealer = room.events.find((event): event is HandStartEvent => event.type === "hand.started")?.dealer ?? "N";
    return materializeMatch(room.events, {
      match: this.baseMatchForRoom(room, baseDealer)
    });
  }

  private lookupRoom(code: string): RoomState {
    const room = this.roomsByCode.get(normalizeCode(code));

    if (!room) {
      throw new Error("Room not found.");
    }

    return room;
  }

  private lookupSessionByToken(code: string, token: string): PlayerSession {
    const room = this.lookupRoom(code);
    const session = room.sessions.find((candidate) => candidate.token === token);

    if (!session) {
      throw new Error("Session not found.");
    }

    return session;
  }

  private lookupSessionRoom(token: string): RoomState {
    const code = this.roomCodeByToken.get(token);

    if (!code) {
      throw new Error("Unknown session token.");
    }

    return this.lookupRoom(code);
  }

  private nextPresetHand(room: RoomState): TestHandDefinition | null {
    if (!room.testPresetKey) {
      return null;
    }

    const preset = this.config.testPresets[room.testPresetKey];

    if (!preset) {
      return null;
    }

    return preset.hands[room.testPresetCursor] ?? null;
  }

  private createHandStartEvent(room: RoomState, handId: number, fallbackDealer: Seat): HandStartEvent {
    const preset = this.nextPresetHand(room);
    const dealer = preset?.dealer ?? fallbackDealer;
    const event: HandStartEvent = {
      type: "hand.started",
      id: randomId(),
      at: nowIso(),
      handId,
      dealer,
      seed: preset?.seed ?? `${room.code}-${handId}-${crypto.randomUUID()}`,
      presetHands: preset?.presetHands
    };

    if (preset) {
      room.testPresetCursor += 1;
    }

    return event;
  }

  private seatCount(room: RoomState): number {
    return room.sessions.filter((session) => session.seat !== null).length;
  }

  private allSeatsFilled(room: RoomState): boolean {
    return this.seatCount(room) === 4 && SEATS.every((seat) => room.sessions.some((session) => session.seat === seat));
  }

  private assertHost(room: RoomState, token: string): PlayerSession {
    const session = this.lookupSessionByToken(room.code, token);

    if (room.hostSessionId !== session.id) {
      throw new Error("Only the host can do that.");
    }

    return session;
  }

  async createRoom(nickname: string, testPresetKey?: string): Promise<{ room: RoomState; session: PlayerSession }> {
    const trimmedNickname = nickname.trim();

    if (!trimmedNickname) {
      throw new Error("Nickname is required.");
    }

    if (testPresetKey && !this.config.allowTestPresets) {
      throw new Error("Test presets are disabled.");
    }

    let code = randomRoomCode();

    while (this.roomsByCode.has(code)) {
      code = randomRoomCode();
    }

    const session: PlayerSession = {
      id: randomId(),
      token: randomId(),
      nickname: trimmedNickname,
      seat: null,
      connected: false,
      createdAt: nowIso(),
      lastSeenAt: nowIso()
    };
    const room: RoomState = {
      id: randomId(),
      code,
      hostSessionId: session.id,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      status: "lobby",
      sessions: [session],
      events: [],
      match: createMatch({
        initialDealer: "N",
        createdAt: nowIso()
      }),
      testPresetKey: testPresetKey ?? null,
      testPresetCursor: 0
    };

    await this.persist(room);
    return { room, session };
  }

  async joinRoom(code: string, nickname: string): Promise<{ room: RoomState; session: PlayerSession }> {
    const room = this.lookupRoom(code);
    const trimmedNickname = nickname.trim();

    if (!trimmedNickname) {
      throw new Error("Nickname is required.");
    }

    const existingSession = room.sessions.find(
      (session) => normalizeNickname(session.nickname) === normalizeNickname(trimmedNickname)
    );

    if (existingSession) {
      if (existingSession.connected) {
        throw new Error("That nickname is already connected.");
      }

      existingSession.nickname = trimmedNickname;
      existingSession.lastSeenAt = nowIso();
      await this.persist(room);
      return { room, session: existingSession };
    }

    if (room.status !== "lobby") {
      throw new Error("The match has already started. Rejoin with the same nickname or a saved link.");
    }

    if (room.sessions.length >= 4) {
      throw new Error("Room is full.");
    }

    const session: PlayerSession = {
      id: randomId(),
      token: randomId(),
      nickname: trimmedNickname,
      seat: null,
      connected: false,
      createdAt: nowIso(),
      lastSeenAt: nowIso()
    };

    room.sessions.push(session);
    await this.persist(room);

    return { room, session };
  }

  rejoinRoom(code: string, token: string): { room: RoomState; session: PlayerSession } {
    const room = this.lookupRoom(code);
    const session = this.lookupSessionByToken(room.code, token);
    return { room, session };
  }

  getRoom(code: string): RoomState {
    return this.lookupRoom(code);
  }

  getRoomForToken(token: string): { room: RoomState; session: PlayerSession } {
    const room = this.lookupSessionRoom(token);
    const session = ensure(
      room.sessions.find((candidate) => candidate.token === token),
      "Session not found."
    );
    return { room, session };
  }

  buildSnapshot(code: string, token: string): RoomSnapshot {
    const room = this.lookupRoom(code);
    const session = this.lookupSessionByToken(room.code, token);
    const isHost = room.hostSessionId === session.id;
    const publicMatch = toPublicState(room.match);
    const matchView = session.seat ? toPlayerView(room.match, session.seat) : publicMatch;

    return {
      roomCode: room.code,
      roomStatus: room.status,
      me: {
        sessionId: session.id,
        nickname: session.nickname,
        seat: session.seat,
        isHost
      },
      players: buildRoomPlayers(room),
      match: publicMatch,
      view: matchView,
      controls: {
        canStartMatch: isHost && room.status === "lobby" && room.sessions.length === 4 && this.allSeatsFilled(room),
        canStartNextHand: isHost && room.status === "active" && room.match.awaitingNextHand,
        canEndMatch: isHost && room.status !== "ended",
        canAssignSeats: isHost && room.status === "lobby"
      }
    };
  }

  async assignSeat(actorToken: string, targetSessionId: string, targetSeat: Seat): Promise<RoomState> {
    const room = this.lookupSessionRoom(actorToken);
    this.assertHost(room, actorToken);

    if (room.status !== "lobby") {
      throw new Error("Seats can only be assigned before the match starts.");
    }

    const targetSession = ensure(
      room.sessions.find((session) => session.id === targetSessionId),
      "Player not found."
    );
    const occupant = room.sessions.find((session) => session.seat === targetSeat && session.id !== targetSession.id);
    const currentSeat = targetSession.seat;

    if (occupant) {
      occupant.seat = currentSeat;
    }

    targetSession.seat = targetSeat;
    return this.persist(room);
  }

  async startMatch(actorToken: string): Promise<RoomState> {
    const room = this.lookupSessionRoom(actorToken);
    this.assertHost(room, actorToken);

    if (room.status !== "lobby") {
      throw new Error("The match already started.");
    }

    if (room.sessions.length !== 4 || !this.allSeatsFilled(room)) {
      throw new Error("Four seated players are required to start.");
    }

    const preset = room.testPresetKey ? this.config.testPresets[room.testPresetKey] : undefined;
    const dealer = preset?.initialDealer ?? randomSeat();

    room.events = [this.createHandStartEvent(room, 1, dealer)];
    room.match = materializeMatch(room.events, {
      match: this.baseMatchForRoom(room, dealer)
    });
    room.status = "active";

    return this.persist(room);
  }

  async startNextHand(actorToken: string): Promise<RoomState> {
    const room = this.lookupSessionRoom(actorToken);
    this.assertHost(room, actorToken);

    if (room.status !== "active" || !room.match.awaitingNextHand) {
      throw new Error("There is no next hand to start.");
    }

    const dealer = nextDealer(room.match.dealer);
    room.events.push(this.createHandStartEvent(room, room.match.handNumber + 1, dealer));
    room.match = this.rebuildMatch(room);

    return this.persist(room);
  }

  async endMatch(actorToken: string): Promise<RoomState> {
    const room = this.lookupSessionRoom(actorToken);
    this.assertHost(room, actorToken);

    if (room.status === "ended") {
      return room;
    }

    room.events.push({
      type: "match.ended",
      id: randomId(),
      at: nowIso(),
      seat: ensure(room.sessions.find((session) => session.token === actorToken), "Missing host session.").seat ?? "N"
    });
    room.match = this.rebuildMatch(room);
    room.status = "ended";

    return this.persist(room);
  }

  async appendGameEvent(actorToken: string, event: PlayerGameInput): Promise<{
    room: RoomState;
    appended: GameEvent;
  }> {
    const { room, session } = this.getRoomForToken(actorToken);

    if (!session.seat) {
      throw new Error("This player does not have a seat.");
    }

    const appended = {
      ...event,
      id: randomId(),
      at: nowIso(),
      seat: session.seat
    } as GameEvent;
    const nextEvents = [...room.events, appended];
    const nextMatch = materializeMatch(nextEvents, {
      match: this.baseMatchForRoom(room, room.match.dealer)
    });

    room.events = nextEvents;
    room.match = nextMatch;
    if (nextMatch.status === "ended") {
      room.status = "ended";
    }

    await this.persist(room);
    return { room, appended };
  }

  async requestUndo(actorToken: string): Promise<{ room: RoomState; appended: GameEvent }> {
    const { room, session } = this.getRoomForToken(actorToken);

    if (!session.seat) {
      throw new Error("This player does not have a seat.");
    }

    const validation = validateUndo(room.events, room.match, session.seat);

    if (!validation.valid || !validation.targetEventId) {
      throw new Error(validation.reason ?? "Undo is not available.");
    }

    return this.appendGameEvent(actorToken, {
      type: "undo.requested",
      targetEventId: validation.targetEventId
    });
  }

  async setSessionConnected(token: string, connected: boolean): Promise<RoomState> {
    const { room, session } = this.getRoomForToken(token);
    session.connected = connected;
    session.lastSeenAt = nowIso();
    return this.persist(room);
  }

  async transferHost(roomCode: string): Promise<RoomState | null> {
    const room = this.lookupRoom(roomCode);
    const currentHost = room.sessions.find((session) => session.id === room.hostSessionId);
    const eligibleSessions = room.sessions.filter((session) => session.id !== room.hostSessionId);

    if (currentHost?.connected) {
      return room;
    }

    const nextHost =
      eligibleSessions
        .filter((session) => session.connected && session.seat !== null)
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt))[0] ??
      eligibleSessions
        .filter((session) => session.seat !== null)
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt))[0] ??
      eligibleSessions.sort((left, right) => left.createdAt.localeCompare(right.createdAt))[0];

    if (!nextHost) {
      return null;
    }

    room.hostSessionId = nextHost.id;
    return this.persist(room);
  }

  async leaveRoom(token: string): Promise<RoomState | null> {
    const { room, session } = this.getRoomForToken(token);

    if (room.status === "lobby") {
      room.sessions = room.sessions.filter((candidate) => candidate.id !== session.id);

      if (room.sessions.length === 0) {
        this.roomsByCode.delete(room.code);
        this.roomCodeByToken.delete(session.token);
        await this.store.deleteRoom(room.id);
        return null;
      }

      if (room.hostSessionId === session.id) {
        room.hostSessionId = room.sessions[0]!.id;
      }

      return this.persist(room);
    }

    session.connected = false;
    session.lastSeenAt = nowIso();
    return this.persist(room);
  }

  async cleanupExpiredRooms(referenceTime = Date.now()): Promise<string[]> {
    const deletedCodes: string[] = [];

    for (const room of this.roomsByCode.values()) {
      const age = referenceTime - new Date(room.updatedAt).getTime();
      const shouldDelete = room.status === "ended" && age >= this.config.roomTtlMs;

      if (!shouldDelete) {
        continue;
      }

      deletedCodes.push(room.code);
      this.roomsByCode.delete(room.code);

      for (const session of room.sessions) {
        this.roomCodeByToken.delete(session.token);
      }

      await this.store.deleteRoom(room.id);
    }

    return deletedCodes;
  }
}
