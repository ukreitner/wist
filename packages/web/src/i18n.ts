import type { HandPhase, Seat, Trump } from "@wist/core";

export type Locale = "en" | "he";

export const LOCALE_STORAGE_KEY = "wist.locale";

type MessageSet = {
  languageName: string;
  toggleLabel: string;
  eyebrow: string;
  landingTitle: string;
  landingBody: string;
  createRoom: string;
  joinRoom: string;
  nicknamePlaceholder: string;
  roomCodePlaceholder: string;
  create: string;
  join: string;
  room: string;
  roomTools: string;
  roomCode: string;
  copyCode: string;
  copyInviteLink: string;
  copyRejoinLink: string;
  players: string;
  host: string;
  player: string;
  connected: string;
  away: string;
  unseated: string;
  seats: string;
  openSeat: string;
  readyToStart: string;
  seatPrompt: string;
  startMatch: string;
  tableInMotion: string;
  auctionOpening: string;
  contract: string;
  highBid: string;
  by: string;
  turn: string;
  dealer: string;
  actions: string;
  tableView: string;
  publicTableOnly: string;
  phase: string;
  waiting: string;
  handComplete: string;
  undoLatestAction: string;
  passLeft: string;
  passLeftHint: string;
  submitThreeCards: string;
  auction: string;
  pass: string;
  exactTrickBet: string;
  minimum: string;
  playCard: string;
  playableHint: string;
  dealNextHand: string;
  yourSeat: string;
  score: string;
  bid: string;
  taken: string;
  currentTrickEmpty: string;
  history: string;
  noCompletedHands: string;
  hideHistory: string;
  showHistory: string;
  hand: string;
  passes: string;
  cycles: string;
  reshuffles: string;
  connection: string;
  hostBadge: string;
  roomManagement: string;
  endMatch: string;
  endMatchHint: string;
  rejoinHint: string;
  onThisDevice: string;
  recentRooms: string;
  noRecentRooms: string;
  resume: string;
  savedHistory: string;
  noSavedHistory: string;
  importHistory: string;
  exportHistory: string;
  saveToDevice: string;
  deleteSaved: string;
  lastUsed: string;
  updated: string;
  finalScores: string;
  savedBy: string;
};

