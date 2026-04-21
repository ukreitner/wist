import { View, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import { WistCard, Card } from './WistCard';

type Props = {
  cards: Card[];
  playable?: Set<string>;
  selectedCard?: string | null;
  onCardPress?: (key: string, card: Card) => void;
};

export function HandFan({ cards, playable = new Set(), selectedCard, onCardPress }: Props) {
  const n = cards.length;
  const availW = 360;
  const cardW = n <= 8 ? 68 : n <= 11 ? 64 : 60;
  const visW = n > 1 ? Math.floor((availW - cardW) / (n - 1)) : cardW;
  const ml = visW - cardW;

  return (
    <View style={s.row}>
      {cards.map((card, i) => {
        const key = `${card.rank}-${card.suit}`;
        const isSelected = selectedCard === key;
        const isPlayable = playable.has(key);
        const content = (
          <WistCard
            rank={card.rank}
            suit={card.suit}
            width={cardW}
            selected={isSelected}
            playable={isPlayable}
            onPress={undefined}
          />
        );
        return (
          <View
            key={key}
            style={{
              marginLeft: i === 0 ? 0 : ml,
              zIndex: isSelected ? 50 : i,
              elevation: isSelected ? 50 : i,
            }}
          >
            {onCardPress ? (
              <TouchableWithoutFeedback onPress={() => onCardPress(key, card)}>
                <View testID={`card-${key}`} accessible accessibilityLabel={`card-${key}`}>
                  {content}
                </View>
              </TouchableWithoutFeedback>
            ) : (
              content
            )}
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: 16,
  },
});
