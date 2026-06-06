import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MonthSwitcher } from '@/components/MonthSwitcher';
import { SummaryCard } from '@/components/SummaryCard';
import { TransactionRow } from '@/components/TransactionRow';
import { FAB } from '@/components/FAB';
import { EmptyState } from '@/components/EmptyState';
import { monthBounds, shiftMonth } from '@/utils/date';
import { listTransactionsByPeriod } from '@/db/transactions';
import { getMonthComparison } from '@/db/reports';
import type { MonthComparison } from '@/db/reports';
import {
  listActiveTemplatesWithCategory,
  projectRecurrencesForMonth,
} from '@/db/recurring';
import type { ListItem, PeriodSummary, ProjectedListItem } from '@/db/types';
import { useReloadToken } from '@/hooks/useReload';
import { colors } from '@/theme/colors';

export default function HomeScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const reloadToken = useReloadToken();

  const [month, setMonth] = useState(() => new Date());
  const [comparison, setComparison] = useState<MonthComparison | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);
  const [projectionSummary, setProjectionSummary] = useState<PeriodSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const current = monthBounds(month);
    const previous = monthBounds(shiftMonth(month, -1));
    const [c, list, templates] = await Promise.all([
      getMonthComparison(db, current.from, current.to, previous.from, previous.to),
      listTransactionsByPeriod(db, current.from, current.to, 50),
      listActiveTemplatesWithCategory(db),
    ]);
    setComparison(c);

    const existingRecurringIds = new Set<number>();
    for (const tx of list) {
      if (tx.recurring_id != null) existingRecurringIds.add(tx.recurring_id);
    }
    const projections = projectRecurrencesForMonth(templates, month, existingRecurringIds);
    const projectedItems: ProjectedListItem[] = projections.map((p) => ({
      is_projection: true,
      template_id: p.template_id,
      synthetic_id: `proj-${p.template_id}-${p.occurred_at}`,
      kind: p.kind,
      amount_cents: p.amount_cents,
      category_id: p.category_id,
      category_name: p.category_name,
      category_icon: p.category_icon,
      category_color: p.category_color,
      description: p.description,
      occurred_at: p.occurred_at,
    }));

    const merged: ListItem[] = [
      ...list.map((tx) => ({ ...tx, is_projection: false as const })),
      ...projectedItems,
    ].sort((a, b) => (a.occurred_at > b.occurred_at ? -1 : 1));
    setItems(merged);

    if (projectedItems.length === 0) {
      setProjectionSummary(null);
    } else {
      let income = 0;
      let expense = 0;
      for (const p of projectedItems) {
        if (p.kind === 'income') income += p.amount_cents;
        else expense += p.amount_cents;
      }
      setProjectionSummary({
        income_cents: income,
        expense_cents: expense,
        balance_cents: income - expense,
        count: projectedItems.length,
      });
    }
  }, [db, month]);

  useEffect(() => {
    load();
  }, [load, reloadToken]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const realCount = useMemo(() => items.filter((i) => !i.is_projection).length, [items]);
  const projectedCount = useMemo(() => items.filter((i) => i.is_projection).length, [items]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.bg }}>
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View>
            <Text style={{ color: colors.inkMuted, fontSize: 12, fontWeight: '600', letterSpacing: 0.5 }}>
              COFRINHO
            </Text>
            <Text style={{ color: colors.ink, fontSize: 22, fontWeight: '800', marginTop: 2 }}>
              Olá 👋
            </Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginBottom: 16 }}>
          <MonthSwitcher date={month} onChange={setMonth} />
        </View>

        {comparison ? (
          <SummaryCard
            summary={comparison.current}
            projection={projectionSummary}
            label="Saldo do mês"
            expenseDeltaPct={comparison.expenseDeltaPct}
            incomeDeltaPct={comparison.incomeDeltaPct}
          />
        ) : null}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 28,
            marginBottom: 12,
            paddingHorizontal: 4,
          }}
        >
          <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '700' }}>
            Lançamentos
          </Text>
          {items.length > 0 ? (
            <Text style={{ color: colors.inkMuted, fontSize: 12 }}>
              {realCount} {realCount === 1 ? 'real' : 'reais'}
              {projectedCount > 0 ? ` · ${projectedCount} previsto${projectedCount === 1 ? '' : 's'}` : ''}
            </Text>
          ) : null}
        </View>

        {items.length === 0 ? (
          <EmptyState
            title="Nenhum lançamento neste mês"
            subtitle="Toque no botão + para adicionar uma entrada ou saída."
          />
        ) : (
          items.map((item) => (
            <TransactionRow
              key={item.is_projection ? item.synthetic_id : `tx-${item.id}`}
              tx={item}
              onPress={() => {
                if (item.is_projection) {
                  const dateOnly = item.occurred_at.split('T')[0];
                  router.push(
                    `/transaction?kind=${item.kind}&amount=${item.amount_cents}&categoryId=${
                      item.category_id ?? ''
                    }&description=${encodeURIComponent(item.description ?? '')}&date=${dateOnly}&recurringId=${item.template_id}`
                  );
                } else {
                  router.push(`/transaction?id=${item.id}`);
                }
              }}
            />
          ))
        )}
      </ScrollView>

      <FAB onPress={() => router.push('/transaction')} />
    </View>
  );
}
