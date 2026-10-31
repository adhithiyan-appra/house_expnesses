import { useMemo, useState } from 'react';
import {
  Eye,
  Package,
  Pencil,
  Plus,
  Search,
  Store,
  Trash2,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import DetailsModal from '../components/DetailsModal';
import MaterialForm from '../components/forms/MaterialForm';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/appContext';
import type { MaterialRecord } from '../types';
import {
  getPaymentState,
  materialToUnified,
  sortMaterials,
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

export default function Materials() {
  const { data, deleteMaterial } = useApp();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MaterialRecord | null>(null);
  const [viewing, setViewing] = useState<MaterialRecord | null>(null);
  const [deleting, setDeleting] = useState<MaterialRecord | null>(null);

  const records = useMemo(() => sortMaterials(data.materials), [data.materials]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return records;
    return records.filter((record) =>
      [record.materialName, record.supplier, record.notes, record.date]
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

  const openEdit = (record: MaterialRecord) => {
    setEditing(record);
    setFormOpen(true);
  };

  const handleDelete = () => {
    if (!deleting) return;
    deleteMaterial(deleting.id);
    setDeleting(null);
  };

  return (
    <>
      <PageHeader
        title="Material Expenses"
        description="Track purchases of cement, sand, steel, bricks, and fittings."
        action={
          <button type="button" className={cn(btnPrimary, 'w-full sm:w-auto')} onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Add Material
          </button>
        }
      />

      {/* Summary KPI grid (2 cols on mobile, 4 on desktop) */}
      <div className={cn(cardClass, 'mb-5 grid grid-cols-2 divide-y sm:divide-y-0 sm:grid-cols-4 sm:divide-x divide-slate-100')}>
        <div className="p-3 sm:p-4">
          <p className="text-xs text-slate-500 font-medium">Purchases</p>
          <p className="mt-1 text-base sm:text-lg font-bold text-slate-900">{records.length}</p>
        </div>
        <div className="p-3 sm:p-4">
          <p className="text-xs text-slate-500 font-medium">Total Cost</p>
          <p className="mt-1 text-base sm:text-lg font-bold text-slate-900">{formatINR(totals.total)}</p>
        </div>
        <div className="p-3 sm:p-4">
          <p className="text-xs text-slate-500 font-medium">Amount Paid</p>
          <p className="mt-1 text-base sm:text-lg font-bold text-emerald-600">{formatINR(totals.paid)}</p>
        </div>
        <div className="p-3 sm:p-4">
          <p className="text-xs text-slate-500 font-medium">Pending</p>
          <p className="mt-1 text-base sm:text-lg font-bold text-rose-600">{formatINR(totals.pending)}</p>
        </div>
      </div>

      <div className={cardClass}>
        {/* Search Bar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-3 sm:p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Material purchases</h2>
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
              placeholder="Search material, supplier, notes"
              className={cn(inputClass, 'pl-9 text-xs sm:text-sm')}
              aria-label="Search material purchases"
            />
          </div>
        </div>

        {records.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No material expenses yet"
            description="Add your first material purchase to start tracking costs and balances."
            action={
              <button type="button" className={btnPrimary} onClick={openAdd}>
                <Plus className="h-4 w-4" />
                Add Material
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
              {filtered.map((record) => {
                const state = getPaymentState(record.totalAmount, record.amountPaid);
                return (
                  <div key={record.id} className="p-3.5 space-y-2.5">
                    {/* Top Row: Material, Date, Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">
                          {record.materialName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDisplayDate(record.date)}
                        </p>
                      </div>
                      <StatusBadge state={state} />
                    </div>

                    {/* Middle: Quantity, Price, Supplier */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">
                      <span>
                        <span className="font-semibold text-slate-800">{record.quantity} {record.unit}</span> @ {formatINR(record.pricePerUnit)}
                      </span>
                      {record.transportation > 0 && (
                        <span>+ {formatINR(record.transportation)} transport</span>
                      )}
                      {record.supplier && (
                        <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                          <Store className="h-3 w-3 text-slate-400" />
                          {record.supplier}
                        </span>
                      )}
                    </div>

                    {/* Financial Summary */}
                    <div className="grid grid-cols-3 gap-2 rounded-lg border border-slate-100 bg-white p-2 text-center text-xs">
                      <div>
                        <span className="block text-[11px] text-slate-500">Total</span>
                        <span className="font-bold text-slate-900">{formatINR(record.totalAmount)}</span>
                      </div>
                      <div>
                        <span className="block text-[11px] text-slate-500">Paid</span>
                        <span className="font-semibold text-emerald-600">{formatINR(record.amountPaid)}</span>
                      </div>
                      <div>
                        <span className="block text-[11px] text-slate-500">Balance</span>
                        <span className={cn('font-bold', record.balance > 0 ? 'text-rose-600' : 'text-emerald-600')}>
                          {formatINR(record.balance)}
                        </span>
                      </div>
                    </div>

                    {record.notes && (
                      <p className="text-xs text-slate-500 truncate italic">
                        "{record.notes}"
                      </p>
                    )}

                    {/* Action Buttons */}
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
                );
              })}
            </div>

            {/* DESKTOP TABLE VIEW (Screens >= sm) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className={tableHeadClass}>
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Material</th>
                    <th className="px-4 py-3 text-right">Quantity</th>
                    <th className="px-4 py-3 text-right">Price / Unit</th>
                    <th className="px-4 py-3 text-right">Transport</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">Paid</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                    <th className="px-4 py-3">Supplier</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((record) => (
                    <tr key={record.id} className="transition hover:bg-slate-50/70">
                      <td className={tableCellClass}>{formatDisplayDate(record.date)}</td>
                      <td className={cn(tableCellClass, 'font-medium text-slate-900')}>
                        {record.materialName}
                      </td>
                      <td className={cn(tableCellClass, 'text-right')}>
                        {record.quantity} {record.unit}
                      </td>
                      <td className={cn(tableCellClass, 'text-right')}>
                        {formatINR(record.pricePerUnit)}
                      </td>
                      <td className={cn(tableCellClass, 'text-right')}>
                        {record.transportation > 0 ? formatINR(record.transportation) : '—'}
                      </td>
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
                      <td className={tableCellClass}>{record.supplier || '—'}</td>
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
                            aria-label={`View details for ${record.materialName}`}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className={iconButton}
                            onClick={() => openEdit(record)}
                            aria-label={`Edit ${record.materialName}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className={cn(iconButton, 'hover:text-rose-600')}
                            onClick={() => setDeleting(record)}
                            aria-label={`Delete ${record.materialName}`}
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
        <MaterialForm initial={editing} onClose={() => setFormOpen(false)} />
      )}

      <DetailsModal
        expense={viewing ? materialToUnified(viewing) : null}
        onClose={() => setViewing(null)}
      />

      <ConfirmDialog
        isOpen={Boolean(deleting)}
        title="Delete material purchase"
        message={`Are you sure you want to delete the purchase for "${deleting?.materialName}" on ${
          deleting ? formatDisplayDate(deleting.date) : ''
        }? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
