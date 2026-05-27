import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MonthSwitcher } from '@/components/MonthSwitcher';
import { SummaryCard } from '@/components/SummaryCard';
import { TransactionRow } from '@/components/TransactionRow';
import { FAB } from '@/components/FAB';
import { EmptyState } from '@/components/EmptyState';
import { Pressable } from '@/components/Pressable';
import { monthBounds, shiftMonth } from '@/utils/date';
import { listTransactionsByPeriod } from '@/db/transactions';
import { getMonthComparison } from '@/db/reports';
import type { MonthComparison } from '@/db/reports';
import type { TransactionWithCategory } from '@/db/types';
import { useReloadToken } from '@/hooks/useReload';
import { colors } from '@/theme/colors';

export default function HomeScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const reloadToken = useReloadToken();

  const [month, setMonth] = useState(() => new Date());
  const [comparison, setComparison] = useState<MonthComparison | null>(null);
  const [txs, setTxs] = useState<TransactionWithCategory[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const current = monthBounds(month);
    const previous = monthBounds(shiftMonth(month, -1));
    const [c, list] = await Promise.all([
      getMonthComparison(db, current.from, current.to, previous.from, previous.to),
      listTransactionsByPeriod(db, current.from, current.to, 50),
    ]);
    setComparison(c);
    setTxs(list);
  }, [db, month]);

  useEffect(() => {
    load();
  }, [load, reloadToken]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

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
          {txs.length > 0 ? (
            <Text style={{ color: colors.inkMuted, fontSize: 12 }}>
              {txs.length} {txs.length === 1 ? 'item' : 'itens'}
            </Text>
          ) : null}
        </View>

        {txs.length === 0 ? (
          <EmptyState
            title="Nenhum lançamento neste mês"
            subtitle="Toque no botão + para adicionar uma entrada ou saída."
          />
        ) : (
          txs.map((tx) => (
            <TransactionRow
              key={tx.id}
              tx={tx}
              onPress={() => router.push(`/transaction?id=${tx.id}`)}
            />
          ))
        )}
      </ScrollView>

      <FAB onPress={() => router.push('/transaction')} />
    </View>
  );
}
