import { View, Text, TextInput } from 'react-native';
import { Minus, Plus, Layers } from 'lucide-react-native';
import { Pressable } from './Pressable';
import { colors } from '@/theme/colors';

type Props = {
  value: number;
  onChange: (n: number) => void;
  amountCents: number;
};

export function InstallmentPicker({ value, onChange, amountCents }: Props) {
  const per = value > 0 ? amountCents / value : 0;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: colors.bgCard,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.line,
      }}
    >
      <Layers size={18} color={colors.inkSoft} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: colors.inkMuted, fontSize: 11, fontWeight: '600' }}>
          {value === 1 ? 'À vista' : `${value}× de R$ ${(per / 100).toFixed(2).replace('.', ',')}`}
        </Text>
        <Text style={{ color: colors.inkDim, fontSize: 10 }}>Parcelamento</Text>
      </View>
      <Pressable
        onPress={() => onChange(Math.max(1, value - 1))}
        haptic="light"
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          backgroundColor: colors.bgElev,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Minus size={16} color={colors.inkSoft} />
      </Pressable>
      <TextInput
        value={String(value)}
        onChangeText={(v) => {
          const n = parseInt(v.replace(/\D/g, ''), 10);
          if (!Number.isNaN(n)) onChange(Math.max(1, Math.min(24, n)));
        }}
        keyboardType="number-pad"
        maxLength={2}
        style={{
          minWidth: 28,
          color: colors.ink,
          fontSize: 16,
          fontWeight: '800',
          textAlign: 'center',
        }}
      />
      <Pressable
        onPress={() => onChange(Math.min(24, value + 1))}
        haptic="light"
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          backgroundColor: colors.bgElev,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Plus size={16} color={colors.inkSoft} />
      </Pressable>
    </View>
  );
}
