import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  CategoryAggregate,
  MonthAggregate,
  PeriodSummary,
  TxKind,
} from './types';
import { EFFECTIVE_AT_EXPR } from './sqlHelpers';

export async function getPeriodSummary(
  db: SQLiteDatabase,
  from: string,
  to: string
): Promise<PeriodSummary> {
  const row = await db.getFirstAsync<{
    income_cents: number | null;
    expense_cents: number | null;
    count: number;
  }>(
    `SELECT
       COALESCE(SUM(CASE WHEN t.kind = 'income' THEN t.amount_cents END), 0) AS income_cents,
       COALESCE(SUM(CASE WHEN t.kind = 'expense' THEN t.amount_cents END), 0) AS expense_cents,
       COUNT(*) AS count
     FROM transactions t
     LEFT JOIN cards cd ON cd.id = t.card_id
     WHERE ${EFFECTIVE_AT_EXPR} >= ? AND ${EFFECTIVE_AT_EXPR} < ?
       AND t.is_card_payment = 0`,
    [from, to]
  );
  const income = row?.income_cents ?? 0;
  const expense = row?.expense_cents ?? 0;
  return {
    income_cents: income,
    expense_cents: expense,
    balance_cents: income - expense,
    count: row?.count ?? 0,
  };
}

export async function getCategoryBreakdown(
  db: SQLiteDatabase,
  from: string,
  to: string,
  kind: TxKind
): Promise<CategoryAggregate[]> {
  return db.getAllAsync<CategoryAggregate>(
    `SELECT
       c.id AS category_id,
       COALESCE(c.name, 'Sem categoria') AS category_name,
       COALESCE(c.icon, 'circle') AS category_icon,
       COALESCE(c.color, '#8A8A99') AS category_color,
       SUM(t.amount_cents) AS total_cents,
       COUNT(*) AS count
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     LEFT JOIN cards cd ON cd.id = t.card_id
     WHERE t.kind = ? AND ${EFFECTIVE_AT_EXPR} >= ? AND ${EFFECTIVE_AT_EXPR} < ?
       AND t.is_card_payment = 0
     GROUP BY t.category_id
     ORDER BY total_cents DESC`,
    [kind, from, to]
  );
}

export type FrequentShortcut = {
  category_id: number;
  category_name: string;
  category_icon: string;
  category_color: string;
  amount_cents: number;
  description: string | null;
};

export async function getFrequentShortcuts(
  db: SQLiteDatabase,
  kind: TxKind,
  limit = 5
): Promise<FrequentShortcut[]> {
  return db.getAllAsync<FrequentShortcut>(
    `SELECT t.category_id AS category_id,
            c.name AS category_name,
            c.icon AS category_icon,
            c.color AS category_color,
            t.amount_cents AS amount_cents,
            t.description AS description
     FROM transactions t
     INNER JOIN categories c ON c.id = t.category_id
     WHERE t.kind = ?
       AND t.is_card_payment = 0
       AND t.id IN (
         SELECT MAX(id) FROM transactions
         WHERE kind = ? AND category_id IS NOT NULL AND is_card_payment = 0
         GROUP BY category_id
       )
     ORDER BY t.occurred_at DESC, t.id DESC
     LIMIT ?`,
    [kind, kind, limit]
  );
}

export type MonthComparison = {
  current: PeriodSummary;
  previous: PeriodSummary;
  expenseDeltaPct: number | null;
  incomeDeltaPct: number | null;
};

export async function getMonthComparison(
  db: SQLiteDatabase,
  currentFrom: string,
  currentTo: string,
  previousFrom: string,
  previousTo: string
): Promise<MonthComparison> {
  const [current, previous] = await Promise.all([
    getPeriodSummary(db, currentFrom, currentTo),
    getPeriodSummary(db, previousFrom, previousTo),
  ]);

  const expenseDeltaPct =
    previous.expense_cents > 0
      ? ((current.expense_cents - previous.expense_cents) / previous.expense_cents) * 100
      : null;
  const incomeDeltaPct =
    previous.income_cents > 0
      ? ((current.income_cents - previous.income_cents) / previous.income_cents) * 100
      : null;

  return { current, previous, expenseDeltaPct, incomeDeltaPct };
}

export async function getMonthlyAggregates(
  db: SQLiteDatabase,
  monthsBack = 6
): Promise<MonthAggregate[]> {
  return db.getAllAsync<MonthAggregate>(
    `SELECT
       strftime('%Y-%m', ${EFFECTIVE_AT_EXPR}) AS month,
       COALESCE(SUM(CASE WHEN t.kind = 'income' THEN t.amount_cents END), 0) AS income_cents,
       COALESCE(SUM(CASE WHEN t.kind = 'expense' THEN t.amount_cents END), 0) AS expense_cents
     FROM transactions t
     LEFT JOIN cards cd ON cd.id = t.card_id
     WHERE ${EFFECTIVE_AT_EXPR} >= date('now', ?) AND t.is_card_payment = 0
     GROUP BY month
     ORDER BY month ASC`,
    [`-${monthsBack} months`]
  );
}
