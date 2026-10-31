import { useMemo, useState } from 'react';
import {
  CreditCard,
  Eye,
  Pencil,
  Plus,
  Receipt,
  Search,
  Trash2,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import DetailsModal from '../components/DetailsModal';
import OtherForm from '../components/forms/OtherForm';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/appContext';
import type { OtherRecord } from '../types';
import { otherToUnified, sortOthers } from '../lib/calculations';
import { cn, formatDisplayDate, formatINR } from '../lib/format';
import {
  btnPrimary,
  cardClass,
  iconButton,
  inputClass,
  tableCellClass,
  tableHeadClass,
} from '../lib/styles';

export default function OtherExpenses() {
  const { data, deleteOther } = useApp();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<OtherRecord | null>(null);
  const [viewing, setViewing] = useState<OtherRecord | null>(null);
  const [deleting, setDeleting] = useState<OtherRecord | null>(null);

  const records = useMemo(() => sortOthers(data.others), [data.others]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return records;
    return records.filter((record: OtherRecord) =>
      [record.name, record.category, record.paidTo, record.notes, record.date]
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [records, search]);

  const totalAmount = useMemo(
    () => records.reduce((sum: number, item: OtherRecord) => sum + item.amount, 0),
    [records],
  );

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (record: OtherRecord) => {
    setEditing(record);
    setFormOpen(true);
  };

  const handleDelete = () => {
    if (!deleting) return;
    deleteOther(deleting.id);
    setDeleting(null);
  };

  return (
    <>
      <PageHeader
        title="Other Expenses"
        description="Track daily site expenses such as food, tea, water, vehicle rent, and fees."
        action={
          <button type="button" className={cn(btnPrimary, 'w-full sm:w-auto')} onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Add Expense
          </button>
        }
      />

      {/* Summary KPI grid (2 cols on mobile, 3 on desktop) */}
      <div className={cn(cardClass, 'mb-5 grid grid-cols-2 divide-y sm:divide-y-0 sm:grid-cols-3 sm:divide-x divide-slate-100')}>
        <div className="p-3 sm:p-4">
          <p className="text-xs text-slate-500 font-medium">Entries</p>
          <p className="mt-1 text-base sm:text-lg font-bold text-slate-900">{records.length}</p>
        </div>
        <div className="p-3 sm:p-4">
          <p className="text-xs text-slate-500 font-medium">Total Spent</p>
          <p className="mt-1 text-base sm:text-lg font-bold text-slate-900">{formatINR(totalAmount)}</p>
        </div>
        <div className="col-span-2 sm:col-span-1 p-3 sm:p-4 border-t sm:border-t-0 border-slate-100">
          <p className="text-xs text-slate-500 font-medium">Average Expense</p>
          <p className="mt-1 text-base sm:text-lg font-bold text-slate-700">
            {records.length > 0 ? formatINR(Math.round(totalAmount / records.length)) : formatINR(0)}
          </p>
        </div>
      </div>

      <div className={cardClass}>
        {/* Search Bar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-3 sm:p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Expense records</h2>
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
              placeholder="Search title, category, paid to"
              className={cn(inputClass, 'pl-9 text-xs sm:text-sm')}
              aria-label="Search other expenses"
            />
          </div>
        </div>

        {records.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No other expenses yet"
            description="Add daily expenses like worker tea, snacks, water, or equipment rent."
            action={
              <button type="button" className={btnPrimary} onClick={openAdd}>
                <Plus className="h-4 w-4" />
                Add Expense
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
          <>
            {/* MOBILE CARD VIEW (Screens < sm) */}
            <div className="divide-y divide-slate-100 sm:hidden">
              {filtered.map((record) => (
                <div key={record.id} className="p-3.5 space-y-2.5">
                  {/* Top Row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {record.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDisplayDate(record.date)} · <span className="font-medium text-slate-700">{record.category}</span>
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-slate-900">{formatINR(record.amount)}</p>
                      <StatusBadge state="paid" />
                    </div>
                  </div>

                  {/* Middle row: Paid To & Method */}
                  {(record.paidTo || record.paymentMethod) && (
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">
                      <span>Paid to: <span className="font-semibold text-slate-800">{record.paidTo || 'Direct'}</span></span>
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <CreditCard className="h-3 w-3" />
                        {record.paymentMethod}
                      </span>
                    </div>
                  )}

                  {record.notes && (
                    <p className="text-xs text-slate-500 truncate italic">
                      "{record.notes}"
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setViewing(record)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 active:bg-slate-100"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(record)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 active:bg-blue-100"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(record)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 active:bg-rose-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* DESKTOP TABLE VIEW (Screens >= sm) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className={tableHeadClass}>
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Expense</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Paid To</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((record) => (
                    <tr key={record.id} className="transition hover:bg-slate-50/70">
                      <td className={tableCellClass}>{formatDisplayDate(record.date)}</td>
                      <td className={cn(tableCellClass, 'font-medium text-slate-900')}>
                        {record.name}
                      </td>
                      <td className={tableCellClass}>{record.category}</td>
                      <td className={tableCellClass}>{record.paidTo || '—'}</td>
                      <td className={tableCellClass}>{record.paymentMethod}</td>
                      <td className={cn(tableCellClass, 'text-right font-semibold text-slate-900')}>
                        {formatINR(record.amount)}
                      </td>
                      <td className={tableCellClass}>
                        <StatusBadge state="paid" />
                      </td>
                      <td className={tableCellClass}>
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            className={iconButton}
                            onClick={() => setViewing(record)}
                            aria-label={`View details for ${record.name}`}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className={iconButton}
                            onClick={() => openEdit(record)}
                            aria-label={`Edit ${record.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className={cn(iconButton, 'hover:text-rose-600')}
                            onClick={() => setDeleting(record)}
                            aria-label={`Delete ${record.name}`}
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
          </>
        )}
      </div>

      {formOpen && (
        <OtherForm initial={editing} onClose={() => setFormOpen(false)} />
      )}

      <DetailsModal
        expense={viewing ? otherToUnified(viewing) : null}
        onClose={() => setViewing(null)}
      />

      <ConfirmDialog
        isOpen={Boolean(deleting)}
        title="Delete expense"
        message={`Are you sure you want to delete "${deleting?.name}" on ${
          deleting ? formatDisplayDate(deleting.date) : ''
        }? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
