import {
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subMonths,
} from 'date-fns';
import type {
  DateRange,
  LabourRecord,
  MaterialRecord,
  MonthlyTotal,
  OtherRecord,
  RangePreset,
  Totals,
  TrackerData,
  UnifiedExpense,
} from '../types';
import { todayISO } from './format';

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calcLabourTotal(
  workers: number,
  dailyWage: number,
  workingDays: number,
): number {
  return roundMoney(Math.max(0, workers) * Math.max(0, dailyWage) * Math.max(0, workingDays));
}

export function calcMaterialTotal(
  quantity: number,
  pricePerUnit: number,
  transportation: number,
): number {
  return roundMoney(
    Math.max(0, quantity) * Math.max(0, pricePerUnit) + Math.max(0, transportation),
  );
}

export function getBalance(total: number, paid: number): number {
  return roundMoney(total - paid);
}

export function getPaymentState(
  total: number,
  paid: number,
): 'paid' | 'partial' | 'pending' {
  if (paid >= total && total > 0) return 'paid';
  if (paid > 0) return 'partial';
  return 'pending';
}

export function getTotals(data: TrackerData): Totals {
  const labourTotal = roundMoney(data.labour.reduce((sum, item) => sum + item.totalAmount, 0));
  const materialTotal = roundMoney(
    data.materials.reduce((sum, item) => sum + item.totalAmount, 0),
  );
  const otherTotal = roundMoney(data.others.reduce((sum, item) => sum + item.amount, 0));

  const labourPaid = roundMoney(data.labour.reduce((sum, item) => sum + item.amountPaid, 0));
  const materialPaid = roundMoney(
    data.materials.reduce((sum, item) => sum + item.amountPaid, 0),
  );

  const totalPending = roundMoney(
    data.labour.reduce((sum, item) => sum + Math.max(item.balance, 0), 0) +
      data.materials.reduce((sum, item) => sum + Math.max(item.balance, 0), 0),
  );

  return {
    labourTotal,
    materialTotal,
    otherTotal,
    totalSpent: roundMoney(labourTotal + materialTotal + otherTotal),
    labourPaid,
    materialPaid,
    otherPaid: otherTotal,
    totalPaid: roundMoney(labourPaid + materialPaid + otherTotal),
    totalPending,
  };
}

export function getTodayTotal(data: TrackerData): number {
  const today = todayISO();
  return roundMoney(
    data.labour
      .filter((item) => item.date === today)
      .reduce((sum, item) => sum + item.totalAmount, 0) +
      data.materials
        .filter((item) => item.date === today)
        .reduce((sum, item) => sum + item.totalAmount, 0) +
      data.others
        .filter((item) => item.date === today)
        .reduce((sum, item) => sum + item.amount, 0),
  );
}

export function getMonthlyTotals(data: TrackerData, count = 6): MonthlyTotal[] {
  const months = Array.from({ length: count }, (_, index) => {
    const date = subMonths(new Date(), count - 1 - index);
    return {
      key: format(date, 'yyyy-MM'),
      label: format(date, 'MMM yyyy'),
    };
  });

  return months.map(({ key, label }) => {
    const labour = roundMoney(
      data.labour
        .filter((item) => item.date.startsWith(key))
        .reduce((sum, item) => sum + item.totalAmount, 0),
    );
    const material = roundMoney(
      data.materials
        .filter((item) => item.date.startsWith(key))
        .reduce((sum, item) => sum + item.totalAmount, 0),
    );
    const other = roundMoney(
      data.others
        .filter((item) => item.date.startsWith(key))
        .reduce((sum, item) => sum + item.amount, 0),
    );

    return {
      key,
      label,
      labour,
      material,
      other,
      total: roundMoney(labour + material + other),
    };
  });
}

export function labourToUnified(item: LabourRecord): UnifiedExpense {
  return {
    id: item.id,
    type: 'labour',
    date: item.date,
    description: `${item.labourType} · ${item.workers} worker${item.workers === 1 ? '' : 's'} · ${item.workingDays} day${item.workingDays === 1 ? '' : 's'}`,
    category: item.labourType,
    person: '',
    totalAmount: item.totalAmount,
    amountPaid: item.amountPaid,
    balance: item.balance,
    notes: item.notes,
    record: item,
  };
}

export function materialToUnified(item: MaterialRecord): UnifiedExpense {
  return {
    id: item.id,
    type: 'material',
    date: item.date,
    description: `${item.materialName} · ${item.quantity} ${item.unit}`,
    category: item.materialName,
    person: item.supplier,
    totalAmount: item.totalAmount,
    amountPaid: item.amountPaid,
    balance: item.balance,
    notes: item.notes,
    record: item,
  };
}

export function otherToUnified(item: OtherRecord): UnifiedExpense {
  return {
    id: item.id,
    type: 'other',
    date: item.date,
    description: item.name,
    category: item.category,
    person: item.paidTo,
    totalAmount: item.amount,
    amountPaid: item.amount,
    balance: 0,
    notes: item.notes,
    record: item,
  };
}

export function getUnifiedExpenses(data: TrackerData): UnifiedExpense[] {
  const labour = data.labour.map(labourToUnified);
  const materials = data.materials.map(materialToUnified);
  const others = data.others.map(otherToUnified);

  return [...labour, ...materials, ...others].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.record.createdAt.localeCompare(a.record.createdAt);
  });
}

export function buildDateRange(
  preset: RangePreset,
  from?: string,
  to?: string,
): DateRange {
  const now = new Date();

  switch (preset) {
    case 'today': {
      const today = format(now, 'yyyy-MM-dd');
      return { start: today, end: today };
    }
    case 'week':
      return {
        start: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        end: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      };
    case 'month':
      return {
        start: format(startOfMonth(now), 'yyyy-MM-dd'),
        end: format(endOfMonth(now), 'yyyy-MM-dd'),
      };
    case 'year':
      return {
        start: format(startOfYear(now), 'yyyy-MM-dd'),
        end: format(endOfYear(now), 'yyyy-MM-dd'),
      };
    case 'custom':
      return { start: from || undefined, end: to || undefined };
    case 'all':
    default:
      return {};
  }
}

export function isInDateRange(date: string, range: DateRange): boolean {
  if (range.start && date < range.start) return false;
  if (range.end && date > range.end) return false;
  return true;
}

export function getDayKey(date: string): string {
  return date;
}

export function getMonthKey(date: string): string {
  return date.slice(0, 7);
}

export function formatMonthKey(key: string): string {
  const parsed = parseISO(`${key}-01`);
  return format(parsed, 'MMM yyyy');
}

export function sortLabour(records: LabourRecord[]): LabourRecord[] {
  return [...records].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function sortMaterials(records: MaterialRecord[]): MaterialRecord[] {
  return [...records].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function sortOthers(records: OtherRecord[]): OtherRecord[] {
  return [...records].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function sumUnified(expenses: UnifiedExpense[]) {
  return expenses.reduce(
    (result, item) => ({
      total: roundMoney(result.total + item.totalAmount),
      paid: roundMoney(result.paid + item.amountPaid),
      pending: roundMoney(result.pending + Math.max(item.balance, 0)),
    }),
    { total: 0, paid: 0, pending: 0 },
  );
}
