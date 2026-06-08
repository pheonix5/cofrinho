/**
 * SQL expression that computes the "effective month" of a transaction.
 *
 * Card transactions made AFTER the card's closing_day belong to next month's
 * invoice, so they should appear in next month's period. Card payments and
 * non-card transactions use their own occurred_at.
 *
 * Requires the query to alias the transactions table as `t` and LEFT JOIN
 * cards as `cd ON cd.id = t.card_id`.
 */
export const EFFECTIVE_AT_EXPR = `
  CASE
    WHEN t.is_card_payment = 1 THEN t.occurred_at
    WHEN t.card_id IS NULL THEN t.occurred_at
    WHEN CAST(strftime('%d', t.occurred_at) AS INTEGER) > cd.closing_day
      THEN datetime(t.occurred_at, '+1 month')
    ELSE t.occurred_at
  END
`;
