import { useRef, useState, type FormEvent } from 'react';
import { Calculator } from 'lucide-react';
import type { Employee, LabourRecord } from '../../types';
import { useApp } from '../../context/appContext';
import {
  calcLabourTotal,
  getPaymentState,
  roundMoney,
} from '../../lib/calculations';
import { cn, formatINR, toNumber, todayISO, uid } from '../../lib/format';
import {
  btnPrimary,
  btnSecondary,
  helpClass,
  inputClass,
  labelClass,
} from '../../lib/styles';
import EmployeeForm from './EmployeeForm';
import Modal from '../Modal';

const CUSTOM_CATEGORY = '__custom_labour__';
const ADD_EMPLOYEE = '__add_employee__';

interface LabourFormProps {
  initial?: LabourRecord | null;
  onClose: () => void;
}

type Attendance = 'full' | 'half' | 'custom';

function getAttendance(days: number | undefined): Attendance {
  if (days === 1) return 'full';
  if (days === 0.5) return 'half';
  return days === undefined ? 'full' : 'custom';
}

export default function LabourForm({ initial, onClose }: LabourFormProps) {
  const { data, addLabour, updateLabour, labourTypes } = useApp();
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [employeeId, setEmployeeId] = useState(initial?.employeeId ?? '');
  const [categorySelection, setCategorySelection] = useState(
    initial?.labourType ?? labourTypes[0] ?? '',
  );
  const [customCategory, setCustomCategory] = useState('');
  const [workDescription, setWorkDescription] = useState(
    initial?.workDescription ?? '',
  );
  const [workers, setWorkers] = useState(initial ? String(initial.workers) : '1');
  const [attendance, setAttendance] = useState<Attendance>(() =>
    getAttendance(initial?.workingDays),
  );
  const [workingDays, setWorkingDays] = useState(
    initial ? String(initial.workingDays) : '1',
  );
  const [dailyWage, setDailyWage] = useState(
    initial ? String(initial.dailyWage) : '',
  );
  const [amountPaid, setAmountPaid] = useState(
    initial ? String(initial.amountPaid) : '',
  );
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [employeeFormOpen, setEmployeeFormOpen] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [requestId] = useState(uid);
  const submittingRef = useRef(false);

  const selectedEmployee = data.employees.find(
    (employee) => employee.id === employeeId,
  );
  const workersValue = toNumber(workers);
  const wageValue = toNumber(dailyWage);
  const daysValue = attendance === 'full' ? 1 : attendance === 'half' ? 0.5 : toNumber(workingDays);
  const total = calcLabourTotal(workersValue, wageValue, daysValue);
  const paid = toNumber(amountPaid);
  const pending = Math.max(0, roundMoney(total - paid));
  const paymentState = getPaymentState(total, paid);
  const labourCategory =
    categorySelection === CUSTOM_CATEGORY
      ? customCategory.trim()
      : categorySelection;

  const applyEmployee = (employee: Employee) => {
    setEmployeeId(employee.id);
    setCategorySelection(employee.labourType);
    setCustomCategory('');
    setDailyWage(String(employee.dailyWage));
    setError('');
  };

  const handleEmployeeChange = (value: string) => {
    if (value === ADD_EMPLOYEE) {
      setEmployeeFormOpen(true);
      return;
    }
    const employee = data.employees.find((item) => item.id === value);
    if (employee) {
      applyEmployee(employee);
      return;
    }
    setEmployeeId('');
    setError('');
  };

  const handleAttendanceChange = (value: Attendance) => {
    setAttendance(value);
    if (value === 'full') setWorkingDays('1');
    if (value === 'half') setWorkingDays('0.5');
  };

  const handlePaymentStatusChange = (value: string) => {
    if (value === 'paid') {
      setAmountPaid(total > 0 ? String(total) : '0');
      return;
    }
    if (value === 'pending') {
      setAmountPaid('0');
      return;
    }
    if (paid <= 0 || paid >= total) {
      setAmountPaid(total > 0 ? String(roundMoney(total / 2)) : '');
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (submittingRef.current) return;

    if (!date) return setError('Please select a date.');
    if (!selectedEmployee) return setError('Please select an employee.');
    if (!labourCategory) return setError('Please select a labour category.');
    if (workersValue <= 0) return setError('Number of workers must be greater than zero.');
    if (wageValue < 0) return setError('Daily wage cannot be negative.');
    if (daysValue <= 0) return setError('Working days must be greater than zero.');
    if (paid < 0) return setError('Amount paid cannot be negative.');
    if (paid > total) return setError('Amount paid cannot be greater than the total amount.');

    submittingRef.current = true;
    setSaving(true);
    setError('');

    const draft = {
      date,
      employeeId: selectedEmployee.id,
      employeeName: selectedEmployee.name,
      labourType: labourCategory,
      workDescription,
      workers: workersValue,
      dailyWage: wageValue,
      workingDays: daysValue,
      amountPaid: paid,
      notes,
    };

    const saved = initial
      ? updateLabour(initial.id, draft)
      : addLabour(draft, requestId);

    if (saved) {
      onClose();
      return;
    }

    submittingRef.current = false;
    setSaving(false);
    setError('This labour expense could not be saved. Please try again.');
  };

  return (
    <>
      <Modal
        isOpen
        onClose={onClose}
        title={initial ? 'Edit labour expense' : 'Add labour expense'}
        subtitle="Select a saved employee and record the day's work and payment."
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className={cn(btnSecondary, 'w-full justify-center sm:w-auto')}
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="labour-form"
              className={cn(
                btnPrimary,
                'w-full justify-center sm:w-auto',
                saving && 'cursor-not-allowed opacity-60',
              )}
              disabled={saving}
            >
              {saving ? 'Saving...' : initial ? 'Save changes' : 'Add expense'}
            </button>
          </div>
        }
      >
        <form id="labour-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="labour-date" className={labelClass}>
                Date
              </label>
              <input
                id="labour-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className={inputClass}
                required
              />
            </div>

            <div>
              <label htmlFor="labour-employee" className={labelClass}>
                Select existing employee
              </label>
              <select
                id="labour-employee"
                value={employeeId}
                onChange={(event) => handleEmployeeChange(event.target.value)}
                className={inputClass}
                required
              >
                <option value="" disabled>
                  Select an employee
                </option>
                {data.employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                    {employee.labourType ? ` · ${employee.labourType}` : ''}
                  </option>
                ))}
                <option value={ADD_EMPLOYEE} className="font-semibold text-blue-600">
                  + Add new employee
                </option>
              </select>
              <p className={helpClass}>
                Selecting an employee fills their saved category and daily wage.
              </p>
            </div>
          </div>

          {selectedEmployee && (
            <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2 text-xs text-blue-900">
              <span className="font-semibold">{selectedEmployee.name}</span>
              {selectedEmployee.mobile ? ` · ${selectedEmployee.mobile}` : ''}
              {selectedEmployee.notes ? ` · ${selectedEmployee.notes}` : ''}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="labour-type" className={labelClass}>
                Type of labour
              </label>
              <select
                id="labour-type"
                value={categorySelection}
                onChange={(event) => {
                  setCategorySelection(event.target.value);
                  if (event.target.value !== CUSTOM_CATEGORY) {
                    setCustomCategory('');
                  }
                  setError('');
                }}
                className={inputClass}
                required
              >
                {labourTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
                <option value={CUSTOM_CATEGORY} className="font-semibold text-blue-600">
                  + Add custom category
                </option>
              </select>
            </div>

            <div>
              <label htmlFor="labour-work" className={labelClass}>
                Work description / work completed
              </label>
              <input
                id="labour-work"
                type="text"
                value={workDescription}
                onChange={(event) => setWorkDescription(event.target.value)}
                className={inputClass}
                placeholder="e.g. Ground-floor brickwork"
              />
            </div>
          </div>

          {categorySelection === CUSTOM_CATEGORY && (
            <div>
              <label htmlFor="labour-custom-category" className={labelClass}>
                Custom labour category
              </label>
              <input
                id="labour-custom-category"
                type="text"
                value={customCategory}
                onChange={(event) => {
                  setCustomCategory(event.target.value);
                  setError('');
                }}
                className={inputClass}
                placeholder="e.g. Welder"
                autoComplete="off"
                required
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label htmlFor="labour-workers" className={labelClass}>
                Workers
              </label>
              <input
                id="labour-workers"
                type="number"
                min="0"
                step="1"
                value={workers}
                onChange={(event) => setWorkers(event.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label htmlFor="labour-attendance" className={labelClass}>
                Attendance
              </label>
              <select
                id="labour-attendance"
                value={attendance}
                onChange={(event) =>
                  handleAttendanceChange(event.target.value as Attendance)
                }
                className={inputClass}
              >
                <option value="full">Full day</option>
                <option value="half">Half day</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label htmlFor="labour-days" className={labelClass}>
                Working days
              </label>
              <input
                id="labour-days"
                type="number"
                min="0"
                step="0.5"
                value={attendance === 'custom' ? workingDays : String(daysValue)}
                onChange={(event) => setWorkingDays(event.target.value)}
                className={inputClass}
                disabled={attendance !== 'custom'}
                required
              />
            </div>
            <div>
              <label htmlFor="labour-wage" className={labelClass}>
                Daily wage (₹)
              </label>
              <input
                id="labour-wage"
                type="number"
                min="0"
                step="0.01"
                value={dailyWage}
                onChange={(event) => {
                  setDailyWage(event.target.value);
                  setError('');
                }}
                className={inputClass}
                placeholder="0"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="labour-paid" className={labelClass}>
                Amount paid (₹)
              </label>
              <input
                id="labour-paid"
                type="number"
                min="0"
                step="0.01"
                value={amountPaid}
                onChange={(event) => {
                  setAmountPaid(event.target.value);
                  setError('');
                }}
                className={inputClass}
                placeholder="0"
              />
              <p className={helpClass}>Leave blank if nothing has been paid yet.</p>
            </div>
            <div>
              <label htmlFor="labour-status" className={labelClass}>
                Payment status
              </label>
              <select
                id="labour-status"
                value={paymentState}
                onChange={(event) =>
                  handlePaymentStatusChange(event.target.value)
                }
                className={inputClass}
              >
                <option value="pending">Pending</option>
                <option value="partial">Partially paid</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="labour-notes" className={labelClass}>
              Notes for this expense
            </label>
            <textarea
              id="labour-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className={cn(inputClass, 'min-h-20 resize-y')}
              placeholder="e.g. Half-day work due to rain. Remaining payment tomorrow."
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Calculator className="h-4 w-4" />
              Calculated automatically
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-slate-500">Total labour amount</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-900">
                  {formatINR(total)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Paid</p>
                <p className="mt-0.5 text-sm font-semibold text-emerald-600">
                  {formatINR(paid)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Pending amount</p>
                <p
                  className={cn(
                    'mt-0.5 text-sm font-semibold',
                    pending > 0 ? 'text-rose-600' : 'text-emerald-600',
                  )}
                >
                  {formatINR(pending)}
                </p>
              </div>
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}
        </form>
      </Modal>

      {employeeFormOpen && (
        <EmployeeForm
          onClose={() => setEmployeeFormOpen(false)}
          onSaved={applyEmployee}
        />
      )}
    </>
  );
}
