import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
  north?: React.ReactNode;
  west?: React.ReactNode;
  east?: React.ReactNode;
  south?: React.ReactNode;
  center: React.ReactNode;
  centerH?: number;
};

export function FeltTable({ north, west, east, south, center, centerH = 200 }: Props) {
  return (
    <LinearGradient colors={['#20553e', '#163b2c', '#112b21']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={s.table}>
      <View style={s.northRow}>{north}</View>
      <View style={[s.middleRow, { height: centerH }]}>
        <View style={s.side}>{west}</View>
        <View style={[s.centerWrap, { height: centerH }]}>{center}</View>
        <View style={s.side}>{east}</View>
      </View>
      <View style={s.southRow}>{south}</View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  table: {
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 22,
    padding: 10,
  },
  northRow: { height: 52, alignItems: 'center', justifyContent: 'center' },
  middleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  side: { width: 80, justifyContent: 'center' },
  centerWrap: { flex: 1, borderRadius: 18, overflow: 'hidden' },
  southRow: { height: 52, alignItems: 'center', justifyContent: 'center' },
});
