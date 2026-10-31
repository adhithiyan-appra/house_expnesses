import { useMemo, useState } from 'react';
import {
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
import { useApp } from '../context/AppContext';
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
import { cn, formatDisplayDate, formatINR, todayISO } from '../lib/format';
import {
  cardClass,
  iconButton,
  inputClass,
  tableCellClass,
  tableHeadClass,
} from '../lib/styles';

type EditingRecord = LabourRecord | MaterialRecord | OtherRecord;

const presets: Array<{ value: RangePreset; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'all', label: 'All Time' },
  { value: 'custom', label: 'Custom' },
];

const typeMeta = {
  labour: {
    label: 'Labour',
    icon: HardHat,
    className: 'bg-blue-50 text-blue-700',
  },
  material: {
    label: 'Material',
    icon: Package,
    className: 'bg-amber-50 text-amber-700',
  },
  other: {
    label: 'Other',
    icon: Receipt,
    className: 'bg-violet-50 text-violet-700',
  },
};

export default function History() {
  const {
    data,
    labourTypes,
    materialTypes,
    expenseCategories,
    deleteLabour,
    deleteMaterial,
    deleteOther,
  } = useApp();
  const [preset, setPreset] = useState<RangePreset>('all');
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<EditingRecord | null>(null);
  const [viewing, setViewing] = useState<UnifiedExpense | null>(null);
  const [deleting, setDeleting] = useState<UnifiedExpense | null>(null);

  const allExpenses = useMemo(() => getUnifiedExpenses(data), [data]);

  const filtered = useMemo(() => {
    const range = buildDateRange(preset, from, to);
    const term = search.trim().toLowerCase();

    return allExpenses.filter((expense) => {
      if (!isInDateRange(expense.date, range)) return false;

      if (categoryFilter !== 'all') {
        const [type, category] = categoryFilter.split('::');
        if (expense.type !== type || expense.category !== category) return false;
      }

      if (term) {
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

  const handleDelete = () => {
    if (!deleting) return;
    if (deleting.type === 'labour') deleteLabour(deleting.id);
    if (deleting.type === 'material') deleteMaterial(deleting.id);
    if (deleting.type === 'other') deleteOther(deleting.id);
    setDeleting(null);
  };

  return (
    <>
      <PageHeader
        title="Expense History"
        description="View, filter, edit, and manage every expense in one place."
      />

      <div className={cn(cardClass, 'mb-5 p-4')}>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="mb-2 text-xs font-medium text-slate-500">Date range</p>
            <div className="flex flex-wrap gap-2">
              {presets.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setPreset(item.value)}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-sm font-medium transition',
                    preset === item.value
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
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

            <div className="min-w-52">
              <label htmlFor="history-category" className="mb-1 block text-xs font-medium text-slate-500">
                Expense category
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

            <div className="relative min-w-52">
              <label htmlFor="history-search" className="mb-1 block text-xs font-medium text-slate-500">
                Search
              </label>
              <Search className="pointer-events-none absolute bottom-2.5 left-3 h-4 w-4 text-slate-400" />
              <input
                id="history-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Description, supplier, notes"
                className={cn(inputClass, 'pl-9')}
              />
            </div>
          </div>
        </div>
      </div>

      <div className={cn(cardClass, 'mb-5 grid grid-cols-2 divide-slate-100 sm:grid-cols-4 sm:divide-x')}>
        <div className="p-4">
          <p className="text-xs text-slate-500">Records</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{filtered.length}</p>
        </div>
        <div className="p-4">
          <p className="text-xs text-slate-500">Total</p>
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
          <div className="overflow-x-auto">
            <table className="min-w-[940px] w-full border-collapse">
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
        )}
      </div>

      {editing?.type === 'labour' && (
        <LabourForm initial={editing} onClose={() => setEditing(null)} />
      )}
      {editing?.type === 'material' && (
        <MaterialForm initial={editing} onClose={() => setEditing(null)} />
      )}
      {editing?.type === 'other' && (
        <OtherForm initial={editing} onClose={() => setEditing(null)} />
      )}

      <DetailsModal expense={viewing} onClose={() => setViewing(null)} />

      <ConfirmDialog
        isOpen={Boolean(deleting)}
        title="Delete expense?"
        message="This record will be permanently removed. This action cannot be undone."
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
