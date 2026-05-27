import { View, Text } from 'react-native';
import { CreditCard } from 'lucide-react-native';
import type { TransactionWithCategory } from '@/db/types';
import { CategoryIcon } from './CategoryIcon';
import { Pressable } from './Pressable';
import { formatBRL } from '@/utils/format';
import { formatDateLabel } from '@/utils/date';
import { colors } from '@/theme/colors';

type Props = {
  tx: TransactionWithCategory;
  onPress?: () => void;
  showDate?: boolean;
};

export function TransactionRow({ tx, onPress, showDate = true }: Props) {
  const isIncome = tx.kind === 'income';
  const color = tx.category_color ?? '#8A8A99';

  return (
    <Pressable
      onPress={onPress}
      haptic="selection"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: '#1C1C26',
        borderRadius: 16,
        marginBottom: 8,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: `${color}22`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CategoryIcon name={tx.category_icon ?? 'circle'} color={color} size={20} />
      </View>

      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ color: '#F4F4F7', fontSize: 15, fontWeight: '600' }} numberOfLines={1}>
          {tx.description?.trim() || tx.category_name || 'Sem categoria'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Text style={{ color: '#8A8A99', fontSize: 12 }}>
            {tx.category_name ?? 'Sem categoria'}
            {showDate ? ` · ${formatDateLabel(tx.occurred_at)}` : ''}
          </Text>
          {tx.card_name ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 3,
                paddingHorizontal: 6,
                paddingVertical: 1,
                borderRadius: 999,
                backgroundColor: `${tx.card_color ?? colors.inkMuted}22`,
              }}
            >
              <CreditCard size={9} color={tx.card_color ?? colors.inkMuted} strokeWidth={2.4} />
              <Text style={{ color: tx.card_color ?? colors.inkMuted, fontSize: 10, fontWeight: '700' }}>
                {tx.card_name}
                {tx.installment_total && tx.installment_total > 1
                  ? ` ${tx.installment_number}/${tx.installment_total}`
                  : ''}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <Text
        style={{
          color: isIncome ? '#4ADE80' : '#F87171',
          fontSize: 15,
          fontWeight: '700',
          fontVariant: ['tabular-nums'],
        }}
      >
        {isIncome ? '+ ' : '− '}
        {formatBRL(tx.amount_cents)}
      </Text>
    </Pressable>
  );
}
