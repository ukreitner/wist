import { View, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import { WistCard } from './WistCard';
import { displayCardKey, sortCardsForDisplay, visualCardKey, type VisibleCard } from './cardLayout';

type Props = {
  cards: VisibleCard[];
  playable?: Set<string>;
  selectedCard?: string | null;
  onCardPress?: (key: string, card: VisibleCard) => void;
};

export function HandFan({ cards, playable, selectedCard, onCardPress }: Props) {
  const sortedCards = sortCardsForDisplay(cards);
  const cardW = sortedCards.length <= 8 ? 66 : 60;

  return (
    <View style={s.row}>
      {sortedCards.map((card) => {
        const key = displayCardKey(card);
        const visualKey = visualCardKey(card);
        const isSelected = selectedCard === key || selectedCard === visualKey;
        const isPlayable = playable ? playable.has(key) || playable.has(visualKey) : true;
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
            style={[s.cardSlot, isSelected && s.cardSlotSelected]}
          >
            {onCardPress && isPlayable ? (
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
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'center',
    columnGap: 6,
    rowGap: 8,
    paddingTop: 12,
    paddingBottom: 8,
    overflow: 'visible',
  },
  cardSlot: {
    overflow: 'visible',
  },
  cardSlotSelected: {
    zIndex: 50,
    elevation: 50,
  },
});