export const MESSAGES: Record<Locale, MessageSet> = {
  en: {
    languageName: "English",
    toggleLabel: "עברית",
    eyebrow: "Realtime Four-Player Table",
    landingTitle: "Wist that actually feels like a card table.",
    landingBody: "Create a private room, seat the table, and play with reconnect, undo, hand history, and exact-trick scoring.",
    createRoom: "Create Room",
    joinRoom: "Join Room",
    nicknamePlaceholder: "Your nickname",
    roomCodePlaceholder: "Room code",
    create: "Create",
    join: "Join",
    room: "Room",
    roomTools: "Room Tools",
    roomCode: "Room code",
    copyCode: "Copy Code",
    copyInviteLink: "Copy Invite Link",
    copyRejoinLink: "Copy Rejoin Link",
    players: "Players",
    host: "Host",
    player: "Player",
    connected: "Connected",
    away: "Away",
    unseated: "Unseated",
    seats: "Seats",
    openSeat: "Open seat",
    readyToStart: "All four seats are filled.",
    seatPrompt: "Seat all four players to begin.",
    startMatch: "Start Match",
    tableInMotion: "Table In Motion",
    auctionOpening: "Auction opening",
    contract: "Contract",
    highBid: "High bid",
    by: "by",
    turn: "Turn",
    dealer: "Dealer",
    actions: "Actions",
    tableView: "Table View",
    publicTableOnly: "You are watching the public table state.",
    phase: "Phase",
    waiting: "Waiting",
    handComplete: "Hand complete",
    undoLatestAction: "Undo Latest Action",
    passLeft: "Pass Left",
    passLeftHint: "Select exactly three cards to pass left.",
    submitThreeCards: "Submit 3 Cards",
    auction: "Auction",
    pass: "Pass",
    exactTrickBet: "Exact-Trick Bet",
    minimum: "Minimum",
    playCard: "Play a Card",
    playableHint: "Playable cards are outlined in your hand below.",
    dealNextHand: "Next hand starts automatically.",
    yourSeat: "Your Seat",
    score: "Score",
    bid: "Bid",
    taken: "Taken",
    currentTrickEmpty: "Lead the next card to the center.",
    history: "Hand History",
    noCompletedHands: "No completed hands yet.",
    hideHistory: "Hide History",
    showHistory: "Show History",
    hand: "Hand",
    passes: "Passes",
    cycles: "cycle(s)",
    reshuffles: "reshuffle(s)",
    connection: "Connection",
    hostBadge: "Host",
    roomManagement: "Room Management",
    endMatch: "End Match",
    endMatchHint: "Only use this when the table is actually done.",
    rejoinHint: "If you disconnect, rejoin with the same nickname or use the saved rejoin link.",
    onThisDevice: "On This Device",
    recentRooms: "Recent Rooms",
    noRecentRooms: "No saved rooms yet.",
    resume: "Resume",
    savedHistory: "Saved History",
    noSavedHistory: "No saved histories yet.",
    importHistory: "Import History",
    exportHistory: "Export History",
    saveToDevice: "Save To Device",
    deleteSaved: "Delete Saved",
    lastUsed: "Last used",
    updated: "Updated",
    finalScores: "Final Scores",
    savedBy: "Saved by"
  },
  he: {
    languageName: "עברית",
    toggleLabel: "English",
    eyebrow: "שולחן אונליין לארבעה שחקנים",
    landingTitle: "וויסט שמרגיש כמו שולחן קלפים אמיתי.",
    landingBody: "פתחו חדר פרטי, שבו סביב השולחן, ושחקו עם חיבור מחדש, ביטול פעולה, היסטוריה וניקוד מדויק.",
    createRoom: "יצירת חדר",
    joinRoom: "הצטרפות לחדר",
    nicknamePlaceholder: "שם משתמש",
    roomCodePlaceholder: "קוד חדר",
    create: "צור",
    join: "הצטרף",
    room: "חדר",
    roomTools: "כלי חדר",
    roomCode: "קוד חדר",
    copyCode: "העתק קוד",
    copyInviteLink: "העתק קישור הזמנה",
    copyRejoinLink: "העתק קישור חזרה",
    players: "שחקנים",
    host: "מארח",
    player: "שחקן",
    connected: "מחובר",
    away: "מנותק",
    unseated: "ללא מושב",
    seats: "מושבים",
    openSeat: "מושב פנוי",
    readyToStart: "כל ארבעת המושבים מלאים.",
    seatPrompt: "שבצו ארבעה שחקנים כדי להתחיל.",
    startMatch: "התחל משחק",
    tableInMotion: "המשחק בעיצומו",
    auctionOpening: "פתיחת מכרז",
    contract: "חוזה",
    highBid: "הצעה מובילה",
    by: "של",
    turn: "תור",
    dealer: "מחלק",
    actions: "פעולות",
    tableView: "מבט שולחן",
    publicTableOnly: "אתה צופה במצב הציבורי של השולחן.",
    phase: "שלב",
    waiting: "ממתין",
    handComplete: "היד הסתיימה",
    undoLatestAction: "בטל פעולה אחרונה",
    passLeft: "העבר שמאלה",
    passLeftHint: "בחר בדיוק שלושה קלפים להעברה שמאלה.",
    submitThreeCards: "שלח 3 קלפים",
    auction: "מכרז",
    pass: "פאס",
    exactTrickBet: "הימור מדויק",
    minimum: "מינימום",
    playCard: "שחק קלף",
    playableHint: "הקלפים המותרים מודגשים ביד שלך.",
    dealNextHand: "היד הבאה תתחיל אוטומטית.",
    yourSeat: "המושב שלך",
    score: "ניקוד",
    bid: "הימור",
    taken: "לקח",
    currentTrickEmpty: "הוביל את הקלף הבא למרכז.",
    history: "היסטוריית ידיים",
    noCompletedHands: "עדיין אין ידיים שהסתיימו.",
    hideHistory: "הסתר היסטוריה",
    showHistory: "הצג היסטוריה",
    hand: "יד",
    passes: "העברות",
    cycles: "סבב(ים)",
    reshuffles: "ערבוב(ים) מחדש",
    connection: "חיבור",
    hostBadge: "מארח",
    roomManagement: "ניהול חדר",
    endMatch: "סיים משחק",
    endMatchHint: "להשתמש בזה רק כשכולם סיימו באמת.",
    rejoinHint: "אם התנתקת, אפשר לחזור עם אותו שם משתמש או עם קישור החזרה.",
    onThisDevice: "על המכשיר הזה",
    recentRooms: "חדרים אחרונים",
    noRecentRooms: "עדיין אין חדרים שמורים.",
    resume: "חזור",
    savedHistory: "היסטוריה שמורה",
    noSavedHistory: "עדיין אין היסטוריות שמורות.",
    importHistory: "ייבא היסטוריה",
    exportHistory: "ייצא היסטוריה",
    saveToDevice: "שמור במכשיר",
    deleteSaved: "מחק שמור",
    lastUsed: "שימוש אחרון",
    updated: "עודכן",
    finalScores: "ניקוד סופי",
    savedBy: "נשמר על ידי"
  }
};

export const seatLabel = (seat: Seat, locale: Locale): string =>
  locale === "he"
    ? {
        N: "צפון",
        E: "מזרח",
        S: "דרום",
        W: "מערב"
      }[seat]
    : {
        N: "North",
        E: "East",
        S: "South",
        W: "West"
      }[seat];

export const phaseLabel = (phase: HandPhase, locale: Locale): string =>
  locale === "he"
    ? {
        auction: "מכרז",
        passing: "העברה",
        betting: "הימור",
        playing: "משחק"
      }[phase]
    : phase;

export const trumpLabel = (trump: Trump, locale: Locale): string => {
  const symbols = {
    C: "♣",
    D: "♦",
    H: "♥",
    S: "♠",
    NT: locale === "he" ? "ללא שליט" : "NT"
  };

  return symbols[trump];
};
