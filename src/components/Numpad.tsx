import { View, Text } from 'react-native';
import { Delete } from 'lucide-react-native';
import { Pressable } from './Pressable';
import { colors } from '@/theme/colors';

type Props = {
  onDigit: (d: string) => void;
  onBackspace: () => void;
};

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'back'];

export function Numpad({ onDigit, onBackspace }: Props) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {KEYS.map((k) => (
        <Pressable
          key={k}
          onPress={() => (k === 'back' ? onBackspace() : onDigit(k))}
          haptic={k === 'back' ? 'medium' : 'light'}
          scaleTo={0.94}
          style={{
            width: '31.5%',
            aspectRatio: 1.8,
            backgroundColor: k === 'back' ? colors.bgSoft : colors.bgCard,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {k === 'back' ? (
            <Delete size={22} color={colors.inkSoft} />
          ) : (
            <Text style={{ color: colors.ink, fontSize: 24, fontWeight: '600' }}>{k}</Text>
          )}
        </Pressable>
      ))}
    </View>
  );
}
