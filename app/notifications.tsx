import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Switch, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, X, Minus, Plus, Clock } from 'lucide-react-native';

import { Pressable } from '@/components/Pressable';
import {
  getInvoiceReminderPrefs,
  setInvoiceReminderPrefs,
  type InvoiceReminderPrefs,
} from '@/storage/preferences';
import { rescheduleInvoiceReminders } from '@/notifications/invoiceReminder';
import { colors } from '@/theme/colors';

export default function NotificationsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();

  const [prefs, setPrefs] = useState<InvoiceReminderPrefs | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await getInvoiceReminderPrefs();
      setPrefs(p);
    })();
  }, []);

  const update = useCallback(
    async (patch: Partial<InvoiceReminderPrefs>) => {
      if (!prefs) return;
      const next = { ...prefs, ...patch };
      setPrefs(next);
      setSaving(true);
      try {
        await setInvoiceReminderPrefs(next);
        await rescheduleInvoiceReminders(db);
      } catch (e: any) {
        Alert.alert('Erro ao salvar', e?.message ?? 'Tente novamente.');
      } finally {
        setSaving(false);
      }
    },
    [prefs, db]
  );

  if (!prefs) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

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
        <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '700' }}>Notificações</Text>
        <View style={{ width: 40 }}>
          {saving ? <ActivityIndicator size="small" color={colors.brand} /> : null}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        <View
          style={{
            backgroundColor: colors.bgCard,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: colors.line,
            padding: 16,
            gap: 14,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: `${colors.brand}22`,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bell size={20} color={colors.brand} strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.ink, fontSize: 15, fontWeight: '700' }}>
                Lembrete de fatura
              </Text>
              <Text style={{ color: colors.inkMuted, fontSize: 12 }}>
                Avisa antes do vencimento de cada cartão ativo.
              </Text>
            </View>
            <Switch
              value={prefs.enabled}
              onValueChange={(v) => update({ enabled: v })}
              trackColor={{ false: colors.bgElev, true: colors.brandDeep }}
              thumbColor={prefs.enabled ? colors.brand : colors.inkDim}
            />
          </View>

          {prefs.enabled ? (
            <>
              <View style={{ height: 1, backgroundColor: colors.line }} />
              <Stepper
                label="Avisar com antecedência"
                value={prefs.daysBefore}
                min={1}
                max={14}
                unit={prefs.daysBefore === 1 ? 'dia antes' : 'dias antes'}
                onChange={(v) => update({ daysBefore: v })}
              />
              <Stepper
                label="Horário"
                Icon={Clock}
                value={prefs.hour}
                min={0}
                max={23}
                unit="h"
                formatValue={(v) => `${String(v).padStart(2, '0')}:00`}
                onChange={(v) => update({ hour: v })}
              />
            </>
          ) : null}
        </View>

        <Text style={{ color: colors.inkMuted, fontSize: 12, paddingHorizontal: 4, lineHeight: 18 }}>
          As notificações são reagendadas automaticamente quando você adiciona, edita ou remove um
          cartão.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stepper({
  label,
  Icon,
  value,
  min,
  max,
  unit,
  formatValue,
  onChange,
}: {
  label: string;
  Icon?: any;
  value: number;
  min: number;
  max: number;
  unit?: string;
  formatValue?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {Icon ? <Icon size={18} color={colors.inkSoft} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.inkMuted, fontSize: 12 }}>{label}</Text>
        <Text style={{ color: colors.ink, fontSize: 15, fontWeight: '700', marginTop: 2 }}>
          {formatValue ? formatValue(value) : value} {unit ?? ''}
        </Text>
      </View>
      <Pressable
        onPress={() => onChange(Math.max(min, value - 1))}
        haptic="light"
        scaleTo={0.92}
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: colors.bgElev,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Minus size={16} color={colors.inkSoft} />
      </Pressable>
      <Pressable
        onPress={() => onChange(Math.min(max, value + 1))}
        haptic="light"
        scaleTo={0.92}
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: colors.bgElev,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Plus size={16} color={colors.inkSoft} />
      </Pressable>
    </View>
  );
}
