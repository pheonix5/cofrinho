import type { SQLiteDatabase } from 'expo-sqlite';

export const DB_NAME = 'cofrinho.db';
const TARGET_VERSION = 4;

const DEFAULT_CATEGORIES: Array<{
  name: string;
  icon: string;
  color: string;
  kind: 'income' | 'expense';
}> = [
  { name: 'Alimentação', icon: 'utensils', color: '#F87171', kind: 'expense' },
  { name: 'Transporte', icon: 'car', color: '#60A5FA', kind: 'expense' },
  { name: 'Moradia', icon: 'home', color: '#A78BFA', kind: 'expense' },
  { name: 'Lazer', icon: 'gamepad-2', color: '#F472B6', kind: 'expense' },
  { name: 'Saúde', icon: 'heart-pulse', color: '#34D399', kind: 'expense' },
  { name: 'Educação', icon: 'graduation-cap', color: '#FBBF24', kind: 'expense' },
  { name: 'Mercado', icon: 'shopping-cart', color: '#FB923C', kind: 'expense' },
  { name: 'Assinaturas', icon: 'repeat', color: '#22D3EE', kind: 'expense' },
  { name: 'Outros', icon: 'circle-ellipsis', color: '#8A8A99', kind: 'expense' },
  { name: 'Salário', icon: 'briefcase', color: '#4ADE80', kind: 'income' },
  { name: 'Freelance', icon: 'laptop', color: '#9AE66E', kind: 'income' },
  { name: 'Investimentos', icon: 'trending-up', color: '#5FC23B', kind: 'income' },
  { name: 'Presente', icon: 'gift', color: '#C8F5A6', kind: 'income' },
  { name: 'Outros', icon: 'circle-plus', color: '#8A8A99', kind: 'income' },
];

export async function migrate(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      kind TEXT NOT NULL CHECK(kind IN ('income','expense')),
      is_default INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL CHECK(kind IN ('income','expense')),
      amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      description TEXT,
      occurred_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_tx_occurred ON transactions(occurred_at);
    CREATE INDEX IF NOT EXISTS idx_tx_category ON transactions(category_id);
    CREATE INDEX IF NOT EXISTS idx_tx_kind ON transactions(kind);

    CREATE TABLE IF NOT EXISTS recurring_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL CHECK(kind IN ('income','expense')),
      amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      description TEXT,
      day_of_month INTEGER NOT NULL CHECK(day_of_month BETWEEN 1 AND 31),
      active INTEGER NOT NULL DEFAULT 1,
      last_run_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL UNIQUE REFERENCES categories(id) ON DELETE CASCADE,
      monthly_cents INTEGER NOT NULL CHECK(monthly_cents > 0),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      closing_day INTEGER NOT NULL CHECK(closing_day BETWEEN 1 AND 31),
      due_day INTEGER NOT NULL CHECK(due_day BETWEEN 1 AND 31),
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  await addColumnIfMissing(db, 'transactions', 'recurring_id',
    'INTEGER REFERENCES recurring_templates(id) ON DELETE SET NULL');
  await addColumnIfMissing(db, 'transactions', 'card_id',
    'INTEGER REFERENCES cards(id) ON DELETE SET NULL');
  await addColumnIfMissing(db, 'transactions', 'installment_group', 'TEXT');
  await addColumnIfMissing(db, 'transactions', 'installment_number', 'INTEGER');
  await addColumnIfMissing(db, 'transactions', 'installment_total', 'INTEGER');
  await addColumnIfMissing(db, 'transactions', 'is_card_payment',
    'INTEGER NOT NULL DEFAULT 0');

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_tx_recurring ON transactions(recurring_id);
    CREATE INDEX IF NOT EXISTS idx_tx_card ON transactions(card_id);
    CREATE INDEX IF NOT EXISTS idx_tx_installment_group ON transactions(installment_group);
  `);

  await seedDefaultCategories(db);
  await db.execAsync(`PRAGMA user_version = ${TARGET_VERSION}`);
}

async function addColumnIfMissing(
  db: SQLiteDatabase,
  table: string,
  column: string,
  definition: string
): Promise<void> {
  const rows = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  if (rows.some((r) => r.name === column)) return;
  await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
}

async function seedDefaultCategories(db: SQLiteDatabase): Promise<void> {
  const existing = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) as c FROM categories'
  );
  if ((existing?.c ?? 0) > 0) return;

  await db.withTransactionAsync(async () => {
    for (const c of DEFAULT_CATEGORIES) {
      await db.runAsync(
        'INSERT INTO categories (name, icon, color, kind, is_default) VALUES (?, ?, ?, ?, 1)',
        [c.name, c.icon, c.color, c.kind]
      );
    }
  });
}
