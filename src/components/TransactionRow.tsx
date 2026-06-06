import { View, Text } from 'react-native';
import { Clock, CreditCard, Layers } from 'lucide-react-native';
import type { ListItem } from '@/db/types';
import { CategoryIcon } from './CategoryIcon';
import { Pressable } from './Pressable';
import { formatBRL } from '@/utils/format';
import { formatDateLabel } from '@/utils/date';
import { colors } from '@/theme/colors';

type Props = {
  tx: ListItem;
  onPress?: () => void;
  showDate?: boolean;
};

export function TransactionRow({ tx, onPress, showDate = true }: Props) {
  const isIncome = tx.kind === 'income';
  const color = tx.category_color ?? '#8A8A99';
  const isProjection = tx.is_projection === true;

  const cardName = !isProjection ? tx.card_name : null;
  const cardColor = !isProjection ? tx.card_color : null;
  const installmentTotal = !isProjection ? tx.installment_total : null;
  const installmentNumber = !isProjection ? tx.installment_number : null;
  const noCardInstallment =
    !isProjection &&
    !cardName &&
    installmentTotal != null &&
    installmentTotal > 1 &&
    installmentNumber != null;

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
        opacity: isProjection ? 0.7 : 1,
        borderWidth: isProjection ? 1 : 0,
        borderColor: isProjection ? colors.line : 'transparent',
        borderStyle: isProjection ? 'dashed' : 'solid',
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
          {isProjection ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 3,
                paddingHorizontal: 6,
                paddingVertical: 1,
                borderRadius: 999,
                backgroundColor: `${colors.inkMuted}22`,
              }}
            >
              <Clock size={9} color={colors.inkMuted} strokeWidth={2.4} />
              <Text style={{ color: colors.inkMuted, fontSize: 10, fontWeight: '700' }}>
                Previsto
              </Text>
            </View>
          ) : null}
          {cardName ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 3,
                paddingHorizontal: 6,
                paddingVertical: 1,
                borderRadius: 999,
                backgroundColor: `${cardColor ?? colors.inkMuted}22`,
              }}
            >
              <CreditCard size={9} color={cardColor ?? colors.inkMuted} strokeWidth={2.4} />
              <Text style={{ color: cardColor ?? colors.inkMuted, fontSize: 10, fontWeight: '700' }}>
                {cardName}
                {installmentTotal && installmentTotal > 1
                  ? ` ${installmentNumber}/${installmentTotal}`
                  : ''}
              </Text>
            </View>
          ) : null}
          {noCardInstallment ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 3,
                paddingHorizontal: 6,
                paddingVertical: 1,
                borderRadius: 999,
                backgroundColor: `${colors.accent}22`,
              }}
            >
              <Layers size={9} color={colors.accent} strokeWidth={2.4} />
              <Text style={{ color: colors.accent, fontSize: 10, fontWeight: '700' }}>
                {installmentNumber}/{installmentTotal}
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
