import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { T } from '../theme';
import type { NavProps } from '../nav';

export default function HomeScreen({ navigation }: NavProps<'Home'>) {
  const [createName, setCreateName] = useState('Dani');
  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState('Dani');

  return (
    <LinearGradient colors={[T.bgStart, T.bgMid, T.bgEnd]} style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.topRow}>
          <View style={s.brandPill}><Text style={s.brandText}>WIST</Text></View>
          <TouchableOpacity style={s.langBtn}><Text style={s.langText}>EN</Text></TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: 2 }}>
          <Text style={s.eyebrow}>Online Multiplayer</Text>
          <Text style={s.title}>Wist</Text>
          <Text style={s.lede}>Four-player trick-taking with auction bidding. Play with friends anywhere.</Text>
        </View>

        <Panel label="New Game" heading="Create Room">
          <TextInput style={s.input} value={createName} onChangeText={setCreateName} placeholder="Your nickname" placeholderTextColor="#8a8a8a" />
          <Cta label="Create Room" onPress={() => navigation.navigate('Lobby')} testID="cta-create" />
        </Panel>

        <Panel label="Join Game" heading="Join Room">
          <TextInput style={s.input} value={joinCode} onChangeText={(v) => setJoinCode(v.toUpperCase())} placeholder="Room code (e.g. KZPQ)" placeholderTextColor="#8a8a8a" />
          <TextInput style={s.input} value={joinName} onChangeText={setJoinName} placeholder="Your nickname" placeholderTextColor="#8a8a8a" />
          <Cta label="Join Room" onPress={() => navigation.navigate('Lobby')} testID="cta-join" />
        </Panel>

        <Panel label="On this device" heading="Recent Rooms">
          {[
            { code: 'KZPQ', nick: 'Dani', time: 'Today, 14:32' },
            { code: 'MRWV', nick: 'Dani', time: 'Yesterday, 21:10' },
          ].map((r) => (
            <View key={r.code} style={s.recent}>
              <View>
                <Text style={s.recentCode}>{r.code}</Text>
                <Text style={s.recentMeta}>{r.nick} · {r.time}</Text>
              </View>
              <TouchableOpacity style={s.ghostBtn} onPress={() => navigation.navigate('Lobby')}>
                <Text style={s.ghostBtnText}>Resume</Text>
              </TouchableOpacity>
            </View>
          ))}
        </Panel>
      </ScrollView>
    </LinearGradient>
  );
}

function Panel({ label, heading, children }: { label: string; heading: string; children: React.ReactNode }) {
  return (
    <View style={s.panel}>
      <Text style={s.panelEyebrow}>{label}</Text>
      <Text style={s.panelHeading}>{heading}</Text>
      {children}
    </View>
  );
}

function Cta({ label, onPress, testID }: { label: string; onPress: () => void; testID?: string }) {
  return (
    <TouchableOpacity onPress={onPress} testID={testID} style={s.cta}>
      <Text style={s.ctaText}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 16, paddingTop: 52, paddingBottom: 40, gap: 14 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandPill: { paddingVertical: 7, paddingHorizontal: 15, borderRadius: 99, backgroundColor: 'rgba(248,233,202,0.18)' },
  brandText: { color: '#f6e6c4', letterSpacing: 4, fontSize: 12, fontWeight: '700' },
  langBtn: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 99, backgroundColor: 'rgba(248,233,202,0.1)' },
  langText: { color: 'rgba(246,231,201,0.8)', fontSize: 12, fontWeight: '600' },
  eyebrow: { color: T.goldDeep, fontSize: 10, fontWeight: '800', letterSpacing: 1.8, textTransform: 'uppercase' },
  title: { fontFamily: T.serif, color: '#f6e7c9', fontSize: 30, marginTop: 4, marginBottom: 6 },
  lede: { color: 'rgba(246,231,201,0.7)', fontSize: 13, lineHeight: 20 },
  panel: { backgroundColor: T.panel, borderRadius: 20, padding: 16, gap: 10, borderWidth: 1, borderColor: T.panelBorder, marginTop: 4 },
  panelEyebrow: { color: T.goldDeep, fontSize: 10, fontWeight: '800', letterSpacing: 1.8, textTransform: 'uppercase' },
  panelHeading: { fontFamily: T.serif, fontSize: 19, color: T.ink },
  input: { width: '100%', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 13, borderWidth: 1, borderColor: 'rgba(109,86,46,0.18)', backgroundColor: 'rgba(255,253,247,0.93)', color: T.ink, fontSize: 14 },
  cta: { width: '100%', paddingVertical: 13, borderRadius: 99, backgroundColor: T.gold, alignItems: 'center' },
  ctaText: { color: '#1c2024', fontWeight: '700', fontSize: 14 },
  recent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, paddingHorizontal: 13, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.54)', borderWidth: 1, borderColor: 'rgba(134,106,64,0.12)' },
  recentCode: { fontFamily: T.serif, fontSize: 15, fontWeight: '700', color: T.ink },
  recentMeta: { fontSize: 11, color: T.muted, marginTop: 1 },
  ghostBtn: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 99, backgroundColor: 'rgba(18,42,32,0.08)' },
  ghostBtnText: { color: T.ink, fontWeight: '600', fontSize: 12 },
});
