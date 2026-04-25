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
import type { Seat } from '@wist/core';

const SEATS: Seat[] = ['N', 'E', 'S', 'W'];

export default function BettingScreen({ navigation }: NavProps<'Betting'>) {
  const { playerForSeat, selfName, contractText, hand, bettingValues, minimumBet, currentBets, currentTaken, currentTurn, recentlyReceivedCardCodes, submitBet, error, clearError } = useDemoState();
  const total = Object.values(currentBets).reduce<number>((sum, value) => sum + (value ?? 0), 0);
  const forbidden = 13 - total;
  const betCount = Object.values(currentBets).filter((value) => value !== undefined).length;
  const isFinalBettor = betCount === 3;
  const showThirteenWarning = isFinalBettor && forbidden >= minimumBet && forbidden <= 13;

  const BettingCenter = (
    <View style={s.centerWrap}>
      <View style={s.centerTop}>
        <Text style={s.centerEyebrow}>Contract</Text>
        <Text style={s.centerBid}>{contractText ?? 'Waiting for contract'}</Text>
      </View>
      <View style={s.centerGrid}>
        {SEATS.map((seat) => (
          <View key={seat} style={[s.centerCell, currentTurn === seat && s.centerCellMe]}>
            <Text style={s.centerCellSeat}>{currentTurn === seat ? '▶ TURN' : seat}</Text>
            <Text style={s.centerCellName} numberOfLines={1}>{playerForSeat(seat).name}</Text>
            <Text style={s.centerCellAction}>{currentBets[seat] ?? '?'}</Text>
          </View>
        ))}
      </View>
      <Text style={s.totalText}>Total bets so far: {total}</Text>
    </View>
  );

  return (
    <LinearGradient colors={[T.bgStart, T.bgMid, T.bgEnd]} style={s.root}>
      <ScrollView contentContainerStyle={{ paddingTop: 40, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <GameHeader hand="Current Hand" phase="Betting" contract={contractText ?? undefined} />
        <FeltTable
          north={<SeatChip name={playerForSeat('N').name} bid={currentBets.N} taken={currentTaken.N} isTurn={currentTurn === 'N'} connected={playerForSeat('N').connected} />}
          west={<SeatChip name={playerForSeat('W').name} bid={currentBets.W} taken={currentTaken.W} isTurn={currentTurn === 'W'} connected={playerForSeat('W').connected} />}
          east={<SeatChip name={playerForSeat('E').name} bid={currentBets.E} taken={currentTaken.E} isTurn={currentTurn === 'E'} connected={playerForSeat('E').connected} />}
          south={<SeatChip name={playerForSeat('S').name} bid={currentBets.S} taken={currentTaken.S} isTurn={currentTurn === 'S'} connected={playerForSeat('S').connected} />}
          center={BettingCenter}
          centerH={220}
        />

        <View style={s.handWrap}>
          <Text style={s.handLabel}>Your Hand · {selfName}</Text>
          <HandFan cards={hand} highlighted={new Set(recentlyReceivedCardCodes)} />
        </View>

        <View style={s.panel}>
          <View style={s.panelHeader}>
            <Text style={s.panelTitle}>How many tricks?</Text>
            <View style={s.pill}>
              <Text style={s.pillText}>Min {minimumBet}</Text>
            </View>
          </View>

          {showThirteenWarning ? (
            <View style={s.warn}>
              <Text style={s.warnText}>Cannot bet {forbidden} because it would total exactly 13.</Text>
            </View>
          ) : null}

          <View style={{ gap: 5 }}>
            <View style={s.grid}>
              {bettingValues.map((value) => (
                <ChipBtn
                  key={value}
                  label={value}
                  selected={false}
                  onPress={() => {
                    clearError();
                    submitBet(value);
                  }}
                  disabled={value < minimumBet}
                  testID={`bet-${value}`}
                />
              ))}
            </View>
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
  centerBid: { fontFamily: T.serif, fontSize: 16, color: '#faedcf', textAlign: 'center' },
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
  grid: { flexDirection: 'row', gap: 5, flexWrap: 'wrap' },
  errorText: { color: T.wine, fontWeight: '700', fontSize: 12, textAlign: 'center' },
});
