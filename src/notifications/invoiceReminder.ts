import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';

import { getOpenInvoiceWindow, listCards } from '@/db/cards';
import { getInvoiceReminderPrefs } from '@/storage/preferences';

export const INVOICE_REMINDER_CHANNEL = 'invoice-reminder';
const INVOICE_REMINDER_ID_PREFIX = 'cofrinho-invoice-';

export async function rescheduleInvoiceReminders(db: SQLiteDatabase): Promise<void> {
  try {
    await cancelAllInvoiceReminders();

    const prefs = await getInvoiceReminderPrefs();
    if (!prefs.enabled) return;

    const permission = await ensurePermission();
    if (!permission) return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(INVOICE_REMINDER_CHANNEL, {
        name: 'Lembrete de fatura',
        description: 'Notificações de vencimento das faturas dos cartões.',
        importance: Notifications.AndroidImportance.HIGH,
        showBadge: true,
      });
    }

    const cards = await listCards(db);
    const now = new Date();

    for (const card of cards) {
      if (card.active !== 1) continue;
      const window = getOpenInvoiceWindow(card, now);
      const dueDate = parseISODate(window.dueDate);
      if (!dueDate) continue;

      const trigger = new Date(dueDate);
      trigger.setDate(trigger.getDate() - prefs.daysBefore);
      trigger.setHours(prefs.hour, 0, 0, 0);

      if (trigger.getTime() <= now.getTime()) continue;

      await Notifications.scheduleNotificationAsync({
        identifier: `${INVOICE_REMINDER_ID_PREFIX}${card.id}`,
        content: {
          title: `Fatura do ${card.name} vence em breve`,
          body: `Vencimento em ${formatDDMM(dueDate)}. Toque para abrir a fatura.`,
          data: { kind: 'invoice-reminder', cardId: card.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: trigger,
          channelId: INVOICE_REMINDER_CHANNEL,
        },
      });
    }
  } catch (err) {
    console.warn('[invoiceReminder] reschedule failed:', err);
  }
}

export async function cancelAllInvoiceReminders(): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const item of scheduled) {
      if (item.identifier?.startsWith(INVOICE_REMINDER_ID_PREFIX)) {
        await Notifications.cancelScheduledNotificationAsync(item.identifier);
      }
    }
  } catch (err) {
    console.warn('[invoiceReminder] cancel failed:', err);
  }
}

async function ensurePermission(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  if (!settings.canAskAgain) return false;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

function parseISODate(iso: string): Date | null {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatDDMM(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}
