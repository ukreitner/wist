import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Share } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { T } from '../theme';
import type { NavProps } from '../nav';
import { useDemoState, type Seat } from '../demo-state';

function SeatBox({ seat, name }: { seat: Seat; name: string }) {
  return (
    <View style={s.seatBox}>
      <Text style={s.seatLabel}>{seat}</Text>
      <Text style={s.seatName}>{name}</Text>
    </View>
  );
}

export default function LobbyScreen({ navigation }: NavProps<'Lobby'>) {
  const { roomCode, players, playerForSeat, snapshot, startMatch, assignSeat, inviteUrl, rejoinUrl, error, clearError } = useDemoState();
  const connectedCount = snapshot?.players.filter((player) => player.connected).length ?? 0;
  const seatedCount = players.length;

  const shareText = async (value: string | null, fallback: string) => {
    await Share.share({
      message: value ?? fallback
    });
  };

  return (
    <LinearGradient colors={[T.bgStart, T.bgMid, T.bgEnd]} style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.eyebrow}>Room</Text>
          <Text style={s.code}>{roomCode}</Text>
          <View style={s.statusRow}>
            <View style={s.statusPill}>
              <Text style={s.statusText}>● Connected</Text>
            </View>
            <Text style={s.waiting}>{connectedCount} / 4 online</Text>
          </View>
        </View>

        {/* Felt table seating grid */}
        <LinearGradient colors={['#20553e', '#163b2c', '#112b21']} style={s.felt}>
          <View style={s.feltRow}>
            <View style={s.placeholder} />
            <SeatBox seat="N" name={playerForSeat('N').name} />
            <View style={s.placeholder} />
          </View>
          <View style={s.feltMiddle}>
            <SeatBox seat="W" name={playerForSeat('W').name} />
            <View style={s.center}>
              <Text style={s.centerCode}>{roomCode}</Text>
              <Text style={s.centerMeta}>{seatedCount} / 4 seated</Text>
            </View>
            <SeatBox seat="E" name={playerForSeat('E').name} />
          </View>
          <View style={s.feltRow}>
            <View style={s.placeholder} />
            <SeatBox seat="S" name={playerForSeat('S').name} />
            <View style={s.placeholder} />
          </View>
        </LinearGradient>

        {/* Players panel */}
        <View style={s.panel}>
          <Text style={s.panelEyebrow}>Players</Text>
          <View style={{ gap: 8, marginTop: 10 }}>
            {snapshot?.players.map((p) => (
              <View key={p.id} style={s.playerRow}>
                <LinearGradient colors={['#20553e', '#112b21']} style={s.avatar}>
                  <Text style={s.avatarText}>{p.nickname[0]}</Text>
                </LinearGradient>
                <View style={s.playerMain}>
                  <Text style={s.playerName}>{p.nickname}{p.isHost ? ' 👑' : ''}</Text>
                  <Text style={s.playerSeat}>{p.seat ? `Seat ${p.seat}` : 'Unseated'}</Text>
                </View>
                <View style={[s.statusTag, p.connected ? s.statusOnline : s.statusOffline]}>
                  <Text style={[s.statusTagText, { color: p.connected ? T.success : T.wine }]}>
                    {p.connected ? 'Online' : 'Away'}
                  </Text>
                </View>
                {snapshot?.controls.canAssignSeats ? (
                  <View style={s.seatActions}>
                    {(['N', 'E', 'S', 'W'] as Seat[]).map((seat) => (
                      <TouchableOpacity key={`${p.id}-${seat}`} style={s.seatBtn} onPress={() => assignSeat(p.id, seat)}>
                        <Text style={s.seatBtnText}>{seat}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        </View>

        {/* Actions */}
        <View style={{ gap: 8, marginTop: 4 }}>
          <TouchableOpacity
            style={[s.cta, !snapshot?.controls.canStartMatch && s.ctaDisabled]}
            onPress={() => {
              clearError();
              startMatch();
            }}
            disabled={!snapshot?.controls.canStartMatch}
            testID="cta-start-match"
          >
            <Text style={s.ctaText}>Start Match</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.ghost} onPress={() => void shareText(inviteUrl, roomCode)}>
            <Text style={s.ghostText}>Share Invite Link</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.ghost} onPress={() => void shareText(rejoinUrl, roomCode)}>
            <Text style={s.ghostText}>Share Rejoin Link</Text>
          </TouchableOpacity>
          {error ? <Text style={s.errorText}>{error}</Text> : null}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 14, paddingTop: 52, paddingBottom: 30, gap: 12 },
  header: { paddingHorizontal: 2, gap: 3 },
  eyebrow: { fontSize: 10, color: 'rgba(246,231,201,0.65)', letterSpacing: 1.2, textTransform: 'uppercase' },
  code: { fontFamily: T.serif, fontSize: 28, color: '#f6e7c9', letterSpacing: 1 },
  statusRow: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 },
  statusPill: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 99, backgroundColor: 'rgba(37,93,66,0.35)' },
  statusText: { color: '#7acea8', fontSize: 11, fontWeight: '700' },
  waiting: { fontSize: 12, color: 'rgba(246,231,201,0.6)' },
  felt: { borderRadius: 22, padding: 14, gap: 6 },
  feltRow: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  feltMiddle: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 80 },
  placeholder: { width: 82 },
  seatBox: {
    width: 82,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(8,21,16,0.44)',
    borderWidth: 1,
    borderColor: 'rgba(248,226,187,0.12)',
    alignItems: 'center',
    gap: 2,
  },
  seatLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(245,231,203,0.55)' },
  seatName: { fontSize: 13, fontWeight: '700', color: '#f5e7cb' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(255,243,218,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(245,219,173,0.18)',
    borderStyle: 'dashed',
    paddingVertical: 10,
  },
  centerCode: { fontFamily: T.serif, fontSize: 22, fontWeight: '700', color: '#f9ebcf' },
  centerMeta: { fontSize: 10, color: 'rgba(249,235,207,0.55)', letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 },
  panel: {
    backgroundColor: T.panel,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: T.panelBorder,
  },
  panelEyebrow: { color: T.goldDeep, fontSize: 10, fontWeight: '800', letterSpacing: 1.8, textTransform: 'uppercase' },
  playerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.56)',
    borderWidth: 1,
    borderColor: 'rgba(134,106,64,0.12)',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: T.goldSoft, fontFamily: T.serif, fontSize: 14, fontWeight: '700' },
  playerMain: { flex: 1, minWidth: 110 },
  playerName: { fontSize: 14, fontWeight: '600', color: T.ink },
  playerSeat: { fontSize: 11, color: T.muted },
  statusTag: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 99 },
  statusOnline: { backgroundColor: 'rgba(37,93,66,0.14)' },
  statusOffline: { backgroundColor: 'rgba(142,62,56,0.12)' },
  statusTagText: { fontSize: 10, fontWeight: '800' },
  seatActions: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  seatBtn: {
    flexGrow: 1,
    flexBasis: '22%',
    minWidth: 54,
    paddingVertical: 6,
    borderRadius: 99,
    backgroundColor: 'rgba(18,42,32,0.08)',
    alignItems: 'center',
  },
  seatBtnText: { color: T.ink, fontWeight: '700', fontSize: 11 },
  cta: {
    paddingVertical: 13,
    borderRadius: 99,
    backgroundColor: T.gold,
    alignItems: 'center',
  },
  ctaDisabled: { opacity: 0.45 },
  ctaText: { color: '#1c2024', fontWeight: '700', fontSize: 14 },
  ghost: {
    paddingVertical: 11,
    borderRadius: 99,
    backgroundColor: 'rgba(18,42,32,0.08)',
    alignItems: 'center',
  },
  ghostText: { color: T.ink, fontWeight: '600', fontSize: 13 },
  errorText: { color: '#f1a39c', fontWeight: '700', fontSize: 12, textAlign: 'center' },
});
