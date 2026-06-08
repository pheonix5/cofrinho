import type { SQLiteDatabase } from 'expo-sqlite';
import type { Category, TxKind } from './types';

export async function listCategories(
  db: SQLiteDatabase,
  kind?: TxKind
): Promise<Category[]> {
  if (kind) {
    return db.getAllAsync<Category>(
      'SELECT * FROM categories WHERE kind = ? ORDER BY is_default DESC, name ASC',
      [kind]
    );
  }
  return db.getAllAsync<Category>(
    'SELECT * FROM categories ORDER BY kind, is_default DESC, name ASC'
  );
}

export async function createCategory(
  db: SQLiteDatabase,
  input: { name: string; icon: string; color: string; kind: TxKind }
): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO categories (name, icon, color, kind, is_default) VALUES (?, ?, ?, ?, 0)',
    [input.name.trim(), input.icon, input.color, input.kind]
  );
  return result.lastInsertRowId;
}

export async function updateCategory(
  db: SQLiteDatabase,
  id: number,
  input: { name: string; icon: string; color: string }
): Promise<void> {
  await db.runAsync(
    'UPDATE categories SET name = ?, icon = ?, color = ? WHERE id = ?',
    [input.name.trim(), input.icon, input.color, id]
  );
}

export async function deleteCategory(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
}

export async function countCategoryUsage(
  db: SQLiteDatabase,
  id: number
): Promise<number> {
  const row = await db.getFirstAsync<{ c: number }>(
    `SELECT
       (SELECT COUNT(*) FROM transactions WHERE category_id = ?) +
       (SELECT COUNT(*) FROM recurring_templates WHERE category_id = ?) +
       (SELECT COUNT(*) FROM budgets WHERE category_id = ?) AS c`,
    [id, id, id]
  );
  return row?.c ?? 0;
}
