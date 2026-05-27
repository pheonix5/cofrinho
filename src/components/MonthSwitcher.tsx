import { View, Text } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Pressable } from './Pressable';
import { formatMonthYear, shiftMonth } from '@/utils/date';
import { colors } from '@/theme/colors';

type Props = {
  date: Date;
  onChange: (next: Date) => void;
};

export function MonthSwitcher({ date, onChange }: Props) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingHorizontal: 4,
      }}
    >
      <Pressable
        onPress={() => onChange(shiftMonth(date, -1))}
        haptic="light"
        style={{
          width: 36,
          height: 36,
          borderRadius: 999,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.bgSoft,
        }}
      >
        <ChevronLeft size={20} color={colors.inkSoft} />
      </Pressable>

      <Text
        style={{
          flex: 1,
          textAlign: 'center',
          color: colors.ink,
          fontSize: 15,
          fontWeight: '700',
          letterSpacing: 0.2,
        }}
      >
        {formatMonthYear(date)}
      </Text>

      <Pressable
        onPress={() => onChange(shiftMonth(date, 1))}
        haptic="light"
        style={{
          width: 36,
          height: 36,
          borderRadius: 999,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.bgSoft,
        }}
      >
        <ChevronRight size={20} color={colors.inkSoft} />
      </Pressable>
    </View>
  );
}
