import type { SQLiteDatabase } from 'expo-sqlite';
import type { Category, Transaction } from './types';
import type { RecurringTemplate } from './recurring';
import type { Card } from './cards';

type StoredBudget = {
  category_id: number;
  monthly_cents: number;
};

export type BackupPayload = {
  app: 'cofrinho';
  version: 1 | 2 | 3;
  exported_at: string;
  categories: Category[];
  transactions: Transaction[];
  recurring_templates?: RecurringTemplate[];
  budgets?: StoredBudget[];
  cards?: Card[];
};

export async function exportAll(db: SQLiteDatabase): Promise<BackupPayload> {
  const [categories, transactions, recurring_templates, budgets, cards] = await Promise.all([
    db.getAllAsync<Category>('SELECT * FROM categories ORDER BY id ASC'),
    db.getAllAsync<Transaction>('SELECT * FROM transactions ORDER BY id ASC'),
    db.getAllAsync<RecurringTemplate>('SELECT * FROM recurring_templates ORDER BY id ASC'),
    db.getAllAsync<StoredBudget>('SELECT category_id, monthly_cents FROM budgets'),
    db.getAllAsync<Card>('SELECT * FROM cards ORDER BY id ASC'),
  ]);
  return {
    app: 'cofrinho',
    version: 3,
    exported_at: new Date().toISOString(),
    categories,
    transactions,
    recurring_templates,
    budgets,
    cards,
  };
}

export type ImportMode = 'replace' | 'merge';

export async function importAll(
  db: SQLiteDatabase,
  payload: BackupPayload,
  mode: ImportMode
): Promise<{ categories: number; transactions: number; recurring: number; budgets: number; cards: number }> {
  if (
    payload.app !== 'cofrinho' ||
    (payload.version !== 1 && payload.version !== 2 && payload.version !== 3)
  ) {
    throw new Error('Arquivo de backup inválido ou versão incompatível.');
  }

  let importedCategories = 0;
  let importedTransactions = 0;
  let importedRecurring = 0;
  let importedBudgets = 0;
  let importedCards = 0;
  const idMap = new Map<number, number>();
  const recurringMap = new Map<number, number>();
  const cardMap = new Map<number, number>();

  await db.withExclusiveTransactionAsync(async (txn) => {
    if (mode === 'replace') {
      await txn.execAsync(
        'DELETE FROM transactions; DELETE FROM recurring_templates; DELETE FROM budgets; DELETE FROM cards; DELETE FROM categories;'
      );
    }

    for (const c of payload.cards ?? []) {
      const r = await txn.runAsync(
        `INSERT INTO cards (name, color, closing_day, due_day, active, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [c.name, c.color, c.closing_day, c.due_day, c.active, c.created_at]
      );
      cardMap.set(c.id, r.lastInsertRowId);
      importedCards++;
    }

    for (const c of payload.categories) {
      let targetId: number | null = null;
      if (mode === 'merge') {
        const existing = await txn.getFirstAsync<{ id: number }>(
          'SELECT id FROM categories WHERE name = ? AND kind = ? LIMIT 1',
          [c.name, c.kind]
        );
        if (existing) {
          targetId = existing.id;
        }
      }
      if (targetId === null) {
        const r = await txn.runAsync(
          'INSERT INTO categories (name, icon, color, kind, is_default) VALUES (?, ?, ?, ?, ?)',
          [c.name, c.icon, c.color, c.kind, c.is_default ?? 0]
        );
        targetId = r.lastInsertRowId;
        importedCategories++;
      }
      idMap.set(c.id, targetId);
    }

    for (const r of payload.recurring_templates ?? []) {
      const mappedCat = r.category_id == null ? null : idMap.get(r.category_id) ?? null;
      const result = await txn.runAsync(
        `INSERT INTO recurring_templates
           (kind, amount_cents, category_id, description, day_of_month, active, last_run_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          r.kind,
          r.amount_cents,
          mappedCat,
          r.description,
          r.day_of_month,
          r.active,
          r.last_run_at,
          r.created_at,
        ]
      );
      recurringMap.set(r.id, result.lastInsertRowId);
      importedRecurring++;
    }

    for (const t of payload.transactions) {
      const mappedCategory =
        t.category_id == null ? null : idMap.get(t.category_id) ?? null;
      const mappedRecurring =
        (t as any).recurring_id == null
          ? null
          : recurringMap.get((t as any).recurring_id) ?? null;
      const mappedCard =
        t.card_id == null ? null : cardMap.get(t.card_id) ?? null;
      await txn.runAsync(
        `INSERT INTO transactions
           (kind, amount_cents, category_id, description, occurred_at, created_at, recurring_id,
            card_id, installment_group, installment_number, installment_total, is_card_payment)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          t.kind,
          t.amount_cents,
          mappedCategory,
          t.description,
          t.occurred_at,
          t.created_at,
          mappedRecurring,
          mappedCard,
          t.installment_group ?? null,
          t.installment_number ?? null,
          t.installment_total ?? null,
          t.is_card_payment ?? 0,
        ]
      );
      importedTransactions++;
    }

    for (const b of payload.budgets ?? []) {
      const mappedCat = idMap.get(b.category_id);
      if (mappedCat == null) continue;
      await txn.runAsync(
        `INSERT INTO budgets (category_id, monthly_cents) VALUES (?, ?)
         ON CONFLICT(category_id) DO UPDATE SET monthly_cents = excluded.monthly_cents`,
        [mappedCat, b.monthly_cents]
      );
      importedBudgets++;
    }
  });

  return {
    categories: importedCategories,
    transactions: importedTransactions,
    recurring: importedRecurring,
    budgets: importedBudgets,
    cards: importedCards,
  };
}
