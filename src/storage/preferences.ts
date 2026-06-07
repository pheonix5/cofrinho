import AsyncStorage from '@react-native-async-storage/async-storage';

export type InvoiceReminderPrefs = {
  enabled: boolean;
  daysBefore: number;
  hour: number;
};

const KEY_INVOICE_REMINDER = 'cofrinho:invoiceReminder';

const DEFAULT_INVOICE_REMINDER: InvoiceReminderPrefs = {
  enabled: false,
  daysBefore: 3,
  hour: 10,
};

export async function getInvoiceReminderPrefs(): Promise<InvoiceReminderPrefs> {
  try {
    const raw = await AsyncStorage.getItem(KEY_INVOICE_REMINDER);
    if (!raw) return DEFAULT_INVOICE_REMINDER;
    const parsed = JSON.parse(raw) as Partial<InvoiceReminderPrefs>;
    return {
      enabled: parsed.enabled ?? DEFAULT_INVOICE_REMINDER.enabled,
      daysBefore: clampInt(parsed.daysBefore ?? DEFAULT_INVOICE_REMINDER.daysBefore, 1, 14),
      hour: clampInt(parsed.hour ?? DEFAULT_INVOICE_REMINDER.hour, 0, 23),
    };
  } catch {
    return DEFAULT_INVOICE_REMINDER;
  }
}

export async function setInvoiceReminderPrefs(prefs: InvoiceReminderPrefs): Promise<void> {
  await AsyncStorage.setItem(KEY_INVOICE_REMINDER, JSON.stringify(prefs));
}

function clampInt(n: number, min: number, max: number): number {
  const i = Math.floor(n);
  if (Number.isNaN(i)) return min;
  return Math.max(min, Math.min(max, i));
}
