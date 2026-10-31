import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_LABOUR_TYPES,
  DEFAULT_MATERIAL_TYPES,
  DEFAULT_UNITS,
} from '../constants';
import type {
  CustomListKind,
  DailyNote,
  Employee,
  EmployeeDraft,
  LabourDraft,
  LabourRecord,
  MaterialDraft,
  MaterialRecord,
  OtherDraft,
  OtherRecord,
  TrackerData,
} from '../types';
import {
  calcLabourTotal,
  calcMaterialTotal,
  roundMoney,
} from '../lib/calculations';
import { uid, uniqueStrings } from '../lib/format';
import {
  clearStoredData,
  createDefaultData,
  loadData,
  normalizeData,
  saveData,
} from '../lib/storage';
import {
  AppContext,
  type AppContextValue,
  type ToastState,
  type ToastType,
} from './appContext';

interface ProjectUpdate {
  projectName?: string;
  totalBudget?: number;
}

const CUSTOM_KEY: Record<CustomListKind, keyof TrackerData> = {
  labour: 'customLabourTypes',
  material: 'customMaterialTypes',
  expense: 'customExpenseCategories',
  unit: 'customUnits',
};

const DEFAULT_VALUES: Record<CustomListKind, string[]> = {
  labour: DEFAULT_LABOUR_TYPES,
  material: DEFAULT_MATERIAL_TYPES,
  expense: DEFAULT_EXPENSE_CATEGORIES,
  unit: DEFAULT_UNITS,
};

function addCustomToList(
  current: string[],
  value: string,
  defaults: string[],
): string[] {
  const trimmed = value.trim();
  if (!trimmed) return current;

  const lower = trimmed.toLowerCase();
  const isDefault = defaults.some((item) => item.toLowerCase() === lower);
  const alreadyAdded = current.some((item) => item.toLowerCase() === lower);
  if (isDefault || alreadyAdded) return current;

  return [...current, trimmed];
}

function clampPaid(total: number, paid: number): number {
  return roundMoney(Math.min(total, Math.max(0, paid)));
}

function canonicalizeOption(value: string, options: string[]): string {
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();
  return options.find((option) => option.toLowerCase() === lower) ?? trimmed;
}

function canonicalizeSupplier(value: string, materials: MaterialRecord[]): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  const existing = materials.find(
    (item) => item.supplier && item.supplier.toLowerCase() === lower,
  );
  return existing?.supplier ?? trimmed;
}

function validateDate(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Please select a valid date.';
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return 'Please select a valid date.';
  return parsed.toISOString().slice(0, 10) === value
    ? null
    : 'Please select a valid date.';
}

function validateLabourDraft(draft: LabourDraft): string | null {
  if (validateDate(draft.date)) return 'Please select a valid date.';
  if (!draft.employeeId.trim() || !draft.employeeName.trim()) {
    return 'Please select an employee.';
  }
  if (!draft.labourType.trim()) return 'Please select a labour category.';
  if (!Number.isFinite(draft.workers) || draft.workers <= 0) {
    return 'Number of workers must be greater than zero.';
  }
  if (!Number.isFinite(draft.dailyWage) || draft.dailyWage < 0) {
    return 'Daily wage cannot be negative.';
  }
  if (!Number.isFinite(draft.workingDays) || draft.workingDays <= 0) {
    return 'Working days must be greater than zero.';
  }
  const total = calcLabourTotal(draft.workers, draft.dailyWage, draft.workingDays);
  if (!Number.isFinite(draft.amountPaid) || draft.amountPaid < 0) {
    return 'Amount paid cannot be negative.';
  }
  if (draft.amountPaid > total) {
    return 'Amount paid cannot be greater than the total amount.';
  }
  return null;
}

