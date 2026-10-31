import { useMemo, useState } from 'react';
import {
  Download,
  Eye,
  HardHat,
  History as HistoryIcon,
  Package,
  Pencil,
  Receipt,
  Search,
  Trash2,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import DetailsModal from '../components/DetailsModal';
import LabourForm from '../components/forms/LabourForm';
import MaterialForm from '../components/forms/MaterialForm';
import OtherForm from '../components/forms/OtherForm';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/appContext';
import type {
  LabourRecord,
  MaterialRecord,
  OtherRecord,
  RangePreset,
  UnifiedExpense,
} from '../types';
import {
  buildDateRange,
  getPaymentState,
  getUnifiedExpenses,
  isInDateRange,
  sumUnified,
} from '../lib/calculations';
import { downloadCSV, fileStamp } from '../lib/csv';
import { cn, formatDisplayDate, formatINR } from '../lib/format';
import {
  btnSecondary,
  cardClass,
  iconButton,
  inputClass,
  tableCellClass,
  tableHeadClass,
} from '../lib/styles';

const presets = [
  { value: 'all', label: 'All' },
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This week' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'custom', label: 'Custom' },
] as const;

const typeMeta = {
  labour: { label: 'Labour', icon: HardHat, className: 'bg-blue-50 text-blue-600' },
  material: { label: 'Material', icon: Package, className: 'bg-amber-50 text-amber-600' },
  other: { label: 'Other', icon: Receipt, className: 'bg-violet-50 text-violet-600' },
};

export default function History() {
  const {
    data,
    deleteLabour,
    deleteMaterial,
    deleteOther,
    labourTypes,
    materialTypes,
    expenseCategories,
  } = useApp();

  const [preset, setPreset] = useState<(typeof presets)[number]['value']>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');

  const [viewing, setViewing] = useState<UnifiedExpense | null>(null);
  const [editing, setEditing] = useState<
    LabourRecord | MaterialRecord | OtherRecord | null
  >(null);
  const [deleting, setDeleting] = useState<UnifiedExpense | null>(null);

  const allExpenses = useMemo(() => getUnifiedExpenses(data), [data]);

  const filtered = useMemo(() => {
    const rangePreset: RangePreset =
      preset === 'this_week'
        ? 'week'
        : preset === 'this_month'
          ? 'month'
          : preset === 'today'
            ? 'today'
            : preset === 'custom'
              ? 'custom'
              : 'all';
    const range = buildDateRange(rangePreset, from, to);

    return allExpenses.filter((expense: UnifiedExpense) => {
      if (!isInDateRange(expense.date, range)) return false;

      if (categoryFilter !== 'all') {
        const [type, category] = categoryFilter.split('::');
        if (expense.type !== type) return false;
        if (category && expense.category !== category) return false;
      }

      if (search.trim()) {
        const term = search.trim().toLowerCase();
        const haystack = [
          expense.description,
          expense.category,
          expense.person,
          expense.notes,
          expense.date,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }

      return true;
    });
  }, [allExpenses, preset, from, to, categoryFilter, search]);

  const totals = useMemo(() => sumUnified(filtered), [filtered]);

  const handleExportCSV = () => {
    const headers = [
      'Date',
      'Type',
      'Description',
      'Category',
      'Person / Supplier',
      'Total Amount',
      'Amount Paid',
      'Balance',
      'Status',
      'Notes',
    ];
    const rows = filtered.map((e: UnifiedExpense) => {
      const state =
        e.type === 'other'
          ? 'Paid'
          : getPaymentState(e.totalAmount, e.amountPaid);
      return [
        e.date,
        e.type,
        e.description,
        e.category,
        e.person || '',
        e.totalAmount,
        e.amountPaid,
        e.balance,
        state,
        e.notes || '',
      ];
    });
    downloadCSV(`expense-history-${fileStamp()}`, headers, rows);
  };

  const handleDelete = () => {
    if (!deleting) return;
    const saved =
      deleting.type === 'labour'
        ? deleteLabour(deleting.id)
        : deleting.type === 'material'
          ? deleteMaterial(deleting.id)
          : deleteOther(deleting.id);
    if (saved) setDeleting(null);
  };

  return (
    <>
      <PageHeader
        title="Expense History"
        description="View, filter, edit, and manage every expense in one place."
      />

      {/* Filter Card */}
      <div className={cn(cardClass, 'mb-5 p-3.5 sm:p-5')}>
        <div className="flex flex-col gap-3.5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Date Filter
            </p>
            {/* Scrollable / wrap pills on mobile */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {presets.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setPreset(item.value)}
                  className={cn(
                    'rounded-lg border px-2.5 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm font-medium transition',
                    preset === item.value
                      ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100',
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:flex xl:items-end">
            {preset === 'custom' && (
              <>
                <div>
                  <label htmlFor="history-from" className="mb-1 block text-xs font-medium text-slate-500">
                    From
                  </label>
                  <input
                    id="history-from"
                    type="date"
                    value={from}
                    onChange={(event) => setFrom(event.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="history-to" className="mb-1 block text-xs font-medium text-slate-500">
                    To
                  </label>
                  <input
                    id="history-to"
                    type="date"
                    value={to}
                    onChange={(event) => setTo(event.target.value)}
                    className={inputClass}
                  />
                </div>
              </>
            )}

            <div className="w-full sm:min-w-48">
              <label htmlFor="history-category" className="mb-1 block text-xs font-medium text-slate-500">
                Category
              </label>
              <select
                id="history-category"
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className={inputClass}
              >
                <option value="all">All categories</option>
                <optgroup label="Labour">
                  {labourTypes.map((item) => (
                    <option key={`labour-${item}`} value={`labour::${item}`}>
                      {item}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Materials">
                  {materialTypes.map((item) => (
                    <option key={`material-${item}`} value={`material::${item}`}>
                      {item}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Other">
                  {expenseCategories.map((item) => (
                    <option key={`other-${item}`} value={`other::${item}`}>
                      {item}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="relative w-full sm:min-w-48">
              <label htmlFor="history-search" className="mb-1 block text-xs font-medium text-slate-500">
                Search
              </label>
              <Search className="pointer-events-none absolute bottom-2.5 left-3 h-4 w-4 text-slate-400" />
              <input
                id="history-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Description, supplier..."
                className={cn(inputClass, 'pl-9 text-xs sm:text-sm')}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary KPI grid (2 cols on mobile, 4 on desktop) */}
      <div className={cn(cardClass, 'mb-5 grid grid-cols-2 divide-y sm:divide-y-0 sm:grid-cols-4 sm:divide-x divide-slate-100')}>
        <div className="p-3 sm:p-4">
          <p className="text-xs text-slate-500 font-medium">Entries</p>
          <p className="mt-1 text-base sm:text-lg font-bold text-slate-900">{filtered.length}</p>
        </div>
        <div className="p-3 sm:p-4">
          <p className="text-xs text-slate-500 font-medium">Total Amount</p>
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
        <div className="flex flex-col gap-2 border-b border-slate-100 p-3 sm:p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Expenses</h2>
            <p className="text-xs text-slate-500">
              Showing {filtered.length} of {allExpenses.length} total entries
            </p>
          </div>
          <button
            type="button"
            className={cn(btnSecondary, 'w-full sm:w-auto justify-center')}
            onClick={handleExportCSV}
            disabled={filtered.length === 0}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>

        {allExpenses.length === 0 ? (
          <EmptyState
            icon={HistoryIcon}
            title="No expenses recorded yet"
            description="Labour, material, and other expenses will appear here once you add them."
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No matching expenses"
            description="Try a different date range, category, or search term."
          />
        ) : (
          <>
            {/* MOBILE CARD VIEW (Screens < sm) */}
            <div className="divide-y divide-slate-100 sm:hidden">
              {filtered.map((expense) => {
                const meta = typeMeta[expense.type];
                const Icon = meta.icon;
                const state =
                  expense.type === 'other'
                    ? 'paid'
                    : getPaymentState(expense.totalAmount, expense.amountPaid);

                return (
                  <div key={`${expense.type}-${expense.id}`} className="p-3.5 space-y-2.5">
                    {/* Top Row: Type pill, Date, Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex items-center gap-2">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold',
                            meta.className,
                          )}
                        >
                          <Icon className="h-3 w-3" />
                          {meta.label}
                        </span>
                        <span className="text-xs text-slate-500">{formatDisplayDate(expense.date)}</span>
                      </div>
                      <StatusBadge state={state} />
                    </div>

                    {/* Description and category */}
                    <div>
                      <p className="text-sm font-bold text-slate-900">{expense.description}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {expense.category}
                        {expense.person ? ` · ${expense.person}` : ''}
                      </p>
                    </div>

                    {/* Financial summary */}
                    <div className="grid grid-cols-3 gap-2 rounded-lg border border-slate-100 bg-white p-2 text-center text-xs">
                      <div>
                        <span className="block text-[11px] text-slate-500">Total</span>
                        <span className="font-bold text-slate-900">{formatINR(expense.totalAmount)}</span>
                      </div>
                      <div>
                        <span className="block text-[11px] text-slate-500">Paid</span>
                        <span className="font-semibold text-emerald-600">{formatINR(expense.amountPaid)}</span>
                      </div>
                      <div>
                        <span className="block text-[11px] text-slate-500">Balance</span>
                        <span className={cn('font-bold', expense.balance > 0 ? 'text-rose-600' : 'text-emerald-600')}>
                          {formatINR(expense.balance)}
                        </span>
                      </div>
                    </div>

                    {expense.notes && (
                      <p className="text-xs text-slate-500 truncate italic">
                        "{expense.notes}"
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setViewing(expense)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 active:bg-slate-100"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(expense.record)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 active:bg-blue-100"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(expense)}
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
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-right">Paid</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((expense) => {
                    const meta = typeMeta[expense.type];
                    const Icon = meta.icon;
                    const state =
                      expense.type === 'other'
                        ? 'paid'
                        : getPaymentState(expense.totalAmount, expense.amountPaid);

                    return (
                      <tr
                        key={`${expense.type}-${expense.id}`}
                        className="transition hover:bg-slate-50/70"
                      >
                        <td className={tableCellClass}>{formatDisplayDate(expense.date)}</td>
                        <td className={tableCellClass}>
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                              meta.className,
                            )}
                          >
                            <Icon className="h-3 w-3" />
                            {meta.label}
                          </span>
                        </td>
                        <td className={tableCellClass}>
                          <p className="font-medium text-slate-900">{expense.description}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {expense.category}
                            {expense.person ? ` · ${expense.person}` : ''}
                          </p>
                        </td>
                        <td className={cn(tableCellClass, 'text-right font-semibold text-slate-900')}>
                          {formatINR(expense.totalAmount)}
                        </td>
                        <td className={cn(tableCellClass, 'text-right font-medium text-emerald-600')}>
                          {formatINR(expense.amountPaid)}
                        </td>
                        <td
                          className={cn(
                            tableCellClass,
                            'text-right font-medium',
                            expense.balance > 0 ? 'text-rose-600' : 'text-emerald-600',
                          )}
                        >
                          {formatINR(expense.balance)}
                        </td>
                        <td className={tableCellClass}>
                          <StatusBadge state={state} />
                        </td>
                        <td className={tableCellClass}>
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              className={iconButton}
                              onClick={() => setViewing(expense)}
                              title="View"
                              aria-label="View expense"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className={iconButton}
                              onClick={() => setEditing(expense.record)}
                              title="Edit"
                              aria-label="Edit expense"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className={cn(iconButton, 'hover:bg-rose-50 hover:text-rose-600')}
                              onClick={() => setDeleting(expense)}
                              title="Delete"
                              aria-label="Delete expense"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <DetailsModal expense={viewing} onClose={() => setViewing(null)} />

      {editing && editing.type === 'labour' && (
        <LabourForm initial={editing} onClose={() => setEditing(null)} />
      )}
      {editing && editing.type === 'material' && (
        <MaterialForm initial={editing} onClose={() => setEditing(null)} />
      )}
      {editing && editing.type === 'other' && (
        <OtherForm initial={editing} onClose={() => setEditing(null)} />
      )}

      <ConfirmDialog
        isOpen={Boolean(deleting)}
        title="Delete expense"
        message={`Are you sure you want to delete "${deleting?.description}" on ${
          deleting ? formatDisplayDate(deleting.date) : ''
        }? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
