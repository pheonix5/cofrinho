import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';

import { resolveQuickActionRoute, setupQuickActionNotification } from './quickAction';

export function QuickActionBridge() {
  const router = useRouter();
  const lastResponse = Notifications.useLastNotificationResponse();
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    setupQuickActionNotification();
  }, []);

  useEffect(() => {
    if (!lastResponse) return;
    const stamp = `${lastResponse.notification.request.identifier}:${lastResponse.actionIdentifier}`;
    if (handledRef.current === stamp) return;
    const route = resolveQuickActionRoute(lastResponse.actionIdentifier);
    if (!route) return;
    handledRef.current = stamp;
    router.push(route as never);
  }, [lastResponse, router]);

  return null;
}
