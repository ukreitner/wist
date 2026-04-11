import type { HandSummary } from "@wist/core";
import type { Locale } from "../i18n.js";
import { MESSAGES, seatLabel, trumpLabel } from "../i18n.js";

interface HistoryPanelProps {
  locale: Locale;
  open: boolean;
  hands: HandSummary[];
  onToggle: () => void;
}

export default function HistoryPanel({ locale, open, hands, onToggle }: HistoryPanelProps) {
  const t = MESSAGES[locale];
  const seatStats = (values: Record<"N" | "E" | "S" | "W", number>) =>
    `${seatLabel("N", locale)} ${values.N} / ${seatLabel("E", locale)} ${values.E} / ${seatLabel("S", locale)} ${values.S} / ${seatLabel("W", locale)} ${values.W}`;

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
                      {t.dealer} {seatLabel(hand.dealer, locale)}
                    </span>
                  </div>
                  <span>
                    {hand.contract.tricks}
                    {trumpLabel(hand.contract.trump, locale)} {t.by} {seatLabel(hand.contract.bidder, locale)}
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
                  <span>
                    {seatLabel("N", locale)} {hand.scoreDelta.N >= 0 ? `+${hand.scoreDelta.N}` : hand.scoreDelta.N} /{" "}
                    {seatLabel("E", locale)} {hand.scoreDelta.E >= 0 ? `+${hand.scoreDelta.E}` : hand.scoreDelta.E} /{" "}
                    {seatLabel("S", locale)} {hand.scoreDelta.S >= 0 ? `+${hand.scoreDelta.S}` : hand.scoreDelta.S} /{" "}
                    {seatLabel("W", locale)} {hand.scoreDelta.W >= 0 ? `+${hand.scoreDelta.W}` : hand.scoreDelta.W}
                  </span>
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
