import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { TrendingDown, TrendingUp } from 'lucide-react-native';

import { SummaryCard } from '@/components/SummaryCard';
import { Pressable } from '@/components/Pressable';
import { CategoryIcon } from '@/components/CategoryIcon';
import { EmptyState } from '@/components/EmptyState';
import { getCategoryBreakdown, getMonthlyAggregates, getPeriodSummary } from '@/db/reports';
import type { CategoryAggregate, MonthAggregate, PeriodSummary, TxKind } from '@/db/types';
import { formatBRL, formatBRLCompact } from '@/utils/format';
import { fromMonthKey, formatMonthShort, monthBounds, shiftMonth } from '@/utils/date';
import { useReloadToken } from '@/hooks/useReload';
import { colors } from '@/theme/colors';

type Range = '1m' | '3m' | '6m';

const RANGE_LABELS: Record<Range, string> = {
  '1m': 'Este mês',
  '3m': '3 meses',
  '6m': '6 meses',
};

function rangeBounds(r: Range) {
  const now = new Date();
  if (r === '1m') return monthBounds(now);
  const months = r === '3m' ? 2 : 5;
  const from = monthBounds(shiftMonth(now, -months)).from;
  const to = monthBounds(now).to;
  return { from, to };
}

export default function ReportsScreen() {
  const db = useSQLiteContext();
  const reloadToken = useReloadToken();

  const [range, setRange] = useState<Range>('1m');
  const [kind, setKind] = useState<TxKind>('expense');
  const [summary, setSummary] = useState<PeriodSummary | null>(null);
  const [monthly, setMonthly] = useState<MonthAggregate[]>([]);
  const [breakdown, setBreakdown] = useState<CategoryAggregate[]>([]);

  const load = useCallback(async () => {
    const { from, to } = rangeBounds(range);
    const [s, m, b] = await Promise.all([
      getPeriodSummary(db, from, to),
      getMonthlyAggregates(db, range === '6m' ? 5 : range === '3m' ? 2 : 0),
      getCategoryBreakdown(db, from, to, kind),
    ]);
    setSummary(s);
    setMonthly(m);
    setBreakdown(b);
  }, [db, range, kind]);

  useEffect(() => {
    load();
  }, [load, reloadToken]);

  const barData = useMemo(() => {
    const data: any[] = [];
    monthly.forEach((m) => {
      const label = formatMonthShort(fromMonthKey(m.month));
      data.push({
        value: m.income_cents / 100,
        label,
        frontColor: colors.income,
        spacing: 4,
      });
      data.push({
        value: m.expense_cents / 100,
        frontColor: colors.expense,
        spacing: 18,
      });
    });
    return data;
  }, [monthly]);

  const pieData = useMemo(() => {
    const total = breakdown.reduce((acc, c) => acc + c.total_cents, 0);
    if (total === 0) return [];
    return breakdown.slice(0, 6).map((c, i) => ({
      value: c.total_cents,
      color: c.category_color,
      focused: i === 0,
    }));
  }, [breakdown]);

  const totalKind = breakdown.reduce((acc, c) => acc + c.total_cents, 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.bg }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
          <Text style={{ color: colors.inkMuted, fontSize: 12, fontWeight: '600', letterSpacing: 0.5 }}>
            RELATÓRIOS
          </Text>
          <Text style={{ color: colors.ink, fontSize: 22, fontWeight: '800', marginTop: 2 }}>
            Visão geral
          </Text>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: colors.bgSoft,
            borderRadius: 14,
            padding: 4,
            gap: 4,
          }}
        >
          {(Object.keys(RANGE_LABELS) as Range[]).map((r) => (
            <Pressable
              key={r}
              onPress={() => setRange(r)}
              haptic="selection"
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: range === r ? colors.bgElev : 'transparent',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: range === r ? colors.ink : colors.inkMuted,
                  fontWeight: '700',
                  fontSize: 13,
                }}
              >
                {RANGE_LABELS[r]}
              </Text>
            </Pressable>
          ))}
        </View>

        {summary ? <SummaryCard summary={summary} label={`Saldo · ${RANGE_LABELS[range]}`} /> : null}

        {monthly.length > 0 ? (
          <View
            style={{
              backgroundColor: colors.bgCard,
              borderRadius: 24,
              padding: 16,
              borderWidth: 1,
              borderColor: colors.line,
              gap: 8,
            }}
          >
            <Text style={{ color: colors.inkMuted, fontSize: 12, fontWeight: '600', letterSpacing: 0.5 }}>
              ENTRADAS vs SAÍDAS
            </Text>
            <View style={{ paddingTop: 8 }}>
              <BarChart
                data={barData}
                barWidth={14}
                roundedTop
                noOfSections={3}
                yAxisThickness={0}
                xAxisThickness={0}
                xAxisLabelTextStyle={{ color: colors.inkMuted, fontSize: 10 }}
                yAxisTextStyle={{ color: colors.inkMuted, fontSize: 10 }}
                hideRules
                hideYAxisText={false}
                formatYLabel={(v) => formatBRLCompact(parseFloat(v) * 100).replace('R$ ', '')}
                height={160}
                spacing={8}
                initialSpacing={8}
                disablePress
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 12, paddingTop: 4 }}>
              <Legend color={colors.income} label="Entradas" />
              <Legend color={colors.expense} label="Saídas" />
            </View>
          </View>
        ) : null}

        <View
          style={{
            backgroundColor: colors.bgCard,
            borderRadius: 24,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.line,
            gap: 16,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.inkMuted, fontSize: 12, fontWeight: '600', letterSpacing: 0.5 }}>
              POR CATEGORIA
            </Text>
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: colors.bgElev,
                borderRadius: 10,
                padding: 3,
                gap: 3,
              }}
            >
              <CategoryKindBtn active={kind === 'expense'} onPress={() => setKind('expense')} tint={colors.expense} Icon={TrendingDown} label="Saídas" />
              <CategoryKindBtn active={kind === 'income'} onPress={() => setKind('income')} tint={colors.income} Icon={TrendingUp} label="Entradas" />
            </View>
          </View>

          {breakdown.length === 0 ? (
            <EmptyState title="Sem dados para o período" />
          ) : (
            <>
              <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                <PieChart
                  data={pieData}
                  donut
                  radius={90}
                  innerRadius={62}
                  innerCircleColor={colors.bgCard}
                  centerLabelComponent={() => (
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ color: colors.inkMuted, fontSize: 10, fontWeight: '600' }}>
                        TOTAL
                      </Text>
                      <Text
                        style={{
                          color: kind === 'income' ? colors.income : colors.expense,
                          fontSize: 16,
                          fontWeight: '800',
                          fontVariant: ['tabular-nums'],
                        }}
                      >
                        {formatBRL(totalKind)}
                      </Text>
                    </View>
                  )}
                />
              </View>

              <View style={{ gap: 6 }}>
                {breakdown.map((c) => {
                  const pct = totalKind > 0 ? (c.total_cents / totalKind) * 100 : 0;
                  return (
                    <View
                      key={`${c.category_id}-${c.category_name}`}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        paddingVertical: 10,
                        paddingHorizontal: 10,
                        borderRadius: 12,
                        backgroundColor: colors.bgElev,
                      }}
                    >
                      <View
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 10,
                          backgroundColor: `${c.category_color}22`,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <CategoryIcon name={c.category_icon} color={c.category_color} size={16} />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ color: colors.ink, fontSize: 14, fontWeight: '600' }}>
                          {c.category_name}
                        </Text>
                        <Text style={{ color: colors.inkMuted, fontSize: 11 }}>
                          {pct.toFixed(1)}% · {c.count} {c.count === 1 ? 'item' : 'itens'}
                        </Text>
                      </View>
                      <Text style={{ color: colors.ink, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                        {formatBRL(c.total_cents)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color }} />
      <Text style={{ color: colors.inkMuted, fontSize: 11, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

function CategoryKindBtn({
  active,
  onPress,
  tint,
  Icon,
  label,
}: {
  active: boolean;
  onPress: () => void;
  tint: string;
  Icon: any;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      haptic="selection"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: active ? `${tint}22` : 'transparent',
      }}
    >
      <Icon size={12} color={active ? tint : colors.inkMuted} strokeWidth={2.4} />
      <Text style={{ color: active ? tint : colors.inkMuted, fontSize: 11, fontWeight: '700' }}>
        {label}
      </Text>
    </Pressable>
  );
}
