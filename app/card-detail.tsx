import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Pencil,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Check,
  Calendar,
} from 'lucide-react-native';

import { Pressable } from '@/components/Pressable';
import { TransactionRow } from '@/components/TransactionRow';
import { EmptyState } from '@/components/EmptyState';
import {
  getCard,
  getInvoiceTotal,
  getInvoiceWindow,
  getOpenInvoiceWindow,
  isInvoicePaid,
  listInvoiceTransactions,
  markInvoicePaid,
} from '@/db/cards';
import type { Card, InvoiceWindow } from '@/db/cards';
import type { TransactionWithCategory } from '@/db/types';
import { useBumpReload, useReloadToken } from '@/hooks/useReload';
import { formatBRL } from '@/utils/format';
import { formatDateLabel } from '@/utils/date';
import { colors } from '@/theme/colors';

export default function CardDetailScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const bump = useBumpReload();
  const reloadToken = useReloadToken();
  const params = useLocalSearchParams<{ id: string }>();
  const cardId = parseInt(params.id, 10);

  const [card, setCard] = useState<Card | null>(null);
  const [anchor, setAnchor] = useState<{ year: number; month: number } | null>(null);
  const [window, setWindow] = useState<InvoiceWindow | null>(null);
  const [txs, setTxs] = useState<TransactionWithCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [paid, setPaid] = useState(false);

  const load = useCallback(async () => {
    if (Number.isNaN(cardId)) return;
    const c = await getCard(db, cardId);
    if (!c) return;
    setCard(c);
    const openW = anchor ? getInvoiceWindow(c, anchor.year, anchor.month) : getOpenInvoiceWindow(c);
    setWindow(openW);
    if (!anchor) setAnchor({ year: openW.anchorYear, month: openW.anchorMonth });
    const [list, t, p] = await Promise.all([
      listInvoiceTransactions(db, c.id, openW),
      getInvoiceTotal(db, c.id, openW),
      isInvoicePaid(db, c.id, openW),
    ]);
    setTxs(list);
    setTotal(t);
    setPaid(p);
  }, [db, cardId, anchor]);

  useEffect(() => {
    load();
  }, [load, reloadToken]);

  const monthLabel = useMemo(() => {
    if (!window) return '';
    const d = new Date(window.anchorYear, window.anchorMonth, 1);
    return d
      .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      .replace(/^\w/, (m) => m.toUpperCase());
  }, [window]);

  const shiftAnchor = (delta: number) => {
    if (!anchor) return;
    let m = anchor.month + delta;
    let y = anchor.year;
    while (m < 0) { m += 12; y -= 1; }
    while (m > 11) { m -= 12; y += 1; }
    setAnchor({ year: y, month: m });
  };

  const handleMarkPaid = () => {
    if (!card || !window) return;
    if (total <= 0) {
      Alert.alert('Sem fatura', 'Não há valor a pagar nesta fatura.');
      return;
    }
    Alert.alert(
      'Pagar fatura?',
      `Registrar pagamento de ${formatBRL(total)} para ${card.name}? Esse pagamento não aparece nos relatórios de gastos do mês (os gastos individuais já contam).`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            await markInvoicePaid(db, card.id, window, total, new Date().toISOString());
            bump();
          },
        },
      ]
    );
  };

  if (!card || !window) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View />
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.bg }}>
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
            <ArrowLeft size={20} color={colors.inkSoft} />
          </Pressable>
          <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '700' }}>
            {card.name}
          </Text>
          <Pressable
            onPress={() => router.push(`/card-edit?id=${card.id}`)}
            haptic="selection"
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              backgroundColor: colors.bgSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Pencil size={18} color={colors.inkSoft} />
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 140, gap: 16 }}>
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: `${card.color}22`,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CreditCard size={22} color={card.color} strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: colors.inkMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' }}>
                Fatura
              </Text>
              <Text style={{ color: colors.ink, fontSize: 14, fontWeight: '700' }}>
                {monthLabel}
              </Text>
            </View>
            {paid ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 999,
                  backgroundColor: `${colors.income}22`,
                }}
              >
                <Check size={12} color={colors.income} strokeWidth={2.6} />
                <Text style={{ color: colors.income, fontSize: 11, fontWeight: '700' }}>
                  Paga
                </Text>
              </View>
            ) : null}
          </View>

          <Text
            style={{
              color: total > 0 ? colors.expense : colors.inkSoft,
              fontSize: 36,
              fontWeight: '800',
              letterSpacing: -1,
              fontVariant: ['tabular-nums'],
            }}
          >
            {formatBRL(total)}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Calendar size={12} color={colors.inkMuted} />
            <Text style={{ color: colors.inkMuted, fontSize: 12 }}>
              Fecha em {formatDateLabel(window.toDate)} · vence em {formatDateLabel(window.dueDate)}
            </Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colors.bgSoft,
            padding: 6,
            borderRadius: 14,
          }}
        >
          <Pressable
            onPress={() => shiftAnchor(-1)}
            haptic="light"
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              backgroundColor: colors.bgCard,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronLeft size={20} color={colors.inkSoft} />
          </Pressable>
          <Text style={{ color: colors.ink, fontSize: 13, fontWeight: '700' }}>
            {monthLabel}
          </Text>
          <Pressable
            onPress={() => shiftAnchor(1)}
            haptic="light"
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              backgroundColor: colors.bgCard,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronRight size={20} color={colors.inkSoft} />
          </Pressable>
        </View>

        {txs.length === 0 ? (
          <EmptyState title="Nenhum lançamento nesta fatura" />
        ) : (
          <View style={{ gap: 4 }}>
            {txs.map((tx) => (
              <TransactionRow
                key={tx.id}
                tx={tx}
                onPress={() => router.push(`/transaction?id=${tx.id}`)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {!paid && total > 0 ? (
        <View
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: 24,
          }}
        >
          <Pressable
            onPress={handleMarkPaid}
            haptic="medium"
            scaleTo={0.97}
            style={{
              backgroundColor: colors.brand,
              paddingVertical: 16,
              borderRadius: 16,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
              shadowColor: colors.brand,
              shadowOpacity: 0.35,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            }}
          >
            <Check size={20} color={colors.bg} strokeWidth={2.6} />
            <Text style={{ color: colors.bg, fontSize: 16, fontWeight: '800' }}>
              Marcar como paga · {formatBRL(total)}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
