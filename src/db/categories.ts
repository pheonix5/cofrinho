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

export async function deleteCategory(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM categories WHERE id = ? AND is_default = 0', [id]);
}
