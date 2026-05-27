import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CreditCard, Plus, Calendar } from 'lucide-react-native';

import { Pressable } from '@/components/Pressable';
import { EmptyState } from '@/components/EmptyState';
import { listCardsWithOpenInvoice } from '@/db/cards';
import type { CardWithOpenInvoice } from '@/db/cards';
import { useReloadToken } from '@/hooks/useReload';
import { formatBRL } from '@/utils/format';
import { formatDateLabel } from '@/utils/date';
import { colors } from '@/theme/colors';

export default function CardsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const reloadToken = useReloadToken();

  const [items, setItems] = useState<CardWithOpenInvoice[]>([]);

  const load = useCallback(async () => {
    const list = await listCardsWithOpenInvoice(db);
    setItems(list);
  }, [db]);

  useEffect(() => {
    load();
  }, [load, reloadToken]);

  const totalOpen = items
    .filter((c) => c.active === 1)
    .reduce((acc, c) => acc + c.open_invoice_cents, 0);

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
              CARTÕES
            </Text>
            <Text style={{ color: colors.ink, fontSize: 22, fontWeight: '800', marginTop: 2 }}>
              Faturas abertas
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/card-edit')}
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
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 120, gap: 16 }}>
        {items.length > 0 ? (
          <View
            style={{
              backgroundColor: colors.bgCard,
              borderRadius: 20,
              padding: 18,
              gap: 8,
              borderWidth: 1,
              borderColor: colors.line,
            }}
          >
            <Text style={{ color: colors.inkMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' }}>
              Total em aberto
            </Text>
            <Text
              style={{
                color: colors.expense,
                fontSize: 32,
                fontWeight: '800',
                letterSpacing: -1,
                fontVariant: ['tabular-nums'],
              }}
            >
              {formatBRL(totalOpen)}
            </Text>
            <Text style={{ color: colors.inkMuted, fontSize: 12 }}>
              Somando todos os cartões ativos
            </Text>
          </View>
        ) : null}

        {items.length === 0 ? (
          <EmptyState
            title="Nenhum cartão cadastrado"
            subtitle="Adicione cartões de crédito para gerenciar faturas e lançar compras parceladas."
          />
        ) : (
          items.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => router.push(`/card-detail?id=${c.id}`)}
              haptic="selection"
              style={{
                backgroundColor: colors.bgCard,
                borderRadius: 20,
                padding: 16,
                gap: 14,
                borderWidth: 1,
                borderColor: colors.line,
                opacity: c.active === 1 ? 1 : 0.5,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    backgroundColor: `${c.color}22`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CreditCard size={22} color={c.color} strokeWidth={2.4} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '700' }}>{c.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Calendar size={11} color={colors.inkMuted} />
                    <Text style={{ color: colors.inkMuted, fontSize: 11 }}>
                      Vence {formatDateLabel(c.open_invoice_due)} · fecha dia {c.closing_day}
                    </Text>
                  </View>
                </View>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  paddingTop: 10,
                  borderTopWidth: 1,
                  borderTopColor: colors.line,
                }}
              >
                <Text style={{ color: colors.inkMuted, fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  Fatura aberta
                </Text>
                <Text
                  style={{
                    color: c.open_invoice_cents > 0 ? colors.expense : colors.inkSoft,
                    fontSize: 20,
                    fontWeight: '800',
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {formatBRL(c.open_invoice_cents)}
                </Text>
              </View>
              {c.open_invoice_count > 0 ? (
                <Text style={{ color: colors.inkMuted, fontSize: 11 }}>
                  {c.open_invoice_count}{' '}
                  {c.open_invoice_count === 1 ? 'lançamento' : 'lançamentos'} nesta fatura
                </Text>
              ) : null}
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}
