export function formatBRL(cents: number, opts: { showSign?: boolean } = {}): string {
  const value = Math.abs(cents) / 100;
  const formatted = value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const prefix = opts.showSign ? (cents < 0 ? '- ' : '+ ') : cents < 0 ? '- ' : '';
  return `${prefix}R$ ${formatted}`;
}

export function formatBRLCompact(cents: number): string {
  const value = cents / 100;
  if (Math.abs(value) >= 1000) {
    return `R$ ${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
  }
  return formatBRL(cents);
}

export function parseAmountToCents(input: string): number | null {
  if (!input) return null;
  const cleaned = input.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  if (Number.isNaN(num)) return null;
  return Math.round(num * 100);
}

export function formatAmountInput(rawDigits: string): string {
  const digits = rawDigits.replace(/\D/g, '').slice(0, 11);
  if (!digits) return '0,00';
  const padded = digits.padStart(3, '0');
  const cents = padded.slice(-2);
  const reais = padded.slice(0, -2).replace(/^0+(?=\d)/, '');
  const reaisWithThousands = reais.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${reaisWithThousands},${cents}`;
}

export function digitsToCents(rawDigits: string): number {
  const digits = rawDigits.replace(/\D/g, '');
  if (!digits) return 0;
  return parseInt(digits, 10);
}
