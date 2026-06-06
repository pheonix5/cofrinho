export type TxKind = 'income' | 'expense';

export type Category = {
  id: number;
  name: string;
  icon: string;
  color: string;
  kind: TxKind;
  is_default: number;
};

export type Transaction = {
  id: number;
  kind: TxKind;
  amount_cents: number;
  category_id: number | null;
  description: string | null;
  occurred_at: string;
  created_at: string;
  card_id: number | null;
  recurring_id: number | null;
  installment_group: string | null;
  installment_number: number | null;
  installment_total: number | null;
  is_card_payment: number;
};

export type TransactionWithCategory = Transaction & {
  category_name: string | null;
  category_icon: string | null;
  category_color: string | null;
  card_name: string | null;
  card_color: string | null;
};

export type ProjectedListItem = {
  is_projection: true;
  template_id: number;
  synthetic_id: string;
  kind: TxKind;
  amount_cents: number;
  category_id: number | null;
  category_name: string | null;
  category_icon: string | null;
  category_color: string | null;
  description: string | null;
  occurred_at: string;
};

export type ListItem =
  | (TransactionWithCategory & { is_projection?: false })
  | ProjectedListItem;

export type PeriodSummary = {
  income_cents: number;
  expense_cents: number;
  balance_cents: number;
  count: number;
};

export type CategoryAggregate = {
  category_id: number | null;
  category_name: string;
  category_icon: string;
  category_color: string;
  total_cents: number;
  count: number;
};

export type MonthAggregate = {
  month: string;
  income_cents: number;
  expense_cents: number;
};
