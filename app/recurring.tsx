import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Switch, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, X, Calendar, Trash2 } from 'lucide-react-native';

import { Pressable } from '@/components/Pressable';
import { CategoryIcon } from '@/components/CategoryIcon';
import { EmptyState } from '@/components/EmptyState';
import {
  deleteRecurring,
  listRecurring,
  setRecurringActive,
} from '@/db/recurring';
import type { RecurringWithCategory } from '@/db/recurring';
import { useBumpReload, useReloadToken } from '@/hooks/useReload';
import { formatBRL } from '@/utils/format';
import { colors } from '@/theme/colors';

export default function RecurringListScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const bump = useBumpReload();
  const reloadToken = useReloadToken();

  const [items, setItems] = useState<RecurringWithCategory[]>([]);

  const load = useCallback(async () => {
    const list = await listRecurring(db);
    setItems(list);
  }, [db]);

  useEffect(() => {
    load();
  }, [load, reloadToken]);

  const toggle = async (id: number, active: boolean) => {
    await setRecurringActive(db, id, active);
    bump();
  };

  const remove = (id: number) => {
    Alert.alert(
      'Apagar recorrência?',
      'Isso não apaga os lançamentos já criados, apenas o agendamento futuro.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            await deleteRecurring(db, id);
            bump();
          },
        },
      ]
    );
  };

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
        <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '700' }}>
          Recorrências
        </Text>
        <Pressable
          onPress={() => router.push('/recurring-edit')}
          haptic="medium"
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            backgroundColor: colors.brand,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Plus size={20} color={colors.bg} strokeWidth={2.6} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 80, gap: 10 }}>
        {items.length === 0 ? (
          <EmptyState
            title="Sem lançamentos recorrentes"
            subtitle="Configure salário, assinaturas ou contas fixas para serem lançados automaticamente todo mês."
          />
        ) : (
          items.map((r) => {
            const color = r.category_color ?? colors.inkMuted;
            const isIncome = r.kind === 'income';
            return (
              <View
                key={r.id}
                style={{
                  backgroundColor: colors.bgCard,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: colors.line,
                  padding: 14,
                  gap: 12,
                  opacity: r.active ? 1 : 0.55,
                }}
              >
                <Pressable
                  onPress={() => router.push(`/recurring-edit?id=${r.id}`)}
                  haptic="selection"
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: `${color}22`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CategoryIcon name={r.category_icon ?? 'circle'} color={color} size={20} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ color: colors.ink, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>
                      {r.description?.trim() || r.category_name || 'Sem descrição'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Calendar size={11} color={colors.inkMuted} />
                      <Text style={{ color: colors.inkMuted, fontSize: 11 }}>
                        Todo dia {r.day_of_month} · {r.category_name ?? 'sem categoria'}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={{
                      color: isIncome ? colors.income : colors.expense,
                      fontSize: 15,
                      fontWeight: '700',
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {isIncome ? '+ ' : '− '}
                    {formatBRL(r.amount_cents)}
                  </Text>
                </Pressable>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: 8,
                    borderTopWidth: 1,
                    borderTopColor: colors.line,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Switch
                      value={r.active === 1}
                      onValueChange={(v) => toggle(r.id, v)}
                      trackColor={{ false: colors.bgElev, true: colors.brandDeep }}
                      thumbColor={r.active ? colors.brand : colors.inkDim}
                    />
                    <Text style={{ color: colors.inkMuted, fontSize: 12, fontWeight: '600' }}>
                      {r.active ? 'Ativo' : 'Pausado'}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => remove(r.id)}
                    haptic="medium"
                    style={{ padding: 6 }}
                  >
                    <Trash2 size={16} color={colors.expense} />
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
