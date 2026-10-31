import { createContext, useContext } from 'react';
import type {
  CustomListKind,
  Employee,
  EmployeeDraft,
  LabourDraft,
  MaterialDraft,
  OtherDraft,
  TrackerData,
} from '../types';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastState {
  id: number;
  message: string;
  type: ToastType;
}

interface ProjectUpdate {
  projectName?: string;
  totalBudget?: number;
}

export interface AppContextValue {
  data: TrackerData;
  labourTypes: string[];
  materialTypes: string[];
  expenseCategories: string[];
  units: string[];
  addLabour: (draft: LabourDraft, requestId?: string) => boolean;
  updateLabour: (id: string, draft: LabourDraft) => boolean;
  deleteLabour: (id: string) => boolean;
  addEmployee: (draft: EmployeeDraft) => Employee | null;
  updateEmployee: (id: string, draft: EmployeeDraft) => Employee | null;
  deleteEmployee: (id: string) => boolean;
  saveDailyNote: (date: string, note: string) => boolean;
  deleteDailyNote: (id: string) => boolean;
  addMaterial: (draft: MaterialDraft, requestId?: string) => boolean;
  updateMaterial: (id: string, draft: MaterialDraft) => boolean;
  deleteMaterial: (id: string) => boolean;
  addOther: (draft: OtherDraft, requestId?: string) => boolean;
  updateOther: (id: string, draft: OtherDraft) => boolean;
  deleteOther: (id: string) => boolean;
  updateProject: (update: ProjectUpdate) => boolean;
  addCustomValue: (kind: CustomListKind, value: string) => boolean;
  removeCustomValue: (kind: CustomListKind, value: string) => boolean;
  replaceData: (data: TrackerData) => boolean;
  clearAllData: () => boolean;
  toast: ToastState | null;
  notify: (message: string, type?: ToastType) => void;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}
