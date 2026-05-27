import { ScrollView, View, Text } from 'react-native';
import { CreditCard, Wallet } from 'lucide-react-native';
import { Pressable } from './Pressable';
import { colors } from '@/theme/colors';
import type { Card } from '@/db/cards';

type Props = {
  cards: Card[];
  value: number | null;
  onChange: (cardId: number | null) => void;
};

export function PaymentMethodPicker({ cards, value, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingVertical: 2, paddingHorizontal: 2 }}
    >
      <Chip
        active={value == null}
        tint={colors.brand}
        Icon={Wallet}
        label="Caixa"
        onPress={() => onChange(null)}
      />
      {cards.map((c) => (
        <Chip
          key={c.id}
          active={value === c.id}
          tint={c.color}
          Icon={CreditCard}
          label={c.name}
          onPress={() => onChange(c.id)}
        />
      ))}
    </ScrollView>
  );
}

function Chip({
  active,
  tint,
  Icon,
  label,
  onPress,
}: {
  active: boolean;
  tint: string;
  Icon: any;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      haptic="selection"
      scaleTo={0.94}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 999,
        backgroundColor: active ? `${tint}22` : colors.bgCard,
        borderWidth: 1.5,
        borderColor: active ? tint : colors.line,
      }}
    >
      <Icon size={14} color={active ? tint : colors.inkMuted} strokeWidth={2.4} />
      <Text
        style={{
          color: active ? tint : colors.inkSoft,
          fontSize: 13,
          fontWeight: '700',
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}
