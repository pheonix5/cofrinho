import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Check, Calendar } from 'lucide-react-native';

import { Pressable } from '@/components/Pressable';
import { KindToggle } from '@/components/KindToggle';
import { AmountInput } from '@/components/AmountInput';
import { CategoryPicker } from '@/components/CategoryPicker';
import { listCategories } from '@/db/categories';
import {
  createRecurring,
  getRecurring,
  updateRecurring,
} from '@/db/recurring';
import type { Category, TxKind } from '@/db/types';
import { useBumpReload } from '@/hooks/useReload';
import { digitsToCents } from '@/utils/format';
import { colors } from '@/theme/colors';

export default function RecurringEditScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const bump = useBumpReload();
  const params = useLocalSearchParams<{ id?: string }>();
  const editingId = params.id ? parseInt(params.id, 10) : null;
  const isEditing = editingId !== null && !Number.isNaN(editingId);

  const [kind, setKind] = useState<TxKind>('income');
  const [digits, setDigits] = useState<string>('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [description, setDescription] = useState<string>('');
  const [dayStr, setDayStr] = useState<string>('5');
  const [categories, setCategories] = useState<Category[]>([]);
  const dayInputRef = useRef<TextInput>(null);

  useEffect(() => {
    (async () => {
      const all = await listCategories(db);
      setCategories(all);
    })();
  }, [db]);

  useEffect(() => {
    if (!isEditing) return;
    (async () => {
      const r = await getRecurring(db, editingId!);
      if (!r) return;
      setKind(r.kind);
      setDigits(String(r.amount_cents));
      setCategoryId(r.category_id);
      setDescription(r.description ?? '');
      setDayStr(String(r.day_of_month));
    })();
  }, [db, editingId, isEditing]);

  const visibleCategories = useMemo(
    () => categories.filter((c) => c.kind === kind),
    [categories, kind]
  );

  useEffect(() => {
    if (categoryId == null) return;
    if (categories.length === 0) return;
    const stillValid = visibleCategories.some((c) => c.id === categoryId);
    if (!stillValid) setCategoryId(null);
  }, [visibleCategories, categoryId, categories.length]);

  const cents = digitsToCents(digits);

  const handleSave = useCallback(async () => {
    if (cents <= 0) {
      Alert.alert('Valor inválido', 'Informe um valor maior que zero.');
      return;
    }
    const dayOfMonth = parseInt(dayStr, 10);
    if (Number.isNaN(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
      Alert.alert('Dia inválido', 'Escolha um dia entre 1 e 31.');
      return;
    }
    const payload = {
      kind,
      amount_cents: cents,
      category_id: categoryId,
      description: description || null,
      day_of_month: dayOfMonth,
      active: true,
    };
    if (isEditing) {
      await updateRecurring(db, editingId!, payload);
    } else {
      await createRecurring(db, payload);
    }
    bump();
    router.back();
  }, [cents, kind, categoryId, description, dayStr, isEditing, editingId, db, bump, router]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <View style={{ flex: 1 }}>
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
            {isEditing ? 'Editar recorrência' : 'Nova recorrência'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAwareScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 20 }}
          keyboardShouldPersistTaps="handled"
          bottomOffset={20}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ paddingHorizontal: 4 }}>
            <KindToggle value={kind} onChange={setKind} />
          </View>

          <View style={{ paddingVertical: 18 }}>
            <AmountInput
              digits={digits}
              kind={kind}
              onChangeDigits={setDigits}
              autoFocus={!isEditing}
            />
          </View>

          <View>
            <Label>Categoria</Label>
            <CategoryPicker
              categories={visibleCategories}
              selectedId={categoryId}
              onSelect={(id) => setCategoryId(id)}
            />
          </View>

          <View>
            <Label>Descrição</Label>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Ex: salário, Netflix, aluguel"
              placeholderTextColor={colors.inkDim}
              style={{
                backgroundColor: colors.bgCard,
                color: colors.ink,
                paddingHorizontal: 14,
                paddingVertical: 16,
                borderRadius: 14,
                fontSize: 15,
                borderWidth: 1,
                borderColor: colors.line,
                minHeight: 52,
              }}
            />
          </View>

          <View>
            <Label>Dia do mês</Label>
            <Pressable
              onPress={() => dayInputRef.current?.focus()}
              haptic="selection"
              scaleTo={1}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                backgroundColor: colors.bgCard,
                paddingHorizontal: 14,
                paddingVertical: 16,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.line,
                minHeight: 52,
              }}
            >
              <Calendar size={18} color={colors.inkSoft} />
              <Text style={{ color: colors.inkMuted, fontSize: 13 }}>Lança todo dia</Text>
              <TextInput
                ref={dayInputRef}
                value={dayStr}
                onChangeText={(v) => {
                  const cleaned = v.replace(/\D/g, '').slice(0, 2);
                  setDayStr(cleaned);
                }}
                keyboardType="number-pad"
                maxLength={2}
                style={{
                  color: colors.ink,
                  fontSize: 18,
                  fontWeight: '800',
                  minWidth: 36,
                  textAlign: 'center',
                }}
              />
              <Text style={{ color: colors.inkMuted, fontSize: 13 }}>
                {parseInt(dayStr, 10) > 28 ? '(ou último dia do mês)' : ''}
              </Text>
            </Pressable>
          </View>

        </KeyboardAwareScrollView>

        <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.bgSoft }}>
          <Pressable
            onPress={handleSave}
            haptic="medium"
            scaleTo={0.97}
            style={{
              backgroundColor: cents > 0 ? colors.brand : colors.bgElev,
              paddingVertical: 16,
              borderRadius: 16,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Check size={20} color={cents > 0 ? colors.bg : colors.inkDim} strokeWidth={2.6} />
            <Text style={{ color: cents > 0 ? colors.bg : colors.inkDim, fontSize: 16, fontWeight: '800' }}>
              {isEditing ? 'Salvar alterações' : 'Criar recorrência'}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
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
