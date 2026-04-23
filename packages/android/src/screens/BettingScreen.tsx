import { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { T } from '../theme';
import { GameHeader } from '../components/GameHeader';
import { FeltTable } from '../components/FeltTable';
import { SeatChip } from '../components/SeatChip';
import { ChipBtn } from '../components/ChipBtn';
import { WistCard, type Card } from '../components/WistCard';
import type { NavProps } from '../nav';
import { useDemoState } from '../demo-state';

const HAND: Card[] = [
  { rank: 14, suit: 'S' }, { rank: 11, suit: 'H' }, { rank: 8, suit: 'C' },
  { rank: 5, suit: 'D' }, { rank: 2, suit: 'S' }, { rank: 12, suit: 'C' },
  { rank: 10, suit: 'H' }, { rank: 6, suit: 'D' }, { rank: 4, suit: 'C' },
  { rank: 3, suit: 'S' }, { rank: 9, suit: 'H' }, { rank: 7, suit: 'D' },
  { rank: 13, suit: 'C' },
];

export default function BettingScreen({ navigation }: NavProps<'Betting'>) {
  const [selBet, setSelBet] = useState<number | null>(null);
  const { playerForSeat, selfName, contractText } = useDemoState();
  const betsIn = [
    { name: playerForSeat('N').name, bet: 7 },
    { name: playerForSeat('E').name, bet: 2 },
    { name: playerForSeat('S').name, bet: 3 }
  ];
  const total = betsIn.reduce((acc, b) => acc + b.bet, 0);
  const forbidden = 13 - total;
  const betOptions = Array.from({ length: 14 }, (_, i) => i);

  const BettingCenter = (
    <View style={s.centerWrap}>
      <View style={s.centerTop}>
        <Text style={s.centerEyebrow}>Contract</Text>
        <Text style={s.centerBid}>
          6<Text style={{ color: '#e84040' }}>♥</Text> by {playerForSeat('N').name}
        </Text>
      </View>
      <View style={s.centerGrid}>
        {[...betsIn, { name: selfName, bet: '?', isMe: true }].map((p) => (
          <View key={p.name} style={[s.centerCell, (p as any).isMe && s.centerCellMe]}>
            <Text style={s.centerCellSeat}>{(p as any).isMe ? '▶ YOU' : 'BET'}</Text>
            <Text style={s.centerCellName} numberOfLines={1}>{p.name}</Text>
            <Text style={[s.centerCellAction, (p as any).isMe && { color: T.goldSoft }]}>
              {selBet !== null && (p as any).isMe ? selBet : p.bet}
            </Text>
          </View>
        ))}
      </View>
      <Text style={s.totalText}>
        Total so far: <Text style={{ color: T.goldSoft, fontWeight: '700' }}>
          {total}{selBet !== null ? ` + ${selBet} = ${total + selBet}` : ''}
        </Text>
      </Text>
    </View>
  );

  return (
    <LinearGradient colors={[T.bgStart, T.bgMid, T.bgEnd]} style={s.root}>
      <ScrollView contentContainerStyle={{ paddingTop: 40, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <GameHeader hand="Hand 1" phase="Betting" contract={contractText} />
        <FeltTable
          north={<SeatChip name={playerForSeat('N').name} />}
          west={<SeatChip name={playerForSeat('W').name} isTurn />}
          east={<SeatChip name={playerForSeat('E').name} />}
          south={<SeatChip name={playerForSeat('S').name} />}
          center={BettingCenter}
          centerH={220}
        />

        {/* Hand peek */}
        <View style={s.handWrap}>
          <Text style={s.handLabel}>Your Hand (peek before betting)</Text>
          <View style={s.handRow}>
            {HAND.map((card, i) => (
              <View key={`${card.rank}${card.suit}`} style={{ marginLeft: i === 0 ? 0 : -40, zIndex: i, elevation: i }}>
                <WistCard rank={card.rank} suit={card.suit} width={54} />
              </View>
            ))}
          </View>
        </View>

        {/* Bet picker */}
        <View style={s.panel}>
          <View style={s.panelHeader}>
            <Text style={s.panelTitle}>How many tricks?</Text>
            {selBet !== null && (
              <View style={s.pill}>
                <Text style={s.pillText}>{selBet} tricks</Text>
              </View>
            )}
          </View>

          <View style={s.warn}>
            <Text style={s.warnText}>⚠ Cannot bet {forbidden} — would total exactly 13</Text>
          </View>

          <View style={{ gap: 5 }}>
            <View style={s.grid7}>
              {betOptions.slice(0, 7).map((n) => (
                <ChipBtn
                  key={n}
                  label={n}
                  selected={selBet === n}
                  disabled={n === forbidden}
                  onPress={() => setSelBet(n)}
                  testID={`bet-${n}`}
                />
              ))}
            </View>
            <View style={s.grid7}>
              {betOptions.slice(7).map((n) => (
                <ChipBtn
                  key={n}
                  label={n}
                  selected={selBet === n}
                  disabled={n === forbidden}
                  onPress={() => setSelBet(n)}
                  testID={`bet-${n}`}
                />
              ))}
            </View>
          </View>

          <TouchableOpacity
            testID="cta-bet"
            style={[s.cta, selBet === null && s.ctaDisabled]}
            onPress={() => selBet !== null && navigation.navigate('Play')}
          >
            <Text style={[s.ctaText, selBet === null && s.ctaTextDisabled]}>
              {selBet !== null ? `Bet ${selBet} trick${selBet !== 1 ? 's' : ''} →` : 'Select your bet'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  centerWrap: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: 'rgba(5,18,13,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,229,185,0.14)',
    padding: 10,
    gap: 8,
    alignItems: 'center',
  },
  centerTop: { alignItems: 'center' },
  centerEyebrow: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: 'rgba(250,237,207,0.65)',
    marginBottom: 3,
  },
  centerBid: { fontFamily: T.serif, fontSize: 18, color: '#faedcf' },
  centerGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  centerCell: {
    width: '48%',
    padding: 6,
    borderRadius: 9,
    backgroundColor: 'rgba(2,12,9,0.24)',
    borderWidth: 1,
    borderColor: 'rgba(249,229,193,0.09)',
  },
  centerCellMe: {
    backgroundColor: 'rgba(215,166,79,0.16)',
    borderColor: 'rgba(245,210,146,0.45)',
    borderWidth: 1.5,
  },
  centerCellSeat: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(250,237,207,0.55)',
  },
  centerCellName: { fontSize: 10, color: 'rgba(252,241,219,0.9)', fontWeight: '600' },
  centerCellAction: { fontFamily: T.serif, fontSize: 13, color: '#fff4da', fontWeight: '700' },
  totalText: { fontSize: 10, color: 'rgba(246,231,201,0.55)' },
  handWrap: {
    marginTop: 10,
    marginHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(8,20,15,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(248,226,187,0.1)',
    padding: 10,
  },
  handLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: 'rgba(246,231,201,0.45)',
    marginBottom: 8,
  },
  handRow: { flexDirection: 'row', alignItems: 'flex-end' },
  panel: {
    marginTop: 10,
    marginHorizontal: 12,
    backgroundColor: T.panel,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: T.panelBorder,
    gap: 10,
  },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  panelTitle: { fontFamily: T.serif, fontSize: 17, color: T.ink },
  pill: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 99, backgroundColor: 'rgba(213,166,82,0.2)' },
  pillText: { color: T.goldDeep, fontWeight: '800', fontSize: 12 },
  warn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(142,62,56,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(142,62,56,0.18)',
  },
  warnText: { fontSize: 11, color: T.wine, fontWeight: '700' },
  grid7: { flexDirection: 'row', gap: 5 },
  cta: {
    paddingVertical: 13,
    borderRadius: 99,
    backgroundColor: T.gold,
    alignItems: 'center',
  },
  ctaDisabled: { backgroundColor: 'rgba(18,42,32,0.08)' },
  ctaText: { color: '#1c2024', fontWeight: '700', fontSize: 14 },
  ctaTextDisabled: { color: T.muted },
});
