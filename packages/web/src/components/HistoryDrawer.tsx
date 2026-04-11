import type { HandSummary, Seat } from "@wist/core";

interface HistoryDrawerProps {
  open: boolean;
  hands: HandSummary[];
  onToggle: () => void;
}

const SEATS: Seat[] = ["N", "E", "S", "W"];
const playerName = (seat: Seat): string => `Player ${SEATS.indexOf(seat) + 1}`;
const seatStats = (values: Record<Seat, number>): string =>
  SEATS.map((seat) => `${playerName(seat)} ${values[seat]}`).join(" / ");
const scoreDelta = (values: Record<Seat, number>): string =>
  SEATS.map((seat) => `${playerName(seat)} ${values[seat] >= 0 ? `+${values[seat]}` : values[seat]}`).join(" / ");

export default function HistoryDrawer({ open, hands, onToggle }: HistoryDrawerProps) {
  return (
    <aside className={`history-drawer ${open ? "is-open" : ""}`}>
      <button type="button" className="history-drawer__toggle" onClick={onToggle}>
        {open ? "Hide History" : "Show History"}
      </button>
      <div className="history-drawer__body">
        <h2>Hand History</h2>
        {hands.length === 0 ? <p>No completed hands yet.</p> : null}
        {hands
          .slice()
          .reverse()
          .map((hand) => (
            <article key={hand.id} className="history-hand">
              <header className="history-hand__header">
                <div>
                  <strong>Hand {hand.id}</strong>
                  <span>Dealer {playerName(hand.dealer)}</span>
                </div>
                <span>
                  {hand.contract.tricks}
                  {hand.contract.trump} by {playerName(hand.contract.bidder)}
                </span>
              </header>
              <div className="history-hand__row">
                <span>Bets</span>
                <span>{seatStats(hand.bets)}</span>
              </div>
              <div className="history-hand__row">
                <span>Taken</span>
                <span>{seatStats(hand.taken)}</span>
              </div>
              <div className="history-hand__row">
                <span>Score</span>
                <span>{scoreDelta(hand.scoreDelta)}</span>
              </div>
              <div className="history-hand__row">
                <span>Passes</span>
                <span>
                  {hand.allPassCycles} left-pass cycle(s), {hand.reshuffles} reshuffle(s)
                </span>
              </div>
            </article>
          ))}
      </div>
    </aside>
  );
}
