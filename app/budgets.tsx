import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Check, Target, Trash2 } from 'lucide-react-native';

import { Pressable } from '@/components/Pressable';
import { CategoryIcon } from '@/components/CategoryIcon';
import { AmountInput } from '@/components/AmountInput';
import { BudgetBar, pickColor } from '@/components/BudgetBar';
import { EmptyState } from '@/components/EmptyState';
import { listCategories } from '@/db/categories';
import { listBudgetsWithProgress, setBudget } from '@/db/budgets';
import type { BudgetProgress } from '@/db/budgets';
import type { Category } from '@/db/types';
import { useBumpReload, useReloadToken } from '@/hooks/useReload';
import { monthBounds } from '@/utils/date';
import { digitsToCents, formatBRL } from '@/utils/format';
import { colors } from '@/theme/colors';

export default function BudgetsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const bump = useBumpReload();
  const reloadToken = useReloadToken();

  const [items, setItems] = useState<BudgetProgress[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Category | null>(null);

  const load = useCallback(async () => {
    const { from, to } = monthBounds(new Date());
    const [budgets, cats] = await Promise.all([
      listBudgetsWithProgress(db, from, to),
      listCategories(db, 'expense'),
    ]);
    setItems(budgets);
    setExpenseCategories(cats);
  }, [db]);

  useEffect(() => {
    load();
  }, [load, reloadToken]);

  const withoutBudget = useMemo(() => {
    const have = new Set(items.map((b) => b.category_id));
    return expenseCategories.filter((c) => !have.has(c.id));
  }, [items, expenseCategories]);

  const totalLimit = items.reduce((acc, b) => acc + b.monthly_cents, 0);
  const totalSpent = items.reduce((acc, b) => acc + b.spent_cents, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
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
        <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '700' }}>Orçamentos</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 80, gap: 20 }}>
        {items.length > 0 ? (
          <View
            style={{
              backgroundColor: colors.bgCard,
              borderRadius: 20,
              padding: 16,
              gap: 12,
              borderWidth: 1,
              borderColor: colors.line,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Target size={14} color={colors.brand} strokeWidth={2.4} />
              <Text
                style={{
                  color: colors.inkMuted,
                  fontSize: 11,
                  fontWeight: '700',
                  letterSpacing: 0.6,
                  textTransform: 'uppercase',
                }}
              >
                Total do mês
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.ink, fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
                {formatBRL(totalSpent)}
              </Text>
              <Text style={{ color: colors.inkMuted, fontSize: 13, fontVariant: ['tabular-nums'] }}>
                de {formatBRL(totalLimit)}
              </Text>
            </View>
            <BudgetBar pct={totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0} />
          </View>
        ) : null}

        {items.length > 0 ? (
          <View style={{ gap: 8 }}>
            <SectionLabel>Orçamentos ativos</SectionLabel>
            {items.map((b) => {
              const pct = b.monthly_cents > 0 ? (b.spent_cents / b.monthly_cents) * 100 : 0;
              const tint = pickColor(pct);
              const remaining = b.monthly_cents - b.spent_cents;
              return (
                <Pressable
                  key={b.category_id}
                  onPress={() => {
                    const cat = expenseCategories.find((c) => c.id === b.category_id);
                    if (cat) setEditing(cat);
                  }}
                  haptic="selection"
                  style={{
                    backgroundColor: colors.bgCard,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: colors.line,
                    padding: 14,
                    gap: 10,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 12,
                        backgroundColor: `${b.category_color}22`,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <CategoryIcon name={b.category_icon} color={b.category_color} size={18} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.ink, fontSize: 14, fontWeight: '700' }}>
                        {b.category_name}
                      </Text>
                      <Text style={{ color: colors.inkMuted, fontSize: 11, fontVariant: ['tabular-nums'] }}>
                        {formatBRL(b.spent_cents)} de {formatBRL(b.monthly_cents)}
                      </Text>
                    </View>
                    <Text
                      style={{
                        color: tint,
                        fontSize: 14,
                        fontWeight: '800',
                        fontVariant: ['tabular-nums'],
                      }}
                    >
                      {pct.toFixed(0)}%
                    </Text>
                  </View>
                  <BudgetBar pct={pct} />
                  <Text style={{ color: remaining < 0 ? colors.expense : colors.inkMuted, fontSize: 11, fontWeight: '600' }}>
                    {remaining < 0
                      ? `Estourou ${formatBRL(Math.abs(remaining))}`
                      : `Resta ${formatBRL(remaining)}`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <View style={{ gap: 8 }}>
          <SectionLabel>
            {items.length === 0 ? 'Configure um limite mensal' : 'Sem orçamento'}
          </SectionLabel>
          {withoutBudget.length === 0 ? (
            items.length === 0 ? (
              <EmptyState
                title="Nenhuma categoria de saída encontrada"
                subtitle="Crie uma transação de saída primeiro."
              />
            ) : null
          ) : (
            withoutBudget.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => setEditing(c)}
                haptic="selection"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  backgroundColor: colors.bgCard,
                  padding: 14,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: colors.line,
                }}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    backgroundColor: `${c.color}22`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CategoryIcon name={c.icon} color={c.color} size={16} />
                </View>
                <Text style={{ flex: 1, color: colors.ink, fontSize: 14, fontWeight: '600' }}>
                  {c.name}
                </Text>
                <Text style={{ color: colors.brand, fontSize: 12, fontWeight: '700' }}>
                  Definir
                </Text>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>

      {editing ? (
        <BudgetEditModal
          category={editing}
          currentValue={items.find((b) => b.category_id === editing.id)?.monthly_cents ?? 0}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            bump();
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text
      style={{
        color: colors.inkMuted,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        paddingHorizontal: 4,
      }}
    >
      {children}
    </Text>
  );
}

function BudgetEditModal({
  category,
  currentValue,
  onClose,
  onSaved,
}: {
  category: Category;
  currentValue: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const db = useSQLiteContext();
  const [digits, setDigits] = useState<string>(currentValue > 0 ? String(currentValue) : '');

  const cents = digitsToCents(digits);

  const handleSave = async () => {
    if (cents <= 0) {
      Alert.alert('Valor inválido', 'Informe um valor maior que zero.');
      return;
    }
    await setBudget(db, category.id, cents);
    onSaved();
  };

  const handleRemove = async () => {
    await setBudget(db, category.id, 0);
    onSaved();
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          onPress={onClose}
          haptic={false}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }}
        />
        <KeyboardStickyView style={{ width: '100%' }}>
          <View
            style={{
              backgroundColor: colors.bgSoft,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingTop: 18,
              paddingHorizontal: 20,
              paddingBottom: 28,
              gap: 16,
              borderTopWidth: 1,
              borderColor: colors.line,
              width: '100%',
            }}
          >
            <View style={{ alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 48,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: colors.line,
                }}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: `${category.color}22`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CategoryIcon name={category.icon} color={category.color} size={20} />
                </View>
                <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '700' }}>
                  Limite para {category.name}
                </Text>
              </View>
            </View>

            <View style={{ paddingVertical: 8 }}>
              <AmountInput
                digits={digits}
                kind="expense"
                onChangeDigits={setDigits}
                autoFocus
              />
            </View>

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
                Salvar limite
              </Text>
            </Pressable>

            {currentValue > 0 ? (
              <Pressable
                onPress={handleRemove}
                haptic="medium"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  paddingVertical: 12,
                }}
              >
                <Trash2 size={16} color={colors.expense} />
                <Text style={{ color: colors.expense, fontWeight: '700' }}>Remover orçamento</Text>
              </Pressable>
            ) : null}
          </View>
        </KeyboardStickyView>
      </View>
    </Modal>
  );
}
