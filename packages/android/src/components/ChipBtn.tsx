import { TouchableOpacity, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { T } from '../theme';

type Props = {
  label: string | number;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function ChipBtn({ label, selected, disabled, onPress, style, testID }: Props) {
  return (
    <TouchableOpacity
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      style={[
        s.btn,
        disabled && s.disabled,
        selected && s.selected,
        style,
      ]}
    >
      <Text style={[s.text, selected && s.textSelected, disabled && s.textDisabled]}>{String(label)}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: 99,
    alignItems: 'center',
    backgroundColor: 'rgba(18,42,32,0.09)',
  },
  selected: {
    backgroundColor: 'rgba(213,166,82,0.34)',
  },
  disabled: {
    backgroundColor: 'rgba(18,42,32,0.04)',
  },
  text: { fontSize: 13, fontWeight: '700', color: T.ink },
  textSelected: { color: '#1e271e' },
  textDisabled: { color: 'rgba(26,34,40,0.3)' },
});
