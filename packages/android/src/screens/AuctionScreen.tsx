import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { T } from '../theme';
import { GameHeader } from '../components/GameHeader';
import { FeltTable } from '../components/FeltTable';
import { SeatChip } from '../components/SeatChip';
import { ChipBtn } from '../components/ChipBtn';
import { HandFan } from '../components/HandFan';
import type { NavProps } from '../nav';
import { useDemoState } from '../demo-state';
import type { Trump, Seat } from '@wist/core';

const SUIT_SYM: Record<Trump, string> = { C: '♣', D: '♦', H: '♥', S: '♠', NT: 'NT' };

export default function AuctionScreen({ navigation }: NavProps<'Auction'>) {
  const [selectedTrump, setSelectedTrump] = useState<Trump | null>(null);
  const [selectedTricks, setSelectedTricks] = useState<number | null>(null);
  const { playerForSeat, selfName, highestBidText, hand, auctionBids, currentTurn, recentActions, submitAuctionBid, submitAuctionPass, error, clearError } = useDemoState();

  const trumps = useMemo(
    () => Array.from(new Set(auctionBids.map((bid) => bid.trump))),
    [auctionBids]
  );
  const activeTrump = selectedTrump && trumps.includes(selectedTrump) ? selectedTrump : trumps[0] ?? null;
  const tricks = useMemo(
    () =>
      activeTrump
        ? Array.from(new Set(auctionBids.filter((bid) => bid.trump === activeTrump).map((bid) => bid.tricks))).sort((left, right) => left - right)
        : [],
    [activeTrump, auctionBids]
  );
  const activeTricks = selectedTricks && tricks.includes(selectedTricks) ? selectedTricks : tricks[0] ?? null;
  const selectedBid = activeTrump && activeTricks ? auctionBids.find((bid) => bid.trump === activeTrump && bid.tricks === activeTricks) ?? null : null;
  const actionBySeat = new Map<Seat, string>();

  recentActions.forEach((action) => {
    actionBySeat.set(action.seat, action.label);
  });

  useEffect(() => {
    if (activeTrump !== selectedTrump) {
      setSelectedTrump(activeTrump);
    }
  }, [activeTrump, selectedTrump]);

  useEffect(() => {
    if (activeTricks !== selectedTricks) {
      setSelectedTricks(activeTricks);
    }
  }, [activeTricks, selectedTricks]);

  const seats: Array<{ seat: Seat; name: string; action: string; isTurn: boolean; isHighest: boolean }> = (['N', 'E', 'S', 'W'] as Seat[]).map((seat) => ({
    seat,
    name: playerForSeat(seat).name,
    action: actionBySeat.get(seat) ?? '—',
    isTurn: currentTurn === seat,
    isHighest: Boolean(highestBidText && actionBySeat.get(seat) && highestBidText.startsWith(actionBySeat.get(seat)!))
  }));

  const AuctionCenter = (
    <View style={s.centerWrap}>
      <View style={s.centerTop}>
        <Text style={s.centerEyebrow}>Current highest</Text>
        <Text style={s.centerBid}>{highestBidText ?? 'No bid yet'}</Text>
      </View>
      <View style={s.centerGrid}>
        {seats.map((entry) => (
          <View key={entry.seat} style={[s.centerCell, entry.isHighest && s.centerCellHighest, entry.isTurn && s.centerCellTurn]}>
            <Text style={s.centerCellSeat}>{entry.isTurn ? '▶ TURN' : entry.seat}</Text>
            <Text style={s.centerCellName} numberOfLines={1}>{entry.name}</Text>
            <Text style={s.centerCellAction}>{entry.action}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <LinearGradient colors={[T.bgStart, T.bgMid, T.bgEnd]} style={s.root}>
      <ScrollView contentContainerStyle={{ paddingTop: 40, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <GameHeader hand="Current Hand" phase="Auction" />
        <FeltTable
          north={<SeatChip name={playerForSeat('N').name} isTurn={currentTurn === 'N'} connected={playerForSeat('N').connected} />}
          west={<SeatChip name={playerForSeat('W').name} isTurn={currentTurn === 'W'} connected={playerForSeat('W').connected} />}
          east={<SeatChip name={playerForSeat('E').name} isTurn={currentTurn === 'E'} connected={playerForSeat('E').connected} />}
          south={<SeatChip name={playerForSeat('S').name} isTurn={currentTurn === 'S'} connected={playerForSeat('S').connected} />}
          center={AuctionCenter}
          centerH={200}
        />

        <View style={s.handWrap}>
          <Text style={s.handLabel}>Your Hand · {selfName}</Text>
          <HandFan cards={hand} />
        </View>

        <View style={s.panel}>
          <View style={s.panelHeader}>
            <Text style={s.panelTitle}>Your Bid</Text>
            {selectedBid ? (
              <View style={s.bidPill}>
                <Text style={s.bidPillText}>{selectedBid.tricks}{SUIT_SYM[selectedBid.trump]}</Text>
              </View>
            ) : null}
          </View>

          <View>
            <Text style={s.miniLabel}>Suit</Text>
            <View style={s.grid5}>
              {trumps.map((trump) => (
                <ChipBtn
                  key={trump}
                  label={SUIT_SYM[trump]}
                  selected={selectedTrump === trump}
                  onPress={() => setSelectedTrump(trump)}
                  testID={`auction-trump-${trump}`}
                />
              ))}
            </View>
          </View>

          <View>
            <Text style={s.miniLabel}>Number of tricks</Text>
            <View style={s.grid8}>
              {tricks.map((trickCount) => (
                <ChipBtn
                  key={trickCount}
                  label={trickCount}
                  selected={selectedTricks === trickCount}
                  onPress={() => setSelectedTricks(trickCount)}
                  testID={`auction-tricks-${trickCount}`}
                />
              ))}
            </View>
          </View>

          <View style={s.actionRow}>
            <TouchableOpacity style={s.passBtn} onPress={() => { clearError(); submitAuctionPass(); }}>
              <Text style={s.passText}>Pass</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="cta-bid"
              style={[s.bidBtn, !selectedBid && s.bidBtnDisabled]}
              disabled={!selectedBid}
              onPress={() => {
                if (!selectedBid) return;
                clearError();
                submitAuctionBid(selectedBid);
              }}
            >
              <Text style={s.bidBtnText}>{selectedBid ? `Bid ${selectedBid.tricks}${SUIT_SYM[selectedBid.trump]}` : 'Select a bid'}</Text>
            </TouchableOpacity>
          </View>
          {error ? <Text style={s.errorText}>{error}</Text> : null}
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
  centerBid: { fontFamily: T.serif, fontSize: 18, color: '#faedcf', textAlign: 'center' },
  centerGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
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
  grid8: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
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
  bidBtnDisabled: { opacity: 0.45 },
  bidBtnText: { color: '#1c2024', fontWeight: '700', fontSize: 14 },
  errorText: { color: T.wine, fontWeight: '700', fontSize: 12, textAlign: 'center' },
});
