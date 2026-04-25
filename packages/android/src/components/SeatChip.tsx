import { View, Text, StyleSheet } from 'react-native';
import { T } from '../theme';

type Props = {
  name: string;
  bid?: number;
  taken?: number;
  isTurn?: boolean;
  connected?: boolean;
};

export function SeatChip({ name, bid, taken, isTurn = false, connected = true }: Props) {
  return (
    <View style={[s.chip, isTurn && s.turn]}>
      <View style={s.row}>
        <View style={[s.dot, { backgroundColor: connected ? '#2e8a5e' : T.wine }]} />
        <Text style={s.name} numberOfLines={1}>
          {isTurn ? '▶ ' : ''}{name}
        </Text>
      </View>
      {bid !== undefined && (
        <View style={s.stats}>
          <View style={s.pill}>
            <Text style={s.pillText}>Bid <Text style={s.pillValue}>{bid}</Text></Text>
          </View>
          <View style={s.pill}>
            <Text style={s.pillText}>Won <Text style={s.pillValue}>{taken ?? 0}</Text></Text>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 7,
    borderRadius: 13,
    gap: 3,
    backgroundColor: 'rgba(8,21,16,0.44)',
    borderWidth: 1,
    borderColor: 'rgba(248,226,187,0.11)',
    overflow: 'hidden',
  },
  turn: {
    borderColor: 'rgba(245,210,146,0.55)',
    borderWidth: 1.5,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 0 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  name: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#f5e7cb',
    opacity: 0.9,
    flexShrink: 1,
  },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, marginTop: 1 },
  pill: {
    paddingVertical: 1,
    paddingHorizontal: 4,
    borderRadius: 99,
    backgroundColor: 'rgba(255,244,218,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245,223,183,0.1)',
    minWidth: 38,
    alignItems: 'center',
  },
  pillText: { fontSize: 9, color: '#f5e7cb' },
  pillValue: { color: T.goldSoft, fontWeight: '700' },
});
