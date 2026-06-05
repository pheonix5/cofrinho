import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export const QUICK_ACTION_CATEGORY = 'COFRINHO_QUICK_TX';
export const QUICK_ACTION_CHANNEL = 'quick-action';
export const QUICK_ACTION_NOTIFICATION_ID = 'cofrinho-quick-action';
export const QUICK_ACTION_EXPENSE = 'expense';
export const QUICK_ACTION_INCOME = 'income';

let setupPromise: Promise<void> | null = null;

export function setupQuickActionNotification(): Promise<void> {
  if (Platform.OS !== 'android') return Promise.resolve();
  if (setupPromise) return setupPromise;
  setupPromise = runSetup().catch((err) => {
    console.warn('[quickAction] setup failed:', err);
    setupPromise = null;
  });
  return setupPromise;
}

async function runSetup(): Promise<void> {
  const settings = await Notifications.getPermissionsAsync();
  let granted = settings.granted;
  if (!granted && settings.canAskAgain) {
    const req = await Notifications.requestPermissionsAsync();
    granted = req.granted;
  }
  if (!granted) return;

  await Notifications.setNotificationChannelAsync(QUICK_ACTION_CHANNEL, {
    name: 'Atalhos rápidos',
    description: 'Botões fixos para lançar gastos e receitas direto da barra de notificações.',
    importance: Notifications.AndroidImportance.LOW,
    sound: null,
    vibrationPattern: null,
    enableVibrate: false,
    showBadge: false,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });

  await Notifications.setNotificationCategoryAsync(QUICK_ACTION_CATEGORY, [
    {
      identifier: QUICK_ACTION_EXPENSE,
      buttonTitle: '＋ Gasto',
      options: { opensAppToForeground: true },
    },
    {
      identifier: QUICK_ACTION_INCOME,
      buttonTitle: '＋ Receita',
      options: { opensAppToForeground: true },
    },
  ]);

  await Notifications.scheduleNotificationAsync({
    identifier: QUICK_ACTION_NOTIFICATION_ID,
    content: {
      title: 'Cofrinho',
      body: 'Registrar gasto ou receita',
      sticky: true,
      autoDismiss: false,
      priority: Notifications.AndroidNotificationPriority.LOW,
      categoryIdentifier: QUICK_ACTION_CATEGORY,
      data: { source: 'quick-action' },
    },
    trigger: null,
  });
}

export function resolveQuickActionRoute(actionIdentifier: string | undefined | null): string | null {
  if (actionIdentifier === QUICK_ACTION_EXPENSE) return '/transaction?kind=expense';
  if (actionIdentifier === QUICK_ACTION_INCOME) return '/transaction?kind=income';
  return null;
}
