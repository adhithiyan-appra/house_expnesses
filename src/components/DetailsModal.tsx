import type { UnifiedExpense } from '../types';
import { getPaymentState } from '../lib/calculations';
import { cn, formatDisplayDate, formatINR } from '../lib/format';
import { btnSecondary } from '../lib/styles';
import Modal from './Modal';
import StatusBadge from './StatusBadge';

interface DetailsModalProps {
  expense: UnifiedExpense | null;
  onClose: () => void;
}

const typeLabels = {
  labour: 'Labour',
  material: 'Material',
  other: 'Other',
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}

export default function DetailsModal({ expense, onClose }: DetailsModalProps) {
  if (!expense) return null;

  const { record } = expense;
  const state =
    record.type === 'other'
      ? 'paid'
      : getPaymentState(record.totalAmount, record.amountPaid);

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Expense details"
      subtitle={`${typeLabels[expense.type]} · ${formatDisplayDate(expense.date)}`}
      footer={
        <div className="flex justify-end">
          <button type="button" className={btnSecondary} onClick={onClose}>
            Close
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">{expense.category}</p>
            <p className="mt-1 text-base font-semibold text-slate-900">{expense.description}</p>
            {expense.person && (
              <p className="mt-1 text-sm text-slate-500">{expense.person}</p>
            )}
          </div>
          <StatusBadge state={state} />
        </div>

        <div>
          {record.type === 'labour' && (
            <>
              <DetailRow label="Labour type" value={record.labourType} />
              <DetailRow label="Workers" value={String(record.workers)} />
              <DetailRow label="Daily wage" value={formatINR(record.dailyWage)} />
              <DetailRow label="Working days" value={String(record.workingDays)} />
            </>
          )}

          {record.type === 'material' && (
            <>
              <DetailRow label="Material" value={record.materialName} />
              <DetailRow label="Quantity" value={`${record.quantity} ${record.unit}`} />
              <DetailRow label="Price per unit" value={formatINR(record.pricePerUnit)} />
              <DetailRow label="Transportation" value={formatINR(record.transportation)} />
              <DetailRow label="Supplier" value={record.supplier || '—'} />
            </>
          )}

          {record.type === 'other' && (
            <>
              <DetailRow label="Expense name" value={record.name} />
              <DetailRow label="Category" value={record.category} />
              <DetailRow label="Paid to" value={record.paidTo || '—'} />
              <DetailRow label="Payment method" value={record.paymentMethod} />
            </>
          )}

          <DetailRow label="Notes" value={expense.notes || '—'} />
        </div>

        {record.type === 'other' ? (
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Amount</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{formatINR(record.amount)}</p>
            <p className="mt-1 text-xs text-emerald-600">Paid in full</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 rounded-xl border border-slate-200 p-4">
            <div>
              <p className="text-xs text-slate-500">Total</p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {formatINR(record.totalAmount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Paid</p>
              <p className="mt-1 text-base font-semibold text-emerald-600">
                {formatINR(record.amountPaid)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Balance</p>
              <p
                className={cn(
                  'mt-1 text-base font-semibold',
                  record.balance > 0 ? 'text-rose-600' : 'text-emerald-600',
                )}
              >
                {formatINR(record.balance)}
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
