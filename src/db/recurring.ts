import type { SQLiteDatabase } from 'expo-sqlite';
import type { TxKind } from './types';

export type RecurringTemplate = {
  id: number;
  kind: TxKind;
  amount_cents: number;
  category_id: number | null;
  description: string | null;
  day_of_month: number;
  active: number;
  last_run_at: string | null;
  created_at: string;
};

export type RecurringWithCategory = RecurringTemplate & {
  category_name: string | null;
  category_icon: string | null;
  category_color: string | null;
};

export type RecurringInput = {
  kind: TxKind;
  amount_cents: number;
  category_id: number | null;
  description: string | null;
  day_of_month: number;
  active: boolean;
};

export async function listRecurring(db: SQLiteDatabase): Promise<RecurringWithCategory[]> {
  return db.getAllAsync<RecurringWithCategory>(
    `SELECT r.*,
            c.name AS category_name,
            c.icon AS category_icon,
            c.color AS category_color
     FROM recurring_templates r
     LEFT JOIN categories c ON c.id = r.category_id
     ORDER BY r.active DESC, r.day_of_month ASC`
  );
}

export async function getRecurring(
  db: SQLiteDatabase,
  id: number
): Promise<RecurringTemplate | null> {
  const row = await db.getFirstAsync<RecurringTemplate>(
    'SELECT * FROM recurring_templates WHERE id = ?',
    [id]
  );
  return row ?? null;
}

export async function createRecurring(
  db: SQLiteDatabase,
  input: RecurringInput
): Promise<number> {
  const description = input.description?.trim() || null;
  const r = await db.runAsync(
    `INSERT INTO recurring_templates
       (kind, amount_cents, category_id, description, day_of_month, active)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.kind,
      input.amount_cents,
      input.category_id,
      description,
      input.day_of_month,
      input.active ? 1 : 0,
    ]
  );
  const id = r.lastInsertRowId;

  if (input.active) {
    const now = new Date();
    const effectiveDay = Math.min(
      input.day_of_month,
      lastDayOfMonth(now.getFullYear(), now.getMonth())
    );
    if (now.getDate() >= effectiveDay) {
      const occurredAt = new Date(
        now.getFullYear(),
        now.getMonth(),
        effectiveDay,
        12,
        0,
        0
      );
      await db.runAsync(
        `INSERT INTO transactions
           (kind, amount_cents, category_id, description, occurred_at, recurring_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          input.kind,
          input.amount_cents,
          input.category_id,
          description,
          occurredAt.toISOString(),
          id,
        ]
      );
      await db.runAsync(
        'UPDATE recurring_templates SET last_run_at = ? WHERE id = ?',
        [occurredAt.toISOString(), id]
      );
    }
  }

  return id;
}

export async function updateRecurring(
  db: SQLiteDatabase,
  id: number,
  input: RecurringInput
): Promise<void> {
  await db.runAsync(
    `UPDATE recurring_templates
     SET kind = ?, amount_cents = ?, category_id = ?, description = ?,
         day_of_month = ?, active = ?
     WHERE id = ?`,
    [
      input.kind,
      input.amount_cents,
      input.category_id,
      input.description?.trim() || null,
      input.day_of_month,
      input.active ? 1 : 0,
      id,
    ]
  );
}

export async function deleteRecurring(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM recurring_templates WHERE id = ?', [id]);
}

export async function setRecurringActive(
  db: SQLiteDatabase,
  id: number,
  active: boolean
): Promise<void> {
  await db.runAsync('UPDATE recurring_templates SET active = ? WHERE id = ?', [
    active ? 1 : 0,
    id,
  ]);
}

function lastDayOfMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}

function clampedDayOfMonth(year: number, month0: number, day: number): Date {
  const maxDay = lastDayOfMonth(year, month0);
  return new Date(year, month0, Math.min(day, maxDay), 12, 0, 0);
}

function getNextOccurrenceAfter(after: Date, dayOfMonth: number): Date {
  let year = after.getFullYear();
  let month = after.getMonth();
  let candidate = clampedDayOfMonth(year, month, dayOfMonth);
  if (candidate.getTime() <= after.getTime()) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
    candidate = clampedDayOfMonth(year, month, dayOfMonth);
  }
  return candidate;
}

export async function runRecurrences(db: SQLiteDatabase, now: Date = new Date()): Promise<number> {
  const templates = await db.getAllAsync<RecurringTemplate>(
    'SELECT * FROM recurring_templates WHERE active = 1'
  );

  let created = 0;
  await db.withTransactionAsync(async () => {
    for (const t of templates) {
      const startFrom = new Date(t.last_run_at ?? t.created_at);
      let cursor = getNextOccurrenceAfter(startFrom, t.day_of_month);
      let latestRun: Date | null = null;

      while (cursor.getTime() <= now.getTime()) {
        await db.runAsync(
          `INSERT INTO transactions
             (kind, amount_cents, category_id, description, occurred_at, recurring_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            t.kind,
            t.amount_cents,
            t.category_id,
            t.description,
            cursor.toISOString(),
            t.id,
          ]
        );
        created++;
        latestRun = cursor;
        cursor = getNextOccurrenceAfter(cursor, t.day_of_month);
      }

      if (latestRun) {
        await db.runAsync(
          'UPDATE recurring_templates SET last_run_at = ? WHERE id = ?',
          [latestRun.toISOString(), t.id]
        );
      }
    }
  });

  return created;
}
