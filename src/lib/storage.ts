import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_LABOUR_TYPES,
  DEFAULT_MATERIAL_TYPES,
  DEFAULT_UNITS,
  PAYMENT_METHODS,
  STORAGE_KEY,
} from '../constants';
import type {
  DailyNote,
  Employee,
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

export type StorageResult =
  | { ok: true }
  | { ok: false; message: string };

export interface LoadResult {
  data: TrackerData;
  warning?: string;
  recoveryKey?: string;
}

export interface NormalizeStats {
  droppedRecords: number;
  repairedIds: number;
  generatedIds: number;
}

export interface BackupParseResult {
  data: TrackerData;
  warnings: string[];
  recordCount: number;
  droppedRecords: number;
  repairedIds: number;
  generatedIds: number;
}

interface NormalizeContext {
  usedIds: Set<string>;
  stats: NormalizeStats;
}

const STORAGE_UNAVAILABLE =
  'LocalStorage is unavailable. Changes cannot be saved in this browser.';
const STORAGE_SAVE_FAILED =
  'Could not save changes to LocalStorage. Browser storage may be full or unavailable.';

export function createDefaultData(): TrackerData {
  return {
    version: 1,
    projectName: 'My House Construction',
    totalBudget: 0,
    labour: [],
    materials: [],
    others: [],
    employees: [],
    dailyNotes: [],
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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const parsed = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10) === raw ? raw : null;
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

function asTimestamp(value: unknown): string {
  const raw = asString(value);
  if (!raw) return new Date().toISOString();
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function sanitizeCustomList(value: unknown, defaults: string[]): string[] {
  if (!Array.isArray(value)) return [];
  const defaultKeys = new Set(defaults.map((item) => item.trim().toLowerCase()));
  return uniqueStrings(
    value.filter((item): item is string => typeof item === 'string'),
  ).filter((item) => !defaultKeys.has(item.toLowerCase()));
}

function takeUniqueId(
  value: unknown,
  context: NormalizeContext,
): string {
  const candidate = asString(value).trim();
  let id = candidate;

  if (!id) {
    context.stats.generatedIds += 1;
  } else if (context.usedIds.has(id)) {
    context.stats.repairedIds += 1;
    id = '';
  }

  while (!id || context.usedIds.has(id)) {
    id = uid();
  }

  context.usedIds.add(id);
  return id;
}

function sanitizeEmployee(
  raw: unknown,
  context: NormalizeContext,
): Employee | null {
  if (!raw || typeof raw !== 'object') {
    context.stats.droppedRecords += 1;
    return null;
  }
  const source = raw as Record<string, unknown>;
  const name = asString(source.name).trim();
  if (!name) {
    context.stats.droppedRecords += 1;
    return null;
  }

  const createdAt = asTimestamp(source.createdAt);
  return {
    id: takeUniqueId(source.id, context),
    name,
    mobile: asString(source.mobile).trim(),
    labourType:
      asString(source.labourType).trim() || 'Other / Custom labour',
    dailyWage: asNonNegative(source.dailyWage),
    notes: asString(source.notes),
    createdAt,
    updatedAt: asTimestamp(source.updatedAt ?? createdAt),
  };
}

function sanitizeDailyNote(
  raw: unknown,
  context: NormalizeContext,
): DailyNote | null {
  if (!raw || typeof raw !== 'object') {
    context.stats.droppedRecords += 1;
    return null;
  }
  const source = raw as Record<string, unknown>;
  const date = asISODate(source.date);
  const note = asString(source.note).trim();
  if (!date || !note) {
    context.stats.droppedRecords += 1;
    return null;
  }

  const createdAt = asCreatedAt(source.createdAt, date);
  return {
    id: takeUniqueId(source.id, context),
    date,
    note,
    createdAt,
    updatedAt: asTimestamp(source.updatedAt ?? createdAt),
  };
}

function sanitizeLabour(
  raw: unknown,
  context: NormalizeContext,
): LabourRecord | null {
  if (!raw || typeof raw !== 'object') {
    context.stats.droppedRecords += 1;
    return null;
  }
  const source = raw as Record<string, unknown>;
  const date = asISODate(source.date);
  if (!date) {
    context.stats.droppedRecords += 1;
    return null;
  }

  const workers = asNonNegative(source.workers);
  const dailyWage = asNonNegative(source.dailyWage);
  const workingDays = asNonNegative(source.workingDays);
  const totalAmount = calcLabourTotal(workers, dailyWage, workingDays);
  const amountPaid = Math.min(totalAmount, asNonNegative(source.amountPaid));

  return {
    id: takeUniqueId(source.id, context),
    type: 'labour',
    date,
    employeeId: asString(source.employeeId).trim(),
    employeeName: asString(source.employeeName).trim(),
    labourType:
      asString(source.labourType).trim() || 'Other / Custom labour',
    workDescription: asString(source.workDescription).trim(),
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

function sanitizeMaterial(
  raw: unknown,
  context: NormalizeContext,
): MaterialRecord | null {
  if (!raw || typeof raw !== 'object') {
    context.stats.droppedRecords += 1;
    return null;
  }
  const source = raw as Record<string, unknown>;
  const date = asISODate(source.date);
  if (!date) {
    context.stats.droppedRecords += 1;
    return null;
  }

  const quantity = asNonNegative(source.quantity);
  const pricePerUnit = asNonNegative(source.pricePerUnit);
  const transportation = asNonNegative(source.transportation);
  const totalAmount = calcMaterialTotal(quantity, pricePerUnit, transportation);
  const amountPaid = Math.min(totalAmount, asNonNegative(source.amountPaid));

  return {
    id: takeUniqueId(source.id, context),
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

function sanitizeOther(
  raw: unknown,
  context: NormalizeContext,
): OtherRecord | null {
  if (!raw || typeof raw !== 'object') {
    context.stats.droppedRecords += 1;
    return null;
  }
  const source = raw as Record<string, unknown>;
  const date = asISODate(source.date);
  if (!date) {
    context.stats.droppedRecords += 1;
    return null;
  }

  return {
    id: takeUniqueId(source.id, context),
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

function isTrackerLike(raw: unknown): raw is Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  const source = raw as Record<string, unknown>;
  return [
    'labour',
    'materials',
    'others',
    'employees',
    'dailyNotes',
    'totalBudget',
    'projectName',
    'customLabourTypes',
    'customMaterialTypes',
    'customExpenseCategories',
    'customUnits',
  ].some((key) => key in source);
}

function normalizeDataInternal(raw: unknown): {
  data: TrackerData;
  stats: NormalizeStats;
} {
  const base = createDefaultData();
  const stats: NormalizeStats = {
    droppedRecords: 0,
    repairedIds: 0,
    generatedIds: 0,
  };

  if (!isTrackerLike(raw)) {
    return { data: base, stats };
  }

  const source = raw as Record<string, unknown>;
  const context: NormalizeContext = {
    usedIds: new Set<string>(),
    stats,
  };

  const employees = Array.isArray(source.employees)
    ? source.employees
        .map((item) => sanitizeEmployee(item, context))
        .filter((item): item is Employee => item !== null)
    : [];
  const dailyNotes = Array.isArray(source.dailyNotes)
    ? source.dailyNotes
        .map((item) => sanitizeDailyNote(item, context))
        .filter((item): item is DailyNote => item !== null)
    : [];
  const labour = Array.isArray(source.labour)
    ? source.labour
        .map((item) => sanitizeLabour(item, context))
        .filter((item): item is LabourRecord => item !== null)
    : [];
  const materials = Array.isArray(source.materials)
    ? source.materials
        .map((item) => sanitizeMaterial(item, context))
        .filter((item): item is MaterialRecord => item !== null)
    : [];
  const others = Array.isArray(source.others)
    ? source.others
        .map((item) => sanitizeOther(item, context))
        .filter((item): item is OtherRecord => item !== null)
    : [];

  return {
    data: {
      version: 1,
      projectName: asString(source.projectName).trim() || base.projectName,
      totalBudget: asNonNegative(source.totalBudget),
      labour,
      materials,
      others,
      employees,
      dailyNotes,
      customLabourTypes: sanitizeCustomList(
        source.customLabourTypes,
        DEFAULT_LABOUR_TYPES,
      ),
      customMaterialTypes: sanitizeCustomList(
        source.customMaterialTypes,
        DEFAULT_MATERIAL_TYPES,
      ),
      customExpenseCategories: sanitizeCustomList(
        source.customExpenseCategories,
        DEFAULT_EXPENSE_CATEGORIES,
      ),
      customUnits: sanitizeCustomList(source.customUnits, DEFAULT_UNITS),
    },
    stats,
  };
}

export function normalizeData(raw: unknown): TrackerData {
  return normalizeDataInternal(raw).data;
}

function fingerprint(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return Math.abs(hash).toString(36);
}

function preserveRecoveryCopy(raw: string): string | null {
  const key = `${STORAGE_KEY}-recovery-${fingerprint(raw)}`;
  try {
    if (localStorage.getItem(key) === null) {
      localStorage.setItem(key, raw);
    }
    return key;
  } catch {
    return null;
  }
}

export function loadData(): LoadResult {
  let raw: string | null = null;

  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return { data: createDefaultData(), warning: STORAGE_UNAVAILABLE };
  }

  if (raw === null) return { data: createDefaultData() };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    const recoveryKey = preserveRecoveryCopy(raw);
    return {
      data: createDefaultData(),
      warning: recoveryKey
        ? 'Saved data could not be read. A recovery copy was kept in LocalStorage instead of deleting it.'
        : 'Saved data could not be read. The original LocalStorage value was left untouched.',
      recoveryKey: recoveryKey ?? undefined,
    };
  }

  if (!isTrackerLike(parsed)) {
    const recoveryKey = preserveRecoveryCopy(raw);
    return {
      data: createDefaultData(),
      warning: recoveryKey
        ? 'Saved data has an unsupported format. A recovery copy was kept in LocalStorage.'
        : 'Saved data has an unsupported format. The original LocalStorage value was left untouched.',
      recoveryKey: recoveryKey ?? undefined,
    };
  }

  const { data, stats } = normalizeDataInternal(parsed);
  let recoveryKey: string | undefined;
  let warning: string | undefined;

  if (stats.droppedRecords > 0 || stats.repairedIds > 0 || stats.generatedIds > 0) {
    recoveryKey = preserveRecoveryCopy(raw) ?? undefined;

    const details: string[] = [];
    if (stats.droppedRecords > 0) {
      details.push(`${stats.droppedRecords} invalid record(s) could not be loaded`);
    }
    if (stats.repairedIds > 0) {
      details.push(`${stats.repairedIds} duplicate ID(s) were repaired without removing records`);
    }
    if (stats.generatedIds > 0) {
      details.push(`${stats.generatedIds} missing ID(s) were generated`);
    }
    warning = `${details.join('. ')}. The original saved data was preserved as a recovery copy.`;
  }

  return { data, warning, recoveryKey };
}

export function saveData(data: TrackerData): StorageResult {
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(STORAGE_KEY, serialized);
    if (localStorage.getItem(STORAGE_KEY) !== serialized) {
      return { ok: false, message: STORAGE_SAVE_FAILED };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: STORAGE_SAVE_FAILED };
  }
}

export function clearStoredData(): StorageResult {
  try {
    localStorage.removeItem(STORAGE_KEY);
    if (localStorage.getItem(STORAGE_KEY) !== null) {
      return { ok: false, message: 'Could not clear LocalStorage data.' };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: 'Could not clear LocalStorage data.' };
  }
}

export function serializeData(data: TrackerData): string {
  return JSON.stringify(data, null, 2);
}

export function parseBackup(text: string): BackupParseResult | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!isTrackerLike(parsed)) return null;

    const { data, stats } = normalizeDataInternal(parsed);
    const warnings: string[] = [];

    if (stats.repairedIds > 0) {
      warnings.push(
        `${stats.repairedIds} duplicate ID(s) were repaired without removing any records.`,
      );
    }
    if (stats.generatedIds > 0) {
      warnings.push(`${stats.generatedIds} missing ID(s) were generated.`);
    }
    if (stats.droppedRecords > 0) {
      warnings.push(
        `${stats.droppedRecords} invalid record(s) will be skipped during import.`,
      );
    }

    return {
      data,
      warnings,
      recordCount:
        data.labour.length +
        data.materials.length +
        data.others.length +
        data.employees.length +
        data.dailyNotes.length,
      droppedRecords: stats.droppedRecords,
      repairedIds: stats.repairedIds,
      generatedIds: stats.generatedIds,
    };
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
