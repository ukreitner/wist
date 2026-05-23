import type { QueryResultRow } from "pg";
import { Pool, type PoolClient } from "pg";
import type { GameEvent } from "@wist/core";
import type { RoomStore } from "./room-store.js";
import type { PersistedRoomRow, PlayerSession, RoomState } from "./types.js";

type Queryable = {
  query<Result extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]): Promise<{ rows: Result[] }>;
  end(): Promise<void>;
  connect?(): Promise<PoolClient>;
};

const boolValue = (value: unknown): boolean => value === true || value === "true" || value === 1;
const tableNames = ["rooms", "sessions", "events"] as const;
const supabaseDataApiRoles = ["anon", "authenticated"] as const;
const defaultConnectionTimeoutMs = 10_000;
const parsePositiveInteger = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getErrorCode = (error: unknown): string | undefined =>
  typeof error === "object" && error !== null && "code" in error ? String(error.code) : undefined;

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : typeof error === "string" ? error : "";

const isUnsupportedOptionalSchemaFeature = (error: unknown): boolean => {
  const code = getErrorCode(error);
  const message = getErrorMessage(error).toLowerCase();

  return (
    code === "0A000" ||
    code === "42601" ||
    message.includes("not supported") ||
    message.includes("syntax error")
  );
};
const isMissingPgRolesCatalog = (error: unknown): boolean =>
  getErrorMessage(error).toLowerCase().includes('relation "pg_roles" does not exist');

export class PostgresRoomStore implements RoomStore {
  private constructor(private readonly pool: Queryable) {}

  static async create(config: { connectionString?: string; pool?: Queryable }): Promise<PostgresRoomStore> {
    const pool = config.pool ?? new Pool({
      connectionString: config.connectionString,
      connectionTimeoutMillis: parsePositiveInteger(process.env.DATABASE_CONNECTION_TIMEOUT_MS, defaultConnectionTimeoutMs)
    });
    const store = new PostgresRoomStore(pool);
    await store.ensureSchema();
    return store;
  }

  private async ensureSchema(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        host_session_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        status TEXT NOT NULL,
        snapshot_json TEXT NOT NULL,
        test_preset_key TEXT,
        test_preset_cursor INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        nickname TEXT NOT NULL,
        seat TEXT,
        connected BOOLEAN NOT NULL,
        created_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        seq INTEGER NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(room_id, seq)
      );
    `);
    await this.lockDownSupabaseDataApi();
  }

  private async lockDownSupabaseDataApi(): Promise<void> {
    // Wist stores room/session tokens server-side only. Supabase's Data API must not expose these public-schema tables.
    for (const tableName of tableNames) {
      await this.runOptionalSchemaQuery(`ALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY`);

      for (const roleName of supabaseDataApiRoles) {
        if (await this.roleExists(roleName)) {
          await this.pool.query(`REVOKE ALL PRIVILEGES ON TABLE public.${tableName} FROM ${roleName}`);
        }
      }
    }
  }

  private async roleExists(roleName: string): Promise<boolean> {
    try {
      const result = await this.pool.query<{ exists: boolean }>(
        "SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = $1) AS exists",
        [roleName]
      );

      return boolValue(result.rows[0]?.exists);
    } catch (error) {
      const code = getErrorCode(error);

      if (code === "42P01" || isMissingPgRolesCatalog(error) || isUnsupportedOptionalSchemaFeature(error)) {
        return false;
      }

      throw error;
    }
  }

  private async runOptionalSchemaQuery(query: string): Promise<void> {
    try {
      await this.pool.query(query);
    } catch (error) {
      if (isUnsupportedOptionalSchemaFeature(error)) {
        return;
      }

      throw error;
    }
  }

  async loadRooms(): Promise<RoomState[]> {
    const roomRows = (
      await this.pool.query<{
        id: string;
        code: string;
        host_session_id: string;
        created_at: string;
        updated_at: string;
        status: RoomState["status"];
        snapshot_json: string;
        test_preset_key: string | null;
        test_preset_cursor: number;
      }>("SELECT * FROM rooms ORDER BY created_at ASC")
    ).rows;

    const rooms: RoomState[] = [];

    for (const roomRow of roomRows) {
      const sessionRows = (
        await this.pool.query<{
          id: string;
          room_id: string;
          token: string;
          nickname: string;
          seat: PlayerSession["seat"];
          connected: boolean;
          created_at: string;
          last_seen_at: string;
        }>("SELECT * FROM sessions WHERE room_id = $1 ORDER BY created_at ASC", [roomRow.id])
      ).rows;
      const eventRows = (
        await this.pool.query<{ payload_json: string }>("SELECT payload_json FROM events WHERE room_id = $1 ORDER BY seq ASC", [
          roomRow.id
        ])
      ).rows;
      const snapshot = JSON.parse(roomRow.snapshot_json) as { match: RoomState["match"] };

      rooms.push({
        id: roomRow.id,
        code: roomRow.code,
        hostSessionId: roomRow.host_session_id,
        createdAt: roomRow.created_at,
        updatedAt: roomRow.updated_at,
        status: roomRow.status,
        sessions: sessionRows.map((session) => ({
          id: session.id,
          token: session.token,
          nickname: session.nickname,
          seat: session.seat,
          connected: boolValue(session.connected),
          createdAt: session.created_at,
          lastSeenAt: session.last_seen_at
        })),
        events: eventRows.map((eventRow) => JSON.parse(eventRow.payload_json) as GameEvent),
        match: snapshot.match,
        testPresetKey: roomRow.test_preset_key,
        testPresetCursor: Number(roomRow.test_preset_cursor)
      });
    }

    return rooms;
  }

  async saveRoom(room: RoomState): Promise<void> {
    await this.runInTransaction(async (query) => {
      await query(
        `
          INSERT INTO rooms (id, code, host_session_id, created_at, updated_at, status, snapshot_json, test_preset_key, test_preset_cursor)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT(id) DO UPDATE SET
            code = EXCLUDED.code,
            host_session_id = EXCLUDED.host_session_id,
            updated_at = EXCLUDED.updated_at,
            status = EXCLUDED.status,
            snapshot_json = EXCLUDED.snapshot_json,
            test_preset_key = EXCLUDED.test_preset_key,
            test_preset_cursor = EXCLUDED.test_preset_cursor
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

