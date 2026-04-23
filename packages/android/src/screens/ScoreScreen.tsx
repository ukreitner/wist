import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { T } from '../theme';
import type { NavProps } from '../nav';
import { useDemoState } from '../demo-state';
import type { Seat } from '@wist/core';

const sign = (value: number) => (value > 0 ? `+${value}` : String(value));
const SEATS: Seat[] = ['N', 'E', 'S', 'W'];

export default function ScoreScreen({ navigation }: NavProps<'Score'>) {
  const { playerForSeat, snapshot, recentCompletedHands, currentScores, startNextHand, endMatch, error, clearError } = useDemoState();
  const lastHand = recentCompletedHands[recentCompletedHands.length - 1] ?? null;

  if (!snapshot || !lastHand) {
    return (
      <LinearGradient colors={[T.bgStart, T.bgMid, T.bgEnd]} style={s.root}>
        <View style={s.emptyState}>
          <Text style={s.title}>Waiting for scorecard…</Text>
        </View>
      </LinearGradient>
    );
  }

  const players = SEATS.map((seat) => ({
    seat,
    name: playerForSeat(seat).name,
    total: currentScores[seat]
  }));

  return (
    <LinearGradient colors={[T.bgStart, T.bgMid, T.bgEnd]} style={s.root}>
      <ScrollView contentContainerStyle={{ paddingTop: 46, paddingBottom: 28, gap: 10 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={s.eyebrow}>Hand {lastHand.id} Complete</Text>
          <Text style={s.title}>Scorecard</Text>
        </View>

        <View style={s.deltasCard}>
          <Text style={s.deltasLabel}>Hand {lastHand.id} · {lastHand.contract.tricks}{lastHand.contract.trump} by {playerForSeat(lastHand.contract.bidder).name}</Text>
          <View style={s.deltasGrid}>
            {players.map((player) => {
              const delta = lastHand.scoreDelta[player.seat];
              const positive = delta > 0;
              const negative = delta < 0;
              return (
                <View key={player.seat} style={[s.deltaCell, positive && s.deltaPos, negative && s.deltaNeg]}>
                  <Text style={s.deltaName} numberOfLines={1}>{player.name}</Text>
                  <Text style={[s.deltaValue, { color: positive ? '#7acea8' : negative ? '#e4786e' : 'rgba(246,231,201,0.8)' }]}>{sign(delta)}</Text>
                  <Text style={s.deltaMeta}>B:{lastHand.bets[player.seat]} W:{lastHand.taken[player.seat]}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={s.panel}>
          <Text style={s.panelEyebrow}>Score Table</Text>
          <View style={s.tableHeader}>
            <View style={s.colNarrow} />
            {players.map((player) => (
              <View key={player.seat} style={s.colFlex}>
                <Text style={s.colHeaderText} numberOfLines={1}>{player.name}</Text>
              </View>
            ))}
          </View>

          <View style={s.totalsRow}>
            <View style={[s.colNarrow, s.totalsCell]}>
              <Text style={s.totalsLabel}>Total</Text>
            </View>
            {players.map((player) => (
              <View key={`${player.seat}-total`} style={[s.colFlex, s.totalsCell]}>
                <Text style={s.totalsValue}>{player.total}</Text>
              </View>
            ))}
          </View>

          {recentCompletedHands.slice().reverse().map((hand: typeof recentCompletedHands[number]) => (
            <View key={hand.id} style={s.handRow}>
              <View style={[s.colNarrow, s.handCell]}>
                <Text style={s.handLabel}>H{hand.id}</Text>
              </View>
              {SEATS.map((seat) => (
                <View key={`${hand.id}-${seat}`} style={[s.colFlex, s.handCell]}>
                  <Text style={[s.handDelta, { color: hand.scoreDelta[seat] > 0 ? T.success : hand.scoreDelta[seat] < 0 ? T.wine : T.ink }]}>
                    {sign(hand.scoreDelta[seat])}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={{ paddingHorizontal: 14, gap: 8 }}>
          <TouchableOpacity
            testID="cta-deal-next"
            style={[s.cta, !snapshot.controls.canStartNextHand && s.ctaDisabled]}
            onPress={() => {
              clearError();
              startNextHand();
            }}
            disabled={!snapshot.controls.canStartNextHand}
          >
            <Text style={s.ctaText}>Deal Next Hand</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.ctaEnd, !snapshot.controls.canEndMatch && s.ctaDisabled]} onPress={() => endMatch()} disabled={!snapshot.controls.canEndMatch}>
            <Text style={s.ctaEndText}>End Match</Text>
          </TouchableOpacity>
          {error ? <Text style={s.errorText}>{error}</Text> : null}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
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
  ctaDisabled: { opacity: 0.45 },
  ctaText: { color: '#1c2024', fontWeight: '700', fontSize: 14 },
  ctaEnd: { paddingVertical: 13, borderRadius: 99, backgroundColor: 'rgba(142,62,56,0.1)', alignItems: 'center' },
  ctaEndText: { color: T.wine, fontWeight: '700', fontSize: 14 },
  errorText: { color: T.wine, fontWeight: '700', fontSize: 12, textAlign: 'center' },
});
