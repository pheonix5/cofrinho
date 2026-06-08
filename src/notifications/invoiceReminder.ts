import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';

import { getOpenInvoiceWindow, listCards } from '@/db/cards';
import { listRecurring } from '@/db/recurring';
import { getInvoiceReminderPrefs } from '@/storage/preferences';

export const DUE_REMINDER_CHANNEL = 'due-reminder';
const INVOICE_ID_PREFIX = 'cofrinho-invoice-';
const RECURRING_ID_PREFIX = 'cofrinho-recurring-';

export async function rescheduleInvoiceReminders(db: SQLiteDatabase): Promise<void> {
  try {
    await cancelAllDueReminders();

    const prefs = await getInvoiceReminderPrefs();
    if (!prefs.enabled) return;

    const permission = await ensurePermission();
    if (!permission) return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(DUE_REMINDER_CHANNEL, {
        name: 'Lembrete de vencimento',
        description: 'Faturas de cartão e contas recorrentes prestes a vencer.',
        importance: Notifications.AndroidImportance.HIGH,
        showBadge: true,
      });
    }

    const now = new Date();
    await scheduleCardReminders(db, prefs, now);
    await scheduleRecurringReminders(db, prefs, now);
  } catch (err) {
    console.warn('[dueReminder] reschedule failed:', err);
  }
}

async function scheduleCardReminders(
  db: SQLiteDatabase,
  prefs: { daysBefore: number; hour: number },
  now: Date
): Promise<void> {
  const cards = await listCards(db);
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
      identifier: `${INVOICE_ID_PREFIX}${card.id}`,
      content: {
        title: `Fatura do ${card.name} vence em breve`,
        body: `Vencimento em ${formatDDMM(dueDate)}.`,
        data: { kind: 'invoice-reminder', cardId: card.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: trigger,
        channelId: DUE_REMINDER_CHANNEL,
      },
    });
  }
}

async function scheduleRecurringReminders(
  db: SQLiteDatabase,
  prefs: { daysBefore: number; hour: number },
  now: Date
): Promise<void> {
  const templates = await listRecurring(db);
  for (const t of templates) {
    if (t.active !== 1) continue;
    if (t.kind !== 'expense') continue;

    const dueDate = nextDueDateForDay(t.day_of_month, now);
    if (!dueDate) continue;

    const trigger = new Date(dueDate);
    trigger.setDate(trigger.getDate() - prefs.daysBefore);
    trigger.setHours(prefs.hour, 0, 0, 0);

    if (trigger.getTime() <= now.getTime()) continue;

    const label = t.description?.trim() || t.category_name || 'Conta recorrente';
    await Notifications.scheduleNotificationAsync({
      identifier: `${RECURRING_ID_PREFIX}${t.id}`,
      content: {
        title: `${label} vence em breve`,
        body: `Vencimento em ${formatDDMM(dueDate)}.`,
        data: { kind: 'recurring-reminder', templateId: t.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: trigger,
        channelId: DUE_REMINDER_CHANNEL,
      },
    });
  }
}

export async function cancelAllDueReminders(): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const item of scheduled) {
      const id = item.identifier;
      if (!id) continue;
      if (id.startsWith(INVOICE_ID_PREFIX) || id.startsWith(RECURRING_ID_PREFIX)) {
        await Notifications.cancelScheduledNotificationAsync(id);
      }
    }
  } catch (err) {
    console.warn('[dueReminder] cancel failed:', err);
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

function nextDueDateForDay(dayOfMonth: number, now: Date): Date | null {
  if (dayOfMonth < 1 || dayOfMonth > 31) return null;
  const todayDay = now.getDate();
  const year = now.getFullYear();
  const month = now.getMonth();
  if (todayDay <= dayOfMonth) {
    const lastDay = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(dayOfMonth, lastDay), 0, 0, 0, 0);
  }
  const nextMonth = month + 1;
  const nextYear = nextMonth > 11 ? year + 1 : year;
  const wrappedMonth = nextMonth % 12;
  const lastDay = new Date(nextYear, wrappedMonth + 1, 0).getDate();
  return new Date(nextYear, wrappedMonth, Math.min(dayOfMonth, lastDay), 0, 0, 0, 0);
}

function formatDDMM(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}
