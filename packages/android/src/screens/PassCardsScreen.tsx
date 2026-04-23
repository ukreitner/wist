import { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { T } from '../theme';
import { WistCard } from '../components/WistCard';
import { sortCardsForDisplay } from '../components/cardLayout';
import type { NavProps } from '../nav';
import { useDemoState } from '../demo-state';

export default function PassCardsScreen({ navigation }: NavProps<'PassCards'>) {
  const [selected, setSelected] = useState<string[]>([]);
  const { leftOfSelf, hand, legalPassCardCodes, submitPass, error, clearError } = useDemoState();
  const sortedHand = sortCardsForDisplay(hand);

  const toggle = (key: string) => {
    setSelected((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= 3) return prev;
      return [...prev, key];
    });
  };

  const n = selected.length;

  return (
    <LinearGradient colors={[T.bgStart, T.bgMid, T.bgEnd]} style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.eyebrow}>Hand 1 · Special Rule</Text>
          <Text style={s.title}>Pass 3 Cards Left</Text>
          <Text style={s.lede}>
            Select 3 cards to pass to <Text style={s.ledeStrong}>{leftOfSelf.name}</Text>. All players pass simultaneously.
          </Text>
        </View>

        {/* Progress */}
        <View style={s.progressRow}>
          <Text style={s.progressLabel}>Cards selected</Text>
          <View style={s.dotsRow}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[s.progressDot, i < n && s.progressDotFilled]}>
                <Text style={[s.progressDotText, i < n && s.progressDotTextFilled]}>
                  {i < n ? '✓' : String(i + 1)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Hand (tap to select) */}
        <View style={{ gap: 10 }}>
          <Text style={s.sectionLabel}>Your Hand (tap to select)</Text>
          <View style={s.handGrid}>
            {sortedHand.map((card) => {
              const testKey = `${card.rank}-${card.suit}`;
              const isSel = selected.includes(card.code);
              const isPlayable = legalPassCardCodes.includes(card.code);
              return (
                <TouchableWithoutFeedback key={card.code} onPress={() => toggle(card.code)}>
                  <View
                    testID={`card-${testKey}`}
                    accessible
                    accessibilityLabel={`card-${testKey}`}
                    style={[s.cardSlot, isSel && s.cardSlotSelected]}
                  >
                    <WistCard
                      rank={card.rank}
                      suit={card.suit}
                      width={54}
                      selected={isSel}
                      playable={isPlayable && (!selected.length || isSel || selected.length < 3)}
                    />
                  </View>
                </TouchableWithoutFeedback>
              );
            })}
          </View>
        </View>

        {/* Selected preview */}
        {selected.length > 0 && (
          <View style={s.preview}>
            <Text style={s.previewLabel}>Passing:</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {selected.map((k) => {
                const card = hand.find((entry) => entry.code === k);

                if (!card) {
                  return null;
                }

                return <WistCard key={k} rank={card.rank} suit={card.suit} width={44} />;
              })}
            </View>
          </View>
        )}

        {/* Action */}
        <TouchableOpacity
          testID="cta-pass-cards"
          style={[s.cta, n !== 3 && s.ctaDisabled]}
          onPress={() => {
            if (n !== 3) return;
            clearError();
            submitPass(selected);
          }}
        >
          <Text style={s.ctaText}>
            {n === 3 ? `Pass Cards to ${leftOfSelf.name} →` : `Select ${3 - n} more card${3 - n !== 1 ? 's' : ''}`}
          </Text>
        </TouchableOpacity>
        {error ? <Text style={s.errorText}>{error}</Text> : null}
      </ScrollView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingTop: 40, paddingBottom: 24, gap: 12 },
  header: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(2,10,7,0.4)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245,219,173,0.08)',
    gap: 4,
  },
  eyebrow: { fontSize: 10, color: 'rgba(246,231,201,0.6)', letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { fontFamily: T.serif, fontSize: 22, color: '#f6e7c9', marginTop: 2 },
  lede: { fontSize: 12, color: 'rgba(246,231,201,0.65)', lineHeight: 18 },
  ledeStrong: { color: T.goldSoft, fontWeight: '700' },
  progressRow: {
    marginHorizontal: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: T.panel,
    borderWidth: 1,
    borderColor: T.panelBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressLabel: { fontSize: 13, color: T.ink, fontWeight: '600' },
  dotsRow: { flexDirection: 'row', gap: 6 },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(111,80,42,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotFilled: { borderColor: T.gold, backgroundColor: 'rgba(213,166,82,0.22)' },
  progressDotText: { fontSize: 13, fontWeight: '700', color: T.muted },
  progressDotTextFilled: { color: T.goldDeep },
  sectionLabel: {
    paddingHorizontal: 12,
    fontSize: 10,
    color: 'rgba(246,231,201,0.5)',
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  handGrid: {
    paddingHorizontal: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 6,
    rowGap: 9,
    justifyContent: 'center',
    paddingTop: 12,
    overflow: 'visible',
  },
  cardSlot: { overflow: 'visible' },
  cardSlotSelected: { zIndex: 20, elevation: 20 },
  preview: {
    marginHorizontal: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(213,166,82,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(213,166,82,0.22)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  previewLabel: { fontSize: 12, color: T.goldDeep, fontWeight: '700' },
  cta: {
    marginHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 99,
    backgroundColor: T.gold,
    alignItems: 'center',
  },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { color: '#1c2024', fontWeight: '700', fontSize: 14 },
  errorText: { color: '#f1a39c', fontWeight: '700', fontSize: 12, textAlign: 'center' },
});
