import type { SQLiteDatabase } from 'expo-sqlite';
import type { Transaction, TransactionWithCategory, TxKind } from './types';

export type TxInput = {
  kind: TxKind;
  amount_cents: number;
  category_id: number | null;
  description: string | null;
  occurred_at: string;
  card_id?: number | null;
  installments?: number;
  recurring_id?: number | null;
};

export type InstallmentSeriesInput = {
  kind: TxKind;
  per_parcel_cents: number;
  parcel_count: number;
  category_id: number | null;
  description: string | null;
  first_occurrence: string;
};

function makeGroupId(): string {
  return `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function addMonths(iso: string, n: number): string {
  const d = new Date(iso);
  const targetMonth = d.getMonth() + n;
  const targetYear = d.getFullYear() + Math.floor(targetMonth / 12);
  const wrappedMonth = ((targetMonth % 12) + 12) % 12;
  const desiredDay = d.getDate();
  const lastDay = new Date(targetYear, wrappedMonth + 1, 0).getDate();
  const day = Math.min(desiredDay, lastDay);
  const out = new Date(targetYear, wrappedMonth, day, d.getHours(), d.getMinutes(), d.getSeconds());
  return out.toISOString();
}

export async function createTransaction(
  db: SQLiteDatabase,
  input: TxInput
): Promise<number> {
  const installments = Math.max(1, Math.floor(input.installments ?? 1));
  const cardId = input.card_id ?? null;

  if (installments === 1 || !cardId) {
    const result = await db.runAsync(
      `INSERT INTO transactions
         (kind, amount_cents, category_id, description, occurred_at, card_id, recurring_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        input.kind,
        input.amount_cents,
        input.category_id,
        input.description?.trim() || null,
        input.occurred_at,
        cardId,
        input.recurring_id ?? null,
      ]
    );
    return result.lastInsertRowId;
  }

  const group = makeGroupId();
  const baseDesc = input.description?.trim() || null;
  let firstId = 0;

  await db.withTransactionAsync(async () => {
    for (let i = 1; i <= installments; i++) {
      const occurred = addMonths(input.occurred_at, i - 1);
      const desc = baseDesc ? `${baseDesc} (${i}/${installments})` : `Parcela ${i}/${installments}`;
      const r = await db.runAsync(
        `INSERT INTO transactions
           (kind, amount_cents, category_id, description, occurred_at, card_id,
            installment_group, installment_number, installment_total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.kind,
          input.amount_cents,
          input.category_id,
          desc,
          occurred,
          cardId,
          group,
          i,
          installments,
        ]
      );
      if (i === 1) firstId = r.lastInsertRowId;
    }
  });
  return firstId;
}

export async function updateTransaction(
  db: SQLiteDatabase,
  id: number,
  input: TxInput
): Promise<void> {
  await db.runAsync(
    `UPDATE transactions
     SET kind = ?, amount_cents = ?, category_id = ?, description = ?, occurred_at = ?, card_id = ?
     WHERE id = ?`,
    [
      input.kind,
      input.amount_cents,
      input.category_id,
      input.description?.trim() || null,
      input.occurred_at,
      input.card_id ?? null,
      id,
    ]
  );
}

export async function createInstallmentSeries(
  db: SQLiteDatabase,
  input: InstallmentSeriesInput
): Promise<string> {
  const group = makeGroupId();
  const desc = input.description?.trim() || null;
  const count = Math.max(1, Math.floor(input.parcel_count));
  await db.withTransactionAsync(async () => {
    for (let i = 1; i <= count; i++) {
      const occurred = i === 1 ? input.first_occurrence : addMonths(input.first_occurrence, i - 1);
      const parcelDesc = desc ? `${desc} (${i}/${count})` : `Parcela ${i}/${count}`;
      await db.runAsync(
        `INSERT INTO transactions
           (kind, amount_cents, category_id, description, occurred_at,
            installment_group, installment_number, installment_total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.kind,
          input.per_parcel_cents,
          input.category_id,
          parcelDesc,
          occurred,
          group,
          i,
          count,
        ]
      );
    }
  });
  return group;
}

export async function deleteInstallmentSeries(
  db: SQLiteDatabase,
  groupId: string
): Promise<void> {
  await db.runAsync('DELETE FROM transactions WHERE installment_group = ?', [groupId]);
}

export async function deleteTransaction(
  db: SQLiteDatabase,
  id: number,
  options: { deleteFutureInstallments?: boolean } = {}
): Promise<void> {
  if (!options.deleteFutureInstallments) {
    await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
    return;
  }
  const tx = await getTransaction(db, id);
  if (!tx || !tx.installment_group || !tx.installment_number) {
    await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
    return;
  }
  await db.runAsync(
    'DELETE FROM transactions WHERE installment_group = ? AND installment_number >= ?',
    [tx.installment_group, tx.installment_number]
  );
}

export async function getTransaction(
  db: SQLiteDatabase,
  id: number
): Promise<Transaction | null> {
  const row = await db.getFirstAsync<Transaction>(
    'SELECT * FROM transactions WHERE id = ?',
    [id]
  );
  return row ?? null;
}

export async function listTransactionsByPeriod(
  db: SQLiteDatabase,
  from: string,
  to: string,
  limit?: number
): Promise<TransactionWithCategory[]> {
  const sql = `
    SELECT t.*,
           c.name AS category_name,
           c.icon AS category_icon,
           c.color AS category_color,
           cd.name AS card_name,
           cd.color AS card_color
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    LEFT JOIN cards cd ON cd.id = t.card_id
    WHERE t.occurred_at >= ? AND t.occurred_at < ?
      AND t.is_card_payment = 0
    ORDER BY t.occurred_at DESC, t.id DESC
    ${limit ? `LIMIT ${Math.floor(limit)}` : ''}
  `;
  return db.getAllAsync<TransactionWithCategory>(sql, [from, to]);
}

export async function listRecentTransactions(
  db: SQLiteDatabase,
  limit = 5
): Promise<TransactionWithCategory[]> {
  return db.getAllAsync<TransactionWithCategory>(
    `SELECT t.*,
            c.name AS category_name,
            c.icon AS category_icon,
            c.color AS category_color,
            cd.name AS card_name,
            cd.color AS card_color
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     LEFT JOIN cards cd ON cd.id = t.card_id
     WHERE t.is_card_payment = 0
     ORDER BY t.occurred_at DESC, t.id DESC
     LIMIT ?`,
    [limit]
  );
}
