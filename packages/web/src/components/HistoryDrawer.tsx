import type { HandSummary } from "@wist/core";

interface HistoryDrawerProps {
  open: boolean;
  hands: HandSummary[];
  onToggle: () => void;
}

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
                  <span>Dealer {hand.dealer}</span>
                </div>
                <span>
                  {hand.contract.tricks}
                  {hand.contract.trump} by {hand.contract.bidder}
                </span>
              </header>
              <div className="history-hand__row">
                <span>Bets</span>
                <span>
                  N {hand.bets.N} / E {hand.bets.E} / S {hand.bets.S} / W {hand.bets.W}
                </span>
              </div>
              <div className="history-hand__row">
                <span>Taken</span>
                <span>
                  N {hand.taken.N} / E {hand.taken.E} / S {hand.taken.S} / W {hand.taken.W}
                </span>
              </div>
              <div className="history-hand__row">
                <span>Score</span>
                <span>
                  N {hand.scoreDelta.N >= 0 ? `+${hand.scoreDelta.N}` : hand.scoreDelta.N} / E{" "}
                  {hand.scoreDelta.E >= 0 ? `+${hand.scoreDelta.E}` : hand.scoreDelta.E} / S{" "}
                  {hand.scoreDelta.S >= 0 ? `+${hand.scoreDelta.S}` : hand.scoreDelta.S} / W{" "}
                  {hand.scoreDelta.W >= 0 ? `+${hand.scoreDelta.W}` : hand.scoreDelta.W}
                </span>
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
