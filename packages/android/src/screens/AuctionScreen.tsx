import { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { T } from '../theme';
import { GameHeader } from '../components/GameHeader';
import { FeltTable } from '../components/FeltTable';
import { SeatChip } from '../components/SeatChip';
import { ChipBtn } from '../components/ChipBtn';
import { WistCard } from '../components/WistCard';
import type { NavProps } from '../nav';
import { useDemoState } from '../demo-state';

type Suit = 'C' | 'D' | 'H' | 'S' | 'NT';
type AuctionSeat = {
  name: string;
  seat: 'N' | 'E' | 'S' | 'W';
  action: string;
  isHighest?: boolean;
  isTurn?: boolean;
};

const SUIT_SYM_NT: Record<Suit, string> = { C: '♣', D: '♦', H: '♥', S: '♠', NT: 'NT' };

export default function AuctionScreen({ navigation }: NavProps<'Auction'>) {
  const [selTrump, setSelTrump] = useState<Suit>('H');
  const [selTricks, setSelTricks] = useState(6);
  const { playerForSeat, selfName, highestBidText } = useDemoState();

  const suits: Suit[] = ['C', 'D', 'H', 'S', 'NT'];
  const numbers = [6, 7, 8, 9, 10, 11, 12, 13];
  const seats: AuctionSeat[] = [
    { name: playerForSeat('N').name, seat: 'N', action: '5♥', isHighest: true },
    { name: playerForSeat('E').name, seat: 'E', action: 'Pass' },
    { name: playerForSeat('S').name, seat: 'S', action: '5♠' },
    { name: playerForSeat('W').name, seat: 'W', action: '—', isTurn: true }
  ];

  const AuctionCenter = (
    <View style={s.centerWrap}>
      <View style={s.centerTop}>
        <Text style={s.centerEyebrow}>Current highest</Text>
        <Text style={s.centerBid}>
          5<Text style={{ color: '#e84040' }}>♥</Text>
        </Text>
        <Text style={s.centerBy}>by {highestBidText.split(' by ')[1]}</Text>
      </View>
      <View style={s.centerGrid}>
        {seats.map((st) => (
          <View
            key={st.seat}
            style={[
              s.centerCell,
              st.isHighest && s.centerCellHighest,
              st.isTurn && s.centerCellTurn,
            ]}
          >
            <Text style={s.centerCellSeat}>{st.isTurn ? '▶ YOU' : st.seat}</Text>
            <Text style={s.centerCellName} numberOfLines={1}>{st.name}</Text>
            <Text style={s.centerCellAction}>{st.action}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <LinearGradient colors={[T.bgStart, T.bgMid, T.bgEnd]} style={s.root}>
      <ScrollView contentContainerStyle={{ paddingTop: 40, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <GameHeader hand="Hand 1" phase="Auction" />
        <FeltTable
          north={<SeatChip name={playerForSeat('N').name} />}
          west={<SeatChip name={playerForSeat('W').name} isTurn />}
          east={<SeatChip name={playerForSeat('E').name} />}
          south={<SeatChip name={playerForSeat('S').name} />}
          center={AuctionCenter}
          centerH={200}
        />

        {/* Face-down hand */}
        <View style={s.handWrap}>
          <Text style={s.handLabel}>Your Hand · {selfName} (West) — auction in progress</Text>
          <View style={s.handRow}>
            {Array.from({ length: 13 }).map((_, i) => (
              <View key={i} style={{ marginLeft: i === 0 ? 0 : -38, zIndex: i, elevation: i }}>
                <WistCard rank={2} suit="C" width={54} faceDown />
              </View>
            ))}
          </View>
        </View>

        {/* Action panel */}
        <View style={s.panel}>
          <View style={s.panelHeader}>
            <Text style={s.panelTitle}>Your Bid</Text>
            <View style={s.bidPill}>
              <Text style={s.bidPillText}>{selTricks}{SUIT_SYM_NT[selTrump]}</Text>
            </View>
          </View>

          <View>
            <Text style={s.miniLabel}>Suit</Text>
            <View style={s.grid5}>
              {suits.map((st) => (
                <ChipBtn
                  key={st}
                  label={SUIT_SYM_NT[st]}
                  selected={selTrump === st}
                  onPress={() => setSelTrump(st)}
                  testID={`suit-${st}`}
                />
              ))}
            </View>
          </View>

          <View>
            <Text style={s.miniLabel}>Number of tricks</Text>
            <View style={s.grid8}>
              {numbers.map((n) => (
                <ChipBtn
                  key={n}
                  label={n}
                  selected={selTricks === n}
                  onPress={() => setSelTricks(n)}
                  testID={`tricks-${n}`}
                />
              ))}
            </View>
          </View>

          <View style={s.actionRow}>
            <TouchableOpacity style={s.passBtn}>
              <Text style={s.passText}>Pass</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="cta-bid"
              style={s.bidBtn}
              onPress={() => navigation.navigate('Betting')}
            >
              <Text style={s.bidBtnText}>Bid {selTricks}{SUIT_SYM_NT[selTrump]} →</Text>
            </TouchableOpacity>
          </View>
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
    borderColor: 'rgba(255,229,185,0.16)',
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
  centerBid: { fontFamily: T.serif, fontSize: 22, color: '#faedcf' },
  centerBy: { fontSize: 10, color: 'rgba(250,237,207,0.65)', marginTop: 2 },
  centerGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  centerCell: {
    width: '48%',
    padding: 6,
    borderRadius: 9,
    backgroundColor: 'rgba(2,12,9,0.24)',
    borderWidth: 1,
    borderColor: 'rgba(249,229,193,0.09)',
  },
  centerCellHighest: {
    backgroundColor: 'rgba(215,166,79,0.22)',
    borderColor: 'rgba(255,218,145,0.32)',
  },
  centerCellTurn: {
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
  bidPill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 99,
    backgroundColor: 'rgba(213,166,82,0.2)',
  },
  bidPillText: { color: T.goldDeep, fontWeight: '800', fontFamily: T.serif, fontSize: 12 },
  miniLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: T.muted,
    marginBottom: 6,
  },
  grid5: { flexDirection: 'row', gap: 5 },
  grid8: { flexDirection: 'row', gap: 4 },
  actionRow: { flexDirection: 'row', gap: 8 },
  passBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 99,
    backgroundColor: 'rgba(18,42,32,0.08)',
    alignItems: 'center',
  },
  passText: { color: T.ink, fontWeight: '600', fontSize: 13 },
  bidBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 99,
    backgroundColor: T.gold,
    alignItems: 'center',
  },
  bidBtnText: { color: '#1c2024', fontWeight: '700', fontSize: 14 },
});
