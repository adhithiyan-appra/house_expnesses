import { useMemo, useState } from 'react';
import {
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
import { useApp } from '../context/AppContext';
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
    return records.filter((record) =>
      [record.name, record.category, record.paidTo, record.notes, record.date]
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [records, search]);

  const total = useMemo(
    () => records.reduce((sum, item) => sum + item.amount, 0),
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
        description="Track food, tea, water, transport, rent, and daily site costs."
        action={
          <button type="button" className={btnPrimary} onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Add Expense
          </button>
        }
      />

      <div className={cn(cardClass, 'mb-5 grid grid-cols-2 divide-slate-100 sm:grid-cols-3 sm:divide-x')}>
        <div className="p-4">
          <p className="text-xs text-slate-500">Records</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{records.length}</p>
        </div>
        <div className="p-4">
          <p className="text-xs text-slate-500">Total Other Expenses</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{formatINR(total)}</p>
        </div>
        <div className="p-4">
          <p className="text-xs text-slate-500">Payment Status</p>
          <p className="mt-1 text-lg font-semibold text-emerald-600">Paid in full</p>
        </div>
      </div>

      <div className={cardClass}>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Other expense records</h2>
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
              placeholder="Search expense or category"
              className={cn(inputClass, 'pl-9')}
              aria-label="Search other expenses"
            />
          </div>
        </div>

        {records.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No other expenses yet"
            description="Add food, tea, transport, or any other construction-related cost."
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
          <div className="overflow-x-auto">
            <table className="min-w-[840px] w-full border-collapse">
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
                          title="View"
                          aria-label="View expense"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className={iconButton}
                          onClick={() => openEdit(record)}
                          title="Edit"
                          aria-label="Edit expense"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className={cn(iconButton, 'hover:bg-rose-50 hover:text-rose-600')}
                          onClick={() => setDeleting(record)}
                          title="Delete"
                          aria-label="Delete expense"
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
        <OtherForm
          initial={editing}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      )}

      <DetailsModal
        expense={viewing ? otherToUnified(viewing) : null}
        onClose={() => setViewing(null)}
      />

      <ConfirmDialog
        isOpen={Boolean(deleting)}
        title="Delete other expense?"
        message="This record will be permanently removed. This action cannot be undone."
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
