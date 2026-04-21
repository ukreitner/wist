import { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { T, SUIT_SYM, rankLabel } from '../theme';
import { GameHeader } from '../components/GameHeader';
import { FeltTable } from '../components/FeltTable';
import { SeatChip } from '../components/SeatChip';
import { HandFan } from '../components/HandFan';
import { WistCard, type Card, type Suit } from '../components/WistCard';
import type { NavProps } from '../nav';

const MY_HAND: Card[] = [
  { rank: 14, suit: 'S' }, { rank: 11, suit: 'H' }, { rank: 8, suit: 'C' },
  { rank: 5, suit: 'D' }, { rank: 2, suit: 'S' }, { rank: 12, suit: 'C' },
  { rank: 10, suit: 'H' }, { rank: 6, suit: 'D' }, { rank: 4, suit: 'C' },
  { rank: 3, suit: 'S' },
];

const PLAYABLE = new Set(['11-H', '10-H']);

type TrickCardT = { seat: 'N' | 'E' | 'S' | 'W'; name: string; rank: number; suit: Suit };
const TRICK: TrickCardT[] = [
  { seat: 'N', name: 'Avi', rank: 7, suit: 'H' },
  { seat: 'E', name: 'Gila', rank: 3, suit: 'H' },
  { seat: 'W', name: 'Yossi', rank: 13, suit: 'D' },
];

function TrickCardSlot({ seat, name, rank, suit }: TrickCardT) {
  const pos =
    seat === 'N' ? { top: 6, left: '50%' as const, transform: [{ translateX: -29 }] } :
    seat === 'E' ? { right: 6, top: '42%' as const, transform: [{ translateY: -40 }] } :
    seat === 'S' ? { bottom: 6, left: '50%' as const, transform: [{ translateX: -29 }] } :
    /* W */        { left: 6, top: '42%' as const, transform: [{ translateY: -40 }] };

  return (
    <View style={[s.trickSlot, pos]}>
      <View style={s.trickPill}>
        <Text style={s.trickPillText}>{name}</Text>
      </View>
      <WistCard rank={rank} suit={suit} width={58} />
    </View>
  );
}

export default function PlayScreen({ navigation }: NavProps<'Play'>) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  const TrickCenter = (
    <View style={s.trickCenter}>
      {TRICK.map((t) => (
        <TrickCardSlot key={t.seat} {...t} />
      ))}
      <View style={s.yourTurnPill}>
        <Text style={s.yourTurnText}>▶ Your turn</Text>
      </View>
    </View>
  );

  const [r, st] = selectedCard ? selectedCard.split('-') : [null, null];

  return (
    <LinearGradient colors={[T.bgStart, T.bgMid, T.bgEnd]} style={s.root}>
      <ScrollView contentContainerStyle={{ paddingTop: 40, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <GameHeader hand="Hand 1 · Trick 4" phase="Playing" contract="6♥ by Avi" trumpSym="♥" trumpColor="#e84040" />
        <FeltTable
          north={<SeatChip name="Avi" bid={6} taken={2} />}
          west={<SeatChip name="Yossi" bid={3} taken={3} />}
          east={<SeatChip name="Gila" bid={2} taken={1} />}
          south={<SeatChip name="Dani" bid={2} taken={1} isTurn />}
          center={TrickCenter}
          centerH={230}
        />

        {/* Last trick strip */}
        <View style={s.lastTrick}>
          <View>
            <Text style={s.lastEyebrow}>Last trick</Text>
            <Text style={s.lastWinner}>Won by Avi</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 4, marginLeft: 'auto' }}>
            {[{ r: 14, s: 'H' as Suit }, { r: 9, s: 'H' as Suit }, { r: 8, s: 'D' as Suit }, { r: 2, s: 'C' as Suit }].map((c, i) => (
              <WistCard key={i} rank={c.r} suit={c.s} width={36} />
            ))}
          </View>
        </View>

        {/* My hand */}
        <View style={{ paddingHorizontal: 12, paddingTop: 10, gap: 8 }}>
          <Text style={s.handLabel}>Your Hand · Dani — tap a card to play</Text>
          <HandFan
            cards={MY_HAND}
            playable={PLAYABLE}
            selectedCard={selectedCard}
            onCardPress={(key) => setSelectedCard(selectedCard === key ? null : key)}
          />
        </View>

        {/* Action */}
        {selectedCard && r && st ? (
          <View style={s.selectedPanel}>
            <View>
              <Text style={s.selectedEyebrow}>Selected</Text>
              <Text style={s.selectedCard}>{rankLabel(parseInt(r, 10))} {SUIT_SYM[st as 'C' | 'D' | 'H' | 'S']}</Text>
            </View>
            <TouchableOpacity
              testID="cta-play"
              style={s.playBtn}
              onPress={() => navigation.navigate('Score')}
            >
              <Text style={s.playBtnText}>Play Card →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.hintPanel}>
            <Text style={s.hintText}>Tap a card to play · Must follow hearts ♥</Text>
          </View>
        )}
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
    position: 'relative',
  },
  trickSlot: {
    position: 'absolute',
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
  yourTurnPill: {
    position: 'absolute',
    bottom: 8,
    left: '50%',
    transform: [{ translateX: -50 }],
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
    marginTop: 0,
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
});
