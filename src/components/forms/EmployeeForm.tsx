import { useRef, useState, type FormEvent } from 'react';
import type { Employee } from '../../types';
import { useApp } from '../../context/appContext';
import { cn, toNumber } from '../../lib/format';
import {
  btnPrimary,
  btnSecondary,
  helpClass,
  inputClass,
  labelClass,
} from '../../lib/styles';
import Modal from '../Modal';

const CUSTOM_CATEGORY = '__custom_labour__';

interface EmployeeFormProps {
  initial?: Employee | null;
  onClose: () => void;
  onSaved?: (employee: Employee) => void;
}

export default function EmployeeForm({
  initial,
  onClose,
  onSaved,
}: EmployeeFormProps) {
  const { addEmployee, updateEmployee, labourTypes } = useApp();
  const [name, setName] = useState(initial?.name ?? '');
  const [mobile, setMobile] = useState(initial?.mobile ?? '');
  const [categorySelection, setCategorySelection] = useState(() => {
    if (!initial) return labourTypes[0] ?? '';
    return labourTypes.includes(initial.labourType)
      ? initial.labourType
      : CUSTOM_CATEGORY;
  });
  const [customCategory, setCustomCategory] = useState(() => {
    if (!initial) return '';
    return labourTypes.includes(initial.labourType) ? '' : initial.labourType;
  });
  const [dailyWage, setDailyWage] = useState(
    initial ? String(initial.dailyWage) : '',
  );
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const submittingRef = useRef(false);

  const wageValue = toNumber(dailyWage);
  const labourType =
    categorySelection === CUSTOM_CATEGORY
      ? customCategory.trim()
      : categorySelection;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (submittingRef.current) return;

    if (!name.trim()) return setError('Please enter the employee name.');
    if (!labourType) return setError('Please select a labour category.');
    if (wageValue < 0) return setError('Daily wage cannot be negative.');

    submittingRef.current = true;
    setSaving(true);
    setError('');

    const draft = {
      name,
      mobile,
      labourType,
      dailyWage: wageValue,
      notes,
    };
    const employee = initial
      ? updateEmployee(initial.id, draft)
      : addEmployee(draft);

    if (employee) {
      onSaved?.(employee);
      onClose();
      return;
    }

    submittingRef.current = false;
    setSaving(false);
    setError('This employee could not be saved. Please try again.');
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={initial ? 'Edit employee' : 'Add employee'}
      subtitle="Save worker details once and reuse them for daily labour entries."
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
            form="employee-form"
            className={cn(
              btnPrimary,
              'w-full justify-center sm:w-auto',
              saving && 'cursor-not-allowed opacity-60',
            )}
            disabled={saving}
          >
            {saving ? 'Saving...' : initial ? 'Save changes' : 'Save employee'}
          </button>
        </div>
      }
    >
      <form id="employee-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="employee-name" className={labelClass}>
              Employee name
            </label>
            <input
              id="employee-name"
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError('');
              }}
              className={inputClass}
              placeholder="e.g. Ravi Kumar"
              autoComplete="off"
              required
            />
          </div>
          <div>
            <label htmlFor="employee-mobile" className={labelClass}>
              Mobile number
            </label>
            <input
              id="employee-mobile"
              type="tel"
              value={mobile}
              onChange={(event) => setMobile(event.target.value)}
              className={inputClass}
              placeholder="Optional"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="employee-category" className={labelClass}>
              Type of labour
            </label>
            <select
              id="employee-category"
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
            <label htmlFor="employee-wage" className={labelClass}>
              Daily wage / rate (₹)
            </label>
            <input
              id="employee-wage"
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
            />
          </div>
        </div>

        {categorySelection === CUSTOM_CATEGORY && (
          <div>
            <label htmlFor="employee-custom-category" className={labelClass}>
              Custom labour category
            </label>
            <input
              id="employee-custom-category"
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
            <p className={helpClass}>
              Custom categories are saved for future entries.
            </p>
          </div>
        )}

        <div>
          <label htmlFor="employee-notes" className={labelClass}>
            Notes
          </label>
          <textarea
            id="employee-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className={cn(inputClass, 'min-h-20 resize-y')}
            placeholder="Optional employee notes"
          />
        </div>

        {error && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
