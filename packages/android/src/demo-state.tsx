import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import type { Socket } from "socket.io-client";
import type { AuctionBid, Card, PrivatePlayerView, PublicMatchState, Seat, Trump } from "@wist/core";
import {
  bootstrapRoom,
  buildRejoinUrl,
  buildRoomUrl,
  connectRoomSocket,
  createRoom as createRemoteRoom,
  createSessionStore,
  getClientConfig,
  joinRoom as joinRemoteRoom,
  rejoinRoom as rejoinRemoteRoom,
  type RoomSnapshot,
  type SessionHandle,
  type SnapshotPlayer
} from "@wist/client";
import { sortCardsForDisplay } from "./components/cardLayout";

export type DemoPlayer = {
  id: string;
  name: string;
  seat: Seat;
  connected: boolean;
  isHost?: boolean;
};

type StoredRecentRoom = {
  roomCode: string;
  token: string;
  nickname: string;
  savedAt: string;
};

export type RecentRoom = {
  code: string;
  nick: string;
  token: string;
  time: string;
  savedAt: string;
};

type DemoStateValue = {
  roomCode: string;
  selfName: string;
  selfSeat: Seat | null;
  session: SessionHandle | null;
  snapshot: RoomSnapshot | null;
  privateView: PrivatePlayerView | null;
  socketState: "disconnected" | "connecting" | "connected";
  error: string | null;
  players: DemoPlayer[];
  recentRooms: RecentRoom[];
  hand: Card[];
  legalPassCardCodes: string[];
  legalPlayCardCodes: string[];
  auctionBids: AuctionBid[];
  bettingValues: number[];
  recentlyReceivedCardCodes: string[];
  minimumBet: number;
  currentTurn: Seat | null;
  currentTrick: NonNullable<PublicMatchState["currentHand"]>["currentTrick"];
  completedTricks: NonNullable<PublicMatchState["currentHand"]>["completedTricks"];
  currentScores: Record<Seat, number>;
  currentBets: Partial<Record<Seat, number>>;
  currentTaken: Record<Seat, number>;
  recentActions: Array<{ seat: Seat; kind: "bid" | "pass"; label: string }>;
  recentCompletedHands: PublicMatchState["completedHands"];
  publicAppUrl: string | null;
  inviteUrl: string | null;
  rejoinUrl: string | null;
  createRoom: (nickname: string) => Promise<void>;
  joinRoom: (roomCode: string, nickname: string) => Promise<void>;
  resumeRoom: (room: RecentRoom) => Promise<void>;
  playerForSeat: (seat: Seat) => DemoPlayer;
  leftOfSelf: DemoPlayer;
  contractText: string | null;
  highestBidText: string | null;
  clearError: () => void;
  assignSeat: (sessionId: string, seat: Seat) => void;
  startMatch: (initialScores?: Partial<Record<Seat, number>>) => void;
  submitPass: (cardCodes: string[]) => void;
  submitAuctionBid: (bid: AuctionBid) => void;
  submitAuctionPass: () => void;
  submitBet: (value: number) => void;
  playCard: (cardCode: string) => void;
  requestUndo: () => void;
  startNextHand: () => void;
  endMatch: () => void;
};

export type { Seat } from "@wist/core";

const PROFILE_STORAGE_KEY = "wist.android.profile.v1";
const RECENT_ROOMS_STORAGE_KEY = "wist.android.recentRooms.v1";
const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL?.replace(/\/+$/, "") ?? "http://10.0.2.2:4100";
const SEATS: Seat[] = ["N", "E", "S", "W"];
const SUIT_SYMBOL: Record<Trump, string> = { C: "♣", D: "♦", H: "♥", S: "♠", NT: "NT" };

const DemoStateContext = createContext<DemoStateValue | null>(null);

const sessionStore = createSessionStore({
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key)
});

const readJson = async <Value,>(key: string, fallback: Value): Promise<Value> => {
  const raw = await AsyncStorage.getItem(key);

  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as Value;
  } catch {
    return fallback;
  }
};

const writeJson = async (key: string, value: unknown): Promise<void> => {
  await AsyncStorage.setItem(key, JSON.stringify(value));
};

