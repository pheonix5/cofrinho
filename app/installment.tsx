import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar, X, Check, Layers } from 'lucide-react-native';

import { Pressable } from '@/components/Pressable';
import { KindToggle } from '@/components/KindToggle';
import { AmountInput } from '@/components/AmountInput';
import { CategoryPicker } from '@/components/CategoryPicker';
import { listCategories } from '@/db/categories';
import { createInstallmentSeries } from '@/db/transactions';
import type { Category, TxKind } from '@/db/types';
import { useBumpReload } from '@/hooks/useReload';
import { digitsToCents, formatBRL } from '@/utils/format';
import { formatDateLabel } from '@/utils/date';
import { colors } from '@/theme/colors';

type Mode = 'per-parcel' | 'total';

export default function InstallmentScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const bump = useBumpReload();

  const [kind, setKind] = useState<TxKind>('expense');
  const [mode, setMode] = useState<Mode>('per-parcel');
  const [digits, setDigits] = useState<string>('');
  const [parcelStr, setParcelStr] = useState<string>('10');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [description, setDescription] = useState<string>('');
  const [firstDate, setFirstDate] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const parcelInputRef = useRef<TextInput>(null);

  useEffect(() => {
    (async () => {
      const all = await listCategories(db);
      setCategories(all);
    })();
  }, [db]);

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

  const enteredCents = digitsToCents(digits);
  const parcelCount = useMemo(() => {
    const n = parseInt(parcelStr, 10);
    return Number.isNaN(n) ? 0 : Math.max(0, Math.min(99, n));
  }, [parcelStr]);

  const perParcelCents = useMemo(() => {
    if (parcelCount === 0) return 0;
    return mode === 'per-parcel' ? enteredCents : Math.round(enteredCents / parcelCount);
  }, [mode, enteredCents, parcelCount]);

  const totalCents = useMemo(() => {
    if (parcelCount === 0) return 0;
    return mode === 'per-parcel' ? enteredCents * parcelCount : enteredCents;
  }, [mode, enteredCents, parcelCount]);

  const handleSave = useCallback(async () => {
    if (perParcelCents <= 0) {
      Alert.alert('Valor inválido', 'Informe um valor maior que zero.');
      return;
    }
    if (parcelCount < 2) {
      Alert.alert('Parcelas inválidas', 'Informe pelo menos 2 parcelas. Para uma única, use lançamento normal.');
      return;
    }
    await createInstallmentSeries(db, {
      kind,
      per_parcel_cents: perParcelCents,
      parcel_count: parcelCount,
      category_id: categoryId,
      description: description || null,
      first_occurrence: firstDate.toISOString(),
    });
    bump();
    router.back();
  }, [perParcelCents, parcelCount, kind, categoryId, description, firstDate, db, bump, router]);

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
            Novo parcelamento
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

          <View
            style={{
              flexDirection: 'row',
              backgroundColor: colors.bgSoft,
              borderRadius: 14,
              padding: 4,
              gap: 4,
            }}
          >
            <ModeOption
              active={mode === 'per-parcel'}
              label="Por parcela"
              onPress={() => setMode('per-parcel')}
            />
            <ModeOption
              active={mode === 'total'}
              label="Valor total"
              onPress={() => setMode('total')}
            />
          </View>

          <View style={{ paddingVertical: 18 }}>
            <AmountInput
              digits={digits}
              kind={kind}
              onChangeDigits={setDigits}
              autoFocus
            />
          </View>

          <View>
            <Label>Parcelas</Label>
            <Pressable
              onPress={() => parcelInputRef.current?.focus()}
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
              <Layers size={18} color={colors.inkSoft} />
              <Text style={{ color: colors.inkMuted, fontSize: 13 }}>Quantidade</Text>
              <TextInput
                ref={parcelInputRef}
                value={parcelStr}
                onChangeText={(v) => {
                  const cleaned = v.replace(/\D/g, '').slice(0, 2);
                  setParcelStr(cleaned);
                }}
                keyboardType="number-pad"
                maxLength={2}
                style={{
                  color: colors.ink,
                  fontSize: 18,
                  fontWeight: '800',
                  minWidth: 44,
                  textAlign: 'center',
                }}
              />
              <Text style={{ flex: 1, textAlign: 'right', color: colors.inkMuted, fontSize: 12 }}>
                {parcelCount > 0 && perParcelCents > 0
                  ? mode === 'per-parcel'
                    ? `Total: ${formatBRL(totalCents)}`
                    : `≈ ${formatBRL(perParcelCents)}/parcela`
                  : ''}
              </Text>
            </Pressable>
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
              placeholder="Ex: parcela do carro, geladeira nova"
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
            <Label>Primeira parcela em</Label>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              <DateShortcut
                label="Este mês"
                onPress={() => setFirstDate(new Date())}
              />
              <DateShortcut
                label="Próximo mês"
                onPress={() => {
                  const d = new Date();
                  setFirstDate(new Date(d.getFullYear(), d.getMonth() + 1, 1));
                }}
              />
            </View>
            <Pressable
              onPress={() => setShowPicker(true)}
              haptic="selection"
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
              <Text style={{ flex: 1, color: colors.ink, fontSize: 15, fontWeight: '600' }}>
                {formatDateLabel(firstDate.toISOString())}
              </Text>
            </Pressable>
            {showPicker ? (
              <DateTimePicker
                value={firstDate}
                mode="date"
                onChange={(_, d) => {
                  setShowPicker(Platform.OS === 'ios');
                  if (d) setFirstDate(d);
                }}
              />
            ) : null}
          </View>
        </KeyboardAwareScrollView>

        <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.bgSoft }}>
          <Pressable
            onPress={handleSave}
            haptic="medium"
            scaleTo={0.97}
            style={{
              backgroundColor: perParcelCents > 0 && parcelCount >= 2 ? colors.brand : colors.bgElev,
              paddingVertical: 16,
              borderRadius: 16,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Check
              size={20}
              color={perParcelCents > 0 && parcelCount >= 2 ? colors.bg : colors.inkDim}
              strokeWidth={2.6}
            />
            <Text
              style={{
                color: perParcelCents > 0 && parcelCount >= 2 ? colors.bg : colors.inkDim,
                fontSize: 16,
                fontWeight: '800',
              }}
            >
              {parcelCount >= 2
                ? `Criar ${parcelCount} parcelas`
                : 'Criar parcelamento'}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function ModeOption({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      haptic="selection"
      style={{
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: active ? colors.bgCard : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: active ? colors.ink : colors.inkMuted,
          fontSize: 13,
          fontWeight: '700',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function DateShortcut({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      haptic="selection"
      scaleTo={0.96}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: colors.bgElev,
        borderWidth: 1,
        borderColor: colors.line,
      }}
    >
      <Text style={{ color: colors.ink, fontSize: 13, fontWeight: '700' }}>{label}</Text>
    </Pressable>
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
