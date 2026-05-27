import { View, Text } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { colors } from '@/theme/colors';

export function EmptyState({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
        paddingHorizontal: 32,
        gap: 12,
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 999,
          backgroundColor: colors.bgCard,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Sparkles size={24} color={colors.brand} />
      </View>
      <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '700', textAlign: 'center' }}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={{ color: colors.inkMuted, fontSize: 13, textAlign: 'center', lineHeight: 18 }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
