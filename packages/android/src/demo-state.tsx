import { createContext, useContext, useState, type ReactNode } from 'react';

export type Seat = 'N' | 'E' | 'S' | 'W';

export type DemoPlayer = {
  name: string;
  seat: Seat;
  connected: boolean;
  isHost?: boolean;
};

type RecentRoom = {
  code: string;
  nick: string;
  time: string;
};

type DemoStateValue = {
  roomCode: string;
  selfName: string;
  selfSeat: Seat;
  players: DemoPlayer[];
  recentRooms: RecentRoom[];
  createRoom: (nickname: string) => void;
  joinRoom: (roomCode: string, nickname: string) => void;
  resumeRoom: (roomCode: string, nickname: string) => void;
  playerForSeat: (seat: Seat) => DemoPlayer;
  leftOfSelf: DemoPlayer;
  contractText: string;
  highestBidText: string;
};

const seatOrder: Seat[] = ['N', 'E', 'S', 'W'];

const ROOM_POOL = ['KZPQ', 'MRWV', 'TSLA', 'BJRN', 'QHTM'];

const fallbackPlayers = (selfName: string, roomCode: string): DemoPlayer[] => [
  { name: roomCode === 'KZPQ' ? 'Avi' : 'Rina', seat: 'N', connected: true, isHost: true },
  { name: roomCode === 'KZPQ' ? 'Gila' : 'Maya', seat: 'E', connected: true },
  { name: roomCode === 'KZPQ' ? 'Yossi' : 'Noam', seat: 'S', connected: roomCode === 'KZPQ' ? false : true },
  { name: selfName, seat: 'W', connected: true }
];

const defaultRecentRooms: RecentRoom[] = [
  { code: 'KZPQ', nick: 'Dani', time: 'Today, 14:32' },
  { code: 'MRWV', nick: 'Dani', time: 'Yesterday, 21:10' }
];

const DemoStateContext = createContext<DemoStateValue | null>(null);

const nextRoomCode = (taken: string[]): string => ROOM_POOL.find((code) => !taken.includes(code)) ?? `W${Date.now().toString().slice(-3)}`;

const upsertRecent = (items: RecentRoom[], entry: RecentRoom): RecentRoom[] => {
  const withoutMatch = items.filter((item) => !(item.code === entry.code && item.nick === entry.nick));
  return [entry, ...withoutMatch].slice(0, 4);
};

export function DemoStateProvider({ children }: { children: ReactNode }) {
  const [roomCode, setRoomCode] = useState('KZPQ');
  const [selfName, setSelfName] = useState('Dani');
  const [players, setPlayers] = useState<DemoPlayer[]>(() => fallbackPlayers('Dani', 'KZPQ'));
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>(defaultRecentRooms);

  const selfSeat: Seat = 'W';

  const syncSession = (nextRoomCodeValue: string, nextName: string, options?: { isHost?: boolean }) => {
    const trimmedName = nextName.trim() || 'Player';
    const normalizedRoomCode = nextRoomCodeValue.trim().toUpperCase() || nextRoomCode(recentRooms.map((room) => room.code));
    const basePlayers = fallbackPlayers(trimmedName, normalizedRoomCode).map((player) =>
      player.seat === selfSeat ? { ...player, name: trimmedName, connected: true, isHost: options?.isHost ?? false } : player
    );

    if (options?.isHost) {
      basePlayers[0] = { ...basePlayers[0], isHost: false };
      basePlayers[3] = { ...basePlayers[3], isHost: true };
    }

    setRoomCode(normalizedRoomCode);
    setSelfName(trimmedName);
    setPlayers(basePlayers);
    setRecentRooms((current) =>
      upsertRecent(current, {
        code: normalizedRoomCode,
        nick: trimmedName,
        time: 'Just now'
      })
    );
  };

  const playerForSeat = (seat: Seat): DemoPlayer => players.find((player) => player.seat === seat) ?? { name: 'Open seat', seat, connected: false };
  const leftOfSelf = playerForSeat('S');
  const hostPlayer = players.find((player) => player.isHost) ?? playerForSeat('N');
  const contractText = `6♥ by ${hostPlayer.name}`;
  const highestBidText = `5♥ by ${hostPlayer.name}`;

  return (
    <DemoStateContext.Provider
      value={{
        roomCode,
        selfName,
        selfSeat,
        players,
        recentRooms,
        createRoom: (nickname) => syncSession(nextRoomCode(recentRooms.map((room) => room.code)), nickname, { isHost: true }),
        joinRoom: (nextCode, nickname) => syncSession(nextCode, nickname, { isHost: false }),
        resumeRoom: (nextCode, nickname) => syncSession(nextCode, nickname, { isHost: false }),
        playerForSeat,
        leftOfSelf,
        contractText,
        highestBidText
      }}
    >
      {children}
    </DemoStateContext.Provider>
  );
}

export function useDemoState(): DemoStateValue {
  const value = useContext(DemoStateContext);

  if (!value) {
    throw new Error('useDemoState must be used inside DemoStateProvider.');
  }

  return value;
}
