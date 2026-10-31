import { format, isValid, parseISO } from 'date-fns';

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const inrCompactFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function formatINR(value: number): string {
  return inrFormatter.format(Number.isFinite(value) ? value : 0);
}

export function formatINRCompact(value: number): string {
  return inrCompactFormatter.format(Number.isFinite(value) ? value : 0);
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function formatDisplayDate(value: string): string {
  const date = parseISO(value);
  return isValid(date) ? format(date, 'dd MMM yyyy') : value;
}

export function formatShortDate(value: string): string {
  const date = parseISO(value);
  return isValid(date) ? format(date, 'dd MMM') : value;
}

export function formatLongDate(value: string): string {
  const date = parseISO(value);
  return isValid(date) ? format(date, 'EEEE, dd MMMM yyyy') : value;
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

export function toNumber(value: string | number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  values.forEach((value) => {
    const trimmed = value.trim();
    const key = trimmed.toLowerCase();
    if (trimmed && !seen.has(key)) {
      seen.add(key);
      result.push(trimmed);
    }
  });

  return result;
}