      await query("DELETE FROM sessions WHERE room_id = $1", [room.id]);
      await query("DELETE FROM events WHERE room_id = $1", [room.id]);

      for (const session of room.sessions) {
        await query(
          `
            INSERT INTO sessions (id, room_id, token, nickname, seat, connected, created_at, last_seen_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `,
          [
            session.id,
            room.id,
            session.token,
            session.nickname,
            session.seat,
            session.connected,
            session.createdAt,
            session.lastSeenAt
          ]
        );
      }

      for (const [index, event] of room.events.entries()) {
        await query(
          `
            INSERT INTO events (id, room_id, seq, payload_json, created_at)
            VALUES ($1, $2, $3, $4, $5)
          `,
          [event.id, room.id, index, JSON.stringify(event), event.at]
        );
      }
    });
  }

  async appendGameEvent(room: RoomState, event: GameEvent): Promise<void> {
    await this.runInTransaction(async (query) => {
      await query(
        `
          UPDATE rooms
          SET updated_at = $1, status = $2, snapshot_json = $3, test_preset_cursor = $4
          WHERE id = $5
        `,
        [room.updatedAt, room.status, JSON.stringify({ match: room.match }), room.testPresetCursor, room.id]
      );

      await query(
        `
          INSERT INTO events (id, room_id, seq, payload_json, created_at)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [event.id, room.id, room.events.length - 1, JSON.stringify(event), event.at]
      );
    });
  }

  async updateSessionConnection(room: RoomState, session: PlayerSession): Promise<void> {
    await this.runInTransaction(async (query) => {
      await query(
        `
          UPDATE rooms
          SET updated_at = $1, status = $2, snapshot_json = $3
          WHERE id = $4
        `,
        [room.updatedAt, room.status, JSON.stringify({ match: room.match }), room.id]
      );

      await query(
        `
          UPDATE sessions
          SET connected = $1, last_seen_at = $2
          WHERE id = $3
        `,
        [session.connected, session.lastSeenAt, session.id]
      );
    });
  }

  async deleteRoom(roomId: string): Promise<void> {
    await this.pool.query("DELETE FROM rooms WHERE id = $1", [roomId]);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  private async runInTransaction(run: (query: (text: string, values?: unknown[]) => Promise<void>) => Promise<void>): Promise<void> {
    const client = await this.acquireClient();

    try {
      await client.query("BEGIN");
      await run(async (text, values) => {
        await client.query(text, values);
      });
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async acquireClient(): Promise<PoolClient> {
    if (!("connect" in this.pool) || typeof this.pool.connect !== "function") {
      throw new Error("Postgres transactions require a pool with connect().");
    }

    return this.pool.connect();
  }
}
