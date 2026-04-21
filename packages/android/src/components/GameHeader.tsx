import { View, Text, StyleSheet } from 'react-native';
import { T } from '../theme';

type Props = {
  hand: string;
  phase: string;
  contract?: string;
  trumpSym?: string;
  trumpColor?: string;
};

export function GameHeader({ hand, phase, contract, trumpSym, trumpColor }: Props) {
  return (
    <View style={s.root}>
      <View>
        <Text style={s.hand}>{hand}</Text>
        {contract ? (
          <View style={s.contractPill}>
            <Text style={s.contractText}>{contract}</Text>
          </View>
        ) : null}
      </View>
      <View style={s.right}>
        <View style={s.phasePill}>
          <Text style={s.phaseText}>{phase}</Text>
        </View>
        {trumpSym ? <Text style={[s.trump, { color: trumpColor ?? '#c8e6d4' }]}>{trumpSym}</Text> : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(2,10,7,0.4)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245,219,173,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hand: { fontSize: 10, color: 'rgba(246,231,201,0.55)', fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  contractPill: {
    alignSelf: 'flex-start',
    marginTop: 3,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 99,
    backgroundColor: 'rgba(231,238,229,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(54,96,72,0.2)',
  },
  contractText: { color: '#c8e6d4', fontSize: 12, fontWeight: '800', fontFamily: T.serif },
  right: { alignItems: 'flex-end', gap: 3 },
  phasePill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 99,
    backgroundColor: 'rgba(231,238,229,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(54,96,72,0.2)',
  },
  phaseText: { color: '#c8e6d4', fontSize: 11, fontWeight: '800' },
  trump: { fontFamily: T.serif, fontSize: 20 },
});
