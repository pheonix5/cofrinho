import { ScrollView, View, Text } from 'react-native';
import { Zap } from 'lucide-react-native';
import { CategoryIcon } from './CategoryIcon';
import { Pressable } from './Pressable';
import { formatBRL } from '@/utils/format';
import { colors } from '@/theme/colors';
import type { FrequentShortcut } from '@/db/reports';

type Props = {
  shortcuts: FrequentShortcut[];
  onPick: (s: FrequentShortcut) => void;
};

export function QuickShortcuts({ shortcuts, onPick }: Props) {
  if (shortcuts.length === 0) return null;
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 }}>
        <Zap size={11} color={colors.brand} strokeWidth={2.4} />
        <Text
          style={{
            color: colors.inkMuted,
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 0.6,
            textTransform: 'uppercase',
          }}
        >
          Atalhos
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 2, paddingVertical: 2 }}
      >
        {shortcuts.map((s, i) => (
          <Pressable
            key={`${s.category_id}-${i}`}
            onPress={() => onPick(s)}
            haptic="selection"
            scaleTo={0.94}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingVertical: 8,
              paddingHorizontal: 10,
              backgroundColor: colors.bgCard,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: colors.line,
            }}
          >
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 999,
                backgroundColor: `${s.category_color}22`,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CategoryIcon name={s.category_icon} color={s.category_color} size={12} />
            </View>
            <Text style={{ color: colors.ink, fontSize: 12, fontWeight: '700' }} numberOfLines={1}>
              {s.description?.trim() || s.category_name}
            </Text>
            <Text
              style={{
                color: colors.inkMuted,
                fontSize: 12,
                fontWeight: '600',
                fontVariant: ['tabular-nums'],
              }}
            >
              {formatBRL(s.amount_cents)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
