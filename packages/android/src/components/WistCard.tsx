import { memo } from 'react';
import { View, StyleSheet, Text, TouchableWithoutFeedback } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Text as SvgText } from 'react-native-svg';
import { SUIT_COLOR, SUIT_SYM, rankLabel, T } from '../theme';

export type Suit = 'C' | 'D' | 'H' | 'S';
export type Card = { rank: number; suit: Suit };

type Props = {
  rank: number;
  suit: Suit;
  width?: number;
  selected?: boolean;
  playable?: boolean;
  faceDown?: boolean;
  onPress?: () => void;
};

function WistCardImpl({ rank, suit, width = 68, selected = false, playable = true, faceDown = false, onPress }: Props) {
  const h = Math.round((width * 260) / 180);

  if (faceDown) {
    const card = (
      <View
        style={[
          s.faceDown,
          {
            width,
            height: h,
            borderRadius: width * 0.11,
          },
        ]}
      >
        <Text style={[s.faceDownLetter, { fontSize: Math.round(width * 0.15) }]}>W</Text>
      </View>
    );
    return onPress ? <TouchableWithoutFeedback onPress={onPress}>{card}</TouchableWithoutFeedback> : card;
  }

  const fill = SUIT_COLOR[suit];
  const sym = SUIT_SYM[suit];
  const rl = rankLabel(rank);
  const gid = `wg-${rank}-${suit}`;

  const translateY = selected ? -16 : 0;
  const opacity = !playable && onPress ? 0.42 : 1;

  const body = (
    <View style={{ opacity, transform: [{ translateY }] }}>
      <Svg viewBox="0 0 180 260" width={width} height={h}>
        <Defs>
          <LinearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#fffdf8" />
            <Stop offset="100%" stopColor="#f1e8d8" />
          </LinearGradient>
        </Defs>
        <Rect x={8} y={8} width={164} height={244} rx={20} fill={`url(#${gid})`} stroke="#d3c2a6" strokeWidth={4} />
        <Rect x={18} y={18} width={144} height={224} rx={16} fill="none" stroke="#eadbc0" strokeWidth={2} />
        <SvgText x={26} y={44} textAnchor="middle" fontSize={rl === '10' ? 35 : 40} fontWeight="800" fill={fill} fontFamily={T.serif}>
          {rl}
        </SvgText>
        <SvgText x={26} y={78} textAnchor="middle" fontSize={28} fill={fill}>
          {sym}
        </SvgText>
        <SvgText x={154} y={224} textAnchor="middle" fontSize={rl === '10' ? 35 : 40} fontWeight="800" fill={fill} fontFamily={T.serif} rotation={180} origin="154,224">
          {rl}
        </SvgText>
        <SvgText x={154} y={194} textAnchor="middle" fontSize={28} fill={fill} rotation={180} origin="154,194">
          {sym}
        </SvgText>
        {rank === 14 ? (
          <>
            <SvgText x={90} y={165} textAnchor="middle" fontSize={110} fill={fill}>
              {sym}
            </SvgText>
            <SvgText x={90} y={205} textAnchor="middle" fontSize={26} fontWeight="700" fill={fill} opacity={0.8}>
              ACE
            </SvgText>
          </>
        ) : rank >= 11 ? (
          <>
            <SvgText x={90} y={140} textAnchor="middle" fontSize={86} fontWeight="700" fill={fill} fontFamily={T.serif}>
              {rl}
            </SvgText>
            <SvgText x={90} y={190} textAnchor="middle" fontSize={58} fill={fill}>
              {sym}
            </SvgText>
          </>
        ) : (
          <SvgText x={90} y={160} textAnchor="middle" fontSize={50} fill={fill}>
            {sym}
          </SvgText>
        )}
      </Svg>
    </View>
  );

  return onPress ? <TouchableWithoutFeedback onPress={onPress}>{body}</TouchableWithoutFeedback> : body;
}

export const WistCard = memo(WistCardImpl);

const s = StyleSheet.create({
  faceDown: {
    backgroundColor: '#19372a',
    borderWidth: 2,
    borderColor: 'rgba(255,224,171,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceDownLetter: {
    color: '#f7ecd7',
    fontFamily: T.serif,
    letterSpacing: 2,
  },
});
