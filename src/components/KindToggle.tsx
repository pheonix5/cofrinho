import { View, Text } from 'react-native';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';
import { Pressable } from './Pressable';
import { colors } from '@/theme/colors';
import type { TxKind } from '@/db/types';

type Props = {
  value: TxKind;
  onChange: (v: TxKind) => void;
};

export function KindToggle({ value, onChange }: Props) {
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.bgSoft,
        borderRadius: 14,
        padding: 4,
        gap: 4,
      }}
    >
      <Option
        active={value === 'expense'}
        tint={colors.expense}
        label="Saída"
        Icon={ArrowUpRight}
        onPress={() => onChange('expense')}
      />
      <Option
        active={value === 'income'}
        tint={colors.income}
        label="Entrada"
        Icon={ArrowDownLeft}
        onPress={() => onChange('income')}
      />
    </View>
  );
}

function Option({
  active,
  tint,
  label,
  Icon,
  onPress,
}: {
  active: boolean;
  tint: string;
  label: string;
  Icon: any;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      haptic="selection"
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 10,
        backgroundColor: active ? `${tint}22` : 'transparent',
      }}
    >
      <Icon size={16} color={active ? tint : colors.inkMuted} strokeWidth={2.4} />
      <Text
        style={{
          color: active ? tint : colors.inkMuted,
          fontWeight: '700',
          fontSize: 14,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
