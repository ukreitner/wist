import type { HandSummary, ScoreMap } from "@wist/core";
import type { RoomSnapshot, SessionHandle } from "./types.js";

const PROFILE_STORAGE_KEY = "wist.profile.v1";
const RECENT_ROOMS_STORAGE_KEY = "wist.recentRooms.v1";
const ARCHIVES_STORAGE_KEY = "wist.archives.v1";

export interface DeviceProfile {
  nickname: string;
}

export interface RecentRoom {
  roomCode: string;
  token: string;
  nickname: string;
  savedAt: string;
}

export interface MatchArchive {
  version: 1;
  id: string;
  roomCode: string;
  savedAt: string;
  updatedAt: string;
  exportedBy: string | null;
  scores: ScoreMap;
  completedHands: HandSummary[];
  status: "waiting" | "active" | "ended";
}

const readJson = <Value>(key: string, fallback: Value): Value => {
  const raw = localStorage.getItem(key);

  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as Value;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

const sortRecentRooms = (rooms: RecentRoom[]): RecentRoom[] =>
  rooms.slice().sort((left, right) => right.savedAt.localeCompare(left.savedAt));

const sortArchives = (archives: MatchArchive[]): MatchArchive[] =>
  archives.slice().sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

export const loadProfileNickname = (): string => readJson<DeviceProfile | null>(PROFILE_STORAGE_KEY, null)?.nickname ?? "";

export const saveProfileNickname = (nickname: string): void => {
  if (!nickname.trim()) {
    return;
  }

  writeJson(PROFILE_STORAGE_KEY, { nickname: nickname.trim() } satisfies DeviceProfile);
};

export const loadRecentRooms = (): RecentRoom[] => sortRecentRooms(readJson<RecentRoom[]>(RECENT_ROOMS_STORAGE_KEY, []));

export const upsertRecentRoom = (session: SessionHandle, current = loadRecentRooms()): RecentRoom[] => {
  const nextRoom: RecentRoom = {
    roomCode: session.roomCode,
    token: session.token,
    nickname: session.nickname,
    savedAt: new Date().toISOString()
  };
  const nextRooms = sortRecentRooms([
    nextRoom,
    ...current.filter((room) => !(room.roomCode === session.roomCode && room.token === session.token))
  ]).slice(0, 8);

  writeJson(RECENT_ROOMS_STORAGE_KEY, nextRooms);
  return nextRooms;
};

export const loadArchives = (): MatchArchive[] => sortArchives(readJson<MatchArchive[]>(ARCHIVES_STORAGE_KEY, []));

export const saveArchive = (archive: MatchArchive, current = loadArchives()): MatchArchive[] => {
  const nextArchives = sortArchives([archive, ...current.filter((entry) => entry.id !== archive.id)]);

  writeJson(ARCHIVES_STORAGE_KEY, nextArchives);
  return nextArchives;
};

export const deleteArchive = (archiveId: string, current = loadArchives()): MatchArchive[] => {
  const nextArchives = current.filter((archive) => archive.id !== archiveId);
  writeJson(ARCHIVES_STORAGE_KEY, nextArchives);
  return nextArchives;
};

const isScoreMap = (value: unknown): value is ScoreMap => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const scoreMap = value as Record<string, unknown>;
  return ["N", "E", "S", "W"].every((seat) => typeof scoreMap[seat] === "number");
};

export const archiveFromSnapshot = (
  snapshot: RoomSnapshot,
  session: SessionHandle | null,
  existingArchive?: MatchArchive | null
): MatchArchive => ({
  version: 1,
  id: snapshot.roomCode,
  roomCode: snapshot.roomCode,
  savedAt: existingArchive?.savedAt ?? new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  exportedBy: session?.nickname ?? snapshot.me.nickname ?? null,
  scores: snapshot.match.scores,
  completedHands: snapshot.match.completedHands,
  status: snapshot.match.status
});

export const parseArchiveText = (text: string): MatchArchive => {
  const candidate = JSON.parse(text) as Partial<MatchArchive>;

  if (candidate.version !== 1) {
    throw new Error("Unsupported history archive version.");
  }

  if (typeof candidate.roomCode !== "string" || !candidate.roomCode.trim()) {
    throw new Error("History archive is missing a room code.");
  }

  if (!Array.isArray(candidate.completedHands)) {
    throw new Error("History archive is missing completed hands.");
  }

  if (!isScoreMap(candidate.scores)) {
    throw new Error("History archive is missing final scores.");
  }

  return {
    version: 1,
    id: typeof candidate.id === "string" && candidate.id.trim() ? candidate.id : candidate.roomCode.toUpperCase(),
    roomCode: candidate.roomCode.toUpperCase(),
    savedAt: typeof candidate.savedAt === "string" ? candidate.savedAt : new Date().toISOString(),
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : new Date().toISOString(),
    exportedBy: typeof candidate.exportedBy === "string" ? candidate.exportedBy : null,
    scores: candidate.scores,
    completedHands: candidate.completedHands,
    status: candidate.status === "waiting" || candidate.status === "active" || candidate.status === "ended" ? candidate.status : "ended"
  };
};
