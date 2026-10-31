import { useMemo, useState } from 'react';
import {
  Eye,
  FileText,
  HardHat,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import DetailsModal from '../components/DetailsModal';
import DailyNoteModal from '../components/DailyNoteModal';
import EmployeeManager from '../components/EmployeeManager';
import LabourForm from '../components/forms/LabourForm';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/appContext';
import type { LabourRecord, RangePreset } from '../types';
import {
  buildDateRange,
  getPaymentState,
  isInDateRange,
  labourToUnified,
  roundMoney,
  sortLabour,
} from '../lib/calculations';
import {
  cn,
  formatDisplayDate,
  formatINR,
  todayISO,
  uniqueStrings,
} from '../lib/format';
import {
  btnPrimary,
  btnSecondary,
  cardClass,
  iconButton,
  inputClass,
  tableCellClass,
  tableHeadClass,
} from '../lib/styles';

const dateOptions: Array<{ value: RangePreset; label: string }> = [
  { value: 'all', label: 'All dates' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'custom', label: 'Custom range' },
];

function sumRecords(records: LabourRecord[]) {
  return {
    count: records.length,
    total: roundMoney(records.reduce((sum, item) => sum + item.totalAmount, 0)),
    paid: roundMoney(records.reduce((sum, item) => sum + item.amountPaid, 0)),
    pending: roundMoney(
      records.reduce((sum, item) => sum + Math.max(item.balance, 0), 0),
    ),
  };
}

export default function Labour() {
  const { data, labourTypes, deleteLabour } = useApp();
  const [search, setSearch] = useState('');
  const [rangePreset, setRangePreset] = useState<RangePreset>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [dailyNoteOpen, setDailyNoteOpen] = useState(false);
  const [editing, setEditing] = useState<LabourRecord | null>(null);
  const [viewing, setViewing] = useState<LabourRecord | null>(null);
  const [deleting, setDeleting] = useState<LabourRecord | null>(null);

  const records = useMemo(() => sortLabour(data.labour), [data.labour]);
  const employeeNames = useMemo(
    () =>
      uniqueStrings([
        ...data.employees.map((employee) => employee.name),
        ...records.map((record) => record.employeeName),
      ]),
    [data.employees, records],
  );
  const categories = useMemo(
    () =>
      uniqueStrings([
        ...labourTypes,
        ...records.map((record) => record.labourType),
      ]),
    [labourTypes, records],
  );

  const baseFiltered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return records.filter((record) => {
      if (
        employeeFilter !== 'all' &&
        record.employeeName !== employeeFilter
      ) {
        return false;
      }
      if (
        categoryFilter !== 'all' &&
        record.labourType !== categoryFilter
      ) {
        return false;
      }
      if (
        statusFilter !== 'all' &&
        getPaymentState(record.totalAmount, record.amountPaid) !== statusFilter
      ) {
        return false;
      }
      if (!term) return true;

      return [
        record.employeeName,
        record.employeeId,
        record.labourType,
        record.workDescription,
        record.notes,
        record.date,
      ]
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [
    records,
    search,
    employeeFilter,
    categoryFilter,
    statusFilter,
  ]);

  const dateRange = useMemo(
    () => buildDateRange(rangePreset, from, to),
    [rangePreset, from, to],
  );
  const filtered = useMemo(
    () =>
      baseFiltered.filter((record) => isInDateRange(record.date, dateRange)),
    [baseFiltered, dateRange],
  );
  const totals = useMemo(() => sumRecords(filtered), [filtered]);

  const today = todayISO();
  const todayTotal = useMemo(
    () =>
      roundMoney(
        filtered
          .filter((record) => record.date === today)
          .reduce((sum, item) => sum + item.totalAmount, 0),
      ),
    [filtered, today],
  );
  const activeWorkers = useMemo(
    () =>
      new Set(
        filtered
          .map((record) => record.employeeName || record.employeeId)
          .filter(Boolean),
      ).size,
    [filtered],
  );

  const periodSummaries = useMemo(() => {
    const summarize = (preset: RangePreset) => {
      const range = buildDateRange(preset);
      return sumRecords(
        baseFiltered.filter((record) => isInDateRange(record.date, range)),
      );
    };
    return {
      daily: summarize('today'),
      weekly: summarize('week'),
      monthly: summarize('month'),
    };
  }, [baseFiltered]);

  const selectedEmployee =
    employeeFilter === 'all'
      ? null
      : data.employees.find(
          (employee) => employee.name === employeeFilter,
        ) ?? null;
  const employeeHistory = useMemo(
    () =>
      employeeFilter === 'all'
        ? []
        : records.filter(
            (record) => record.employeeName === employeeFilter,
          ),
    [employeeFilter, records],
  );
  const employeeHistorySummary = useMemo(
    () => sumRecords(employeeHistory),
    [employeeHistory],
  );
  const employeeWorkingDays = useMemo(
    () =>
      employeeHistory.reduce((sum, record) => sum + record.workingDays, 0),
    [employeeHistory],
  );

  const hasFilters =
    rangePreset !== 'all' ||
    from !== '' ||
    to !== '' ||
    employeeFilter !== 'all' ||
    categoryFilter !== 'all' ||
    statusFilter !== 'all' ||
    search.trim() !== '';

  const resetFilters = () => {
    setRangePreset('all');
    setFrom('');
    setTo('');
    setEmployeeFilter('all');
    setCategoryFilter('all');
    setStatusFilter('all');
    setSearch('');
  };

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (record: LabourRecord) => {
    setEditing(record);
    setFormOpen(true);
  };

  const handleViewEmployee = (employeeName: string) => {
    setRangePreset('all');
    setFrom('');
    setTo('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setSearch('');
    setEmployeeFilter(employeeName);
    window.setTimeout(() => {
      document
        .getElementById('labour-records')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  const handleDelete = () => {
    if (!deleting) return;
    if (deleteLabour(deleting.id)) setDeleting(null);
  };

  return (
    <>
      <PageHeader
        title="Labour Expenses"
        description="Manage employees, record daily attendance, and track wage payments."
        action={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button
              type="button"
              className={cn(btnSecondary, 'w-full justify-center sm:w-auto')}
              onClick={() => setDailyNoteOpen(true)}
            >
              <FileText className="h-4 w-4" />
              Daily note
            </button>
            <button
              type="button"
              className={cn(btnPrimary, 'w-full justify-center sm:w-auto')}
              onClick={openAdd}
            >
              <Plus className="h-4 w-4" />
              Add Labour
            </button>
          </div>
        }
      />

      <EmployeeManager onViewEntries={handleViewEmployee} />

      <div
        className={cn(
          cardClass,
          'mb-5 grid grid-cols-2 gap-px overflow-hidden bg-slate-100 sm:grid-cols-3 lg:grid-cols-5',
        )}
      >
        <div className="bg-white p-3 sm:p-4">
          <p className="text-xs font-medium text-slate-500">
            Today&apos;s labour expense
          </p>
          <p className="mt-1 text-base font-bold text-amber-600 sm:text-lg">
            {formatINR(todayTotal)}
          </p>
        </div>
        <div className="bg-white p-3 sm:p-4">
          <p className="text-xs font-medium text-slate-500">
            Total labour expense
          </p>
          <p className="mt-1 text-base font-bold text-slate-900 sm:text-lg">
            {formatINR(totals.total)}
          </p>
        </div>
        <div className="bg-white p-3 sm:p-4">
          <p className="text-xs font-medium text-slate-500">Total paid</p>
          <p className="mt-1 text-base font-bold text-emerald-600 sm:text-lg">
            {formatINR(totals.paid)}
          </p>
        </div>
        <div className="bg-white p-3 sm:p-4">
          <p className="text-xs font-medium text-slate-500">
            Pending labour payments
          </p>
          <p className="mt-1 text-base font-bold text-rose-600 sm:text-lg">
            {formatINR(totals.pending)}
          </p>
        </div>
        <div className="bg-white p-3 sm:p-4">
          <p className="text-xs font-medium text-slate-500">
            Number of active workers
          </p>
          <p className="mt-1 text-base font-bold text-blue-600 sm:text-lg">
            {activeWorkers}
          </p>
        </div>
      </div>

      <div className={cn(cardClass, 'mb-5 p-3.5 sm:p-4')}>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Daily, weekly, and monthly summaries
            </h2>
            <p className="text-xs text-slate-500">
              Based on the current employee, category, status, and search filters.
            </p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            { label: 'Today', summary: periodSummaries.daily },
            { label: 'This week', summary: periodSummaries.weekly },
            { label: 'This month', summary: periodSummaries.monthly },
          ].map(({ label, summary }) => (
            <div key={label} className="rounded-lg bg-slate-50 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-slate-500">{label}</p>
                <span className="text-[11px] text-slate-400">
                  {summary.count} entr{summary.count === 1 ? 'y' : 'ies'}
                </span>
              </div>
              <p className="mt-1 text-sm font-bold text-slate-900">
                {formatINR(summary.total)}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {formatINR(summary.paid)} paid · {formatINR(summary.pending)}{' '}
                pending
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className={cn(cardClass, 'mb-5 p-3.5 sm:p-4')}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Filter labour history
            </h2>
            <p className="text-xs text-slate-500">
              {filtered.length} of {records.length} records shown
            </p>
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Reset filters
            </button>
          )}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <div>
            <label
              htmlFor="labour-date-filter"
              className="mb-1 block text-xs font-medium text-slate-500"
            >
              Date range
            </label>
            <select
              id="labour-date-filter"
              value={rangePreset}
              onChange={(event) =>
                setRangePreset(event.target.value as RangePreset)
              }
              className={inputClass}
            >
              {dateOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {rangePreset === 'custom' && (
            <>
              <div>
                <label
                  htmlFor="labour-from-filter"
                  className="mb-1 block text-xs font-medium text-slate-500"
                >
                  From
                </label>
                <input
                  id="labour-from-filter"
                  type="date"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label
                  htmlFor="labour-to-filter"
                  className="mb-1 block text-xs font-medium text-slate-500"
                >
                  To
                </label>
                <input
                  id="labour-to-filter"
                  type="date"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                  className={inputClass}
                />
              </div>
            </>
          )}

          <div>
            <label
              htmlFor="labour-employee-filter"
              className="mb-1 block text-xs font-medium text-slate-500"
            >
              Employee name
            </label>
            <select
              id="labour-employee-filter"
              value={employeeFilter}
              onChange={(event) => setEmployeeFilter(event.target.value)}
              className={inputClass}
            >
              <option value="all">All employees</option>
              {employeeNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="labour-category-filter"
              className="mb-1 block text-xs font-medium text-slate-500"
            >
              Labour category
            </label>
            <select
              id="labour-category-filter"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className={inputClass}
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="labour-status-filter"
              className="mb-1 block text-xs font-medium text-slate-500"
            >
              Payment status
            </label>
            <select
              id="labour-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={inputClass}
            >
              <option value="all">All statuses</option>
              <option value="paid">Paid</option>
              <option value="partial">Partially paid</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div className="relative sm:col-span-2 xl:col-span-1">
            <label
              htmlFor="labour-search"
              className="mb-1 block text-xs font-medium text-slate-500"
            >
              Search
            </label>
            <Search className="pointer-events-none absolute bottom-2.5 left-3 h-4 w-4 text-slate-400" />
            <input
              id="labour-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Employee, work, notes..."
              className={cn(inputClass, 'pl-9 text-xs sm:text-sm')}
            />
          </div>
        </div>
      </div>

      {employeeFilter !== 'all' && (
        <div className="mb-5 flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div>
            <p className="text-sm font-semibold text-blue-900">
              Employee history: {employeeFilter}
            </p>
            <p className="mt-0.5 text-xs text-blue-700">
              {employeeHistorySummary.count} entr
              {employeeHistorySummary.count === 1 ? 'y' : 'ies'} ·{' '}
              {employeeWorkingDays} day{employeeWorkingDays === 1 ? '' : 's'}{' '}
              worked · {formatINR(employeeHistorySummary.total)} total ·{' '}
              {formatINR(employeeHistorySummary.pending)} pending
              {selectedEmployee?.mobile ? ` · ${selectedEmployee.mobile}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEmployeeFilter('all')}
            className={cn(btnSecondary, 'w-full justify-center sm:w-auto')}
          >
            Clear employee
          </button>
        </div>
      )}

      <div className={cardClass} id="labour-records">
        <div className="flex flex-col gap-2 border-b border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Daily labour expense history
            </h2>
            <p className="text-xs text-slate-500">
              {filtered.length} of {records.length} records
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">
            <Users className="h-3.5 w-3.5" />
            {activeWorkers} active worker{activeWorkers === 1 ? '' : 's'}
          </div>
        </div>

        {records.length === 0 ? (
          <EmptyState
            icon={HardHat}
            title="No labour expenses yet"
            description="Add an employee, then record their first day of work and payment."
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
            title="No matching labour records"
            description="Try a different date range, employee, category, status, or search term."
            action={
              hasFilters ? (
                <button
                  type="button"
                  className={btnSecondary}
                  onClick={resetFilters}
                >
                  Reset filters
                </button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="divide-y divide-slate-100 sm:hidden">
              {filtered.map((record) => {
                const state = getPaymentState(
                  record.totalAmount,
                  record.amountPaid,
                );
                return (
                  <div key={record.id} className="space-y-2.5 p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">
                          {record.employeeName || 'General labour'}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {formatDisplayDate(record.date)} · {record.labourType}
                        </p>
                      </div>
                      <StatusBadge state={state} />
                    </div>

                    {record.workDescription && (
                      <p className="text-xs text-slate-600">
                        {record.workDescription}
                      </p>
                    )}

                    <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">
                      <Users className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span>
                        {record.workers} worker
                        {record.workers === 1 ? '' : 's'} ×{' '}
                        {formatINR(record.dailyWage)}/day ×{' '}
                        {record.workingDays}d
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 rounded-lg border border-slate-100 bg-white p-2 text-center text-xs">
                      <div>
                        <span className="block text-[11px] text-slate-500">
                          Total
                        </span>
                        <span className="font-bold text-slate-900">
                          {formatINR(record.totalAmount)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[11px] text-slate-500">
                          Paid
                        </span>
                        <span className="font-semibold text-emerald-600">
                          {formatINR(record.amountPaid)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[11px] text-slate-500">
                          Pending
                        </span>
                        <span
                          className={cn(
                            'font-bold',
                            record.balance > 0
                              ? 'text-rose-600'
                              : 'text-emerald-600',
                          )}
                        >
                          {formatINR(record.balance)}
                        </span>
                      </div>
                    </div>

                    {record.notes && (
                      <p className="truncate text-xs italic text-slate-500">
                        &quot;{record.notes}&quot;
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-end gap-1.5 pt-1">
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

            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[1180px] border-collapse">
                <thead className={tableHeadClass}>
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Work description</th>
                    <th className="px-4 py-3 text-right">Workers</th>
                    <th className="px-4 py-3 text-right">Days</th>
                    <th className="px-4 py-3 text-right">Wage</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">Paid</th>
                    <th className="px-4 py-3 text-right">Pending</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Notes</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((record) => (
                    <tr
                      key={record.id}
                      className="transition hover:bg-slate-50/70"
                    >
                      <td className={tableCellClass}>
                        {formatDisplayDate(record.date)}
                      </td>
                      <td
                        className={cn(
                          tableCellClass,
                          'font-medium text-slate-900',
                        )}
                      >
                        {record.employeeName || 'General labour'}
                      </td>
                      <td className={tableCellClass}>{record.labourType}</td>
                      <td className={tableCellClass}>
                        <p
                          className="max-w-[190px] truncate"
                          title={record.workDescription}
                        >
                          {record.workDescription || '—'}
                        </p>
                      </td>
                      <td className={cn(tableCellClass, 'text-right')}>
                        {record.workers}
                      </td>
                      <td className={cn(tableCellClass, 'text-right')}>
                        {record.workingDays}
                      </td>
                      <td className={cn(tableCellClass, 'text-right')}>
                        {formatINR(record.dailyWage)}
                      </td>
                      <td
                        className={cn(
                          tableCellClass,
                          'text-right font-semibold text-slate-900',
                        )}
                      >
                        {formatINR(record.totalAmount)}
                      </td>
                      <td
                        className={cn(
                          tableCellClass,
                          'text-right font-medium text-emerald-600',
                        )}
                      >
                        {formatINR(record.amountPaid)}
                      </td>
                      <td
                        className={cn(
                          tableCellClass,
                          'text-right font-medium',
                          record.balance > 0
                            ? 'text-rose-600'
                            : 'text-emerald-600',
                        )}
                      >
                        {formatINR(record.balance)}
                      </td>
                      <td className={tableCellClass}>
                        <StatusBadge
                          state={getPaymentState(
                            record.totalAmount,
                            record.amountPaid,
                          )}
                        />
                      </td>
                      <td className={tableCellClass}>
                        <p
                          className="max-w-[160px] truncate"
                          title={record.notes}
                        >
                          {record.notes || '—'}
                        </p>
                      </td>
                      <td className={tableCellClass}>
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            className={iconButton}
                            onClick={() => setViewing(record)}
                            aria-label={`View details for ${
                              record.employeeName || 'labour record'
                            }`}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className={iconButton}
                            onClick={() => openEdit(record)}
                            aria-label={`Edit ${
                              record.employeeName || 'labour record'
                            }`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className={cn(
                              iconButton,
                              'hover:text-rose-600',
                            )}
                            onClick={() => setDeleting(record)}
                            aria-label={`Delete ${
                              record.employeeName || 'labour record'
                            }`}
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
        <LabourForm
          initial={editing}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      )}

      {dailyNoteOpen && (
        <DailyNoteModal onClose={() => setDailyNoteOpen(false)} />
      )}

      <DetailsModal
        expense={viewing ? labourToUnified(viewing) : null}
        onClose={() => setViewing(null)}
      />

      <ConfirmDialog
        isOpen={Boolean(deleting)}
        title="Delete labour record"
        message={`Are you sure you want to delete the labour expense for "${
          deleting?.employeeName || deleting?.labourType || ''
        }" on ${
          deleting ? formatDisplayDate(deleting.date) : ''
        }? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
