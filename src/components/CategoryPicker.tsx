import { ScrollView, View, Text } from 'react-native';
import { CategoryIcon } from './CategoryIcon';
import { Pressable } from './Pressable';
import { colors } from '@/theme/colors';
import type { Category } from '@/db/types';

type Props = {
  categories: Category[];
  selectedId: number | null;
  onSelect: (id: number) => void;
};

export function CategoryPicker({ categories, selectedId, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 10, paddingVertical: 4, paddingHorizontal: 2 }}
    >
      {categories.map((c) => {
        const selected = c.id === selectedId;
        return (
          <Pressable
            key={c.id}
            onPress={() => onSelect(c.id)}
            haptic="selection"
            style={{
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 6,
              minWidth: 76,
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 18,
                backgroundColor: selected ? c.color : `${c.color}22`,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: selected ? c.color : 'transparent',
              }}
            >
              <CategoryIcon
                name={c.icon}
                color={selected ? colors.bg : c.color}
                size={22}
              />
            </View>
            <Text
              style={{
                color: selected ? colors.ink : colors.inkMuted,
                fontSize: 11,
                fontWeight: selected ? '700' : '500',
                textAlign: 'center',
                maxWidth: 76,
              }}
              numberOfLines={1}
            >
              {c.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
