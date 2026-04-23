import { startTransition, useEffect, useRef, useState, type ChangeEvent } from "react";
import type { Socket } from "socket.io-client";
import type { AuctionBid, Card, PrivatePlayerView, PublicMatchState, Seat, Trick, Trump } from "@wist/core";
import {
  bootstrapRoom,
  buildRejoinUrl,
  buildRoomUrl,
  connectRoomSocket,
  createRoom,
  createSessionStore,
  getClientConfig,
  joinRoom,
  rejoinRoom
} from "./api.js";
import PlayingCard from "./components/PlayingCard.js";
import { LOCALE_STORAGE_KEY, MESSAGES, phaseLabel, seatLabel, trumpLabel, type Locale } from "./i18n.js";
import {
  archiveFromSnapshot,
  deleteArchive,
  loadArchives,
  loadProfileNickname,
  loadRecentRooms,
  parseArchiveText,
  saveArchive,
  saveProfileNickname,
  type MatchArchive,
  type RecentRoom,
  upsertRecentRoom
} from "./storage.js";
import type { RoomSnapshot, SessionHandle, SnapshotPlayer } from "./types.js";

const SERVER_URL = import.meta.env.VITE_SERVER_URL;
const SEATS: Seat[] = ["N", "E", "S", "W"];
const SUIT_ORDER: Record<Card["suit"], number> = { C: 0, D: 1, H: 2, S: 3 };
const TRUMP_ORDER: Record<Trump, number> = { C: 0, D: 1, H: 2, S: 3, NT: 4 };

const isPrivateView = (view: PrivatePlayerView | PublicMatchState): view is PrivatePlayerView =>
  "viewerSeat" in view;

const initialLocale = (): Locale => {
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);

  if (stored === "he" || stored === "en") {
    return stored;
  }

  return navigator.language.toLowerCase().startsWith("he") ? "he" : "en";
};

const browserSessionStore = createSessionStore({
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: (key) => localStorage.removeItem(key)
});

const formatBidChip = (bid: AuctionBid, locale: Locale): string => `${bid.tricks}${trumpLabel(bid.trump, locale)}`;
const formatTrump = (trump: Trump, locale: Locale): string => trumpLabel(trump, locale);

const sortCards = (cards: Card[]): Card[] =>
  cards
    .slice()
    .sort((left, right) => SUIT_ORDER[left.suit] - SUIT_ORDER[right.suit] || left.rank - right.rank);

const formatTimestamp = (value: string, locale: Locale): string =>
  new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));

const archiveFileName = (archive: MatchArchive): string =>
  `wist-history-${archive.roomCode.toLowerCase()}-${archive.updatedAt.slice(0, 10)}.json`;

