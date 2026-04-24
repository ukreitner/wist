import { memo } from 'react';
import { View, StyleSheet, Text, TouchableWithoutFeedback } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop, Rect, Text as SvgText } from 'react-native-svg';
import { SUIT_COLOR, SUIT_SYM, rankLabel, T } from '../theme';

export type Suit = 'C' | 'D' | 'H' | 'S';
export type Card = { rank: number; suit: Suit };

type Props = {
  rank: number;
  suit: Suit;
  width?: number;
  selected?: boolean;
  playable?: boolean;
  highlighted?: boolean;
  faceDown?: boolean;
  onPress?: () => void;
};

function WistCardImpl({ rank, suit, width = 68, selected = false, playable = true, highlighted = false, faceDown = false, onPress }: Props) {
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
  const accentGid = `wa-${rank}-${suit}`;

  const translateY = selected ? -16 : 0;
  const opacity = playable ? 1 : 0.42;

  const body = (
    <View
      style={[
        s.cardShell,
        selected && s.cardShellSelected,
        highlighted && s.cardShellHighlighted,
        {
          width,
          height: h,
          borderRadius: width * 0.13,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <Svg viewBox="0 0 180 260" width={width} height={h}>
        <Defs>
          <LinearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#fffaf0" />
            <Stop offset="52%" stopColor="#f8edd9" />
            <Stop offset="100%" stopColor="#ead9bd" />
          </LinearGradient>
          <LinearGradient id={accentGid} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={fill} stopOpacity={0.16} />
            <Stop offset="100%" stopColor={fill} stopOpacity={0.03} />
          </LinearGradient>
        </Defs>
        <Rect x={6} y={6} width={168} height={248} rx={22} fill={`url(#${gid})`} stroke="#b79563" strokeWidth={3} />
        {highlighted ? <Rect x={10} y={10} width={160} height={240} rx={20} fill="none" stroke="#d5a652" strokeWidth={7} opacity={0.9} /> : null}
        <Rect x={15} y={15} width={150} height={230} rx={17} fill="none" stroke="#fff8e8" strokeWidth={2} opacity={0.82} />
        <Rect x={24} y={96} width={132} height={68} rx={24} fill={`url(#${accentGid})`} />
        <Path d="M34 92 C58 62, 122 62, 146 92" stroke={fill} strokeWidth={4} strokeLinecap="round" fill="none" opacity={0.18} />
        <Path d="M34 168 C58 198, 122 198, 146 168" stroke={fill} strokeWidth={4} strokeLinecap="round" fill="none" opacity={0.18} />
        <Circle cx={90} cy={130} r={45} fill="#fff9ec" opacity={0.58} />
        <SvgText x={27} y={43} textAnchor="middle" fontSize={rl === '10' ? 32 : 37} fontWeight="900" fill={fill} fontFamily={T.serif}>
          {rl}
        </SvgText>
        <SvgText x={27} y={76} textAnchor="middle" fontSize={28} fill={fill}>
          {sym}
        </SvgText>
        <SvgText x={153} y={224} textAnchor="middle" fontSize={rl === '10' ? 32 : 37} fontWeight="900" fill={fill} fontFamily={T.serif} rotation={180} origin="153,224">
          {rl}
        </SvgText>
        <SvgText x={153} y={192} textAnchor="middle" fontSize={28} fill={fill} rotation={180} origin="153,192">
          {sym}
        </SvgText>
        {rank === 14 ? (
          <>
            <SvgText x={90} y={139} textAnchor="middle" fontSize={78} fontWeight="900" fill={fill} fontFamily={T.serif}>
              {rl}
            </SvgText>
            <SvgText x={90} y={193} textAnchor="middle" fontSize={62} fill={fill}>
              {sym}
            </SvgText>
          </>
        ) : rank >= 11 ? (
          <>
            <SvgText x={90} y={141} textAnchor="middle" fontSize={82} fontWeight="900" fill={fill} fontFamily={T.serif}>
              {rl}
            </SvgText>
            <SvgText x={90} y={189} textAnchor="middle" fontSize={54} fill={fill}>
              {sym}
            </SvgText>
          </>
        ) : (
          <>
            <SvgText x={90} y={153} textAnchor="middle" fontSize={56} fill={fill}>
              {sym}
            </SvgText>
            <SvgText x={90} y={190} textAnchor="middle" fontSize={30} fontWeight="900" fill={fill} fontFamily={T.serif}>
              {rl}
            </SvgText>
          </>
        )}
      </Svg>
    </View>
  );

  return onPress ? <TouchableWithoutFeedback onPress={onPress}>{body}</TouchableWithoutFeedback> : body;
}

export const WistCard = memo(WistCardImpl);

const s = StyleSheet.create({
  cardShell: {
    backgroundColor: '#f8edd9',
    shadowColor: '#020806',
    shadowOpacity: 0.26,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  cardShellSelected: {
    shadowColor: '#f7d07d',
    shadowOpacity: 0.55,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  cardShellHighlighted: {
    shadowColor: '#f5c460',
    shadowOpacity: 0.85,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
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
