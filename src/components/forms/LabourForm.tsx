import { useState, type FormEvent } from 'react';
import { Calculator } from 'lucide-react';
import type { LabourRecord } from '../../types';
import { useApp } from '../../context/AppContext';
import { calcLabourTotal, roundMoney } from '../../lib/calculations';
import { cn, formatINR, toNumber, todayISO } from '../../lib/format';
import {
  btnPrimary,
  btnSecondary,
  helpClass,
  inputClass,
  labelClass,
} from '../../lib/styles';
import Modal from '../Modal';

interface LabourFormProps {
  initial?: LabourRecord | null;
  onClose: () => void;
}

export default function LabourForm({ initial, onClose }: LabourFormProps) {
  const { addLabour, updateLabour, labourTypes } = useApp();
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [labourType, setLabourType] = useState(initial?.labourType ?? labourTypes[0] ?? '');
  const [workers, setWorkers] = useState(initial ? String(initial.workers) : '1');
  const [dailyWage, setDailyWage] = useState(
    initial ? String(initial.dailyWage) : '',
  );
  const [workingDays, setWorkingDays] = useState(
    initial ? String(initial.workingDays) : '1',
  );
  const [amountPaid, setAmountPaid] = useState(
    initial ? String(initial.amountPaid) : '',
  );
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [error, setError] = useState('');

  const workersValue = toNumber(workers);
  const wageValue = toNumber(dailyWage);
  const daysValue = toNumber(workingDays);
  const total = calcLabourTotal(workersValue, wageValue, daysValue);
  const paid = toNumber(amountPaid);
  const balance = roundMoney(total - paid);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!date) return setError('Please select a date.');
    if (!labourType.trim()) return setError('Please enter a labour type.');
    if (workersValue <= 0) return setError('Number of workers must be greater than zero.');
    if (wageValue < 0) return setError('Daily wage cannot be negative.');
    if (daysValue <= 0) return setError('Working days must be greater than zero.');
    if (paid < 0) return setError('Amount paid cannot be negative.');
    if (paid > total) return setError('Amount paid cannot be greater than the total amount.');

    const draft = {
      date,
      labourType,
      workers: workersValue,
      dailyWage: wageValue,
      workingDays: daysValue,
      amountPaid: paid,
      notes,
    };

    if (initial) {
      updateLabour(initial.id, draft);
    } else {
      addLabour(draft);
    }
    onClose();
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={initial ? 'Edit labour expense' : 'Add labour expense'}
      subtitle="Track daily wages and pending payments."
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className={btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="labour-form" className={btnPrimary}>
            {initial ? 'Save changes' : 'Add expense'}
          </button>
        </div>
      }
    >
      <form id="labour-form" onSubmit={handleSubmit} className="space-y-4">
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
          <label htmlFor="labour-type" className={labelClass}>
            Labour type
          </label>
          <input
            id="labour-type"
            list="labour-type-options"
            value={labourType}
            onChange={(event) => setLabourType(event.target.value)}
            className={inputClass}
            placeholder="Select or type a labour type"
            autoComplete="off"
            required
          />
          <datalist id="labour-type-options">
            {labourTypes.map((type) => (
              <option key={type} value={type} />
            ))}
          </datalist>
          <p className={helpClass}>
            Pick a default or type a new one. New types are saved automatically.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
            <label htmlFor="labour-wage" className={labelClass}>
              Daily wage (₹)
            </label>
            <input
              id="labour-wage"
              type="number"
              min="0"
              step="0.01"
              value={dailyWage}
              onChange={(event) => setDailyWage(event.target.value)}
              className={inputClass}
              placeholder="0"
              required
            />
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
              value={workingDays}
              onChange={(event) => setWorkingDays(event.target.value)}
              className={inputClass}
              required
            />
          </div>
        </div>

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
            onChange={(event) => setAmountPaid(event.target.value)}
            className={inputClass}
            placeholder="0"
          />
          <p className={helpClass}>Leave blank if nothing has been paid yet.</p>
        </div>

        <div>
          <label htmlFor="labour-notes" className={labelClass}>
            Notes
          </label>
          <textarea
            id="labour-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className={cn(inputClass, 'min-h-20 resize-y')}
            placeholder="Optional notes"
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Calculator className="h-4 w-4" />
            Calculated automatically
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-slate-500">Total</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900">{formatINR(total)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Paid</p>
              <p className="mt-0.5 text-sm font-semibold text-emerald-600">{formatINR(paid)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Balance</p>
              <p
                className={cn(
                  'mt-0.5 text-sm font-semibold',
                  balance > 0 ? 'text-rose-600' : 'text-emerald-600',
                )}
              >
                {formatINR(balance)}
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
  );
}
