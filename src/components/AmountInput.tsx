import { forwardRef, useImperativeHandle, useRef } from 'react';
import { View, Text, TextInput } from 'react-native';
import { formatAmountInput } from '@/utils/format';
import { colors } from '@/theme/colors';
import type { TxKind } from '@/db/types';

type Props = {
  digits: string;
  kind: TxKind;
  onChangeDigits: (digits: string) => void;
  autoFocus?: boolean;
  maxLength?: number;
};

export type AmountInputHandle = {
  focus: () => void;
  blur: () => void;
};

export const AmountInput = forwardRef<AmountInputHandle, Props>(function AmountInput(
  { digits, kind, onChangeDigits, autoFocus, maxLength = 11 },
  ref
) {
  const inputRef = useRef<TextInput>(null);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    blur: () => inputRef.current?.blur(),
  }));

  const tint = kind === 'income' ? colors.income : colors.expense;
  const sign = kind === 'income' ? '+' : '−';
  const empty = digits.replace(/\D/g, '') === '';

  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <Text style={{ color: colors.inkMuted, fontSize: 12, fontWeight: '600', letterSpacing: 0.5 }}>
        VALOR
      </Text>
      <View style={{ position: 'relative', alignSelf: 'stretch', minHeight: 64 }}>
        <View
          pointerEvents="none"
          style={{
            ...StyleSheetAbsoluteFill,
            flexDirection: 'row',
            alignItems: 'baseline',
            justifyContent: 'center',
            gap: 6,
          }}
        >
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
        <TextInput
          ref={inputRef}
          value={digits.replace(/\D/g, '')}
          onChangeText={(text) => {
            const cleaned = text.replace(/\D/g, '').slice(0, maxLength);
            onChangeDigits(cleaned);
          }}
          keyboardType="number-pad"
          inputMode="numeric"
          autoFocus={autoFocus}
          caretHidden
          contextMenuHidden
          selectionColor="transparent"
          maxLength={maxLength}
          style={{
            width: '100%',
            minHeight: 64,
            fontSize: 48,
            color: 'transparent',
            textAlign: 'center',
            padding: 0,
          }}
        />
      </View>
    </View>
  );
});

const StyleSheetAbsoluteFill = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};
