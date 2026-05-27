import { View, Text } from 'react-native';
import { formatAmountInput } from '@/utils/format';
import { colors } from '@/theme/colors';
import type { TxKind } from '@/db/types';

export function AmountDisplay({
  digits,
  kind,
}: {
  digits: string;
  kind: TxKind;
}) {
  const tint = kind === 'income' ? colors.income : colors.expense;
  const sign = kind === 'income' ? '+' : '−';
  const empty = digits.replace(/\D/g, '') === '';

  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <Text style={{ color: colors.inkMuted, fontSize: 12, fontWeight: '600', letterSpacing: 0.5 }}>
        VALOR
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
        <Text style={{ color: empty ? colors.inkDim : tint, fontSize: 32, fontWeight: '700' }}>
          {empty ? '' : sign}
        </Text>
        <Text style={{ color: empty ? colors.inkDim : colors.ink, fontSize: 18, fontWeight: '600' }}>
          R$
        </Text>
        <Text
          style={{
            color: empty ? colors.inkDim : colors.ink,
            fontSize: 48,
            fontWeight: '800',
            letterSpacing: -1.5,
            fontVariant: ['tabular-nums'],
          }}
        >
          {formatAmountInput(digits)}
        </Text>
      </View>
    </View>
  );
}
