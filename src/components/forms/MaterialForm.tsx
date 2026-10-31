import { useState, type FormEvent } from 'react';
import { Calculator } from 'lucide-react';
import type { MaterialRecord } from '../../types';
import { useApp } from '../../context/AppContext';
import { calcMaterialTotal, roundMoney } from '../../lib/calculations';
import { cn, formatINR, toNumber, todayISO } from '../../lib/format';
import {
  btnPrimary,
  btnSecondary,
  helpClass,
  inputClass,
  labelClass,
} from '../../lib/styles';
import Modal from '../Modal';

interface MaterialFormProps {
  initial?: MaterialRecord | null;
  onClose: () => void;
}

export default function MaterialForm({ initial, onClose }: MaterialFormProps) {
  const { addMaterial, updateMaterial, materialTypes, units } = useApp();
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [materialName, setMaterialName] = useState(
    initial?.materialName ?? materialTypes[0] ?? '',
  );
  const [quantity, setQuantity] = useState(
    initial ? String(initial.quantity) : '',
  );
  const [unit, setUnit] = useState(initial?.unit ?? units[0] ?? 'Units');
  const [pricePerUnit, setPricePerUnit] = useState(
    initial ? String(initial.pricePerUnit) : '',
  );
  const [transportation, setTransportation] = useState(
    initial ? String(initial.transportation) : '',
  );
  const [amountPaid, setAmountPaid] = useState(
    initial ? String(initial.amountPaid) : '',
  );
  const [supplier, setSupplier] = useState(initial?.supplier ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [error, setError] = useState('');

  const quantityValue = toNumber(quantity);
  const priceValue = toNumber(pricePerUnit);
  const transportValue = toNumber(transportation);
  const total = calcMaterialTotal(quantityValue, priceValue, transportValue);
  const paid = toNumber(amountPaid);
  const balance = roundMoney(total - paid);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!date) return setError('Please select a date.');
    if (!materialName.trim()) return setError('Please enter a material name.');
    if (quantityValue <= 0) return setError('Quantity must be greater than zero.');
    if (!unit.trim()) return setError('Please enter a unit.');
    if (priceValue < 0) return setError('Price per unit cannot be negative.');
    if (transportValue < 0) return setError('Transportation charges cannot be negative.');
    if (paid < 0) return setError('Amount paid cannot be negative.');
    if (paid > total) return setError('Amount paid cannot be greater than the total amount.');

    const draft = {
      date,
      materialName,
      quantity: quantityValue,
      unit,
      pricePerUnit: priceValue,
      transportation: transportValue,
      amountPaid: paid,
      supplier,
      notes,
    };

    if (initial) {
      updateMaterial(initial.id, draft);
    } else {
      addMaterial(draft);
    }
    onClose();
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={initial ? 'Edit material expense' : 'Add material expense'}
      subtitle="Record purchases, transport costs, and supplier balances."
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className={btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="material-form" className={btnPrimary}>
            {initial ? 'Save changes' : 'Add expense'}
          </button>
        </div>
      }
    >
      <form id="material-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="material-date" className={labelClass}>
              Date
            </label>
            <input
              id="material-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label htmlFor="material-supplier" className={labelClass}>
              Supplier name
            </label>
            <input
              id="material-supplier"
              type="text"
              value={supplier}
              onChange={(event) => setSupplier(event.target.value)}
              className={inputClass}
              placeholder="Optional"
            />
          </div>
        </div>

        <div>
          <label htmlFor="material-name" className={labelClass}>
            Material name
          </label>
          <input
            id="material-name"
            list="material-name-options"
            value={materialName}
            onChange={(event) => setMaterialName(event.target.value)}
            className={inputClass}
            placeholder="Select or type a material"
            autoComplete="off"
            required
          />
          <datalist id="material-name-options">
            {materialTypes.map((type) => (
              <option key={type} value={type} />
            ))}
          </datalist>
          <p className={helpClass}>
            Pick a default or type a new one. New materials are saved automatically.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="material-quantity" className={labelClass}>
              Quantity
            </label>
            <input
              id="material-quantity"
              type="number"
              min="0"
              step="0.01"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className={inputClass}
              placeholder="0"
              required
            />
          </div>
          <div>
            <label htmlFor="material-unit" className={labelClass}>
              Unit
            </label>
            <input
              id="material-unit"
              list="material-unit-options"
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
              className={inputClass}
              placeholder="Bags, Pieces, Loads..."
              autoComplete="off"
              required
            />
            <datalist id="material-unit-options">
              {units.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="material-price" className={labelClass}>
              Price per unit (₹)
            </label>
            <input
              id="material-price"
              type="number"
              min="0"
              step="0.01"
              value={pricePerUnit}
              onChange={(event) => setPricePerUnit(event.target.value)}
              className={inputClass}
              placeholder="0"
              required
            />
          </div>
          <div>
            <label htmlFor="material-transport" className={labelClass}>
              Transportation charges (₹)
            </label>
            <input
              id="material-transport"
              type="number"
              min="0"
              step="0.01"
              value={transportation}
              onChange={(event) => setTransportation(event.target.value)}
              className={inputClass}
              placeholder="0"
            />
          </div>
        </div>

        <div>
          <label htmlFor="material-paid" className={labelClass}>
            Amount paid (₹)
          </label>
          <input
            id="material-paid"
            type="number"
            min="0"
            step="0.01"
            value={amountPaid}
            onChange={(event) => setAmountPaid(event.target.value)}
            className={inputClass}
            placeholder="0"
          />
          <p className={helpClass}>Leave blank if the purchase is unpaid.</p>
        </div>

        <div>
          <label htmlFor="material-notes" className={labelClass}>
            Notes
          </label>
          <textarea
            id="material-notes"
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
