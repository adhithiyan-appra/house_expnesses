export type ExpenseType = 'labour' | 'material' | 'other';

export type PaymentMethod =
  | 'Cash'
  | 'UPI'
  | 'Bank Transfer'
  | 'Cheque'
  | 'Card'
  | 'Other';

export interface Employee {
  id: string;
  name: string;
  mobile: string;
  labourType: string;
  dailyWage: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeDraft {
  name: string;
  mobile: string;
  labourType: string;
  dailyWage: number;
  notes: string;
}

export interface DailyNote {
  id: string;
  date: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface LabourRecord {
  id: string;
  type: 'labour';
  date: string;
  employeeId: string;
  employeeName: string;
  labourType: string;
  workDescription: string;
  workers: number;
  dailyWage: number;
  workingDays: number;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  notes: string;
  createdAt: string;
}

export interface LabourDraft {
  date: string;
  employeeId: string;
  employeeName: string;
  labourType: string;
  workDescription: string;
  workers: number;
  dailyWage: number;
  workingDays: number;
  amountPaid: number;
  notes: string;
}

export interface MaterialRecord {
  id: string;
  type: 'material';
  date: string;
  materialName: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  transportation: number;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  supplier: string;
  notes: string;
  createdAt: string;
}

export interface MaterialDraft {
  date: string;
  materialName: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  transportation: number;
  amountPaid: number;
  supplier: string;
  notes: string;
}

export interface OtherRecord {
  id: string;
  type: 'other';
  date: string;
  name: string;
  category: string;
  amount: number;
  paidTo: string;
  paymentMethod: PaymentMethod;
  notes: string;
  createdAt: string;
}

export interface OtherDraft {
  date: string;
  name: string;
  category: string;
  amount: number;
  paidTo: string;
  paymentMethod: PaymentMethod;
  notes: string;
}

export interface TrackerData {
  version: 1;
  projectName: string;
  totalBudget: number;
  labour: LabourRecord[];
  materials: MaterialRecord[];
  others: OtherRecord[];
  employees: Employee[];
  dailyNotes: DailyNote[];
  customLabourTypes: string[];
  customMaterialTypes: string[];
  customExpenseCategories: string[];
  customUnits: string[];
}

export interface UnifiedExpense {
  id: string;
  type: ExpenseType;
  date: string;
  description: string;
  category: string;
  person: string;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  notes: string;
  record: LabourRecord | MaterialRecord | OtherRecord;
}

export interface Totals {
  labourTotal: number;
  materialTotal: number;
  otherTotal: number;
  totalSpent: number;
  labourPaid: number;
  materialPaid: number;
  otherPaid: number;
  totalPaid: number;
  totalPending: number;
}

export interface MonthlyTotal {
  key: string;
  label: string;
  labour: number;
  material: number;
  other: number;
  total: number;
}

export interface DateRange {
  start?: string;
  end?: string;
}

export type RangePreset = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';

export type CustomListKind = 'labour' | 'material' | 'expense' | 'unit';