function validateMaterialDraft(draft: MaterialDraft): string | null {
  if (validateDate(draft.date)) return 'Please select a valid date.';
  if (!draft.materialName.trim()) return 'Please enter a material name.';
  if (!Number.isFinite(draft.quantity) || draft.quantity <= 0) {
    return 'Quantity must be greater than zero.';
  }
  if (!draft.unit.trim()) return 'Please enter a unit.';
  if (!Number.isFinite(draft.pricePerUnit) || draft.pricePerUnit < 0) {
    return 'Price per unit cannot be negative.';
  }
  if (!Number.isFinite(draft.transportation) || draft.transportation < 0) {
    return 'Transportation charges cannot be negative.';
  }
  const total = calcMaterialTotal(
    draft.quantity,
    draft.pricePerUnit,
    draft.transportation,
  );
  if (!Number.isFinite(draft.amountPaid) || draft.amountPaid < 0) {
    return 'Amount paid cannot be negative.';
  }
  if (draft.amountPaid > total) {
    return 'Amount paid cannot be greater than the total amount.';
  }
  return null;
}

function validateEmployeeDraft(draft: EmployeeDraft): string | null {
  if (!draft.name.trim()) return 'Please enter the employee name.';
  if (!draft.labourType.trim()) return 'Please select a labour category.';
  if (!Number.isFinite(draft.dailyWage) || draft.dailyWage < 0) {
    return 'Daily wage cannot be negative.';
  }
  return null;
}

function validateOtherDraft(draft: OtherDraft): string | null {
  if (validateDate(draft.date)) return 'Please select a valid date.';
  if (!draft.name.trim()) return 'Please enter an expense name.';
  if (!draft.category.trim()) return 'Please enter a category.';
  if (!Number.isFinite(draft.amount) || draft.amount <= 0) {
    return 'Amount must be greater than zero.';
  }
  return null;
}

