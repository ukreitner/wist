import type { Card } from "@wist/core";

interface PlayingCardProps {
  card: Card;
  faceDown?: boolean;
  disabled?: boolean;
  selected?: boolean;
  playable?: boolean;
  onClick?: () => void;
}

type Pip = {
  x: number;
  y: number;
  flipped?: boolean;
};

const SUIT_SYMBOL: Record<Card["suit"], string> = {
  C: "♣",
  D: "♦",
  H: "♥",
  S: "♠"
};

const PIP_LAYOUTS: Record<number, Pip[]> = {
  2: [
    { x: 90, y: 74 },
    { x: 90, y: 186, flipped: true }
  ],
  3: [
    { x: 90, y: 66 },
    { x: 90, y: 130 },
    { x: 90, y: 194, flipped: true }
  ],
  4: [
    { x: 58, y: 74 },
    { x: 122, y: 74 },
    { x: 58, y: 186, flipped: true },
    { x: 122, y: 186, flipped: true }
  ],
  5: [
    { x: 58, y: 74 },
    { x: 122, y: 74 },
    { x: 90, y: 130 },
    { x: 58, y: 186, flipped: true },
    { x: 122, y: 186, flipped: true }
  ],
  6: [
    { x: 58, y: 66 },
    { x: 122, y: 66 },
    { x: 58, y: 130 },
    { x: 122, y: 130 },
    { x: 58, y: 194, flipped: true },
    { x: 122, y: 194, flipped: true }
  ],
  7: [
    { x: 58, y: 66 },
    { x: 122, y: 66 },
    { x: 90, y: 98 },
    { x: 58, y: 130 },
    { x: 122, y: 130 },
    { x: 58, y: 194, flipped: true },
    { x: 122, y: 194, flipped: true }
  ],
  8: [
    { x: 58, y: 62 },
    { x: 122, y: 62 },
    { x: 90, y: 96 },
    { x: 58, y: 130 },
    { x: 122, y: 130 },
    { x: 90, y: 164, flipped: true },
    { x: 58, y: 198, flipped: true },
    { x: 122, y: 198, flipped: true }
  ],
  9: [
    { x: 58, y: 58 },
    { x: 122, y: 58 },
    { x: 90, y: 88 },
    { x: 58, y: 118 },
    { x: 122, y: 118 },
    { x: 90, y: 148, flipped: true },
    { x: 58, y: 178, flipped: true },
    { x: 122, y: 178, flipped: true },
    { x: 90, y: 208, flipped: true }
  ],
  10: [
    { x: 58, y: 56 },
    { x: 122, y: 56 },
    { x: 90, y: 84 },
    { x: 58, y: 112 },
    { x: 122, y: 112 },
    { x: 58, y: 152, flipped: true },
    { x: 122, y: 152, flipped: true },
    { x: 90, y: 180, flipped: true },
    { x: 58, y: 208, flipped: true },
    { x: 122, y: 208, flipped: true }
  ]
};

const rankLabel = (rank: number): string => {
  if (rank <= 10) {
    return String(rank);
  }

  if (rank === 11) {
    return "J";
  }

  if (rank === 12) {
    return "Q";
  }

  if (rank === 13) {
    return "K";
  }

  return "A";
};

const suitColor = (suit: Card["suit"]): string => (suit === "H" || suit === "D" ? "#b4312d" : "#152130");

const pipSize = (rank: number): number => {
  if (rank <= 3) {
    return 48;
  }

  if (rank <= 6) {
    return 36;
  }

  return 32;
};

const renderCenter = (card: Card) => {
  const fill = suitColor(card.suit);
  const symbol = SUIT_SYMBOL[card.suit];

  if (card.rank === 14) {
    return (
      <>
        <text x="90" y="158" textAnchor="middle" fontSize="122" fill={fill}>
          {symbol}
        </text>
        <text x="90" y="191" textAnchor="middle" fontSize="28" fontWeight="700" fill={fill} opacity="0.8">
          ACE
        </text>
      </>
    );
  }

  if (card.rank >= 11) {
    return (
      <>
        <text
          x="90"
          y="128"
          textAnchor="middle"
          fontSize="90"
          fontWeight="700"
          fill={fill}
          fontFamily="Georgia, 'Times New Roman', serif"
        >
          {rankLabel(card.rank)}
        </text>
        <text x="90" y="190" textAnchor="middle" fontSize="62" fill={fill}>
          {symbol}
        </text>
      </>
    );
  }

  return PIP_LAYOUTS[card.rank].map((pip, index) => (
    <text
      key={`${card.code}-${pip.x}-${pip.y}-${index}`}
      x={pip.x}
      y={pip.y}
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={pipSize(card.rank)}
      fill={fill}
      transform={pip.flipped ? `rotate(180 ${pip.x} ${pip.y})` : undefined}
    >
      {symbol}
    </text>
  ));
};

const CornerMark = ({ rank, suit, fill, flipped = false }: { rank: string; suit: string; fill: string; flipped?: boolean }) => (
  <g transform={flipped ? "translate(154 228) rotate(180)" : "translate(26 36)"}>
    <text
      x="0"
      y="0"
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={rank === "10" ? "35" : "40"}
      fontWeight="800"
      fill={fill}
      fontFamily="Georgia, 'Times New Roman', serif"
    >
      {rank}
    </text>
    <text x="0" y="31" textAnchor="middle" dominantBaseline="middle" fontSize="28" fill={fill}>
      {suit}
    </text>
  </g>
);

export default function PlayingCard({
  card,
  faceDown = false,
  disabled = false,
  selected = false,
  playable = false,
  onClick
}: PlayingCardProps) {
  const fill = suitColor(card.suit);
  const rank = rankLabel(card.rank);
  const symbol = SUIT_SYMBOL[card.suit];
  const gradientId = `card-sheen-${card.code}`;

  return (
    <button
      type="button"
      aria-label={faceDown ? "Face-down card" : `${rank}${card.suit}`}
      data-card-code={card.code}
      className={[
        "playing-card",
        faceDown ? "is-back" : "",
        disabled ? "is-disabled" : "",
        selected ? "is-selected" : "",
        playable ? "is-playable" : ""
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
      disabled={disabled}
    >
      {faceDown ? (
        <div className="playing-card__back">
          <span>WIST</span>
        </div>
      ) : (
        <svg viewBox="0 0 180 260" className="playing-card__svg" aria-label={`${rank}${card.suit}`}>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fffdf8" />
              <stop offset="100%" stopColor="#f1e8d8" />
            </linearGradient>
          </defs>
          <rect x="8" y="8" width="164" height="244" rx="20" fill={`url(#${gradientId})`} stroke="#d3c2a6" strokeWidth="4" />
          <rect x="18" y="18" width="144" height="224" rx="16" fill="none" stroke="#eadbc0" strokeWidth="2" />
          <rect x="28" y="28" width="124" height="204" rx="12" fill="none" stroke="#f4ecdd" strokeWidth="1.5" />
          <CornerMark rank={rank} suit={symbol} fill={fill} />
          <CornerMark rank={rank} suit={symbol} fill={fill} flipped />
          {renderCenter(card)}
        </svg>
      )}
    </button>
  );
}
