import { useRef, useState, type FormEvent } from 'react';
import type { OtherRecord, PaymentMethod } from '../../types';
import { PAYMENT_METHODS } from '../../constants';
import { useApp } from '../../context/appContext';
import { cn, toNumber, todayISO, uid } from '../../lib/format';
import {
  btnPrimary,
  btnSecondary,
  helpClass,
  inputClass,
  labelClass,
} from '../../lib/styles';
import Modal from '../Modal';

interface OtherFormProps {
  initial?: OtherRecord | null;
  onClose: () => void;
}

export default function OtherForm({ initial, onClose }: OtherFormProps) {
  const { addOther, updateOther, expenseCategories } = useApp();
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState(
    initial?.category ?? expenseCategories[0] ?? '',
  );
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [paidTo, setPaidTo] = useState(initial?.paidTo ?? '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    initial?.paymentMethod ?? 'Cash',
  );
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [requestId] = useState(uid);
  const submittingRef = useRef(false);

  const amountValue = toNumber(amount);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (submittingRef.current) return;

    if (!date) return setError('Please select a date.');
    if (!name.trim()) return setError('Please enter an expense name.');
    if (!category.trim()) return setError('Please enter a category.');
    if (amountValue <= 0) return setError('Amount must be greater than zero.');

    submittingRef.current = true;
    setSaving(true);
    setError('');

    const draft = {
      date,
      name,
      category,
      amount: amountValue,
      paidTo,
      paymentMethod,
      notes,
    };

    const saved = initial
      ? updateOther(initial.id, draft)
      : addOther(draft, requestId);

    if (saved) {
      onClose();
      return;
    }

    submittingRef.current = false;
    setSaving(false);
    setError('This expense could not be saved. Please try again.');
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={initial ? 'Edit expense' : 'Add other expense'}
      subtitle="Track food, tea, water, rent, and other site costs."
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button type="button" className={cn(btnSecondary, 'w-full sm:w-auto justify-center')} onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="other-form"
            className={cn(btnPrimary, 'w-full sm:w-auto justify-center', saving && 'cursor-not-allowed opacity-60')}
            disabled={saving}
          >
            {saving ? 'Saving...' : initial ? 'Save changes' : 'Add expense'}
          </button>
        </div>
      }
    >
      <form id="other-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="other-date" className={labelClass}>
              Date
            </label>
            <input
              id="other-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label htmlFor="other-amount" className={labelClass}>
              Amount (₹)
            </label>
            <input
              id="other-amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className={inputClass}
              placeholder="0"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="other-name" className={labelClass}>
            Expense name
          </label>
          <input
            id="other-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={inputClass}
            placeholder="e.g. Lunch for workers"
            required
          />
        </div>

        <div>
          <label htmlFor="other-category" className={labelClass}>
            Category
          </label>
          <input
            id="other-category"
            list="expense-category-options"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className={inputClass}
            placeholder="Select or type a category"
            autoComplete="off"
            required
          />
          <datalist id="expense-category-options">
            {expenseCategories.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          <p className={helpClass}>
            Pick a default or type a new one. New categories are saved automatically.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="other-paid-to" className={labelClass}>
              Paid to
            </label>
            <input
              id="other-paid-to"
              type="text"
              value={paidTo}
              onChange={(event) => setPaidTo(event.target.value)}
              className={inputClass}
              placeholder="Shop, person, or vendor"
            />
          </div>
          <div>
            <label htmlFor="other-method" className={labelClass}>
              Payment method
            </label>
            <select
              id="other-method"
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
              className={inputClass}
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="other-notes" className={labelClass}>
            Notes
          </label>
          <textarea
            id="other-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className={cn(inputClass, 'min-h-20 resize-y')}
            placeholder="Optional notes"
          />
        </div>

        <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
          Other expenses are recorded as paid in full.
        </p>

        {error && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
