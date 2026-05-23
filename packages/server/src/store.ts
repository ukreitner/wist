import fs from "node:fs";
import path from "node:path";
import initSqlJs, { type Database, type SqlJsStatic, type SqlValue } from "sql.js";
import type { GameEvent } from "@wist/core";
import type { RoomStore } from "./room-store.js";
import type { PersistedRoomRow, PlayerSession, RoomState } from "./types.js";

const mapRows = <Row>(database: Database, query: string, params: SqlValue[] = []): Row[] => {
  const result = database.exec(query, params)[0];

  if (!result) {
    return [];
  }

  return result.values.map((valueRow) => {
    const row = {} as Row;

    result.columns.forEach((column, index) => {
      row[column as keyof Row] = valueRow[index] as Row[keyof Row];
    });

    return row;
  });
};

export class SqliteRoomStore implements RoomStore {
  private readonly database: Database;

  private constructor(
    private readonly sql: SqlJsStatic,
    private readonly dbPath: string,
    database: Database
  ) {
    this.database = database;
    this.ensureSchema();
  }

  static async create(dbPath: string): Promise<SqliteRoomStore> {
    const sql = await initSqlJs();
    const directory = path.dirname(dbPath);
    fs.mkdirSync(directory, { recursive: true });

    const database = fs.existsSync(dbPath)
      ? new sql.Database(fs.readFileSync(dbPath))
      : new sql.Database();

    return new SqliteRoomStore(sql, dbPath, database);
  }

  private ensureSchema(): void {
    this.database.run(`
      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        hostSessionId TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        status TEXT NOT NULL,
        snapshotJson TEXT NOT NULL,
        testPresetKey TEXT,
        testPresetCursor INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        roomId TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        nickname TEXT NOT NULL,
        seat TEXT,
        connected INTEGER NOT NULL,
        createdAt TEXT NOT NULL,
        lastSeenAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        roomId TEXT NOT NULL,
        seq INTEGER NOT NULL,
        payloadJson TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );
    `);
    this.flush();
  }

  private flush(): void {
    const bytes = this.database.export();
    fs.writeFileSync(this.dbPath, Buffer.from(bytes));
  }

  async loadRooms(): Promise<RoomState[]> {
    const roomRows = mapRows<PersistedRoomRow>(this.database, "SELECT * FROM rooms ORDER BY createdAt ASC");

    return roomRows.map((roomRow) => {
      const sessionRows = mapRows<
        PlayerSession & {
          roomId: string;
        }
      >(this.database, "SELECT * FROM sessions WHERE roomId = ? ORDER BY createdAt ASC", [roomRow.id]);
      const eventRows = mapRows<{ payloadJson: string }>(
        this.database,
        "SELECT payloadJson FROM events WHERE roomId = ? ORDER BY seq ASC",
        [roomRow.id]
      );
      const snapshot = JSON.parse(roomRow.snapshotJson) as {
        match: RoomState["match"];
      };

      return {
        id: roomRow.id,
        code: roomRow.code,
        hostSessionId: roomRow.hostSessionId,
        createdAt: roomRow.createdAt,
        updatedAt: roomRow.updatedAt,
        status: roomRow.status,
        sessions: sessionRows.map((session) => ({
          id: session.id,
          token: session.token,
          nickname: session.nickname,
          seat: session.seat,
          connected: Boolean(Number(session.connected)),
          createdAt: session.createdAt,
          lastSeenAt: session.lastSeenAt
        })),
        events: eventRows.map((row) => JSON.parse(row.payloadJson) as GameEvent),
        match: snapshot.match,
        testPresetKey: roomRow.testPresetKey,
        testPresetCursor: roomRow.testPresetCursor
      };
    });
  }

  async saveRoom(room: RoomState): Promise<void> {
    this.database.run(
      `
        INSERT INTO rooms (id, code, hostSessionId, createdAt, updatedAt, status, snapshotJson, testPresetKey, testPresetCursor)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          code = excluded.code,
          hostSessionId = excluded.hostSessionId,
          updatedAt = excluded.updatedAt,
          status = excluded.status,
          snapshotJson = excluded.snapshotJson,
          testPresetKey = excluded.testPresetKey,
          testPresetCursor = excluded.testPresetCursor
      `,
      [
        room.id,
        room.code,
        room.hostSessionId,
        room.createdAt,
        room.updatedAt,
        room.status,
        JSON.stringify({ match: room.match }),
        room.testPresetKey,
        room.testPresetCursor
      ]
    );

    this.database.run("DELETE FROM sessions WHERE roomId = ?", [room.id]);
    this.database.run("DELETE FROM events WHERE roomId = ?", [room.id]);

    room.sessions.forEach((session) => {
      this.database.run(
        `
          INSERT INTO sessions (id, roomId, token, nickname, seat, connected, createdAt, lastSeenAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          session.id,
          room.id,
          session.token,
          session.nickname,
          session.seat,
          session.connected ? 1 : 0,
          session.createdAt,
          session.lastSeenAt
        ]
      );
    });

    room.events.forEach((event, index) => {
      this.database.run(
        `
          INSERT INTO events (id, roomId, seq, payloadJson, createdAt)
          VALUES (?, ?, ?, ?, ?)
        `,
        [event.id, room.id, index, JSON.stringify(event), event.at]
      );
    });

    this.flush();
  }

  async appendGameEvent(room: RoomState, event: GameEvent): Promise<void> {
    this.database.run(
      `
        UPDATE rooms
        SET updatedAt = ?, status = ?, snapshotJson = ?, testPresetCursor = ?
        WHERE id = ?
      `,
      [room.updatedAt, room.status, JSON.stringify({ match: room.match }), room.testPresetCursor, room.id]
    );

    this.database.run(
      `
        INSERT INTO events (id, roomId, seq, payloadJson, createdAt)
        VALUES (?, ?, ?, ?, ?)
      `,
      [event.id, room.id, room.events.length - 1, JSON.stringify(event), event.at]
    );

    this.flush();
  }

  async updateSessionConnection(room: RoomState, session: PlayerSession): Promise<void> {
    this.database.run(
      `
        UPDATE rooms
        SET updatedAt = ?, status = ?, snapshotJson = ?
        WHERE id = ?
      `,
      [room.updatedAt, room.status, JSON.stringify({ match: room.match }), room.id]
    );

    this.database.run(
      `
        UPDATE sessions
        SET connected = ?, lastSeenAt = ?
        WHERE id = ?
      `,
      [session.connected ? 1 : 0, session.lastSeenAt, session.id]
    );

    this.flush();
  }

  async deleteRoom(roomId: string): Promise<void> {
    this.database.run("DELETE FROM events WHERE roomId = ?", [roomId]);
    this.database.run("DELETE FROM sessions WHERE roomId = ?", [roomId]);
    this.database.run("DELETE FROM rooms WHERE id = ?", [roomId]);
    this.flush();
  }

  async close(): Promise<void> {
    this.database.close();
  }
}