const formatTimestamp = (value: string): string =>
  new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

const toRecentRoom = (room: StoredRecentRoom): RecentRoom => ({
  code: room.roomCode,
  nick: room.nickname,
  token: room.token,
  time: formatTimestamp(room.savedAt),
  savedAt: room.savedAt
});

const sortRecentRooms = (rooms: StoredRecentRoom[]): StoredRecentRoom[] =>
  rooms.slice().sort((left, right) => right.savedAt.localeCompare(left.savedAt));

const upsertRecentRoom = async (session: SessionHandle): Promise<RecentRoom[]> => {
  const nextRoom: StoredRecentRoom = {
    roomCode: session.roomCode,
    token: session.token,
    nickname: session.nickname,
    savedAt: new Date().toISOString()
  };
  const current = await readJson<StoredRecentRoom[]>(RECENT_ROOMS_STORAGE_KEY, []);
  const nextRooms = sortRecentRooms([
    nextRoom,
    ...current.filter((room) => !(room.roomCode === session.roomCode && room.token === session.token))
  ]).slice(0, 8);

  await writeJson(RECENT_ROOMS_STORAGE_KEY, nextRooms);
  return nextRooms.map(toRecentRoom);
};

const isPrivateView = (view: RoomSnapshot["view"]): view is PrivatePlayerView => "viewerSeat" in view;

const nextSeat = (seat: Seat): Seat => SEATS[(SEATS.indexOf(seat) + 1) % SEATS.length]!;

const fallbackPlayer = (seat: Seat): DemoPlayer => ({
  id: `open-${seat}`,
  name: "Open seat",
  seat,
  connected: false
});

const formatBid = (bid: { tricks: number; trump: Trump }): string => `${bid.tricks}${SUIT_SYMBOL[bid.trump]}`;

