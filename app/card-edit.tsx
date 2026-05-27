import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Check, CreditCard, Trash2 } from 'lucide-react-native';

import { Pressable } from '@/components/Pressable';
import {
  createCard,
  deleteCard,
  getCard,
  updateCard,
} from '@/db/cards';
import { useBumpReload } from '@/hooks/useReload';
import { colors } from '@/theme/colors';

const CARD_COLORS = [
  '#A78BFA', '#F472B6', '#60A5FA', '#34D399',
  '#FBBF24', '#FB923C', '#F87171', '#22D3EE',
  '#9AE66E', '#C084FC', '#94A3B8', '#FB7185',
];

export default function CardEditScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const bump = useBumpReload();
  const params = useLocalSearchParams<{ id?: string }>();
  const editingId = params.id ? parseInt(params.id, 10) : null;
  const isEditing = editingId !== null && !Number.isNaN(editingId);

  const [name, setName] = useState('');
  const [color, setColor] = useState(CARD_COLORS[0]);
  const [closingDay, setClosingDay] = useState(25);
  const [dueDay, setDueDay] = useState(10);
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!isEditing) return;
    (async () => {
      const c = await getCard(db, editingId!);
      if (!c) return;
      setName(c.name);
      setColor(c.color);
      setClosingDay(c.closing_day);
      setDueDay(c.due_day);
      setActive(c.active === 1);
    })();
  }, [db, editingId, isEditing]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Nome obrigatório', 'Dê um nome ao cartão.');
      return;
    }
    const payload = { name, color, closing_day: closingDay, due_day: dueDay, active };
    if (isEditing) {
      await updateCard(db, editingId!, payload);
    } else {
      await createCard(db, payload);
    }
    bump();
    router.back();
  };

  const handleDelete = () => {
    Alert.alert(
      'Apagar cartão?',
      'Os lançamentos feitos nele continuam, mas perdem o vínculo com o cartão.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            await deleteCard(db, editingId!);
            bump();
            router.back();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              backgroundColor: colors.bgSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} color={colors.inkSoft} />
          </Pressable>
          <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '700' }}>
            {isEditing ? 'Editar cartão' : 'Novo cartão'}
          </Text>
          {isEditing ? (
            <Pressable
              onPress={handleDelete}
              haptic="medium"
              style={{
                width: 40,
                height: 40,
                borderRadius: 999,
                backgroundColor: colors.bgSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Trash2 size={18} color={colors.expense} />
            </Pressable>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 22 }}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={{
              backgroundColor: colors.bgCard,
              borderRadius: 24,
              padding: 22,
              gap: 12,
              borderWidth: 1,
              borderColor: colors.line,
            }}
          >
            <View
              style={{
                alignSelf: 'flex-start',
                width: 60,
                height: 60,
                borderRadius: 18,
                backgroundColor: `${color}22`,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CreditCard size={30} color={color} strokeWidth={2.4} />
            </View>
            <Text style={{ color: colors.ink, fontSize: 20, fontWeight: '800' }}>
              {name || 'Nome do cartão'}
            </Text>
            <Text style={{ color: colors.inkMuted, fontSize: 12 }}>
              Fecha dia {closingDay} · Vence dia {dueDay}
            </Text>
          </View>

          <View>
            <Label>Nome</Label>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Ex: Nubank, Inter, Itaú"
              placeholderTextColor={colors.inkDim}
              style={{
                backgroundColor: colors.bgCard,
                color: colors.ink,
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderRadius: 14,
                fontSize: 15,
                borderWidth: 1,
                borderColor: colors.line,
              }}
            />
          </View>

          <View>
            <Label>Cor</Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {CARD_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setColor(c)}
                  haptic="selection"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: c,
                    borderWidth: 3,
                    borderColor: color === c ? colors.ink : 'transparent',
                  }}
                />
              ))}
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <DayField label="Fecha dia" value={closingDay} onChange={setClosingDay} />
            <DayField label="Vence dia" value={dueDay} onChange={setDueDay} />
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: colors.bgCard,
              padding: 14,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.line,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.ink, fontSize: 14, fontWeight: '700' }}>
                Cartão ativo
              </Text>
              <Text style={{ color: colors.inkMuted, fontSize: 11 }}>
                Aparece nas opções de pagamento
              </Text>
            </View>
            <Switch
              value={active}
              onValueChange={setActive}
              trackColor={{ false: colors.bgElev, true: colors.brandDeep }}
              thumbColor={active ? colors.brand : colors.inkDim}
            />
          </View>
        </ScrollView>

        <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.bgSoft }}>
          <Pressable
            onPress={handleSave}
            haptic="medium"
            scaleTo={0.97}
            style={{
              backgroundColor: name.trim() ? colors.brand : colors.bgElev,
              paddingVertical: 16,
              borderRadius: 16,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Check size={20} color={name.trim() ? colors.bg : colors.inkDim} strokeWidth={2.6} />
            <Text style={{ color: name.trim() ? colors.bg : colors.inkDim, fontSize: 16, fontWeight: '800' }}>
              {isEditing ? 'Salvar alterações' : 'Adicionar cartão'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function DayField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Label>{label}</Label>
      <View
        style={{
          backgroundColor: colors.bgCard,
          borderRadius: 14,
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderWidth: 1,
          borderColor: colors.line,
          alignItems: 'center',
        }}
      >
        <TextInput
          value={String(value)}
          onChangeText={(v) => {
            const n = parseInt(v.replace(/\D/g, ''), 10);
            if (!Number.isNaN(n)) onChange(Math.max(1, Math.min(31, n)));
            else if (v === '') onChange(1);
          }}
          keyboardType="number-pad"
          maxLength={2}
          style={{
            color: colors.ink,
            fontSize: 26,
            fontWeight: '800',
            textAlign: 'center',
            minWidth: 50,
          }}
        />
      </View>
    </View>
  );
}

function Label({ children }: { children: string }) {
  return (
    <Text
      style={{
        color: colors.inkMuted,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        marginBottom: 10,
        paddingHorizontal: 4,
      }}
    >
      {children}
    </Text>
  );
}
