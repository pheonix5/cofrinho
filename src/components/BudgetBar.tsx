import { View } from 'react-native';
import { colors } from '@/theme/colors';

export function BudgetBar({ pct, color }: { pct: number; color?: string }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const tint = color ?? pickColor(clamped);
  return (
    <View
      style={{
        height: 8,
        borderRadius: 999,
        backgroundColor: colors.bgElev,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${clamped}%`,
          height: '100%',
          borderRadius: 999,
          backgroundColor: tint,
        }}
      />
    </View>
  );
}

export function pickColor(pct: number): string {
  if (pct >= 100) return colors.expense;
  if (pct >= 80) return colors.warn;
  return colors.income;
}
