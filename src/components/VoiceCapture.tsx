import { useEffect, useRef } from 'react';
import { View, Text, Modal, Animated, Easing } from 'react-native';
import { Mic, X } from 'lucide-react-native';
import { Pressable } from './Pressable';
import { useVoice } from '@/voice/useVoice';
import { parseVoiceCommand } from '@/voice/parser';
import type { ParsedVoice } from '@/voice/parser';
import { colors } from '@/theme/colors';

type Props = {
  visible: boolean;
  onClose: () => void;
  onResult: (parsed: ParsedVoice, raw: string) => void;
};

export function VoiceCapture({ visible, onClose, onResult }: Props) {
  const { state, partial, error, start, stop, cancel } = useVoice();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    start();
  }, [visible, start]);

  useEffect(() => {
    if (state === 'listening') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [state, pulse]);

  const handleStop = async () => {
    const text = await stop();
    if (text) {
      onResult(parseVoiceCommand(text), text);
    }
    onClose();
  };

  const handleCancel = async () => {
    await cancel();
    onClose();
  };

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleCancel}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.7)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <View
          style={{
            width: '100%',
            backgroundColor: colors.bgCard,
            borderRadius: 28,
            padding: 28,
            alignItems: 'center',
            gap: 20,
            borderWidth: 1,
            borderColor: colors.line,
          }}
        >
          <View style={{ alignItems: 'center', justifyContent: 'center', height: 140, width: 140 }}>
            <Animated.View
              style={{
                position: 'absolute',
                width: 110,
                height: 110,
                borderRadius: 999,
                backgroundColor: colors.brand,
                opacity,
                transform: [{ scale }],
              }}
            />
            <View
              style={{
                width: 92,
                height: 92,
                borderRadius: 999,
                backgroundColor: colors.brand,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Mic size={36} color={colors.bg} strokeWidth={2.4} />
            </View>
          </View>

          <View style={{ alignItems: 'center', gap: 6, minHeight: 60 }}>
            <Text style={{ color: colors.inkMuted, fontSize: 12, fontWeight: '600', letterSpacing: 0.5 }}>
              {state === 'listening' ? 'OUVINDO…' : state === 'processing' ? 'PROCESSANDO…' : state === 'error' ? 'ERRO' : 'PRONTO'}
            </Text>
            <Text
              style={{
                color: colors.ink,
                fontSize: 16,
                textAlign: 'center',
                fontStyle: partial ? 'normal' : 'italic',
              }}
              numberOfLines={3}
            >
              {partial || 'Diga algo como “gastei 35 reais no mercado”.'}
            </Text>
            {error ? (
              <Text style={{ color: colors.expense, fontSize: 12, textAlign: 'center' }}>{error}</Text>
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
            <Pressable
              onPress={handleCancel}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 14,
                backgroundColor: colors.bgSoft,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <X size={16} color={colors.inkSoft} />
              <Text style={{ color: colors.inkSoft, fontWeight: '600' }}>Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={handleStop}
              haptic="medium"
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 14,
                backgroundColor: colors.brand,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: colors.bg, fontWeight: '700' }}>Concluir</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
