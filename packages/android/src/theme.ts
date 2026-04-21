export const T = {
  bgStart: '#0e2019',
  bgMid: '#173328',
  bgEnd: '#224c3a',
  felt: '#20553e',
  feltDark: '#163b2c',
  panel: 'rgba(248,239,223,0.96)',
  panelBorder: 'rgba(111,80,42,0.18)',
  ink: '#1a2228',
  muted: '#62707a',
  gold: '#d5a652',
  goldSoft: '#f0d59b',
  goldDeep: '#8e6120',
  wine: '#8e3e38',
  success: '#255d42',
  serif: 'Georgia',
  sans: 'System',
} as const;

export const SUIT_COLOR = { C: '#207344', D: '#2563a8', H: '#b4312d', S: '#152130' } as const;
export const SUIT_SYM   = { C: '♣', D: '♦', H: '♥', S: '♠' } as const;
export const rankLabel  = (r: number) => ({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A' }[r] ?? String(r));
