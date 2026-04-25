import { useMemo, useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { T, SUIT_SYM, rankLabel } from '../theme';
import { GameHeader } from '../components/GameHeader';
import { FeltTable } from '../components/FeltTable';
import { SeatChip } from '../components/SeatChip';
import { HandFan } from '../components/HandFan';
import { WistCard } from '../components/WistCard';
import type { NavProps } from '../nav';
import { useDemoState } from '../demo-state';
import type { Seat } from '@wist/core';

const SEATS: Seat[] = ['N', 'E', 'W', 'S'];

function TrickCardSlot({ seat, name, rank, suit }: { seat: Seat; name: string; rank: number; suit: 'C' | 'D' | 'H' | 'S' }) {
  return (
    <View style={s.trickSlot}>
      <View style={s.trickPill}>
        <Text style={s.trickPillText}>{name}</Text>
      </View>
      <WistCard rank={rank} suit={suit} width={48} />
    </View>
  );
}

export default function PlayScreen({ navigation }: NavProps<'Play'>) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const { playerForSeat, selfName, selfSeat, contractText, hand, legalPlayCardCodes, currentTrick, completedTricks, currentBets, currentTaken, currentTurn, recentlyReceivedCardCodes, playCard, error, clearError } = useDemoState();
  const playable = useMemo(() => new Set(legalPlayCardCodes), [legalPlayCardCodes]);
  const selectedCardInfo = selectedCard ? hand.find((entry) => entry.code === selectedCard) ?? null : null;
  const latestTrick = completedTricks.at(-1) ?? null;

  const TrickCenter = (
    <View style={s.trickCenter}>
      <View style={s.trickGrid}>
        {SEATS.map((seat) => {
          const play = currentTrick?.plays.find((entry) => entry.seat === seat);

          return (
            <View key={`trick-slot-${seat}`} style={[s.trickQuadrant, currentTurn === seat && s.trickQuadrantTurn]}>
              {play ? (
                <TrickCardSlot
                  seat={play.seat}
                  name={playerForSeat(play.seat).name}
                  rank={play.card.rank}
                  suit={play.card.suit}
                />
              ) : currentTurn === seat ? (
                <Text style={s.pendingTurnText}>{selfSeat === seat ? 'You' : playerForSeat(seat).name}</Text>
              ) : null}
            </View>
          );
        })}
      </View>
      {currentTurn ? (
        <View style={s.yourTurnPill}>
          <Text style={s.yourTurnText}>{currentTurn === selfSeat ? '▶ Your turn' : `${playerForSeat(currentTurn).name} to play`}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <LinearGradient colors={[T.bgStart, T.bgMid, T.bgEnd]} style={s.root}>
      <ScrollView contentContainerStyle={{ paddingTop: 40, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <GameHeader hand="Current Hand" phase="Playing" contract={contractText ?? undefined} />
        <FeltTable
          north={<SeatChip name={playerForSeat('N').name} bid={currentBets.N} taken={currentTaken.N} isTurn={currentTurn === 'N'} connected={playerForSeat('N').connected} />}
          west={<SeatChip name={playerForSeat('W').name} bid={currentBets.W} taken={currentTaken.W} isTurn={currentTurn === 'W'} connected={playerForSeat('W').connected} />}
          east={<SeatChip name={playerForSeat('E').name} bid={currentBets.E} taken={currentTaken.E} isTurn={currentTurn === 'E'} connected={playerForSeat('E').connected} />}
          south={<SeatChip name={playerForSeat('S').name} bid={currentBets.S} taken={currentTaken.S} isTurn={currentTurn === 'S'} connected={playerForSeat('S').connected} />}
          center={TrickCenter}
          centerH={230}
        />

        {latestTrick ? (
          <View style={s.lastTrick}>
            <View>
              <Text style={s.lastEyebrow}>Last trick</Text>
              <Text style={s.lastWinner}>Won by {playerForSeat(latestTrick.winner).name}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 4, marginLeft: 'auto' }}>
              {latestTrick.plays.map((play: { seat: Seat; card: { code: string; rank: number; suit: 'C' | 'D' | 'H' | 'S' } }) => (
                <WistCard key={`${play.seat}-${play.card.code}`} rank={play.card.rank} suit={play.card.suit} width={36} />
              ))}
            </View>
          </View>
        ) : null}

        <View style={{ paddingHorizontal: 12, paddingTop: 10, gap: 8 }}>
          <Text style={s.handLabel}>Your Hand · {selfName}</Text>
          <HandFan
            cards={hand}
            playable={playable}
            highlighted={new Set(recentlyReceivedCardCodes)}
            selectedCard={selectedCard}
            onCardPress={(key, card) => setSelectedCard(selectedCard === key ? null : card.code ?? key)}
          />
        </View>

        {selectedCard ? (
          <View style={s.selectedPanel}>
            <View>
              <Text style={s.selectedEyebrow}>Selected</Text>
              <Text style={s.selectedCard}>
                {selectedCardInfo ? `${rankLabel(selectedCardInfo.rank)}${SUIT_SYM[selectedCardInfo.suit]}` : selectedCard}
              </Text>
            </View>
            <TouchableOpacity
              testID="cta-play"
              style={s.playBtn}
              onPress={() => {
                clearError();
                playCard(selectedCard);
                setSelectedCard(null);
              }}
            >
              <Text style={s.playBtnText}>Play Card</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.hintPanel}>
            <Text style={s.hintText}>{currentTurn === selfSeat ? 'Tap a highlighted card to play.' : `${playerForSeat(currentTurn ?? 'N').name} is up.`}</Text>
          </View>
        )}
        {error ? <Text style={s.errorText}>{error}</Text> : null}
      </ScrollView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  trickCenter: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: 'rgba(4,18,13,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(245,223,183,0.09)',
    padding: 8,
    gap: 6,
  },
  trickGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  trickQuadrant: {
    width: '48%',
    minHeight: 80,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trickQuadrantTurn: { backgroundColor: 'rgba(246,208,125,0.08)' },
  trickSlot: {
    alignItems: 'center',
    gap: 3,
  },
  trickPill: {
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 99,
    backgroundColor: 'rgba(8,20,15,0.55)',
  },
  trickPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(247,234,208,0.88)',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  pendingTurnText: { color: 'rgba(255,230,173,0.78)', fontWeight: '800', fontSize: 11, textTransform: 'uppercase' },
  yourTurnPill: {
    alignSelf: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 99,
    backgroundColor: 'rgba(246,208,125,0.18)',
  },
  yourTurnText: { color: '#ffe6ad', fontWeight: '800', fontSize: 11 },
  lastTrick: {
    marginTop: 8,
    marginHorizontal: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,244,218,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(245,223,183,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lastEyebrow: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(248,232,199,0.55)',
  },
  lastWinner: { fontSize: 12, color: 'rgba(248,232,199,0.9)', fontWeight: '700', marginTop: 1 },
  handLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: 'rgba(246,231,201,0.5)',
  },
  selectedPanel: {
    marginHorizontal: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: T.panel,
    borderWidth: 1,
    borderColor: T.panelBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  selectedEyebrow: { fontSize: 11, color: T.muted, fontWeight: '700' },
  selectedCard: { fontFamily: T.serif, fontSize: 18, color: T.ink, fontWeight: '700', marginTop: 1 },
  playBtn: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 99,
    backgroundColor: T.gold,
  },
  playBtnText: { color: '#1c2024', fontWeight: '700', fontSize: 14 },
  hintPanel: {
    marginHorizontal: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(246,208,125,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(245,210,146,0.18)',
    alignItems: 'center',
  },
  hintText: { fontSize: 12, color: 'rgba(246,231,201,0.7)', fontWeight: '600' },
  errorText: { color: T.wine, fontWeight: '700', fontSize: 12, textAlign: 'center' },
});
