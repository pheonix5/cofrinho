import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar, Mic, Trash2, X, Check } from 'lucide-react-native';

import { Pressable } from '@/components/Pressable';
import { KindToggle } from '@/components/KindToggle';
import { AmountInput } from '@/components/AmountInput';
import { CategoryPicker } from '@/components/CategoryPicker';
import { PaymentMethodPicker } from '@/components/PaymentMethodPicker';
import { InstallmentPicker } from '@/components/InstallmentPicker';
import { VoiceCapture } from '@/components/VoiceCapture';
import { QuickShortcuts } from '@/components/QuickShortcuts';
import { listCategories } from '@/db/categories';
import { listCards } from '@/db/cards';
import type { Card } from '@/db/cards';
import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  updateTransaction,
} from '@/db/transactions';
import { getFrequentShortcuts } from '@/db/reports';
import type { FrequentShortcut } from '@/db/reports';
import type { Category, TxKind } from '@/db/types';
import { useBumpReload } from '@/hooks/useReload';
import { digitsToCents } from '@/utils/format';
import { formatDateLabel } from '@/utils/date';
import { colors } from '@/theme/colors';

export default function TransactionScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const bump = useBumpReload();
  const params = useLocalSearchParams<{ id?: string; kind?: string }>();
  const editingId = params.id ? parseInt(params.id, 10) : null;
  const isEditing = editingId !== null && !Number.isNaN(editingId);
  const initialKind: TxKind = params.kind === 'income' ? 'income' : 'expense';

  const [kind, setKind] = useState<TxKind>(initialKind);
  const [digits, setDigits] = useState<string>('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<Date>(new Date());
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [cardId, setCardId] = useState<number | null>(null);
  const [installments, setInstallments] = useState<number>(1);
  const [shortcuts, setShortcuts] = useState<FrequentShortcut[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const [cats, cardList] = await Promise.all([
        listCategories(db),
        listCards(db),
      ]);
      setCategories(cats);
      setCards(cardList.filter((c) => c.active === 1));
    })();
  }, [db]);

  useEffect(() => {
    if (isEditing) return;
    (async () => {
      const list = await getFrequentShortcuts(db, kind, 6);
      setShortcuts(list);
    })();
  }, [db, kind, isEditing]);

  useEffect(() => {
    if (!isEditing) return;
    (async () => {
      const tx = await getTransaction(db, editingId!);
      if (!tx) return;
      setKind(tx.kind);
      setDigits(String(tx.amount_cents));
      setCategoryId(tx.category_id);
      setDescription(tx.description ?? '');
      setDate(new Date(tx.occurred_at));
      setCardId(tx.card_id);
      setInstallments(tx.installment_total ?? 1);
    })();
  }, [db, editingId, isEditing]);

  useEffect(() => {
    if (kind === 'income') {
      setCardId(null);
      setInstallments(1);
    }
  }, [kind]);

  useEffect(() => {
    if (cardId == null) setInstallments(1);
  }, [cardId]);

  const visibleCategories = useMemo(
    () => categories.filter((c) => c.kind === kind),
    [categories, kind]
  );

  useEffect(() => {
    if (categoryId == null) return;
    const stillValid = visibleCategories.some((c) => c.id === categoryId);
    if (!stillValid) setCategoryId(null);
  }, [visibleCategories, categoryId]);

  const cents = digitsToCents(digits);

  const handleSave = useCallback(async () => {
    if (cents <= 0) {
      Alert.alert('Valor inválido', 'Informe um valor maior que zero.');
      return;
    }
    const payload = {
      kind,
      amount_cents: cents,
      category_id: categoryId,
      description: description || null,
      occurred_at: date.toISOString(),
      card_id: cardId,
      installments,
    };
    if (isEditing) {
      await updateTransaction(db, editingId!, payload);
    } else {
      await createTransaction(db, payload);
    }
    bump();
    router.back();
  }, [cents, kind, categoryId, description, date, cardId, installments, isEditing, editingId, db, bump, router]);

  const handleDelete = useCallback(() => {
    Alert.alert('Apagar lançamento?', 'Esta ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: async () => {
          await deleteTransaction(db, editingId!);
          bump();
          router.back();
        },
      },
    ]);
  }, [db, editingId, bump, router]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
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
            {isEditing ? 'Editar lançamento' : 'Novo lançamento'}
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
            <Pressable
              onPress={() => setVoiceOpen(true)}
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
              <Mic size={18} color={colors.brand} />
            </Pressable>
          )}
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ paddingHorizontal: 4 }}>
            <KindToggle value={kind} onChange={setKind} />
          </View>

          {!isEditing && shortcuts.length > 0 ? (
            <QuickShortcuts
              shortcuts={shortcuts}
              onPick={(s) => {
                setCategoryId(s.category_id);
                setDigits(String(s.amount_cents));
                if (s.description) setDescription(s.description);
              }}
            />
          ) : null}

          <View style={{ paddingVertical: 18 }}>
            <AmountInput
              digits={digits}
              kind={kind}
              onChangeDigits={setDigits}
              autoFocus={!isEditing}
            />
          </View>

          {kind === 'expense' && cards.length > 0 ? (
            <View>
              <Label>Forma de pagamento</Label>
              <PaymentMethodPicker cards={cards} value={cardId} onChange={setCardId} />
            </View>
          ) : null}

          {cardId != null ? (
            <View>
              <Label>Parcelas</Label>
              <InstallmentPicker
                value={installments}
                onChange={setInstallments}
                amountCents={cents}
              />
            </View>
          ) : null}

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
              placeholder="Ex: almoço com amigos"
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
            <Label>Data</Label>
            <Pressable
              onPress={() => setPickerOpen(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                backgroundColor: colors.bgCard,
                paddingHorizontal: 14,
                paddingVertical: 14,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.line,
              }}
            >
              <Calendar size={18} color={colors.inkSoft} />
              <Text style={{ color: colors.ink, fontSize: 15, fontWeight: '600' }}>
                {formatDateLabel(date.toISOString())}
              </Text>
            </Pressable>
            {pickerOpen ? (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                maximumDate={new Date()}
                onChange={(_, d) => {
                  setPickerOpen(Platform.OS === 'ios');
                  if (d) setDate(d);
                }}
                themeVariant="dark"
              />
            ) : null}
          </View>

        </ScrollView>

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
              {isEditing ? 'Salvar alterações' : 'Adicionar lançamento'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <VoiceCapture
        visible={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        onResult={(parsed) => {
          if (parsed.kind) setKind(parsed.kind);
          if (parsed.amount_cents) setDigits(String(parsed.amount_cents));
          if (parsed.description) setDescription(parsed.description);
          if (parsed.occurred_at) setDate(new Date(parsed.occurred_at));
          if (parsed.category_hint) {
            const targetKind = parsed.kind ?? kind;
            const match = categories.find(
              (c) => c.kind === targetKind && c.name.toLowerCase() === parsed.category_hint!.toLowerCase()
            );
            if (match) setCategoryId(match.id);
          }
        }}
      />
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
