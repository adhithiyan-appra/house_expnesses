import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  id: number;
  message: string;
  type: ToastType;
}

interface ProjectUpdate {
  projectName?: string;
  totalBudget?: number;
}

interface AppContextValue {
  data: TrackerData;
  labourTypes: string[];
  materialTypes: string[];
  expenseCategories: string[];
  units: string[];
  addLabour: (draft: LabourDraft) => void;
  updateLabour: (id: string, draft: LabourDraft) => void;
  deleteLabour: (id: string) => void;
  addMaterial: (draft: MaterialDraft) => void;
  updateMaterial: (id: string, draft: MaterialDraft) => void;
  deleteMaterial: (id: string) => void;
  addOther: (draft: OtherDraft) => void;
  updateOther: (id: string, draft: OtherDraft) => void;
  deleteOther: (id: string) => void;
  updateProject: (update: ProjectUpdate) => void;
  addCustomValue: (kind: CustomListKind, value: string) => void;
  removeCustomValue: (kind: CustomListKind, value: string) => void;
  replaceData: (data: TrackerData) => void;
  clearAllData: () => void;
  toast: ToastState | null;
  notify: (message: string, type?: ToastType) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

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

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<TrackerData>(loadData);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    saveData(data);
  }, [data]);

  const notify = useCallback((message: string, type: ToastType = 'success') => {
    setToast({ id: Date.now(), message, type });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const labourTypes = useMemo(
    () => uniqueStrings([...DEFAULT_LABOUR_TYPES, ...data.customLabourTypes]),
    [data.customLabourTypes],
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
    (draft: LabourDraft) => {
      const totalAmount = calcLabourTotal(
        draft.workers,
        draft.dailyWage,
        draft.workingDays,
      );
      const amountPaid = clampPaid(totalAmount, draft.amountPaid);

      const record: LabourRecord = {
        ...draft,
        id: uid(),
        type: 'labour',
        labourType: draft.labourType.trim(),
        notes: draft.notes.trim(),
        totalAmount,
        amountPaid,
        balance: roundMoney(totalAmount - amountPaid),
        createdAt: new Date().toISOString(),
      };

      setData((previous) => ({
        ...previous,
        labour: [record, ...previous.labour],
        customLabourTypes: addCustomToList(
          previous.customLabourTypes,
          record.labourType,
          DEFAULT_LABOUR_TYPES,
        ),
      }));
      notify('Labour expense added');
    },
    [notify],
  );

  const updateLabour = useCallback(
    (id: string, draft: LabourDraft) => {
      const totalAmount = calcLabourTotal(
        draft.workers,
        draft.dailyWage,
        draft.workingDays,
      );
      const amountPaid = clampPaid(totalAmount, draft.amountPaid);

      setData((previous) => {
        const existing = previous.labour.find((item) => item.id === id);
        if (!existing) return previous;

        const record: LabourRecord = {
          ...existing,
          ...draft,
          labourType: draft.labourType.trim(),
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
      });
      notify('Labour expense updated');
    },
    [notify],
  );

  const deleteLabour = useCallback(
    (id: string) => {
      setData((previous) => ({
        ...previous,
        labour: previous.labour.filter((item) => item.id !== id),
      }));
      notify('Labour expense deleted', 'info');
    },
    [notify],
  );

  const addMaterial = useCallback(
    (draft: MaterialDraft) => {
      const totalAmount = calcMaterialTotal(
        draft.quantity,
        draft.pricePerUnit,
        draft.transportation,
      );
      const amountPaid = clampPaid(totalAmount, draft.amountPaid);

      const record: MaterialRecord = {
        ...draft,
        id: uid(),
        type: 'material',
        materialName: draft.materialName.trim(),
        unit: draft.unit.trim(),
        supplier: draft.supplier.trim(),
        notes: draft.notes.trim(),
        totalAmount,
        amountPaid,
        balance: roundMoney(totalAmount - amountPaid),
        createdAt: new Date().toISOString(),
      };

      setData((previous) => ({
        ...previous,
        materials: [record, ...previous.materials],
        customMaterialTypes: addCustomToList(
          previous.customMaterialTypes,
          record.materialName,
          DEFAULT_MATERIAL_TYPES,
        ),
        customUnits: addCustomToList(previous.customUnits, record.unit, DEFAULT_UNITS),
      }));
      notify('Material expense added');
    },
    [notify],
  );

  const updateMaterial = useCallback(
    (id: string, draft: MaterialDraft) => {
      const totalAmount = calcMaterialTotal(
        draft.quantity,
        draft.pricePerUnit,
        draft.transportation,
      );
      const amountPaid = clampPaid(totalAmount, draft.amountPaid);

      setData((previous) => {
        const existing = previous.materials.find((item) => item.id === id);
        if (!existing) return previous;

        const record: MaterialRecord = {
          ...existing,
          ...draft,
          materialName: draft.materialName.trim(),
          unit: draft.unit.trim(),
          supplier: draft.supplier.trim(),
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
      });
      notify('Material expense updated');
    },
    [notify],
  );

  const deleteMaterial = useCallback(
    (id: string) => {
      setData((previous) => ({
        ...previous,
        materials: previous.materials.filter((item) => item.id !== id),
      }));
      notify('Material expense deleted', 'info');
    },
    [notify],
  );

  const addOther = useCallback(
    (draft: OtherDraft) => {
      const record: OtherRecord = {
        ...draft,
        id: uid(),
        type: 'other',
        name: draft.name.trim(),
        category: draft.category.trim(),
        paidTo: draft.paidTo.trim(),
        notes: draft.notes.trim(),
        amount: roundMoney(Math.max(0, draft.amount)),
        createdAt: new Date().toISOString(),
      };

      setData((previous) => ({
        ...previous,
        others: [record, ...previous.others],
        customExpenseCategories: addCustomToList(
          previous.customExpenseCategories,
          record.category,
          DEFAULT_EXPENSE_CATEGORIES,
        ),
      }));
      notify('Expense added');
    },
    [notify],
  );

  const updateOther = useCallback(
    (id: string, draft: OtherDraft) => {
      setData((previous) => {
        const existing = previous.others.find((item) => item.id === id);
        if (!existing) return previous;

        const record: OtherRecord = {
          ...existing,
          ...draft,
          name: draft.name.trim(),
          category: draft.category.trim(),
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
      });
      notify('Expense updated');
    },
    [notify],
  );

  const deleteOther = useCallback(
    (id: string) => {
      setData((previous) => ({
        ...previous,
        others: previous.others.filter((item) => item.id !== id),
      }));
      notify('Expense deleted', 'info');
    },
    [notify],
  );

  const updateProject = useCallback(
    (update: ProjectUpdate) => {
      setData((previous) => ({
        ...previous,
        projectName:
          typeof update.projectName === 'string'
            ? update.projectName.trim() || previous.projectName
            : previous.projectName,
        totalBudget:
          typeof update.totalBudget === 'number'
            ? roundMoney(Math.max(0, update.totalBudget))
            : previous.totalBudget,
      }));
      notify('Project settings saved');
    },
    [notify],
  );

  const addCustomValue = useCallback(
    (kind: CustomListKind, value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;

      const key = CUSTOM_KEY[kind];
      const defaults = DEFAULT_VALUES[kind];
      setData((previous) => ({
        ...previous,
        [key]: addCustomToList(
          previous[key] as string[],
          trimmed,
          defaults,
        ),
      }));
      notify(`${trimmed} added`);
    },
    [notify],
  );

  const removeCustomValue = useCallback(
    (kind: CustomListKind, value: string) => {
      const key = CUSTOM_KEY[kind];
      setData((previous) => ({
        ...previous,
        [key]: (previous[key] as string[]).filter((item) => item !== value),
      }));
      notify(`${value} removed`, 'info');
    },
    [notify],
  );

  const replaceData = useCallback(
    (incoming: TrackerData) => {
      setData(normalizeData(incoming));
      notify('Backup restored successfully');
    },
    [notify],
  );

  const clearAllData = useCallback(() => {
    clearStoredData();
    setData(createDefaultData());
    notify('All data cleared', 'info');
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

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}
