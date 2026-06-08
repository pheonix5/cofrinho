import type { SQLiteDatabase } from 'expo-sqlite';
import { EFFECTIVE_AT_EXPR } from './sqlHelpers';

export type BudgetProgress = {
  category_id: number;
  category_name: string;
  category_icon: string;
  category_color: string;
  monthly_cents: number;
  spent_cents: number;
};

export async function listBudgetsWithProgress(
  db: SQLiteDatabase,
  monthFrom: string,
  monthTo: string
): Promise<BudgetProgress[]> {
  return db.getAllAsync<BudgetProgress>(
    `SELECT
       b.category_id AS category_id,
       c.name AS category_name,
       c.icon AS category_icon,
       c.color AS category_color,
       b.monthly_cents AS monthly_cents,
       COALESCE((
         SELECT SUM(t.amount_cents)
         FROM transactions t
         LEFT JOIN cards cd ON cd.id = t.card_id
         WHERE t.category_id = b.category_id
           AND t.kind = 'expense'
           AND t.is_card_payment = 0
           AND ${EFFECTIVE_AT_EXPR} >= ? AND ${EFFECTIVE_AT_EXPR} < ?
       ), 0) AS spent_cents
     FROM budgets b
     INNER JOIN categories c ON c.id = b.category_id
     ORDER BY (CAST(spent_cents AS REAL) / b.monthly_cents) DESC, c.name ASC`,
    [monthFrom, monthTo]
  );
}

export async function getBudget(
  db: SQLiteDatabase,
  categoryId: number
): Promise<number | null> {
  const row = await db.getFirstAsync<{ monthly_cents: number }>(
    'SELECT monthly_cents FROM budgets WHERE category_id = ?',
    [categoryId]
  );
  return row?.monthly_cents ?? null;
}

export async function setBudget(
  db: SQLiteDatabase,
  categoryId: number,
  monthlyCents: number
): Promise<void> {
  if (monthlyCents <= 0) {
    await db.runAsync('DELETE FROM budgets WHERE category_id = ?', [categoryId]);
    return;
  }
  await db.runAsync(
    `INSERT INTO budgets (category_id, monthly_cents) VALUES (?, ?)
     ON CONFLICT(category_id) DO UPDATE SET monthly_cents = excluded.monthly_cents`,
    [categoryId, monthlyCents]
  );
}

export async function deleteBudget(db: SQLiteDatabase, categoryId: number): Promise<void> {
  await db.runAsync('DELETE FROM budgets WHERE category_id = ?', [categoryId]);
}