export default function App() {
  const socketRef = useRef<Socket | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const heldTrickKeyRef = useRef<string | null>(null);
  const heldTrickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextHandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedNickname = loadProfileNickname();
  const [session, setSession] = useState<SessionHandle | null>(null);
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [clientConfig, setClientConfig] = useState<{ publicAppUrl: string | null }>({ publicAppUrl: null });
  const [socketState, setSocketState] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [error, setError] = useState<string | null>(null);
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [createNickname, setCreateNickname] = useState(savedNickname);
  const [joinNickname, setJoinNickname] = useState(savedNickname);
  const [joinRoomCode, setJoinRoomCode] = useState("");
  const [selectedPassCards, setSelectedPassCards] = useState<string[]>([]);
  const [selectedAuctionTrump, setSelectedAuctionTrump] = useState<Trump | null>(null);
  const [selectedAuctionTricks, setSelectedAuctionTricks] = useState<number | null>(null);
  const [heldCompletedTrick, setHeldCompletedTrick] = useState<Trick | null>(null);
  const [lastCompletedTrick, setLastCompletedTrick] = useState<Trick | null>(null);
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>(() => loadRecentRooms());
  const [archives, setArchives] = useState<MatchArchive[]>(() => loadArchives());
  const [selectedArchiveId, setSelectedArchiveId] = useState<string | null>(null);

  const t = MESSAGES[locale];
  const isRtl = locale === "he";
  const socketStateLabel = socketState === "connected" ? t.connected : socketState === "connecting" ? t.connection : t.away;

  const rememberSession = (nextSession: SessionHandle): void => {
    void browserSessionStore.save(nextSession);
    saveProfileNickname(nextSession.nickname);
    setSession(nextSession);
    setCreateNickname(nextSession.nickname);
    setJoinNickname(nextSession.nickname);
    setRecentRooms((current) => upsertRecentRoom(nextSession, current));
  };

  const connectSocket = (nextSession: SessionHandle): void => {
    socketRef.current?.disconnect();
    socketRef.current = connectRoomSocket({
      serverUrl: SERVER_URL,
      session: nextSession,
      onConnectStateChange: setSocketState,
      onSnapshot: (nextSnapshot) => {
        startTransition(() => {
          setSnapshot(nextSnapshot);
          setError(null);
        });
      },
      onPresence: (players: SnapshotPlayer[]) => {
        startTransition(() => {
          setSnapshot((current) => (current ? { ...current, players } : current));
        });
      },
      onError: (message) => {
        setError(message);
      }
    });
  };

  useEffect(() => {
    void getClientConfig({ serverUrl: SERVER_URL })
      .then((nextConfig) => {
        setClientConfig(nextConfig);
      })
      .catch(() => {
        setClientConfig({ publicAppUrl: null });
      });
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
  }, [isRtl, locale]);

  useEffect(() => {
    setSelectedArchiveId((current) => {
      if (current && archives.some((archive) => archive.id === current)) {
        return current;
      }

      return archives[0]?.id ?? null;
    });
  }, [archives]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomFromUrl = params.get("room")?.toUpperCase();
    const tokenFromUrl = params.get("token");

    if (roomFromUrl) {
      setJoinRoomCode(roomFromUrl);
    }

    const restore = async (): Promise<void> => {
      try {
        if (roomFromUrl && tokenFromUrl) {
          const restored = await rejoinRoom(roomFromUrl, tokenFromUrl);
          rememberSession(restored.session);
          setSnapshot(restored.snapshot);
          connectSocket(restored.session);
          return;
        }

        if (roomFromUrl) {
          const stored = await browserSessionStore.load(roomFromUrl);

          if (stored) {
            rememberSession(stored);
            const restoredSnapshot = await bootstrapRoom(stored.roomCode, stored.token);
            setSnapshot(restoredSnapshot);
            connectSocket(stored);
            window.history.replaceState({}, "", `?room=${stored.roomCode}&token=${stored.token}`);
          }
        }
      } catch (restoreError) {
        setError(restoreError instanceof Error ? restoreError.message : "Unable to restore session.");
      }
    };

    void restore();
  }, []);

  useEffect(() => {
    const privateView = snapshot && isPrivateView(snapshot.view) ? snapshot.view : null;

    if (!privateView?.legalActions.passSelection) {
      setSelectedPassCards([]);
      return;
    }

    if (privateView.pendingPassSelection?.length) {
      setSelectedPassCards(privateView.pendingPassSelection.map((card) => card.code));
    }
  }, [snapshot]);

  useEffect(() => {
    const privateView = snapshot && isPrivateView(snapshot.view) ? snapshot.view : null;

    if (!privateView?.legalActions.auction) {
      setSelectedAuctionTrump(null);
      setSelectedAuctionTricks(null);
    }
  }, [snapshot]);

  useEffect(() => {
    if (!snapshot || snapshot.roomStatus === "lobby") {
      return;
    }

    if (snapshot.match.completedHands.length === 0 && snapshot.roomStatus !== "ended") {
      return;
    }

    setArchives((current) => {
      const existingArchive = current.find((archive) => archive.id === snapshot.roomCode) ?? null;
      return saveArchive(archiveFromSnapshot(snapshot, session, existingArchive), current);
    });
  }, [snapshot?.roomCode, snapshot?.roomStatus, snapshot?.match.completedHands.length, session?.nickname]);

  useEffect(
    () => () => {
      if (heldTrickTimerRef.current) {
        clearTimeout(heldTrickTimerRef.current);
      }

      if (nextHandTimerRef.current) {
        clearTimeout(nextHandTimerRef.current);
      }
    },
    []
  );

  const publicAppBaseUrl = clientConfig.publicAppUrl ?? `${window.location.origin}${window.location.pathname}`;

  const roomUrl = (roomCode: string): string => buildRoomUrl(publicAppBaseUrl, roomCode);

  const rejoinUrl = (roomCode: string, token: string): string => buildRejoinUrl(publicAppBaseUrl, roomCode, token);

  const selectedArchive = archives.find((archive) => archive.id === selectedArchiveId) ?? null;

  const downloadArchive = (archive: MatchArchive): void => {
    const blob = new Blob([JSON.stringify(archive, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = archiveFileName(archive);
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateRoom = async (): Promise<void> => {
    try {
      const created = await createRoom(createNickname);
      rememberSession(created.session);
      setSnapshot(created.snapshot);
      connectSocket(created.session);
      window.history.replaceState({}, "", `?room=${created.session.roomCode}&token=${created.session.token}`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create room.");
    }
  };

  const handleJoinRoom = async (): Promise<void> => {
    try {
      const joined = await joinRoom(joinRoomCode, joinNickname);
      rememberSession(joined.session);
      setSnapshot(joined.snapshot);
      connectSocket(joined.session);
      window.history.replaceState({}, "", `?room=${joined.session.roomCode}&token=${joined.session.token}`);
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : "Unable to join room.");
    }
  };

  const resumeRecentRoom = async (recentRoom: RecentRoom): Promise<void> => {
    try {
      const nextSession: SessionHandle = {
        roomCode: recentRoom.roomCode,
        token: recentRoom.token,
        nickname: recentRoom.nickname
      };
      const restoredSnapshot = await bootstrapRoom(nextSession.roomCode, nextSession.token);

      rememberSession(nextSession);
      setSnapshot(restoredSnapshot);
      setJoinRoomCode(nextSession.roomCode);
      connectSocket(nextSession);
      window.history.replaceState({}, "", `?room=${nextSession.roomCode}&token=${nextSession.token}`);
    } catch (resumeError) {
      setError(resumeError instanceof Error ? resumeError.message : "Unable to resume room.");
    }
  };

  const emit = (eventName: string, payload?: unknown): void => {
    socketRef.current?.emit(eventName, payload);
  };

  useEffect(() => {
    if (nextHandTimerRef.current) {
      clearTimeout(nextHandTimerRef.current);
      nextHandTimerRef.current = null;
    }

    if (!snapshot?.controls.canStartNextHand) {
      return;
    }

    nextHandTimerRef.current = setTimeout(() => {
      emit("match.nextHand");
      nextHandTimerRef.current = null;
    }, 2200);
  }, [snapshot?.controls.canStartNextHand, snapshot?.match.completedHands.length]);

  const copyText = async (value: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      setError(null);
    } catch {
      setError("Clipboard access failed.");
    }
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const importedArchive = parseArchiveText(await file.text());
      setArchives((current) => saveArchive(importedArchive, current));
      setSelectedArchiveId(importedArchive.id);
      setError(null);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Unable to import history.");
    } finally {
      event.target.value = "";
    }
  };

  const privateView = snapshot && isPrivateView(snapshot.view) ? snapshot.view : null;
  const publicMatch = snapshot?.match ?? null;
  const currentHand = publicMatch?.currentHand ?? null;
  const currentTurn = currentHand?.currentTurn ?? null;
  const statusText = currentHand
    ? `${t.phase} ${phaseLabel(currentHand.phase, locale)}`
    : publicMatch?.awaitingNextHand
      ? t.handComplete
      : t.waiting;
  const seatPlayers = new Map<Seat, SnapshotPlayer>();

  snapshot?.players.forEach((player) => {
    if (player.seat) {
      seatPlayers.set(player.seat, player);
    }
  });

  const fallbackPlayerName = (seat: Seat): string => `${t.player} ${SEATS.indexOf(seat) + 1}`;
  const playerNameForSeat = (seat: Seat): string => seatPlayers.get(seat)?.nickname ?? fallbackPlayerName(seat);
  const archivePlayerNameForSeat = (archive: MatchArchive, seat: Seat): string =>
    archive.playerNames?.[seat] ?? fallbackPlayerName(seat);
  const formatSeatNumbers = (values: Record<Seat, number>, labelForSeat: (seat: Seat) => string): string =>
    SEATS.map((seat) => `${labelForSeat(seat)} ${values[seat]}`).join(" / ");
  const formatScoreDelta = (values: Record<Seat, number>, labelForSeat: (seat: Seat) => string): string =>
    SEATS.map((seat) => `${labelForSeat(seat)} ${values[seat] >= 0 ? `+${values[seat]}` : values[seat]}`).join(" / ");

  useEffect(() => {
    const completedTricks = currentHand?.completedTricks ?? [];
    const latestTrick = completedTricks.at(-1) ?? null;

    if (!currentHand || !latestTrick) {
      setLastCompletedTrick(null);
      setHeldCompletedTrick(null);
      heldTrickKeyRef.current = null;
      return;
    }

    setLastCompletedTrick(latestTrick);

    const latestKey = `${currentHand.id}-${completedTricks.length}-${latestTrick.winner}-${latestTrick.plays
      .map((play) => `${play.seat}:${play.card.code}`)
      .join("|")}`;

    if (heldTrickKeyRef.current === latestKey) {
      return;
    }

    heldTrickKeyRef.current = latestKey;
    setHeldCompletedTrick(latestTrick);

    if (heldTrickTimerRef.current) {
      clearTimeout(heldTrickTimerRef.current);
    }

    heldTrickTimerRef.current = setTimeout(() => {
      setHeldCompletedTrick(null);
      heldTrickTimerRef.current = null;
    }, 1000);
  }, [currentHand?.id, currentHand?.completedTricks.length]);

  const renderLanguageToggle = () => (
    <button type="button" className="ghost-button locale-toggle" onClick={() => setLocale((value) => (value === "en" ? "he" : "en"))}>
      {t.toggleLabel}
    </button>
  );

  const renderRecentRooms = () => (
    <article className="panel device-panel">
      <header className="panel-header">
        <div>
          <span className="panel-kicker">{t.onThisDevice}</span>
          <h2>{t.recentRooms}</h2>
        </div>
      </header>
      <div className="recent-room-list">
        {recentRooms.length === 0 ? <p className="panel-muted">{t.noRecentRooms}</p> : null}
        {recentRooms.map((recentRoom) => (
          <article key={`${recentRoom.roomCode}-${recentRoom.token}`} className="recent-room">
            <div>
              <strong>{recentRoom.roomCode}</strong>
              <span>{recentRoom.nickname}</span>
            </div>
            <div className="recent-room__meta">
              <span>
                {t.lastUsed} {formatTimestamp(recentRoom.savedAt, locale)}
              </span>
              <button type="button" className="ghost-button" onClick={() => void resumeRecentRoom(recentRoom)}>
                {t.resume}
              </button>
            </div>
          </article>
        ))}
      </div>
    </article>
  );

  const renderArchiveHistoryRows = (archive: MatchArchive) => {
    if (archive.completedHands.length === 0) {
      return <p className="panel-muted">{t.noCompletedHands}</p>;
    }

    return archive.completedHands
      .slice()
      .reverse()
      .map((hand) => (
        <article key={`${archive.id}-${hand.id}`} className="history-hand">
          <header className="history-hand__header">
            <div>
              <strong>
                {t.hand} {hand.id}
              </strong>
              <span>
                {t.dealer} {archivePlayerNameForSeat(archive, hand.dealer)}
              </span>
            </div>
            <span>
              {hand.contract.tricks}
              {trumpLabel(hand.contract.trump, locale)} {t.by} {archivePlayerNameForSeat(archive, hand.contract.bidder)}
            </span>
          </header>
          <div className="history-hand__row">
            <span>{t.bid}</span>
            <span>{formatSeatNumbers(hand.bets, (seat) => archivePlayerNameForSeat(archive, seat))}</span>
          </div>
          <div className="history-hand__row">
            <span>{t.taken}</span>
            <span>{formatSeatNumbers(hand.taken, (seat) => archivePlayerNameForSeat(archive, seat))}</span>
          </div>
          <div className="history-hand__row">
            <span>{t.score}</span>
            <span>{formatScoreDelta(hand.scoreDelta, (seat) => archivePlayerNameForSeat(archive, seat))}</span>
          </div>
        </article>
      ));
  };

  const renderArchiveLibrary = () => (
    <article className="panel device-panel archive-library">
      <header className="panel-header">
        <div>
          <span className="panel-kicker">{t.savedHistory}</span>
          <h2>{t.savedHistory}</h2>
        </div>
        <button type="button" className="ghost-button" onClick={() => importInputRef.current?.click()}>
          {t.importHistory}
        </button>
      </header>

      {archives.length === 0 ? <p className="panel-muted">{t.noSavedHistory}</p> : null}

      {archives.length > 0 ? (
        <div className="archive-library__grid">
          <div className="archive-list">
            {archives.map((archive) => (
              <button
                key={archive.id}
                type="button"
                className={`archive-button ${archive.id === selectedArchive?.id ? "is-selected" : ""}`}
                onClick={() => setSelectedArchiveId(archive.id)}
              >
                <strong>{archive.roomCode}</strong>
                <span>
                  {archive.completedHands.length} {t.hand}
                </span>
                <span>
                  {t.updated} {formatTimestamp(archive.updatedAt, locale)}
                </span>
              </button>
            ))}
          </div>

          {selectedArchive ? (
            <div className="archive-details">
              <div className="archive-details__header">
                <div>
                  <span className="panel-kicker">
                    {t.room} {selectedArchive.roomCode}
                  </span>
                  <h3>{selectedArchive.roomCode}</h3>
                  <p className="panel-muted">
                    {t.savedBy} {selectedArchive.exportedBy ?? "-"} - {t.updated} {formatTimestamp(selectedArchive.updatedAt, locale)}
                  </p>
                </div>
                <div className="archive-toolbar">
                  <button type="button" className="ghost-button" onClick={() => downloadArchive(selectedArchive)}>
                    {t.exportHistory}
                  </button>
                  <button
                    type="button"
                    className="ghost-button subtle-danger"
                    onClick={() => setArchives((current) => deleteArchive(selectedArchive.id, current))}
                  >
                    {t.deleteSaved}
                  </button>
                </div>
              </div>

              <div className="archive-score-grid">
                {SEATS.map((seat) => (
                  <div key={`${selectedArchive.id}-${seat}`} className="score-chip">
                    <span>{archivePlayerNameForSeat(selectedArchive, seat)}</span>
                    <strong>{selectedArchive.scores[seat]}</strong>
                  </div>
                ))}
              </div>

              <div className="archive-history-list">{renderArchiveHistoryRows(selectedArchive)}</div>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );

  const renderLanding = () => (
    <main className={`shell app-root landing-shell ${isRtl ? "is-rtl" : ""}`} dir={isRtl ? "rtl" : "ltr"}>
      <header className="topbar">
        <div className="brand-mark">WIST</div>
        {renderLanguageToggle()}
      </header>

      <section className="hero-card landing-hero">
        <div className="landing-copy">
          <span className="hero-card__eyebrow">{t.eyebrow}</span>
          <h1>{t.landingTitle}</h1>
          <p>{t.landingBody}</p>
        </div>
        <div className="hero-preview" aria-hidden="true">
          <PlayingCard card={{ code: "AS", rank: 14, suit: "S" }} />
          <PlayingCard card={{ code: "QH", rank: 12, suit: "H" }} />
          <PlayingCard card={{ code: "10D", rank: 10, suit: "D" }} />
        </div>
      </section>

      <section className="entry-grid">
        <article className="panel entry-panel">
          <h2>{t.createRoom}</h2>
          <input
            value={createNickname}
            onChange={(event) => setCreateNickname(event.target.value)}
            placeholder={t.nicknamePlaceholder}
          />
          <button type="button" className="cta-button" onClick={() => void handleCreateRoom()}>
            {t.create}
          </button>
        </article>
        <article className="panel entry-panel">
          <h2>{t.joinRoom}</h2>
          <input
            value={joinRoomCode}
            onChange={(event) => setJoinRoomCode(event.target.value.toUpperCase())}
            placeholder={t.roomCodePlaceholder}
          />
          <input
            value={joinNickname}
            onChange={(event) => setJoinNickname(event.target.value)}
            placeholder={t.nicknamePlaceholder}
          />
          <button type="button" className="cta-button" onClick={() => void handleJoinRoom()}>
            {t.join}
          </button>
          <p className="panel-muted">{t.rejoinHint}</p>
        </article>
      </section>

      <section className="device-grid">
        {renderRecentRooms()}
        {renderArchiveLibrary()}
      </section>

      {error ? <p className="error-banner">{error}</p> : null}
    </main>
  );

  const renderRoomTools = () => (
    <article className="panel sidebar-panel rejoin-panel">
      <header className="sidebar-panel__header">
        <div>
          <span className="panel-kicker">{t.room}</span>
          <h2>{t.copyRejoinLink}</h2>
        </div>
      </header>
      <div className="room-tools__body">
        <div className="room-code-chip">
          <span>{t.roomCode}</span>
          <strong>{snapshot?.roomCode}</strong>
        </div>
        <div className="room-tools__actions">
          <button
            type="button"
            className="cta-button wide-button"
            onClick={() => (snapshot && session ? void copyText(rejoinUrl(snapshot.roomCode, session.token)) : undefined)}
          >
            {t.copyRejoinLink}
          </button>
        </div>
        {snapshot?.controls.canEndMatch ? (
          <div className="room-tools__danger">
            <button type="button" className="ghost-button subtle-danger wide-button" onClick={() => emit("match.end")}>
              {t.endMatch}
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );

  const renderLobby = () => (
    <main className={`shell app-root room-shell ${isRtl ? "is-rtl" : ""}`} dir={isRtl ? "rtl" : "ltr"}>
      <header className="room-header room-header--lobby">
        <div>
          <span className="hero-card__eyebrow">
            {t.room} {snapshot?.roomCode}
          </span>
          <h1>{snapshot?.roomCode}</h1>
          <p className="header-copy">{t.rejoinHint}</p>
        </div>
        <div className="header-stack">
          <span className={`connection-pill ${socketState}`}>{socketStateLabel}</span>
          {renderLanguageToggle()}
        </div>
      </header>

      <section className="lobby-grid lobby-grid--wide">
        <article className="panel players-panel">
          <header className="panel-header">
            <div>
              <span className="panel-kicker">{t.players}</span>
              <h2>{t.players}</h2>
            </div>
          </header>
          <div className="player-list">
            {snapshot?.players.map((player) => (
              <div key={player.id} className="player-row" data-testid={`player-${player.id}`}>
                <div className="player-row__identity">
                  <strong>{player.nickname}</strong>
                  <div className="player-row__labels">
                    <span className="role-pill">{player.isHost ? t.host : t.player}</span>
                    <span className={`presence-pill ${player.connected ? "is-on" : "is-off"}`}>
                      {player.connected ? t.connected : t.away}
                    </span>
                  </div>
                </div>
                <div className="player-row__meta">
                  <span>{player.seat ? seatLabel(player.seat, locale) : t.unseated}</span>
                </div>
                {snapshot?.controls.canAssignSeats ? (
                  <div className="seat-actions">
                    {SEATS.map((seat) => (
                      <button
                        key={seat}
                        type="button"
                        aria-label={`Assign ${player.nickname} to ${seat}`}
                        onClick={() => emit("seat.assign", { sessionId: player.id, seat })}
                      >
                        {seatLabel(seat, locale)}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </article>

        <article className="panel seat-showcase">
          <header className="panel-header">
            <div>
              <span className="panel-kicker">{t.seats}</span>
              <h2>{t.seats}</h2>
            </div>
          </header>
          <div className="seat-showcase__table">
            {SEATS.map((seat) => (
              <div key={seat} className={`seat-showcase__seat seat-${seat.toLowerCase()}`}>
                <span>{seatLabel(seat, locale)}</span>
                <strong>{seatPlayers.get(seat)?.nickname ?? t.openSeat}</strong>
              </div>
            ))}
            <div className="seat-showcase__center">
              <span className="panel-kicker">{t.room}</span>
              <strong>{snapshot?.roomCode}</strong>
            </div>
          </div>
        </article>

        <article className="panel lobby-control-panel">
          <header className="panel-header">
            <div>
              <span className="panel-kicker">{t.roomTools}</span>
              <h2>{t.roomTools}</h2>
            </div>
          </header>
          <div className="room-tools__body">
            <button type="button" className="ghost-button wide-button" onClick={() => void copyText(snapshot?.roomCode ?? "")}>
              {t.copyCode}
            </button>
            <button
              type="button"
              className="ghost-button wide-button"
              onClick={() => (snapshot ? void copyText(roomUrl(snapshot.roomCode)) : undefined)}
            >
              {t.copyInviteLink}
            </button>
            <button
              type="button"
              className="ghost-button wide-button"
              onClick={() => (snapshot && session ? void copyText(rejoinUrl(snapshot.roomCode, session.token)) : undefined)}
            >
              {t.copyRejoinLink}
            </button>
            <p className="panel-muted">{snapshot?.controls.canStartMatch ? t.readyToStart : t.seatPrompt}</p>
            <button
              type="button"
              className="cta-button wide-button"
              data-testid="start-match"
              disabled={!snapshot?.controls.canStartMatch}
              onClick={() => emit("match.start")}
            >
              {t.startMatch}
            </button>
          </div>
        </article>
      </section>
      {error ? <p className="error-banner">{error}</p> : null}
    </main>
  );

  const renderActionPanel = () => {
    if (!snapshot) {
      return null;
    }

    if (!privateView) {
      return (
        <article className="panel sidebar-panel action-panel">
          <header className="sidebar-panel__header">
            <div>
              <span className="panel-kicker">{t.actions}</span>
              <h2>{t.tableView}</h2>
            </div>
          </header>
          <p className="panel-muted">{t.publicTableOnly}</p>
        </article>
      );
    }

    const legal = privateView.legalActions;
    const auctionBids = legal.auction?.bids ?? [];
    const auctionTrumps = Array.from(new Set(auctionBids.map((bid) => bid.trump))).sort(
      (left, right) => TRUMP_ORDER[left] - TRUMP_ORDER[right]
    );
    const effectiveAuctionTrump =
      selectedAuctionTrump && auctionTrumps.includes(selectedAuctionTrump)
        ? selectedAuctionTrump
        : auctionTrumps[0] ?? null;
    const auctionNumbers = effectiveAuctionTrump
      ? Array.from(
          new Set(auctionBids.filter((bid) => bid.trump === effectiveAuctionTrump).map((bid) => bid.tricks))
        ).sort((left, right) => left - right)
      : [];
    const effectiveAuctionTricks =
      selectedAuctionTricks && auctionNumbers.includes(selectedAuctionTricks)
        ? selectedAuctionTricks
        : auctionNumbers[0] ?? null;
    const selectedAuctionBid =
      effectiveAuctionTrump && effectiveAuctionTricks
        ? auctionBids.find((bid) => bid.trump === effectiveAuctionTrump && bid.tricks === effectiveAuctionTricks) ?? null
        : null;
    const auctionSuitLabel = locale === "he" ? "סדרה" : "Suit";
    const auctionNumberLabel = locale === "he" ? "מספר" : "Number";
    const submitBidLabel = locale === "he" ? "שלח הצעה" : "Submit Bid";

    return (
      <article className="panel sidebar-panel action-panel">
        <header className="sidebar-panel__header">
          <div>
            <span className="panel-kicker">{t.actions}</span>
            <h2>{t.actions}</h2>
          </div>
          <span className="phase-pill">{statusText}</span>
        </header>

        {legal.canUndo ? (
          <button type="button" className="ghost-button wide-button" onClick={() => emit("undo.request")}>
            {t.undoLatestAction}
          </button>
        ) : null}

        {legal.passSelection ? (
          <div className="action-block">
            <h3>{t.passLeft}</h3>
            <p className="panel-muted">
              {t.passLeftHint} {selectedPassCards.length}/3
            </p>
            <button
              type="button"
              className="cta-button wide-button"
              disabled={selectedPassCards.length !== 3}
              onClick={() => emit("pass.submit", { cardCodes: selectedPassCards })}
            >
              {t.submitThreeCards}
            </button>
          </div>
        ) : null}

        {legal.auction ? (
          <div className="action-block">
            <h3>{t.auction}</h3>
            <button type="button" className="ghost-button wide-button" onClick={() => emit("auction.action", { kind: "pass" })}>
              {t.pass}
            </button>
            <div className="auction-picker">
              <span className="auction-picker__label">{auctionSuitLabel}</span>
              <div className="chip-grid chip-grid--compact">
                {auctionTrumps.map((trump) => (
                  <button
                    key={trump}
                    type="button"
                    data-testid={`auction-trump-${trump}`}
                    className={`chip-button${effectiveAuctionTrump === trump ? " is-selected" : ""}`}
                    aria-pressed={effectiveAuctionTrump === trump}
                    onClick={() => setSelectedAuctionTrump(trump)}
                  >
                    {formatTrump(trump, locale)}
                  </button>
                ))}
              </div>
              <span className="auction-picker__label">{auctionNumberLabel}</span>
              <div className="chip-grid chip-grid--compact">
                {auctionNumbers.map((tricks) => (
                  <button
                    key={tricks}
                    type="button"
                    data-testid={`auction-tricks-${tricks}`}
                    className={`chip-button${effectiveAuctionTricks === tricks ? " is-selected" : ""}`}
                    aria-pressed={effectiveAuctionTricks === tricks}
                    onClick={() => setSelectedAuctionTricks(tricks)}
                  >
                    {tricks}
                  </button>
                ))}
              </div>
              <button
                type="button"
                data-testid="auction-submit"
                className="cta-button wide-button"
                disabled={!selectedAuctionBid}
                onClick={() => selectedAuctionBid && emit("auction.action", { kind: "bid", bid: selectedAuctionBid })}
              >
                {submitBidLabel}
                {selectedAuctionBid ? `: ${formatBidChip(selectedAuctionBid, locale)}` : ""}
              </button>
            </div>
          </div>
        ) : null}

        {legal.betting ? (
          <div className="action-block">
            <h3>{t.exactTrickBet}</h3>
            <p className="panel-muted">
              {t.minimum} {legal.betting.min}
            </p>
            <div className="chip-grid">
              {legal.betting.values.map((value) => (
                <button
                  key={value}
                  type="button"
                  className="chip-button"
                  aria-label={`Bet ${value}`}
                  onClick={() => emit("bet.submit", { value })}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {legal.playing ? (
          <div className="action-block">
            <h3>{t.playCard}</h3>
            <p className="panel-muted">{t.playableHint}</p>
          </div>
        ) : null}

        {snapshot.controls.canStartNextHand ? <p className="panel-muted">{t.dealNextHand}</p> : null}
      </article>
    );
  };

  const renderSeat = (seat: Seat) => {
    const player = seatPlayers.get(seat);
    const bet = currentHand?.bets[seat];
    const taken = currentHand?.taken[seat] ?? 0;
    const isTurn = currentTurn === seat;

    return (
      <article key={seat} className={`seat-panel seat-panel--table seat-${seat.toLowerCase()} ${isTurn ? "is-active" : ""}`}>
        <div className="seat-panel__header">
          <span
            className={`seat-status ${player?.connected ? "is-on" : "is-off"}`}
            aria-label={player?.connected ? t.connected : t.away}
            title={player?.connected ? t.connected : t.away}
          >
            <i aria-hidden="true" />
          </span>
          <strong>{player?.nickname ?? fallbackPlayerName(seat)}</strong>
        </div>
        <div className="seat-panel__meta">
          <span className="seat-stat">
            <small>{t.bid}</small>
            <strong>{bet ?? "-"}</strong>
          </span>
          <span className="seat-stat">
            <small>{t.taken}</small>
            <strong>{taken}</strong>
          </span>
        </div>
      </article>
    );
  };

  const renderAuctionBoard = () => {
    if (!currentHand || currentHand.phase !== "auction") {
      return null;
    }

    const latestActionBySeat = new Map<Seat, (typeof currentHand.auctionLog)[number]>();

    currentHand.auctionLog.forEach((entry) => {
      latestActionBySeat.set(entry.seat, entry);
    });

    const recentActions = currentHand.auctionLog.slice(-8);
    const highestText =
      currentHand.highestBid && currentHand.highestBidder
        ? `${formatBidChip(currentHand.highestBid, locale)} ${t.by} ${playerNameForSeat(currentHand.highestBidder)}`
        : locale === "he"
          ? "אין הצעה עדיין"
          : "No bid yet";
    const turnText = currentTurn
      ? `${locale === "he" ? "עכשיו" : "Now"}: ${playerNameForSeat(currentTurn)}`
      : t.waiting;
    const latestLabel = locale === "he" ? "פעולה אחרונה" : "Last action";
    const highestLabel = locale === "he" ? "ההצעה המובילה" : "Current highest";
    const actionText = (seat: Seat): string => {
      const action = latestActionBySeat.get(seat);

      if (!action) {
        return locale === "he" ? "עוד לא פעל" : "Not yet";
      }

      return action.kind === "bid" && action.bid ? formatBidChip(action.bid, locale) : t.pass;
    };

    return (
      <section className="auction-board" aria-label={t.auction}>
        <div className="auction-board__hero">
          <span>{highestLabel}</span>
          <strong>{highestText}</strong>
          <em>{turnText}</em>
        </div>

        <div className="auction-board__seats">
          {SEATS.map((seat) => {
            const isHighest = currentHand.highestBidder === seat;
            const isTurn = currentTurn === seat;
            return (
              <div
                key={`auction-${seat}`}
                className={`auction-seat${isHighest ? " is-highest" : ""}${isTurn ? " is-turn" : ""}`}
              >
                <span>{isTurn ? t.turn : t.player}</span>
                <strong>{playerNameForSeat(seat)}</strong>
                <b>{actionText(seat)}</b>
              </div>
            );
          })}
        </div>

        <div className="auction-board__log">
          <span>{latestLabel}</span>
          {recentActions.length === 0 ? (
            <strong>{locale === "he" ? "המכרז עוד לא התחיל" : "Auction has not started"}</strong>
          ) : (
            <div>
              {recentActions.map((entry) => (
                <strong key={entry.eventId}>
                  {playerNameForSeat(entry.seat)}{" "}
                  {entry.kind === "bid" && entry.bid ? formatBidChip(entry.bid, locale) : t.pass}
                </strong>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  };

  const renderTrickCards = (plays: Trick["plays"]) =>
    plays.map((play) => (
      <div key={`${play.seat}-${play.card.code}`} className={`trick-card trick-card--${play.seat.toLowerCase()}`}>
        <span>{playerNameForSeat(play.seat)}</span>
        <PlayingCard card={play.card} />
      </div>
    ));

  const renderLastTrickTray = () => {
    if (!lastCompletedTrick) {
      return null;
    }

    const lastTrickLabel = locale === "he" ? "הלקיחה האחרונה" : "Last trick";
    const wonByLabel = locale === "he" ? "זכה" : "won by";

    return (
      <aside className="last-trick-tray" aria-label={lastTrickLabel}>
        <div>
          <span>{lastTrickLabel}</span>
          <strong>
            {wonByLabel} {playerNameForSeat(lastCompletedTrick.winner)}
          </strong>
        </div>
        <div className="last-trick-tray__cards">
          {lastCompletedTrick.plays.map((play) => (
            <div key={`last-${play.seat}-${play.card.code}`} className="last-trick-card">
              <span>{playerNameForSeat(play.seat)}</span>
              <PlayingCard card={play.card} />
            </div>
          ))}
        </div>
      </aside>
    );
  };

  const renderTrumpBanner = () => {
    if (!currentHand?.contract) {
      return null;
    }

    const trumpText = locale === "he" ? "שליט" : "Trump";

    return (
      <div className="trump-banner">
        <span>{trumpText}</span>
        <strong>{formatTrump(currentHand.contract.trump, locale)}</strong>
        <em>
          {currentHand.contract.tricks} {t.by} {playerNameForSeat(currentHand.contract.bidder)}
        </em>
      </div>
    );
  };

  const renderScorePanel = () => {
    const hands = publicMatch?.completedHands ?? [];
    const totalLabel = locale === "he" ? "סה״כ" : "Total";
    const scoreTableLabel = locale === "he" ? "טבלת ניקוד" : "Score Table";
    const signed = (value: number): string => (value > 0 ? `+${value}` : String(value));

    return (
      <article className="panel sidebar-panel score-table-panel">
        <header className="sidebar-panel__header">
          <div>
            <span className="panel-kicker">{t.score}</span>
            <h2>{scoreTableLabel}</h2>
          </div>
        </header>
        <div className="score-table" role="table" aria-label={scoreTableLabel}>
          <div className="score-table__row score-table__row--head" role="row">
            <span role="columnheader">{t.hand}</span>
            {SEATS.map((seat) => (
              <span key={`score-head-${seat}`} role="columnheader">
                {playerNameForSeat(seat)}
              </span>
            ))}
          </div>
          <div className="score-table__row score-table__row--total" role="row">
            <strong role="cell">{totalLabel}</strong>
            {SEATS.map((seat) => (
              <strong key={`score-total-${seat}`} role="cell">
                {publicMatch?.scores[seat] ?? 0}
              </strong>
            ))}
          </div>
          {hands.length === 0 ? <p className="panel-muted">{t.noCompletedHands}</p> : null}
          {hands
            .slice()
            .reverse()
            .map((hand) => (
              <div key={`score-hand-${hand.id}`} className="score-table__row" role="row">
                <span role="cell">
                  {t.hand} {hand.id}
                </span>
                {SEATS.map((seat) => (
                  <span key={`score-hand-${hand.id}-${seat}`} role="cell">
                    {signed(hand.scoreDelta[seat])}
                  </span>
                ))}
              </div>
            ))}
        </div>
      </article>
    );
  };

  const renderHand = () => {
    if (!privateView) {
      return null;
    }

    const legalCardCodes = new Set(privateView.legalActions.playing?.cardCodes ?? []);
    const canPass = Boolean(privateView.legalActions.passSelection);
    const sortedHand = sortCards(privateView.hand);

    return (
      <section className="panel hand-panel">
        <header className="hand-panel__header">
          <div>
            <span className="hero-card__eyebrow">{t.yourSeat}</span>
            <h2>{snapshot?.me.nickname ?? playerNameForSeat(privateView.viewerSeat)}</h2>
          </div>
          <div className="hand-panel__meta">
            {snapshot?.me.isHost ? <span className="badge">{t.hostBadge}</span> : null}
            {canPass ? <span className="badge">{selectedPassCards.length}/3</span> : null}
          </div>
        </header>

        <div className="hand-fan">
          {sortedHand.map((card) => {
            const selected = selectedPassCards.includes(card.code);
            const playable = legalCardCodes.has(card.code);
            const disabled = canPass ? false : legalCardCodes.size > 0 ? !playable : true;

            return (
              <PlayingCard
                key={card.code}
                card={card}
                selected={selected}
                playable={playable}
                disabled={disabled}
                onClick={() => {
                  if (canPass) {
                    setSelectedPassCards((current) => {
                      if (current.includes(card.code)) {
                        return current.filter((code) => code !== card.code);
                      }

                      if (current.length >= 3) {
                        return current;
                      }

                      return [...current, card.code];
                    });
                    return;
                  }

                  if (playable) {
                    emit("play.card", { cardCode: card.code });
                  }
                }}
              />
            );
          })}
        </div>
      </section>
    );
  };

  const renderGame = () => {
    const activeTrickPlays = currentHand?.currentTrick?.plays ?? [];
    const visibleTrickPlays = activeTrickPlays.length > 0 ? activeTrickPlays : heldCompletedTrick?.plays ?? [];

    return (
      <main className={`shell app-root table-shell ${isRtl ? "is-rtl" : ""}`} dir={isRtl ? "rtl" : "ltr"}>
      <header className="room-header room-header--table">
        <div>
          <span className="hero-card__eyebrow">WIST</span>
          <h1>{t.tableInMotion}</h1>
        </div>
        <div className="header-stack">
          {currentHand?.contract ? (
            <span className="contract-pill">
              {t.contract} {currentHand.contract.tricks}
              {formatTrump(currentHand.contract.trump, locale)} {t.by} {playerNameForSeat(currentHand.contract.bidder)}
            </span>
          ) : currentHand?.highestBid ? (
            <span className="contract-pill">
              {t.highBid} {currentHand.highestBid.tricks}
              {formatTrump(currentHand.highestBid.trump, locale)} {t.by} {playerNameForSeat(currentHand.highestBidder!)}
            </span>
          ) : (
            <span className="contract-pill">{t.auctionOpening}</span>
          )}
        </div>
      </header>

      <section className="table-layout">
        <div className="table-main">
          <section className="table-stage">
            {SEATS.map((seat) => renderSeat(seat))}

            <div className="table-center">
              <div className="table-center__status">
                <span>
                  {t.dealer} {playerNameForSeat(publicMatch?.dealer ?? "N")}
                </span>
                <span>{statusText}</span>
                {currentTurn ? (
                  <span>
                    {t.turn} {playerNameForSeat(currentTurn)}
                  </span>
                ) : null}
              </div>
              {renderTrumpBanner()}

              {currentHand?.phase === "auction" ? (
                renderAuctionBoard()
              ) : (
                <>
                  <div className={`trick-cluster ${heldCompletedTrick && activeTrickPlays.length === 0 ? "is-holding-trick" : ""}`}>
                    {renderTrickCards(visibleTrickPlays)}
                    {heldCompletedTrick && activeTrickPlays.length === 0 ? (
                      <span className="trick-cluster__winner">
                        {locale === "he" ? "לקיחה ל" : "Trick to"} {playerNameForSeat(heldCompletedTrick.winner)}
                      </span>
                    ) : null}
                    {visibleTrickPlays.length === 0 ? <p>{t.currentTrickEmpty}</p> : null}
                  </div>
                  {renderLastTrickTray()}
                </>
              )}
            </div>
          </section>

          {renderHand()}
        </div>

        <aside className="table-sidebar">
          {renderActionPanel()}
          {renderRoomTools()}
          {renderScorePanel()}
        </aside>
      </section>
      {error ? <p className="error-banner">{error}</p> : null}
    </main>
    );
  };

  return (
    <>
      <input ref={importInputRef} type="file" accept=".json,application/json" className="file-input" onChange={(event) => void handleImportFile(event)} />
      {!snapshot ? renderLanding() : snapshot.roomStatus === "lobby" ? renderLobby() : renderGame()}
    </>
  );
}
