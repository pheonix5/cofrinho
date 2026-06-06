import { View, Text } from 'react-native';
import { ArrowDownLeft, ArrowUpRight, Wallet, TrendingDown, TrendingUp, Clock } from 'lucide-react-native';
import { formatBRL } from '@/utils/format';
import { colors } from '@/theme/colors';
import type { PeriodSummary } from '@/db/types';

type Props = {
  summary: PeriodSummary;
  projection?: PeriodSummary | null;
  label: string;
  expenseDeltaPct?: number | null;
  incomeDeltaPct?: number | null;
};

export function SummaryCard({ summary, projection, label, expenseDeltaPct, incomeDeltaPct }: Props) {
  const positive = summary.balance_cents >= 0;
  const projectedBalance = projection ? summary.balance_cents + projection.balance_cents : null;
  return (
    <View
      style={{
        backgroundColor: colors.bgCard,
        borderRadius: 24,
        padding: 20,
        gap: 16,
        borderWidth: 1,
        borderColor: colors.line,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Wallet size={14} color={colors.inkMuted} />
        <Text style={{ color: colors.inkMuted, fontSize: 12, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' }}>
          {label}
        </Text>
      </View>

      <View style={{ gap: 2 }}>
        <Text
          style={{
            color: positive ? colors.brand : colors.expense,
            fontSize: 38,
            fontWeight: '800',
            letterSpacing: -1,
            fontVariant: ['tabular-nums'],
          }}
        >
          {formatBRL(summary.balance_cents, { showSign: false })}
        </Text>
        <Text style={{ color: colors.inkMuted, fontSize: 12 }}>
          {summary.count} {summary.count === 1 ? 'lançamento' : 'lançamentos'}
        </Text>
        {projection && projectedBalance != null ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginTop: 8,
              paddingTop: 8,
              borderTopWidth: 1,
              borderTopColor: colors.line,
            }}
          >
            <Clock size={12} color={colors.inkMuted} strokeWidth={2.4} />
            <Text style={{ color: colors.inkMuted, fontSize: 12, fontWeight: '600' }}>
              Com previstos:{' '}
              <Text
                style={{
                  color: projectedBalance >= 0 ? colors.brand : colors.expense,
                  fontWeight: '800',
                  fontVariant: ['tabular-nums'],
                }}
              >
                {formatBRL(projectedBalance, { showSign: false })}
              </Text>
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Stat
          label="Entradas"
          value={formatBRL(summary.income_cents)}
          tint={colors.income}
          Icon={ArrowDownLeft}
          deltaPct={incomeDeltaPct}
          higherIsGood
        />
        <Stat
          label="Saídas"
          value={formatBRL(summary.expense_cents)}
          tint={colors.expense}
          Icon={ArrowUpRight}
          deltaPct={expenseDeltaPct}
          higherIsGood={false}
        />
      </View>
    </View>
  );
}

function Stat({
  label,
  value,
  tint,
  Icon,
  deltaPct,
  higherIsGood,
}: {
  label: string;
  value: string;
  tint: string;
  Icon: any;
  deltaPct?: number | null;
  higherIsGood?: boolean;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bgElev,
        borderRadius: 16,
        padding: 12,
        gap: 6,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 999,
            backgroundColor: `${tint}22`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={12} color={tint} strokeWidth={2.6} />
        </View>
        <Text style={{ color: colors.inkMuted, fontSize: 11, fontWeight: '600' }}>{label}</Text>
      </View>
      <Text
        style={{
          color: colors.ink,
          fontSize: 16,
          fontWeight: '700',
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </Text>
      {deltaPct != null && Number.isFinite(deltaPct) ? (
        <DeltaPill value={deltaPct} higherIsGood={higherIsGood ?? true} />
      ) : null}
    </View>
  );
}

function DeltaPill({ value, higherIsGood }: { value: number; higherIsGood: boolean }) {
  const isUp = value > 0;
  const isFlat = Math.abs(value) < 0.5;
  const goodDirection = (isUp && higherIsGood) || (!isUp && !higherIsGood);
  const tint = isFlat ? colors.inkMuted : goodDirection ? colors.income : colors.expense;
  const Icon = isFlat ? null : isUp ? TrendingUp : TrendingDown;
  const sign = isUp ? '+' : '';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      {Icon ? <Icon size={10} color={tint} strokeWidth={2.6} /> : null}
      <Text style={{ color: tint, fontSize: 10, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
        {`${sign}${value.toFixed(0)}% vs mês passado`}
      </Text>
    </View>
  );
}
