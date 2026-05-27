import * as Haptics from 'expo-haptics';
import { useRef } from 'react';
import { Animated, Pressable as RNPressable } from 'react-native';
import type { PressableProps, ViewStyle, StyleProp } from 'react-native';

type Props = PressableProps & {
  haptic?: 'light' | 'medium' | 'heavy' | 'selection' | false;
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
};

export function Pressable({
  haptic = 'light',
  scaleTo = 0.97,
  style,
  onPressIn,
  onPressOut,
  onPress,
  children,
  ...rest
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <RNPressable
      onPressIn={(e) => {
        Animated.spring(scale, { toValue: scaleTo, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic === 'selection') Haptics.selectionAsync();
        else if (haptic) {
          const map = {
            light: Haptics.ImpactFeedbackStyle.Light,
            medium: Haptics.ImpactFeedbackStyle.Medium,
            heavy: Haptics.ImpactFeedbackStyle.Heavy,
          } as const;
          Haptics.impactAsync(map[haptic]);
        }
        onPress?.(e);
      }}
      {...rest}
    >
      <Animated.View style={[{ transform: [{ scale }] }, style]}>{children as any}</Animated.View>
    </RNPressable>
  );
}
