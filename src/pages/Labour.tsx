import { useMemo, useState } from 'react';
import {
  Eye,
  HardHat,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import DetailsModal from '../components/DetailsModal';
import LabourForm from '../components/forms/LabourForm';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import type { LabourRecord } from '../types';
import {
  getPaymentState,
  labourToUnified,
  sortLabour,
} from '../lib/calculations';
import { cn, formatDisplayDate, formatINR } from '../lib/format';
import {
  btnPrimary,
  cardClass,
  iconButton,
  inputClass,
  tableCellClass,
  tableHeadClass,
} from '../lib/styles';

export default function Labour() {
  const { data, deleteLabour } = useApp();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LabourRecord | null>(null);
  const [viewing, setViewing] = useState<LabourRecord | null>(null);
  const [deleting, setDeleting] = useState<LabourRecord | null>(null);

  const records = useMemo(() => sortLabour(data.labour), [data.labour]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return records;
    return records.filter((record) =>
      [record.labourType, record.notes, record.date]
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [records, search]);

  const totals = useMemo(
    () => ({
      total: records.reduce((sum, item) => sum + item.totalAmount, 0),
      paid: records.reduce((sum, item) => sum + item.amountPaid, 0),
      pending: records.reduce((sum, item) => sum + Math.max(item.balance, 0), 0),
    }),
    [records],
  );

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (record: LabourRecord) => {
    setEditing(record);
    setFormOpen(true);
  };

  const handleDelete = () => {
    if (!deleting) return;
    deleteLabour(deleting.id);
    setDeleting(null);
  };

  return (
    <>
      <PageHeader
        title="Labour Expenses"
        description="Track daily wages, workers, and pending labour payments."
        action={
          <button type="button" className={btnPrimary} onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Add Labour
          </button>
        }
      />

      <div className={cn(cardClass, 'mb-5 grid grid-cols-2 divide-slate-100 sm:grid-cols-4 sm:divide-x')}>
        <div className="p-4">
          <p className="text-xs text-slate-500">Records</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{records.length}</p>
        </div>
        <div className="p-4">
          <p className="text-xs text-slate-500">Total Labour</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{formatINR(totals.total)}</p>
        </div>
        <div className="p-4">
          <p className="text-xs text-slate-500">Paid</p>
          <p className="mt-1 text-lg font-semibold text-emerald-600">{formatINR(totals.paid)}</p>
        </div>
        <div className="p-4">
          <p className="text-xs text-slate-500">Pending</p>
          <p className="mt-1 text-lg font-semibold text-rose-600">{formatINR(totals.pending)}</p>
        </div>
      </div>

      <div className={cardClass}>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Labour records</h2>
            <p className="text-xs text-slate-500">
              {filtered.length} of {records.length} records
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search labour type or notes"
              className={cn(inputClass, 'pl-9')}
              aria-label="Search labour records"
            />
          </div>
        </div>

        {records.length === 0 ? (
          <EmptyState
            icon={HardHat}
            title="No labour expenses yet"
            description="Add your first labour payment to start tracking wages and balances."
            action={
              <button type="button" className={btnPrimary} onClick={openAdd}>
                <Plus className="h-4 w-4" />
                Add Labour
              </button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No matching records"
            description="Try a different search term."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full border-collapse">
              <thead className={tableHeadClass}>
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Labour Type</th>
                  <th className="px-4 py-3 text-right">Workers</th>
                  <th className="px-4 py-3 text-right">Wage</th>
                  <th className="px-4 py-3 text-right">Days</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((record) => (
                  <tr key={record.id} className="transition hover:bg-slate-50/70">
                    <td className={tableCellClass}>{formatDisplayDate(record.date)}</td>
                    <td className={cn(tableCellClass, 'font-medium text-slate-900')}>
                      {record.labourType}
                    </td>
                    <td className={cn(tableCellClass, 'text-right')}>{record.workers}</td>
                    <td className={cn(tableCellClass, 'text-right')}>
                      {formatINR(record.dailyWage)}
                    </td>
                    <td className={cn(tableCellClass, 'text-right')}>{record.workingDays}</td>
                    <td className={cn(tableCellClass, 'text-right font-semibold text-slate-900')}>
                      {formatINR(record.totalAmount)}
                    </td>
                    <td className={cn(tableCellClass, 'text-right font-medium text-emerald-600')}>
                      {formatINR(record.amountPaid)}
                    </td>
                    <td
                      className={cn(
                        tableCellClass,
                        'text-right font-medium',
                        record.balance > 0 ? 'text-rose-600' : 'text-emerald-600',
                      )}
                    >
                      {formatINR(record.balance)}
                    </td>
                    <td className={tableCellClass}>
                      <StatusBadge
                        state={getPaymentState(record.totalAmount, record.amountPaid)}
                      />
                    </td>
                    <td className={tableCellClass}>
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className={iconButton}
                          onClick={() => setViewing(record)}
                          title="View"
                          aria-label="View labour record"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className={iconButton}
                          onClick={() => openEdit(record)}
                          title="Edit"
                          aria-label="Edit labour record"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className={cn(iconButton, 'hover:bg-rose-50 hover:text-rose-600')}
                          onClick={() => setDeleting(record)}
                          title="Delete"
                          aria-label="Delete labour record"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formOpen && (
        <LabourForm
          initial={editing}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      )}

      <DetailsModal
        expense={viewing ? labourToUnified(viewing) : null}
        onClose={() => setViewing(null)}
      />

      <ConfirmDialog
        isOpen={Boolean(deleting)}
        title="Delete labour expense?"
        message="This record will be permanently removed. This action cannot be undone."
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
