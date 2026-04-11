import type { HandSummary, Seat } from "@wist/core";
import type { Locale } from "../i18n.js";
import { MESSAGES, trumpLabel } from "../i18n.js";

interface HistoryPanelProps {
  locale: Locale;
  open: boolean;
  hands: HandSummary[];
  playerNameForSeat: (seat: Seat) => string;
  onToggle: () => void;
}

const SEATS: Seat[] = ["N", "E", "S", "W"];

export default function HistoryPanel({ locale, open, hands, playerNameForSeat, onToggle }: HistoryPanelProps) {
  const t = MESSAGES[locale];
  const seatStats = (values: Record<Seat, number>) =>
    SEATS.map((seat) => `${playerNameForSeat(seat)} ${values[seat]}`).join(" / ");
  const scoreDelta = (values: Record<Seat, number>) =>
    SEATS.map((seat) => `${playerNameForSeat(seat)} ${values[seat] >= 0 ? `+${values[seat]}` : values[seat]}`).join(" / ");

  return (
    <article className="panel sidebar-panel history-panel">
      <header className="sidebar-panel__header">
        <div>
          <span className="panel-kicker">{t.history}</span>
          <h2>{t.history}</h2>
        </div>
        <button type="button" className="ghost-button" onClick={onToggle}>
          {open ? t.hideHistory : t.showHistory}
        </button>
      </header>

      {open ? (
        <div className="history-panel__body">
          {hands.length === 0 ? <p className="panel-muted">{t.noCompletedHands}</p> : null}
          {hands
            .slice()
            .reverse()
            .map((hand) => (
              <article key={hand.id} className="history-hand">
                <header className="history-hand__header">
                  <div>
                    <strong>
                      {t.hand} {hand.id}
                    </strong>
                    <span>
                      {t.dealer} {playerNameForSeat(hand.dealer)}
                    </span>
                  </div>
                  <span>
                    {hand.contract.tricks}
                    {trumpLabel(hand.contract.trump, locale)} {t.by} {playerNameForSeat(hand.contract.bidder)}
                  </span>
                </header>
                <div className="history-hand__row">
                  <span>{t.bid}</span>
                  <span>{seatStats(hand.bets)}</span>
                </div>
                <div className="history-hand__row">
                  <span>{t.taken}</span>
                  <span>{seatStats(hand.taken)}</span>
                </div>
                <div className="history-hand__row">
                  <span>{t.score}</span>
                  <span>{scoreDelta(hand.scoreDelta)}</span>
                </div>
                <div className="history-hand__row">
                  <span>{t.passes}</span>
                  <span>
                    {hand.allPassCycles} {t.cycles}, {hand.reshuffles} {t.reshuffles}
                  </span>
                </div>
              </article>
            ))}
        </div>
      ) : null}
    </article>
  );
}
