import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_LABOUR_TYPES,
  DEFAULT_MATERIAL_TYPES,
  DEFAULT_UNITS,
  PAYMENT_METHODS,
  STORAGE_KEY,
} from '../constants';
import type {
  LabourRecord,
  MaterialRecord,
  OtherRecord,
  PaymentMethod,
  TrackerData,
} from '../types';
import {
  calcLabourTotal,
  calcMaterialTotal,
  roundMoney,
} from './calculations';
import { uid, uniqueStrings } from './format';

export function createDefaultData(): TrackerData {
  return {
    version: 1,
    projectName: 'My House Construction',
    totalBudget: 0,
    labour: [],
    materials: [],
    others: [],
    customLabourTypes: [],
    customMaterialTypes: [],
    customExpenseCategories: [],
    customUnits: [],
  };
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asNonNegative(value: unknown): number {
  return Math.max(0, asNumber(value));
}

function asISODate(value: unknown): string | null {
  const raw = asString(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

function asPaymentMethod(value: unknown): PaymentMethod {
  const raw = asString(value);
  return PAYMENT_METHODS.includes(raw as PaymentMethod)
    ? (raw as PaymentMethod)
    : 'Other';
}

function asCreatedAt(value: unknown, date: string): string {
  const raw = asString(value);
  return raw || `${date}T00:00:00.000Z`;
}

function sanitizeCustomList(value: unknown, defaults: string[]): string[] {
  if (!Array.isArray(value)) return [];
  const defaultKeys = new Set(defaults.map((item) => item.trim().toLowerCase()));
  return uniqueStrings(
    value.filter((item): item is string => typeof item === 'string'),
  ).filter((item) => !defaultKeys.has(item.toLowerCase()));
}

function sanitizeLabour(raw: unknown): LabourRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  const date = asISODate(source.date);
  if (!date) return null;

  const workers = asNonNegative(source.workers);
  const dailyWage = asNonNegative(source.dailyWage);
  const workingDays = asNonNegative(source.workingDays);
  const totalAmount = calcLabourTotal(workers, dailyWage, workingDays);
  const amountPaid = Math.min(totalAmount, asNonNegative(source.amountPaid));

  return {
    id: asString(source.id) || uid(),
    type: 'labour',
    date,
    labourType: asString(source.labourType).trim() || 'Other',
    workers,
    dailyWage,
    workingDays,
    totalAmount,
    amountPaid,
    balance: roundMoney(totalAmount - amountPaid),
    notes: asString(source.notes),
    createdAt: asCreatedAt(source.createdAt, date),
  };
}

function sanitizeMaterial(raw: unknown): MaterialRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  const date = asISODate(source.date);
  if (!date) return null;

  const quantity = asNonNegative(source.quantity);
  const pricePerUnit = asNonNegative(source.pricePerUnit);
  const transportation = asNonNegative(source.transportation);
  const totalAmount = calcMaterialTotal(quantity, pricePerUnit, transportation);
  const amountPaid = Math.min(totalAmount, asNonNegative(source.amountPaid));

  return {
    id: asString(source.id) || uid(),
    type: 'material',
    date,
    materialName: asString(source.materialName).trim() || 'Other',
    quantity,
    unit: asString(source.unit).trim() || 'Units',
    pricePerUnit,
    transportation,
    totalAmount,
    amountPaid,
    balance: roundMoney(totalAmount - amountPaid),
    supplier: asString(source.supplier),
    notes: asString(source.notes),
    createdAt: asCreatedAt(source.createdAt, date),
  };
}

function sanitizeOther(raw: unknown): OtherRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  const date = asISODate(source.date);
  if (!date) return null;

  return {
    id: asString(source.id) || uid(),
    type: 'other',
    date,
    name: asString(source.name).trim() || 'Expense',
    category: asString(source.category).trim() || 'Other',
    amount: asNonNegative(source.amount),
    paidTo: asString(source.paidTo),
    paymentMethod: asPaymentMethod(source.paymentMethod),
    notes: asString(source.notes),
    createdAt: asCreatedAt(source.createdAt, date),
  };
}

export function normalizeData(raw: unknown): TrackerData {
  const base = createDefaultData();
  if (!raw || typeof raw !== 'object') return base;

  const source = raw as Record<string, unknown>;
  const labour = Array.isArray(source.labour)
    ? source.labour.map(sanitizeLabour).filter((item): item is LabourRecord => item !== null)
    : [];
  const materials = Array.isArray(source.materials)
    ? source.materials
        .map(sanitizeMaterial)
        .filter((item): item is MaterialRecord => item !== null)
    : [];
  const others = Array.isArray(source.others)
    ? source.others.map(sanitizeOther).filter((item): item is OtherRecord => item !== null)
    : [];

  return {
    version: 1,
    projectName: asString(source.projectName).trim() || base.projectName,
    totalBudget: asNonNegative(source.totalBudget),
    labour,
    materials,
    others,
    customLabourTypes: sanitizeCustomList(source.customLabourTypes, DEFAULT_LABOUR_TYPES),
    customMaterialTypes: sanitizeCustomList(source.customMaterialTypes, DEFAULT_MATERIAL_TYPES),
    customExpenseCategories: sanitizeCustomList(
      source.customExpenseCategories,
      DEFAULT_EXPENSE_CATEGORIES,
    ),
    customUnits: sanitizeCustomList(source.customUnits, DEFAULT_UNITS),
  };
}

export function loadData(): TrackerData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return createDefaultData();
    return normalizeData(JSON.parse(saved));
  } catch {
    return createDefaultData();
  }
}

export function saveData(data: TrackerData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage may be unavailable or full. The UI still keeps the session data in memory.
  }
}

export function clearStoredData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore unavailable storage.
  }
}

export function serializeData(data: TrackerData): string {
  return JSON.stringify(data, null, 2);
}

export function parseBackup(text: string): TrackerData | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;

    const source = parsed as Record<string, unknown>;
    const knownKeys = [
      'labour',
      'materials',
      'others',
      'totalBudget',
      'projectName',
      'customLabourTypes',
      'customMaterialTypes',
      'customExpenseCategories',
      'customUnits',
    ];

    if (!knownKeys.some((key) => key in source)) return null;
    return normalizeData(source);
  } catch {
    return null;
  }
}

export function getDefaults() {
  return {
    labour: DEFAULT_LABOUR_TYPES,
    material: DEFAULT_MATERIAL_TYPES,
    expense: DEFAULT_EXPENSE_CATEGORIES,
    unit: DEFAULT_UNITS,
  };
}
