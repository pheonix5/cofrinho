import { Plus } from 'lucide-react-native';
import { View } from 'react-native';
import { Pressable } from './Pressable';
import { colors } from '@/theme/colors';

export function FAB({ onPress }: { onPress: () => void }) {
  return (
    <View
      style={{
        position: 'absolute',
        right: 20,
        bottom: 20,
      }}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={onPress}
        haptic="medium"
        scaleTo={0.92}
        style={{
          width: 60,
          height: 60,
          borderRadius: 999,
          backgroundColor: colors.brand,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: colors.brand,
          shadowOpacity: 0.45,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
          elevation: 10,
        }}
      >
        <Plus size={28} color={colors.bg} strokeWidth={2.8} />
      </Pressable>
    </View>
  );
}
