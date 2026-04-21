import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { T } from '../theme';
import type { NavProps } from '../nav';

type HandRow = { id: number; bets: number[]; taken: number[]; delta: number[] };

const players = ['Avi', 'Gila', 'Dani', 'Yossi'];
const hands: HandRow[] = [
  { id: 1, bets: [7, 2, 2, 3], taken: [4, 1, 3, 5], delta: [-3, -1, 1, -4] },
  { id: 2, bets: [3, 2, 2, 3], taken: [2, 1, 5, 5], delta: [1, 1, -4, -4] },
  { id: 3, bets: [3, 2, 2, 3], taken: [3, 2, 2, 6], delta: [5, 4, 4, -6] },
];
const totals = [3, 4, 1, -14];
const sign = (n: number) => (n > 0 ? `+${n}` : String(n));

export default function ScoreScreen({ navigation }: NavProps<'Score'>) {
  const lastHand = hands[hands.length - 1];

  return (
    <LinearGradient colors={[T.bgStart, T.bgMid, T.bgEnd]} style={s.root}>
      <ScrollView contentContainerStyle={{ paddingTop: 46, paddingBottom: 28, gap: 10 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={s.eyebrow}>Hand {lastHand.id} Complete</Text>
          <Text style={s.title}>Scorecard</Text>
        </View>

        {/* Hand deltas */}
        <View style={s.deltasCard}>
          <Text style={s.deltasLabel}>Hand {lastHand.id} · 6♥ by Avi</Text>
          <View style={s.deltasGrid}>
            {players.map((p, i) => {
              const d = lastHand.delta[i];
              const positive = d > 0;
              const negative = d < 0;
              return (
                <View
                  key={p}
                  style={[
                    s.deltaCell,
                    positive && s.deltaPos,
                    negative && s.deltaNeg,
                  ]}
                >
                  <Text style={s.deltaName} numberOfLines={1}>{p}</Text>
                  <Text
                    style={[
                      s.deltaValue,
                      { color: positive ? '#7acea8' : negative ? '#e4786e' : 'rgba(246,231,201,0.8)' },
                    ]}
                  >
                    {sign(d)}
                  </Text>
                  <Text style={s.deltaMeta}>B:{lastHand.bets[i]} W:{lastHand.taken[i]}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Score table */}
        <View style={s.panel}>
          <Text style={s.panelEyebrow}>Score Table</Text>

          {/* Header row */}
          <View style={s.tableHeader}>
            <View style={s.colNarrow} />
            {players.map((p) => (
              <View key={p} style={s.colFlex}>
                <Text style={s.colHeaderText} numberOfLines={1}>{p}</Text>
              </View>
            ))}
          </View>

          {/* Totals row */}
          <View style={s.totalsRow}>
            <View style={[s.colNarrow, s.totalsCell]}>
              <Text style={s.totalsLabel}>Total</Text>
            </View>
            {totals.map((t, i) => (
              <View key={i} style={[s.colFlex, s.totalsCell]}>
                <Text style={s.totalsValue}>{t}</Text>
              </View>
            ))}
          </View>

          {/* Per-hand rows, newest first */}
          {hands.slice().reverse().map((h) => (
            <View key={h.id} style={s.handRow}>
              <View style={[s.colNarrow, s.handCell]}>
                <Text style={s.handLabel}>H{h.id}</Text>
              </View>
              {h.delta.map((d, i) => (
                <View key={i} style={[s.colFlex, s.handCell]}>
                  <Text
                    style={[
                      s.handDelta,
                      { color: d > 0 ? T.success : d < 0 ? T.wine : T.ink },
                    ]}
                  >
                    {sign(d)}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Actions */}
        <View style={{ paddingHorizontal: 14, gap: 8 }}>
          <TouchableOpacity
            testID="cta-deal-next"
            style={s.cta}
            onPress={() => navigation.navigate('Auction')}
          >
            <Text style={s.ctaText}>Deal Next Hand</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.ctaGhost}>
            <Text style={s.ctaGhostText}>View Full History</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.ctaEnd}>
            <Text style={s.ctaEndText}>End Match</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  eyebrow: { fontSize: 10, color: 'rgba(246,231,201,0.6)', letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { fontFamily: T.serif, fontSize: 26, color: '#f6e7c9', marginTop: 4 },
  deltasCard: {
    marginHorizontal: 14,
    backgroundColor: 'rgba(255,244,218,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(245,223,183,0.13)',
    borderRadius: 20,
    padding: 14,
  },
  deltasLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: 'rgba(246,231,201,0.6)',
    marginBottom: 10,
  },
  deltasGrid: { flexDirection: 'row', gap: 6 },
  deltaCell: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  deltaPos: { backgroundColor: 'rgba(37,93,66,0.25)', borderColor: 'rgba(46,138,94,0.3)' },
  deltaNeg: { backgroundColor: 'rgba(142,62,56,0.2)', borderColor: 'rgba(142,62,56,0.3)' },
  deltaName: { fontSize: 10, fontWeight: '700', color: 'rgba(246,231,201,0.6)' },
  deltaValue: { fontFamily: T.serif, fontSize: 20, fontWeight: '700', marginTop: 2 },
  deltaMeta: { fontSize: 9, color: 'rgba(246,231,201,0.42)', marginTop: 3 },
  panel: {
    marginHorizontal: 14,
    backgroundColor: T.panel,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: T.panelBorder,
  },
  panelEyebrow: { color: T.goldDeep, fontSize: 10, fontWeight: '800', letterSpacing: 1.8, textTransform: 'uppercase' },
  tableHeader: { flexDirection: 'row', gap: 4, marginTop: 10 },
  colNarrow: { width: 44 },
  colFlex: { flex: 1, alignItems: 'center' },
  colHeaderText: { fontSize: 9, fontWeight: '900', color: T.muted, letterSpacing: 0.5, textTransform: 'uppercase', paddingVertical: 5 },
  totalsRow: { flexDirection: 'row', gap: 4, marginBottom: 5 },
  totalsCell: {
    paddingVertical: 8,
    paddingHorizontal: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(213,166,82,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalsLabel: { fontSize: 11, fontWeight: '900', color: T.goldDeep },
  totalsValue: { fontSize: 15, fontWeight: '900', color: '#243728', fontFamily: T.serif },
  handRow: { flexDirection: 'row', gap: 4, marginBottom: 4 },
  handCell: {
    paddingVertical: 6,
    paddingHorizontal: 3,
    borderRadius: 9,
    backgroundColor: 'rgba(18,40,30,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  handLabel: { fontSize: 11, color: T.ink },
  handDelta: { fontSize: 11, fontWeight: '700' },
  cta: { paddingVertical: 13, borderRadius: 99, backgroundColor: T.gold, alignItems: 'center' },
  ctaText: { color: '#1c2024', fontWeight: '700', fontSize: 14 },
  ctaGhost: { paddingVertical: 13, borderRadius: 99, backgroundColor: 'rgba(18,42,32,0.08)', alignItems: 'center' },
  ctaGhostText: { color: T.ink, fontWeight: '700', fontSize: 14 },
  ctaEnd: { paddingVertical: 13, borderRadius: 99, backgroundColor: 'rgba(142,62,56,0.1)', alignItems: 'center' },
  ctaEndText: { color: T.wine, fontWeight: '700', fontSize: 14 },
});
