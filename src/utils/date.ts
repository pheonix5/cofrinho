import {
  endOfMonth,
  format,
  formatRelative,
  isThisYear,
  isToday,
  isYesterday,
  startOfMonth,
  parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function monthBounds(date: Date): { from: string; to: string } {
  const from = startOfMonth(date);
  const to = new Date(endOfMonth(date).getTime() + 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function shiftMonth(date: Date, delta: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + delta);
  return d;
}

export function formatMonthYear(date: Date): string {
  const s = format(date, "MMMM 'de' yyyy", { locale: ptBR });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatMonthShort(date: Date): string {
  return format(date, 'MMM', { locale: ptBR });
}

export function formatDateLabel(iso: string): string {
  const d = parseISO(iso);
  if (isToday(d)) return 'Hoje';
  if (isYesterday(d)) return 'Ontem';
  if (isThisYear(d)) return format(d, "d 'de' MMM", { locale: ptBR });
  return format(d, "d 'de' MMM 'de' yyyy", { locale: ptBR });
}

export function formatTimeLabel(iso: string): string {
  return format(parseISO(iso), 'HH:mm');
}

export function toISODate(date: Date): string {
  return date.toISOString();
}

export function fromMonthKey(key: string): Date {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1);
}
