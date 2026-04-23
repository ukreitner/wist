const trimSlash = (value: string): string => value.replace(/\/+$/, "");

export const buildRoomUrl = (publicAppUrl: string, roomCode: string): string =>
  `${trimSlash(publicAppUrl)}?room=${encodeURIComponent(roomCode.toUpperCase())}`;

export const buildRejoinUrl = (publicAppUrl: string, roomCode: string, token: string): string =>
  `${trimSlash(publicAppUrl)}?room=${encodeURIComponent(roomCode.toUpperCase())}&token=${encodeURIComponent(token)}`;