function nextRecordId(previous: TrackerData): string {
  const used = new Set([
    ...previous.labour.map((item) => item.id),
    ...previous.materials.map((item) => item.id),
    ...previous.others.map((item) => item.id),
    ...previous.employees.map((item) => item.id),
    ...previous.dailyNotes.map((item) => item.id),
  ]);
  let id = uid();
  while (used.has(id)) id = uid();
  return id;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [loaded] = useState(loadData);
  const [data, setData] = useState<TrackerData>(loaded.data);
  const [toast, setToast] = useState<ToastState | null>(() =>
    loaded.warning
      ? { id: Date.now(), message: loaded.warning, type: 'error' }
      : null,
  );
  const dataRef = useRef(loaded.data);
  const processedAddRequests = useRef(new Set<string>());

  const notify = useCallback((message: string, type: ToastType = 'success') => {
    setToast({ id: Date.now(), message, type });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const commit = useCallback(
    (
      updater: (previous: TrackerData) => TrackerData | null,
      successMessage?: string,
    ): boolean => {
      const previous = dataRef.current;
      const next = updater(previous);
      if (!next) return false;
      if (next === previous) return true;

      const result = saveData(next);
      if (!result.ok) {
        notify(result.message, 'error');
        return false;
      }

      dataRef.current = next;
      setData(next);
      if (successMessage) notify(successMessage);
      return true;
    },
    [notify],
  );

  const labourTypes = useMemo(
    () =>
      uniqueStrings([
        ...DEFAULT_LABOUR_TYPES,
        ...data.customLabourTypes,
        ...data.labour.map((item) => item.labourType),
        ...data.employees.map((item) => item.labourType),
      ]),
    [data.customLabourTypes, data.labour, data.employees],
  );

  const materialTypes = useMemo(
    () => uniqueStrings([...DEFAULT_MATERIAL_TYPES, ...data.customMaterialTypes]),
    [data.customMaterialTypes],
  );

  const expenseCategories = useMemo(
    () => uniqueStrings([...DEFAULT_EXPENSE_CATEGORIES, ...data.customExpenseCategories]),
    [data.customExpenseCategories],
  );

  const units = useMemo(
    () => uniqueStrings([...DEFAULT_UNITS, ...data.customUnits]),
    [data.customUnits],
  );

  const addLabour = useCallback(
    (draft: LabourDraft, requestId?: string) => {
      if (requestId && processedAddRequests.current.has(requestId)) return true;

      const validationError = validateLabourDraft(draft);
      if (validationError) {
        notify(validationError, 'error');
        return false;
      }
      if (
        !dataRef.current.employees.some(
          (employee) => employee.id === draft.employeeId,
        )
      ) {
        notify('Selected employee was not found.', 'error');
        return false;
      }

      const saved = commit((previous) => {
        const totalAmount = calcLabourTotal(
          draft.workers,
          draft.dailyWage,
          draft.workingDays,
        );
        const amountPaid = clampPaid(totalAmount, draft.amountPaid);
        const labourType = canonicalizeOption(
          draft.labourType,
          uniqueStrings([...DEFAULT_LABOUR_TYPES, ...previous.customLabourTypes]),
        );
        const employee = previous.employees.find(
          (item) => item.id === draft.employeeId,
        );

        const record: LabourRecord = {
          ...draft,
          id: nextRecordId(previous),
          type: 'labour',
          employeeName: employee?.name ?? draft.employeeName.trim(),
          labourType,
          workDescription: draft.workDescription.trim(),
          notes: draft.notes.trim(),
          totalAmount,
          amountPaid,
          balance: roundMoney(totalAmount - amountPaid),
          createdAt: new Date().toISOString(),
        };

        return {
          ...previous,
          labour: [record, ...previous.labour],
          customLabourTypes: addCustomToList(
            previous.customLabourTypes,
            record.labourType,
            DEFAULT_LABOUR_TYPES,
          ),
        };
      }, 'Labour expense saved');

      if (saved && requestId) processedAddRequests.current.add(requestId);
      return saved;
    },
    [commit, notify],
  );

  const updateLabour = useCallback(
    (id: string, draft: LabourDraft) => {
      if (!dataRef.current.labour.some((item) => item.id === id)) {
        notify('Labour record was not found.', 'error');
        return false;
      }

      const validationError = validateLabourDraft(draft);
      if (validationError) {
        notify(validationError, 'error');
        return false;
      }
      if (
        !dataRef.current.employees.some(
          (employee) => employee.id === draft.employeeId,
        )
      ) {
        notify('Selected employee was not found.', 'error');
        return false;
      }

      return commit((previous) => {
        const existing = previous.labour.find((item) => item.id === id);
        if (!existing) return null;

        const totalAmount = calcLabourTotal(
          draft.workers,
          draft.dailyWage,
          draft.workingDays,
        );
        const amountPaid = clampPaid(totalAmount, draft.amountPaid);
        const labourType = canonicalizeOption(
          draft.labourType,
          uniqueStrings([...DEFAULT_LABOUR_TYPES, ...previous.customLabourTypes]),
        );
        const employee = previous.employees.find(
          (item) => item.id === draft.employeeId,
        );

        const record: LabourRecord = {
          ...existing,
          ...draft,
          employeeName: employee?.name ?? draft.employeeName.trim(),
          labourType,
          workDescription: draft.workDescription.trim(),
          notes: draft.notes.trim(),
          totalAmount,
          amountPaid,
          balance: roundMoney(totalAmount - amountPaid),
        };

        return {
          ...previous,
          labour: previous.labour.map((item) => (item.id === id ? record : item)),
          customLabourTypes: addCustomToList(
            previous.customLabourTypes,
            record.labourType,
            DEFAULT_LABOUR_TYPES,
          ),
        };
      }, 'Labour expense updated');
    },
    [commit, notify],
  );

  const deleteLabour = useCallback(
    (id: string) => {
      if (!dataRef.current.labour.some((item) => item.id === id)) {
        notify('Labour record was not found.', 'error');
        return false;
      }

      return commit(
        (previous) => ({
          ...previous,
          labour: previous.labour.filter((item) => item.id !== id),
        }),
        'Labour expense deleted',
      );
    },
    [commit, notify],
  );

  const addEmployee = useCallback(
    (draft: EmployeeDraft): Employee | null => {
      const validationError = validateEmployeeDraft(draft);
      if (validationError) {
        notify(validationError, 'error');
        return null;
      }

      const name = draft.name.trim();
      const duplicate = dataRef.current.employees.some(
        (employee) => employee.name.toLowerCase() === name.toLowerCase(),
      );
      if (duplicate) {
        notify('An employee with this name already exists.', 'error');
        return null;
      }

      let created: Employee | null = null;
      const saved = commit((previous) => {
        const now = new Date().toISOString();
        const employee: Employee = {
          id: nextRecordId(previous),
          name,
          mobile: draft.mobile.trim(),
          labourType: canonicalizeOption(
            draft.labourType,
            uniqueStrings([
              ...DEFAULT_LABOUR_TYPES,
              ...previous.customLabourTypes,
              ...previous.employees.map((item) => item.labourType),
            ]),
          ),
          dailyWage: roundMoney(Math.max(0, draft.dailyWage)),
          notes: draft.notes.trim(),
          createdAt: now,
          updatedAt: now,
        };
        created = employee;

        return {
          ...previous,
          employees: [employee, ...previous.employees],
          customLabourTypes: addCustomToList(
            previous.customLabourTypes,
            employee.labourType,
            DEFAULT_LABOUR_TYPES,
          ),
        };
      }, 'Employee saved');

      return saved ? created : null;
    },
    [commit, notify],
  );

  const updateEmployee = useCallback(
    (id: string, draft: EmployeeDraft): Employee | null => {
      const existing = dataRef.current.employees.find((item) => item.id === id);
      if (!existing) {
        notify('Employee was not found.', 'error');
        return null;
      }

      const validationError = validateEmployeeDraft(draft);
      if (validationError) {
        notify(validationError, 'error');
        return null;
      }

      const name = draft.name.trim();
      const duplicate = dataRef.current.employees.some(
        (employee) =>
          employee.id !== id &&
          employee.name.toLowerCase() === name.toLowerCase(),
      );
      if (duplicate) {
        notify('An employee with this name already exists.', 'error');
        return null;
      }

      const previousName = existing.name.toLowerCase();
      let updated: Employee | null = null;
      const saved = commit((previous) => {
        const now = new Date().toISOString();
        const employee: Employee = {
          ...existing,
          name,
          mobile: draft.mobile.trim(),
          labourType: canonicalizeOption(
            draft.labourType,
            uniqueStrings([
              ...DEFAULT_LABOUR_TYPES,
              ...previous.customLabourTypes,
              ...previous.employees.map((item) => item.labourType),
            ]),
          ),
          dailyWage: roundMoney(Math.max(0, draft.dailyWage)),
          notes: draft.notes.trim(),
          updatedAt: now,
        };
        updated = employee;

        return {
          ...previous,
          employees: previous.employees.map((item) =>
            item.id === id ? employee : item,
          ),
          labour: previous.labour.map((item) => {
            const isLinked =
              item.employeeId === id ||
              (!item.employeeId &&
                item.employeeName.toLowerCase() === previousName);
            return isLinked
              ? { ...item, employeeId: id, employeeName: name }
              : item;
          }),
          customLabourTypes: addCustomToList(
            previous.customLabourTypes,
            employee.labourType,
            DEFAULT_LABOUR_TYPES,
          ),
        };
      }, 'Employee updated');

      return saved ? updated : null;
    },
    [commit, notify],
  );

  const deleteEmployee = useCallback(
    (id: string) => {
      const employee = dataRef.current.employees.find((item) => item.id === id);
      if (!employee) {
        notify('Employee was not found.', 'error');
        return false;
      }

      const linkedEntries = dataRef.current.labour.filter(
        (item) =>
          item.employeeId === id ||
          (!item.employeeId &&
            item.employeeName.toLowerCase() === employee.name.toLowerCase()),
      ).length;
      if (linkedEntries > 0) {
        notify(
          `This employee has ${linkedEntries} labour entr${
            linkedEntries === 1 ? 'y' : 'ies'
          }. Delete or reassign those entries first.`,
          'error',
        );
        return false;
      }

      return commit(
        (previous) => ({
          ...previous,
          employees: previous.employees.filter((item) => item.id !== id),
        }),
        'Employee deleted',
      );
    },
    [commit, notify],
  );

  const saveDailyNote = useCallback(
    (date: string, note: string) => {
      const dateError = validateDate(date);
      if (dateError) {
        notify('Please select a valid date.', 'error');
        return false;
      }
      const trimmed = note.trim();
      if (!trimmed) {
        notify('Please enter a daily note.', 'error');
        return false;
      }

      return commit((previous) => {
        const existing = previous.dailyNotes.find((item) => item.date === date);
        const now = new Date().toISOString();

        if (existing) {
          if (existing.note === trimmed) return previous;
          const updated: DailyNote = {
            ...existing,
            note: trimmed,
            updatedAt: now,
          };
          return {
            ...previous,
            dailyNotes: previous.dailyNotes.map((item) =>
              item.id === existing.id ? updated : item,
            ),
          };
        }

        const dailyNote: DailyNote = {
          id: nextRecordId(previous),
          date,
          note: trimmed,
          createdAt: now,
          updatedAt: now,
        };
        return {
          ...previous,
          dailyNotes: [dailyNote, ...previous.dailyNotes],
        };
      }, 'Daily note saved');
    },
    [commit, notify],
  );

  const deleteDailyNote = useCallback(
    (id: string) => {
      if (!dataRef.current.dailyNotes.some((item) => item.id === id)) {
        notify('Daily note was not found.', 'error');
        return false;
      }

      return commit(
        (previous) => ({
          ...previous,
          dailyNotes: previous.dailyNotes.filter((item) => item.id !== id),
        }),
        'Daily note deleted',
      );
    },
    [commit, notify],
  );

  const addMaterial = useCallback(
    (draft: MaterialDraft, requestId?: string) => {
      if (requestId && processedAddRequests.current.has(requestId)) return true;

      const validationError = validateMaterialDraft(draft);
      if (validationError) {
        notify(validationError, 'error');
        return false;
      }

      const saved = commit((previous) => {
        const totalAmount = calcMaterialTotal(
          draft.quantity,
          draft.pricePerUnit,
          draft.transportation,
        );
        const amountPaid = clampPaid(totalAmount, draft.amountPaid);
        const materialName = canonicalizeOption(
          draft.materialName,
          uniqueStrings([...DEFAULT_MATERIAL_TYPES, ...previous.customMaterialTypes]),
        );
        const unit = canonicalizeOption(
          draft.unit,
          uniqueStrings([...DEFAULT_UNITS, ...previous.customUnits]),
        );
        const supplier = canonicalizeSupplier(draft.supplier, previous.materials);

        const record: MaterialRecord = {
          ...draft,
          id: nextRecordId(previous),
          type: 'material',
          materialName,
          unit,
          supplier,
          notes: draft.notes.trim(),
          totalAmount,
          amountPaid,
          balance: roundMoney(totalAmount - amountPaid),
          createdAt: new Date().toISOString(),
        };

        return {
          ...previous,
          materials: [record, ...previous.materials],
          customMaterialTypes: addCustomToList(
            previous.customMaterialTypes,
            record.materialName,
            DEFAULT_MATERIAL_TYPES,
          ),
          customUnits: addCustomToList(previous.customUnits, record.unit, DEFAULT_UNITS),
        };
      }, 'Material expense saved');

      if (saved && requestId) processedAddRequests.current.add(requestId);
      return saved;
    },
    [commit, notify],
  );

  const updateMaterial = useCallback(
    (id: string, draft: MaterialDraft) => {
      if (!dataRef.current.materials.some((item) => item.id === id)) {
        notify('Material record was not found.', 'error');
        return false;
      }

      const validationError = validateMaterialDraft(draft);
      if (validationError) {
        notify(validationError, 'error');
        return false;
      }

      return commit((previous) => {
        const existing = previous.materials.find((item) => item.id === id);
        if (!existing) return null;

        const totalAmount = calcMaterialTotal(
          draft.quantity,
          draft.pricePerUnit,
          draft.transportation,
        );
        const amountPaid = clampPaid(totalAmount, draft.amountPaid);
        const materialName = canonicalizeOption(
          draft.materialName,
          uniqueStrings([...DEFAULT_MATERIAL_TYPES, ...previous.customMaterialTypes]),
        );
        const unit = canonicalizeOption(
          draft.unit,
          uniqueStrings([...DEFAULT_UNITS, ...previous.customUnits]),
        );
        const supplier = canonicalizeSupplier(draft.supplier, previous.materials);

        const record: MaterialRecord = {
          ...existing,
          ...draft,
          materialName,
          unit,
          supplier,
          notes: draft.notes.trim(),
          totalAmount,
          amountPaid,
          balance: roundMoney(totalAmount - amountPaid),
        };

        return {
          ...previous,
          materials: previous.materials.map((item) =>
            item.id === id ? record : item,
          ),
          customMaterialTypes: addCustomToList(
            previous.customMaterialTypes,
            record.materialName,
            DEFAULT_MATERIAL_TYPES,
          ),
          customUnits: addCustomToList(previous.customUnits, record.unit, DEFAULT_UNITS),
        };
      }, 'Material expense updated');
    },
    [commit, notify],
  );

  const deleteMaterial = useCallback(
    (id: string) => {
      if (!dataRef.current.materials.some((item) => item.id === id)) {
        notify('Material record was not found.', 'error');
        return false;
      }

      return commit(
        (previous) => ({
          ...previous,
          materials: previous.materials.filter((item) => item.id !== id),
        }),
        'Material expense deleted',
      );
    },
    [commit, notify],
  );

  const addOther = useCallback(
    (draft: OtherDraft, requestId?: string) => {
      if (requestId && processedAddRequests.current.has(requestId)) return true;

      const validationError = validateOtherDraft(draft);
      if (validationError) {
        notify(validationError, 'error');
        return false;
      }

      const saved = commit((previous) => {
        const category = canonicalizeOption(
          draft.category,
          uniqueStrings([
            ...DEFAULT_EXPENSE_CATEGORIES,
            ...previous.customExpenseCategories,
          ]),
        );

        const record: OtherRecord = {
          ...draft,
          id: nextRecordId(previous),
          type: 'other',
          name: draft.name.trim(),
          category,
          paidTo: draft.paidTo.trim(),
          notes: draft.notes.trim(),
          amount: roundMoney(Math.max(0, draft.amount)),
          createdAt: new Date().toISOString(),
        };

        return {
          ...previous,
          others: [record, ...previous.others],
          customExpenseCategories: addCustomToList(
            previous.customExpenseCategories,
            record.category,
            DEFAULT_EXPENSE_CATEGORIES,
          ),
        };
      }, 'Expense saved');

      if (saved && requestId) processedAddRequests.current.add(requestId);
      return saved;
    },
    [commit, notify],
  );

  const updateOther = useCallback(
    (id: string, draft: OtherDraft) => {
      if (!dataRef.current.others.some((item) => item.id === id)) {
        notify('Expense record was not found.', 'error');
        return false;
      }

      const validationError = validateOtherDraft(draft);
      if (validationError) {
        notify(validationError, 'error');
        return false;
      }

      return commit((previous) => {
        const existing = previous.others.find((item) => item.id === id);
        if (!existing) return null;

        const category = canonicalizeOption(
          draft.category,
          uniqueStrings([
            ...DEFAULT_EXPENSE_CATEGORIES,
            ...previous.customExpenseCategories,
          ]),
        );

        const record: OtherRecord = {
          ...existing,
          ...draft,
          name: draft.name.trim(),
          category,
          paidTo: draft.paidTo.trim(),
          notes: draft.notes.trim(),
          amount: roundMoney(Math.max(0, draft.amount)),
        };

        return {
          ...previous,
          others: previous.others.map((item) => (item.id === id ? record : item)),
          customExpenseCategories: addCustomToList(
            previous.customExpenseCategories,
            record.category,
            DEFAULT_EXPENSE_CATEGORIES,
          ),
        };
      }, 'Expense updated');
    },
    [commit, notify],
  );

  const deleteOther = useCallback(
    (id: string) => {
      if (!dataRef.current.others.some((item) => item.id === id)) {
        notify('Expense record was not found.', 'error');
        return false;
      }

      return commit(
        (previous) => ({
          ...previous,
          others: previous.others.filter((item) => item.id !== id),
        }),
        'Expense deleted',
      );
    },
    [commit, notify],
  );

  const updateProject = useCallback(
    (update: ProjectUpdate) => {
      if (update.projectName !== undefined) {
        if (!update.projectName.trim()) {
          notify('Project name cannot be empty.', 'error');
          return false;
        }
      }
      if (
        update.totalBudget !== undefined &&
        (!Number.isFinite(update.totalBudget) || update.totalBudget < 0)
      ) {
        notify('Budget must be a valid non-negative number.', 'error');
        return false;
      }

      return commit(
        (previous) => ({
          ...previous,
          projectName:
            typeof update.projectName === 'string'
              ? update.projectName.trim()
              : previous.projectName,
          totalBudget:
            typeof update.totalBudget === 'number'
              ? roundMoney(Math.max(0, update.totalBudget))
              : previous.totalBudget,
        }),
        'Project settings saved',
      );
    },
    [commit, notify],
  );

  const addCustomValue = useCallback(
    (kind: CustomListKind, value: string) => {
      const trimmed = value.trim();
      if (!trimmed) {
        notify('Please enter a value.', 'error');
        return false;
      }

      const key = CUSTOM_KEY[kind];
      const defaults = DEFAULT_VALUES[kind];
      const current = dataRef.current[key] as string[];
      const lower = trimmed.toLowerCase();
      const exists =
        defaults.some((item) => item.toLowerCase() === lower) ||
        current.some((item) => item.toLowerCase() === lower);

      if (exists) {
        notify('This option already exists.', 'error');
        return false;
      }

      return commit(
        (previous) => ({
          ...previous,
          [key]: addCustomToList(
            previous[key] as string[],
            trimmed,
            defaults,
          ),
        }),
        `${trimmed} saved`,
      );
    },
    [commit, notify],
  );

  const removeCustomValue = useCallback(
    (kind: CustomListKind, value: string) => {
      const key = CUSTOM_KEY[kind];
      const current = dataRef.current[key] as string[];
      if (!current.includes(value)) {
        notify('This option was not found.', 'error');
        return false;
      }

      return commit(
        (previous) => ({
          ...previous,
          [key]: (previous[key] as string[]).filter((item) => item !== value),
        }),
        `${value} removed`,
      );
    },
    [commit, notify],
  );

  const replaceData = useCallback(
    (incoming: TrackerData) => {
      return commit(
        () => normalizeData(incoming),
        'Backup restored successfully',
      );
    },
    [commit],
  );

  const clearAllData = useCallback(() => {
    const result = clearStoredData();
    if (!result.ok) {
      notify(result.message, 'error');
      return false;
    }

    const empty = createDefaultData();
    dataRef.current = empty;
    setData(empty);
    notify('All data cleared', 'info');
    return true;
  }, [notify]);

  const value: AppContextValue = {
    data,
    labourTypes,
    materialTypes,
    expenseCategories,
    units,
    addLabour,
    updateLabour,
    deleteLabour,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    saveDailyNote,
    deleteDailyNote,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    addOther,
    updateOther,
    deleteOther,
    updateProject,
    addCustomValue,
    removeCustomValue,
    replaceData,
    clearAllData,
    toast,
    notify,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
