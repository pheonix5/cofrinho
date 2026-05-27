import type { SQLiteDatabase } from 'expo-sqlite';
import type { TransactionWithCategory } from './types';

export type Card = {
  id: number;
  name: string;
  color: string;
  closing_day: number;
  due_day: number;
  active: number;
  created_at: string;
};

export type CardInput = {
  name: string;
  color: string;
  closing_day: number;
  due_day: number;
  active: boolean;
};

export type InvoiceWindow = {
  anchorYear: number;
  anchorMonth: number;
  fromDate: string;
  toDate: string;
  dueDate: string;
};

export type CardWithOpenInvoice = Card & {
  open_invoice_cents: number;
  open_invoice_due: string;
  open_invoice_count: number;
};

function clampDayISO(year: number, month0: number, day: number): string {
  const lastDay = new Date(year, month0 + 1, 0).getDate();
  const d = Math.min(day, lastDay);
  const mm = String(month0 + 1).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

function addMonth(year: number, month0: number, delta: number): { year: number; month0: number } {
  let y = year;
  let m = month0 + delta;
  while (m < 0) {
    m += 12;
    y -= 1;
  }
  while (m > 11) {
    m -= 12;
    y += 1;
  }
  return { year: y, month0: m };
}

export function getInvoiceAnchorForTxDate(card: Card, txDateISO: string): { year: number; month: number } {
  const d = new Date(txDateISO);
  let y = d.getFullYear();
  let m = d.getMonth();
  if (d.getDate() > card.closing_day) {
    const next = addMonth(y, m, 1);
    y = next.year;
    m = next.month0;
  }
  return { year: y, month: m };
}

export function getInvoiceWindow(card: Card, anchorYear: number, anchorMonth: number): InvoiceWindow {
  const toDate = clampDayISO(anchorYear, anchorMonth, card.closing_day);
  const prev = addMonth(anchorYear, anchorMonth, -1);
  const fromDate = clampDayISO(prev.year, prev.month0, card.closing_day);
  const dueAnchor = addMonth(anchorYear, anchorMonth, 1);
  const dueDate = clampDayISO(dueAnchor.year, dueAnchor.month0, card.due_day);
  return {
    anchorYear,
    anchorMonth,
    fromDate,
    toDate,
    dueDate,
  };
}

export function getOpenInvoiceWindow(card: Card, now: Date = new Date()): InvoiceWindow {
  const closingThisMonth = clampDayISO(now.getFullYear(), now.getMonth(), card.closing_day);
  const todayISO = clampDayISO(now.getFullYear(), now.getMonth(), now.getDate());
  if (todayISO <= closingThisMonth) {
    return getInvoiceWindow(card, now.getFullYear(), now.getMonth());
  }
  const next = addMonth(now.getFullYear(), now.getMonth(), 1);
  return getInvoiceWindow(card, next.year, next.month0);
}

export async function listCards(db: SQLiteDatabase): Promise<Card[]> {
  return db.getAllAsync<Card>('SELECT * FROM cards ORDER BY active DESC, name ASC');
}

export async function getCard(db: SQLiteDatabase, id: number): Promise<Card | null> {
  const row = await db.getFirstAsync<Card>('SELECT * FROM cards WHERE id = ?', [id]);
  return row ?? null;
}

export async function createCard(db: SQLiteDatabase, input: CardInput): Promise<number> {
  const r = await db.runAsync(
    `INSERT INTO cards (name, color, closing_day, due_day, active)
     VALUES (?, ?, ?, ?, ?)`,
    [input.name.trim(), input.color, input.closing_day, input.due_day, input.active ? 1 : 0]
  );
  return r.lastInsertRowId;
}

export async function updateCard(db: SQLiteDatabase, id: number, input: CardInput): Promise<void> {
  await db.runAsync(
    `UPDATE cards SET name = ?, color = ?, closing_day = ?, due_day = ?, active = ? WHERE id = ?`,
    [input.name.trim(), input.color, input.closing_day, input.due_day, input.active ? 1 : 0, id]
  );
}

export async function deleteCard(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM cards WHERE id = ?', [id]);
}

export async function listCardsWithOpenInvoice(
  db: SQLiteDatabase,
  now: Date = new Date()
): Promise<CardWithOpenInvoice[]> {
  const cards = await listCards(db);
  const result: CardWithOpenInvoice[] = [];
  for (const card of cards) {
    const w = getOpenInvoiceWindow(card, now);
    const row = await db.getFirstAsync<{ total: number | null; n: number }>(
      `SELECT COALESCE(SUM(amount_cents), 0) AS total, COUNT(*) AS n
       FROM transactions
       WHERE card_id = ?
         AND is_card_payment = 0
         AND date(occurred_at) > date(?)
         AND date(occurred_at) <= date(?)`,
      [card.id, w.fromDate, w.toDate]
    );
    result.push({
      ...card,
      open_invoice_cents: row?.total ?? 0,
      open_invoice_due: w.dueDate,
      open_invoice_count: row?.n ?? 0,
    });
  }
  return result;
}

export async function listInvoiceTransactions(
  db: SQLiteDatabase,
  cardId: number,
  window: InvoiceWindow
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
     WHERE t.card_id = ?
       AND t.is_card_payment = 0
       AND date(t.occurred_at) > date(?)
       AND date(t.occurred_at) <= date(?)
     ORDER BY t.occurred_at DESC, t.id DESC`,
    [cardId, window.fromDate, window.toDate]
  );
}

export async function getInvoiceTotal(
  db: SQLiteDatabase,
  cardId: number,
  window: InvoiceWindow
): Promise<number> {
  const row = await db.getFirstAsync<{ total: number | null }>(
    `SELECT COALESCE(SUM(amount_cents), 0) AS total
     FROM transactions
     WHERE card_id = ?
       AND is_card_payment = 0
       AND date(occurred_at) > date(?)
       AND date(occurred_at) <= date(?)`,
    [cardId, window.fromDate, window.toDate]
  );
  return row?.total ?? 0;
}

export async function isInvoicePaid(
  db: SQLiteDatabase,
  cardId: number,
  window: InvoiceWindow
): Promise<boolean> {
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n
     FROM transactions
     WHERE card_id = ?
       AND is_card_payment = 1
       AND date(occurred_at) > date(?)
       AND date(occurred_at) <= date(?)`,
    [cardId, window.fromDate, window.toDate]
  );
  return (row?.n ?? 0) > 0;
}

export async function markInvoicePaid(
  db: SQLiteDatabase,
  cardId: number,
  window: InvoiceWindow,
  amountCents: number,
  paidAtISO: string
): Promise<void> {
  await db.runAsync(
    `INSERT INTO transactions
       (kind, amount_cents, category_id, description, occurred_at, card_id, is_card_payment)
     VALUES ('expense', ?, NULL, ?, ?, ?, 1)`,
    [amountCents, `Pagamento de fatura`, paidAtISO, cardId]
  );
}