export function DemoStateProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [session, setSession] = useState<SessionHandle | null>(null);
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>([]);
  const [profileNickname, setProfileNickname] = useState("Dani");
  const [socketState, setSocketState] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [error, setError] = useState<string | null>(null);
  const [publicAppUrl, setPublicAppUrl] = useState<string | null>(null);
  const [recentlyReceivedCardCodes, setRecentlyReceivedCardCodes] = useState<string[]>([]);
  const previousHandRef = useRef<{ handId: string; phase: string; cardCodes: string[] } | null>(null);

  useEffect(() => {
    void (async () => {
      const [storedNickname, storedRooms] = await Promise.all([
        AsyncStorage.getItem(PROFILE_STORAGE_KEY),
        readJson<StoredRecentRoom[]>(RECENT_ROOMS_STORAGE_KEY, [])
      ]);

      if (storedNickname?.trim()) {
        setProfileNickname(storedNickname);
      }

      setRecentRooms(sortRecentRooms(storedRooms).map(toRecentRoom));

      try {
        const config = await getClientConfig({ serverUrl: SERVER_URL });
        setPublicAppUrl(config.publicAppUrl);
      } catch {
        setPublicAppUrl(null);
      }
    })();

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const rememberSession = async (nextSession: SessionHandle): Promise<void> => {
    await Promise.all([
      sessionStore.save(nextSession),
      AsyncStorage.setItem(PROFILE_STORAGE_KEY, nextSession.nickname),
      upsertRecentRoom(nextSession).then(setRecentRooms)
    ]);

    setSession(nextSession);
    setProfileNickname(nextSession.nickname);
  };

  const connectSocket = (nextSession: SessionHandle): void => {
    socketRef.current?.disconnect();
    socketRef.current = connectRoomSocket({
      serverUrl: SERVER_URL,
      session: nextSession,
      onConnectStateChange: setSocketState,
      onConnect: () => {
        void bootstrapRoom(nextSession.roomCode, nextSession.token, { serverUrl: SERVER_URL })
          .then((nextSnapshot) => {
            setSnapshot(nextSnapshot);
            setError(null);
          })
          .catch(() => {
            /* The server also pushes a snapshot on connect; keep that path if bootstrap races a cold start. */
          });
      },
      onSnapshot: (nextSnapshot) => {
        setSnapshot(nextSnapshot);
        setError(null);
      },
      onPresence: (players: SnapshotPlayer[]) => {
        setSnapshot((current) => (current ? { ...current, players } : current));
      },
      onError: (message) => {
        setError(message);
      }
    });
  };

  const createRoom = async (nickname: string): Promise<void> => {
    try {
      const created = await createRemoteRoom(nickname, { serverUrl: SERVER_URL });
      await rememberSession(created.session);
      setSnapshot(created.snapshot);
      connectSocket(created.session);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to create room.");
    }
  };

  const joinRoom = async (roomCode: string, nickname: string): Promise<void> => {
    try {
      const joined = await joinRemoteRoom(roomCode, nickname, { serverUrl: SERVER_URL });
      await rememberSession(joined.session);
      setSnapshot(joined.snapshot);
      connectSocket(joined.session);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to join room.");
    }
  };

  const resumeRoom = async (room: RecentRoom): Promise<void> => {
    try {
      const storedSession = (await sessionStore.load(room.code)) ?? {
        roomCode: room.code,
        token: room.token,
        nickname: room.nick
      };
      const restored = await rejoinRemoteRoom(storedSession.roomCode, storedSession.token, { serverUrl: SERVER_URL });
      await rememberSession(restored.session);
      setSnapshot(restored.snapshot);
      connectSocket(restored.session);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to resume room.");
      try {
        const bootstrapSnapshot = await bootstrapRoom(room.code, room.token, { serverUrl: SERVER_URL });
        const fallbackSession = {
          roomCode: room.code,
          token: room.token,
          nickname: room.nick
        };

        await rememberSession(fallbackSession);
        setSnapshot(bootstrapSnapshot);
        connectSocket(fallbackSession);
        setError(null);
      } catch {
        /* keep original error */
      }
    }
  };

  const emit = (eventName: string, payload?: unknown): void => {
    socketRef.current?.emit(eventName, payload);
  };

  const privateView = snapshot && isPrivateView(snapshot.view) ? snapshot.view : null;
  const currentHand = snapshot?.match.currentHand ?? null;
  const handId = currentHand ? String(currentHand.id) : null;
  const handPhase = currentHand?.phase ?? null;

  useEffect(() => {
    if (!privateView || !handId || !handPhase) {
      previousHandRef.current = null;
      setRecentlyReceivedCardCodes([]);
      return;
    }

    const cardCodes = privateView.hand.map((card) => card.code);
    const previous = previousHandRef.current;

    if (previous?.handId === handId && previous.phase === "passing" && handPhase !== "passing") {
      const previousCodes = new Set(previous.cardCodes);
      const receivedCodes = cardCodes.filter((code) => !previousCodes.has(code));

      if (receivedCodes.length > 0) {
        setRecentlyReceivedCardCodes(receivedCodes);
      }
    }

    previousHandRef.current = { handId, phase: handPhase, cardCodes };
  }, [handId, handPhase, privateView]);

  useEffect(() => {
    if (recentlyReceivedCardCodes.length === 0) {
      return;
    }

    const timeout = setTimeout(() => setRecentlyReceivedCardCodes([]), 12000);
    return () => clearTimeout(timeout);
  }, [recentlyReceivedCardCodes]);

  const players = useMemo<DemoPlayer[]>(
    () =>
      snapshot?.players
        .filter((player): player is SnapshotPlayer & { seat: Seat } => Boolean(player.seat))
        .map((player) => ({
          id: player.id,
          name: player.nickname,
          seat: player.seat,
          connected: player.connected,
          isHost: player.isHost
        })) ?? [],
    [snapshot?.players]
  );
  const playersBySeat = useMemo(
    () => new Map(players.map((player) => [player.seat, player] as const)),
    [players]
  );
  const selfSeat = snapshot?.me.seat ?? null;
  const leftOfSelf = selfSeat ? playersBySeat.get(nextSeat(selfSeat)) ?? fallbackPlayer(nextSeat(selfSeat)) : fallbackPlayer("N");
  const contractText =
    currentHand?.contract ? `${formatBid(currentHand.contract)} by ${playersBySeat.get(currentHand.contract.bidder)?.name ?? currentHand.contract.bidder}` : null;
  const highestBidText =
    currentHand?.highestBid && currentHand.highestBidder
      ? `${formatBid(currentHand.highestBid)} by ${playersBySeat.get(currentHand.highestBidder)?.name ?? currentHand.highestBidder}`
      : null;
  const publicAppBaseUrl = publicAppUrl ?? null;
  const inviteUrl = snapshot && publicAppBaseUrl ? buildRoomUrl(publicAppBaseUrl, snapshot.roomCode) : null;
  const rejoinUrl =
    snapshot && session && publicAppBaseUrl ? buildRejoinUrl(publicAppBaseUrl, snapshot.roomCode, session.token) : null;

  const value = useMemo<DemoStateValue>(
    () => ({
      roomCode: snapshot?.roomCode ?? "",
      selfName: snapshot?.me.nickname ?? profileNickname,
      selfSeat,
      session,
      snapshot,
      privateView,
      socketState,
      error,
      players,
      recentRooms,
      hand: privateView ? sortCardsForDisplay(privateView.hand) : [],
      legalPassCardCodes: privateView?.legalActions.passSelection?.selectableCardCodes ?? [],
      legalPlayCardCodes: privateView?.legalActions.playing?.cardCodes ?? [],
      auctionBids: privateView?.legalActions.auction?.bids ?? [],
      bettingValues: privateView?.legalActions.betting?.values ?? [],
      recentlyReceivedCardCodes,
      minimumBet: privateView?.legalActions.betting?.min ?? 0,
      currentTurn: currentHand?.currentTurn ?? null,
      currentTrick: currentHand?.currentTrick ?? null,
      completedTricks: currentHand?.completedTricks ?? [],
      currentScores: snapshot?.match.scores ?? { N: 0, E: 0, S: 0, W: 0 },
      currentBets: currentHand?.bets ?? {},
      currentTaken: currentHand?.taken ?? { N: 0, E: 0, S: 0, W: 0 },
      recentActions:
        currentHand?.auctionLog.slice(-4).map((entry: { seat: Seat; kind: "bid" | "pass"; bid?: { tricks: number; trump: Trump } }) => ({
          seat: entry.seat,
          kind: entry.kind,
          label: entry.kind === "bid" && entry.bid ? formatBid(entry.bid) : "Pass"
        })) ?? [],
      recentCompletedHands: snapshot?.match.completedHands ?? [],
      publicAppUrl,
      inviteUrl,
      rejoinUrl,
      createRoom,
      joinRoom,
      resumeRoom,
      playerForSeat: (seat) => playersBySeat.get(seat) ?? fallbackPlayer(seat),
      leftOfSelf,
      contractText,
      highestBidText,
      clearError: () => setError(null),
      assignSeat: (sessionId, seat) => emit("seat.assign", { sessionId, seat }),
      startMatch: (initialScores) => emit("match.start", { initialScores }),
      submitPass: (cardCodes) => emit("pass.submit", { cardCodes }),
      submitAuctionBid: (bid) => emit("auction.action", { kind: "bid", bid }),
      submitAuctionPass: () => emit("auction.action", { kind: "pass" }),
      submitBet: (nextValue) => emit("bet.submit", { value: nextValue }),
      playCard: (cardCode) => emit("play.card", { cardCode }),
      requestUndo: () => emit("undo.request"),
      startNextHand: () => emit("match.nextHand"),
      endMatch: () => emit("match.end")
    }),
    [
      contractText,
      currentHand?.auctionLog,
      currentHand?.bets,
      currentHand?.completedTricks,
      currentHand?.currentTrick,
      currentHand?.currentTurn,
      currentHand?.taken,
      error,
      inviteUrl,
      leftOfSelf,
      players,
      playersBySeat,
      privateView,
      profileNickname,
      publicAppUrl,
      recentlyReceivedCardCodes,
      recentRooms,
      rejoinUrl,
      selfSeat,
      session,
      snapshot,
      socketState,
      highestBidText
    ]
  );

  return <DemoStateContext.Provider value={value}>{children}</DemoStateContext.Provider>;
}

export function useDemoState(): DemoStateValue {
  const value = useContext(DemoStateContext);

  if (!value) {
    throw new Error("useDemoState must be used inside DemoStateProvider.");
  }

  return value;
}
