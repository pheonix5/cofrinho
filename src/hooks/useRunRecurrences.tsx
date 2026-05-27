import { useEffect } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { runRecurrences } from '@/db/recurring';
import { useBumpReload } from './useReload';

export function RecurrencesRunner() {
  const db = useSQLiteContext();
  const bump = useBumpReload();

  useEffect(() => {
    (async () => {
      try {
        const created = await runRecurrences(db);
        if (created > 0) bump();
      } catch (e) {
        console.warn('runRecurrences failed', e);
      }
    })();
  }, [db, bump]);

  return null;
}
