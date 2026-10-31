import { useMemo, useState, type ReactNode } from 'react';
import {
  CalendarDays,
  CalendarRange,
  CircleAlert,
  Download,
  FileText,
  HardHat,
  Package,
  Receipt,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { useApp } from '../context/appContext';
import type {
  DateRange,
  LabourRecord,
  MaterialRecord,
  OtherRecord,
  RangePreset,
} from '../types';
import {
  buildDateRange,
  formatMonthKey,
  getUnifiedExpenses,
  isInDateRange,
  roundMoney,
  sortLabour,
  sortMaterials,
  sortOthers,
  sumUnified,
} from '../lib/calculations';
import {
  cn,
  formatDisplayDate,
  formatINR,
  todayISO,
} from '../lib/format';
import { downloadCSV, fileStamp, type CsvCell } from '../lib/csv';
import {
  btnPrimary,
  btnSecondary,
  cardClass,
  inputClass,
  tableCellClass,
  tableHeadClass,
} from '../lib/styles';

type ReportType = 'daily' | 'monthly' | 'labour' | 'material' | 'other' | 'pending';

interface ReportRow {
  id: string;
  date: string;
  labour?: number;
  material?: number;
  other?: number;
  total: number;
  paid: number;
  pending: number;
  type?: string;
  description?: string;
  category?: string;
  person?: string;
  workers?: number;
  wage?: number;
  days?: number;
  quantity?: number;
  unit?: string;
  pricePerUnit?: number;
  transport?: number;
  supplier?: string;
  name?: string;
  method?: string;
}

interface ReportColumn {
  header: string;
  align?: 'right';
  render: (row: ReportRow) => ReactNode;
  csv: (row: ReportRow) => CsvCell;
}

const reportTypes: Array<{
  value: ReportType;
  label: string;
  icon: typeof CalendarDays;
  title: string;
  description: string;
}> = [
  {
    value: 'daily',
    label: 'Daily Expenses',
    icon: CalendarDays,
    title: 'Daily Expenses',
    description: 'Day-by-day totals across labour, materials, and other expenses.',
  },
  {
    value: 'monthly',
    label: 'Monthly Expenses',
    icon: CalendarRange,
    title: 'Monthly Expenses',
    description: 'Month-by-month totals across all expense categories.',
  },
  {
    value: 'labour',
    label: 'Labour Expenses',
    icon: HardHat,
    title: 'Labour Expenses',
    description: 'Every labour payment with wages, totals, and balances.',
  },
  {
    value: 'material',
    label: 'Material Expenses',
    icon: Package,
    title: 'Material Expenses',
    description: 'Every material purchase with quantities, costs, and balances.',
  },
  {
    value: 'other',
    label: 'Other Expenses',
    icon: Receipt,
    title: 'Other Expenses',
    description: 'Daily site expenses such as food, tea, water, and rent.',
  },
  {
    value: 'pending',
    label: 'Pending Payments',
    icon: CircleAlert,
    title: 'Total Pending Payments',
    description: 'Labour and material balances that are still unpaid.',
  },
];

const moneyCell = (value: number, tone?: 'paid' | 'pending') => (
  <span
    className={cn(
      tone === 'paid' && 'font-medium text-emerald-600',
      tone === 'pending' && value > 0 && 'font-medium text-rose-600',
      tone === 'pending' && value <= 0 && 'font-medium text-emerald-600',
    )}
  >
    {formatINR(value)}
  </span>
);

const dailyColumns: ReportColumn[] = [
  {
    header: 'Date',
    render: (row) => formatDisplayDate(row.date),
    csv: (row) => row.date,
  },
  {
    header: 'Labour',
    align: 'right',
    render: (row) => moneyCell(row.labour ?? 0),
    csv: (row) => row.labour ?? 0,
  },
  {
    header: 'Materials',
    align: 'right',
    render: (row) => moneyCell(row.material ?? 0),
    csv: (row) => row.material ?? 0,
  },
  {
    header: 'Other',
    align: 'right',
    render: (row) => moneyCell(row.other ?? 0),
    csv: (row) => row.other ?? 0,
  },
  {
    header: 'Total',
    align: 'right',
    render: (row) => <span className="font-semibold text-slate-900">{formatINR(row.total)}</span>,
    csv: (row) => row.total,
  },
  {
    header: 'Paid',
    align: 'right',
    render: (row) => moneyCell(row.paid, 'paid'),
    csv: (row) => row.paid,
  },
  {
    header: 'Pending',
    align: 'right',
    render: (row) => moneyCell(row.pending, 'pending'),
    csv: (row) => row.pending,
  },
];

const monthlyColumns: ReportColumn[] = [
  {
    header: 'Month',
    render: (row) => formatMonthKey(row.date),
    csv: (row) => row.date,
  },
  ...dailyColumns.slice(1),
];

const labourColumns: ReportColumn[] = [
  {
    header: 'Date',
    render: (row) => formatDisplayDate(row.date),
    csv: (row) => row.date,
  },
  {
    header: 'Labour Type',
    render: (row) => row.description,
    csv: (row) => row.description ?? '',
  },
  {
    header: 'Workers',
    align: 'right',
    render: (row) => row.workers,
    csv: (row) => row.workers ?? 0,
  },
  {
    header: 'Wage',
    align: 'right',
    render: (row) => formatINR(row.wage ?? 0),
    csv: (row) => row.wage ?? 0,
  },
  {
    header: 'Days',
    align: 'right',
    render: (row) => row.days,
    csv: (row) => row.days ?? 0,
  },
  {
    header: 'Total',
    align: 'right',
    render: (row) => <span className="font-semibold text-slate-900">{formatINR(row.total)}</span>,
    csv: (row) => row.total,
  },
  {
    header: 'Paid',
    align: 'right',
    render: (row) => moneyCell(row.paid, 'paid'),
    csv: (row) => row.paid,
  },
  {
    header: 'Balance',
    align: 'right',
    render: (row) => moneyCell(row.pending, 'pending'),
    csv: (row) => row.pending,
  },
];

const materialColumns: ReportColumn[] = [
  {
    header: 'Date',
    render: (row) => formatDisplayDate(row.date),
    csv: (row) => row.date,
  },
  {
    header: 'Material',
    render: (row) => row.description,
    csv: (row) => row.description ?? '',
  },
  {
    header: 'Quantity',
    align: 'right',
    render: (row) => `${row.quantity} ${row.unit}`,
    csv: (row) => `${row.quantity} ${row.unit}`,
  },
  {
    header: 'Price / Unit',
    align: 'right',
    render: (row) => formatINR(row.pricePerUnit ?? 0),
    csv: (row) => row.pricePerUnit ?? 0,
  },
  {
    header: 'Transport',
    align: 'right',
    render: (row) => formatINR(row.transport ?? 0),
    csv: (row) => row.transport ?? 0,
  },
  {
    header: 'Total',
    align: 'right',
    render: (row) => <span className="font-semibold text-slate-900">{formatINR(row.total)}</span>,
    csv: (row) => row.total,
  },
  {
    header: 'Paid',
    align: 'right',
    render: (row) => moneyCell(row.paid, 'paid'),
    csv: (row) => row.paid,
  },
  {
    header: 'Balance',
    align: 'right',
    render: (row) => moneyCell(row.pending, 'pending'),
    csv: (row) => row.pending,
  },
  {
    header: 'Supplier',
    render: (row) => row.supplier || '—',
    csv: (row) => row.supplier ?? '',
  },
];

const otherColumns: ReportColumn[] = [
  {
    header: 'Date',
    render: (row) => formatDisplayDate(row.date),
    csv: (row) => row.date,
  },
  {
    header: 'Expense',
    render: (row) => row.name,
    csv: (row) => row.name ?? '',
  },
  {
    header: 'Category',
    render: (row) => row.category,
    csv: (row) => row.category ?? '',
  },
  {
    header: 'Paid To',
    render: (row) => row.person || '—',
    csv: (row) => row.person ?? '',
  },
  {
    header: 'Method',
    render: (row) => row.method,
    csv: (row) => row.method ?? '',
  },
  {
    header: 'Amount',
    align: 'right',
    render: (row) => <span className="font-semibold text-slate-900">{formatINR(row.total)}</span>,
    csv: (row) => row.total,
  },
];

const pendingColumns: ReportColumn[] = [
  {
    header: 'Date',
    render: (row) => formatDisplayDate(row.date),
    csv: (row) => row.date,
  },
  {
    header: 'Type',
    render: (row) => (
      <span
        className={cn(
          'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
          row.type === 'labour'
            ? 'bg-blue-50 text-blue-700'
            : 'bg-amber-50 text-amber-700',
        )}
      >
        {row.type === 'labour' ? 'Labour' : 'Material'}
      </span>
    ),
    csv: (row) => (row.type === 'labour' ? 'Labour' : 'Material'),
  },
  {
    header: 'Description',
    render: (row) => row.description,
    csv: (row) => row.description ?? '',
  },
  {
    header: 'Payable To',
    render: (row) => row.person || '—',
    csv: (row) => row.person ?? '',
  },
  {
    header: 'Total',
    align: 'right',
    render: (row) => <span className="font-semibold text-slate-900">{formatINR(row.total)}</span>,
    csv: (row) => row.total,
  },
  {
    header: 'Paid',
    align: 'right',
    render: (row) => moneyCell(row.paid, 'paid'),
    csv: (row) => row.paid,
  },
  {
    header: 'Balance',
    align: 'right',
    render: (row) => moneyCell(row.pending, 'pending'),
    csv: (row) => row.pending,
  },
];

function labourRow(record: LabourRecord): ReportRow {
  return {
    id: record.id,
    date: record.date,
    description: record.labourType,
    workers: record.workers,
    wage: record.dailyWage,
    days: record.workingDays,
    total: record.totalAmount,
    paid: record.amountPaid,
    pending: Math.max(record.balance, 0),
  };
}

function materialRow(record: MaterialRecord): ReportRow {
  return {
    id: record.id,
    date: record.date,
    description: record.materialName,
    quantity: record.quantity,
    unit: record.unit,
    pricePerUnit: record.pricePerUnit,
    transport: record.transportation,
    total: record.totalAmount,
    paid: record.amountPaid,
    pending: Math.max(record.balance, 0),
    supplier: record.supplier,
  };
}

function otherRow(record: OtherRecord): ReportRow {
  return {
    id: record.id,
    date: record.date,
    name: record.name,
    category: record.category,
    person: record.paidTo,
    method: record.paymentMethod,
    total: record.amount,
    paid: record.amount,
    pending: 0,
  };
}

function buildDailyRows(
  expenses: ReturnType<typeof getUnifiedExpenses>,
  mode: 'daily' | 'monthly',
): ReportRow[] {
  const map = new Map<string, ReportRow>();

  expenses.forEach((expense) => {
    const key = mode === 'daily' ? expense.date : expense.date.slice(0, 7);
    const current =
      map.get(key) ??
      {
        id: key,
        date: key,
        labour: 0,
        material: 0,
        other: 0,
        total: 0,
        paid: 0,
        pending: 0,
      };

    if (expense.type === 'labour') current.labour = roundMoney((current.labour ?? 0) + expense.totalAmount);
    if (expense.type === 'material') current.material = roundMoney((current.material ?? 0) + expense.totalAmount);
    if (expense.type === 'other') current.other = roundMoney((current.other ?? 0) + expense.totalAmount);

    current.total = roundMoney(current.total + expense.totalAmount);
    current.paid = roundMoney(current.paid + expense.amountPaid);
    current.pending = roundMoney(current.pending + Math.max(expense.balance, 0));
    map.set(key, current);
  });

  return [...map.values()].sort((a, b) => b.date.localeCompare(a.date));
}

export default function Reports() {
  const { data } = useApp();
  const [reportType, setReportType] = useState<ReportType>('daily');
  const [preset, setPreset] = useState<RangePreset>('all');
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());

  const range: DateRange = useMemo(
    () => buildDateRange(preset, from, to),
    [preset, from, to],
  );

  const report = useMemo(() => {
    const allExpenses = getUnifiedExpenses(data);
    const filteredExpenses = allExpenses.filter((expense) =>
      isInDateRange(expense.date, range),
    );
    const filteredLabour = sortLabour(
      data.labour.filter((record) => isInDateRange(record.date, range)),
    );
    const filteredMaterials = sortMaterials(
      data.materials.filter((record) => isInDateRange(record.date, range)),
    );
    const filteredOthers = sortOthers(
      data.others.filter((record) => isInDateRange(record.date, range)),
    );

    let rows: ReportRow[] = [];
    let columns: ReportColumn[] = dailyColumns;
    let summaryExpenses = filteredExpenses;

    if (reportType === 'daily') {
      rows = buildDailyRows(filteredExpenses, 'daily');
      columns = dailyColumns;
    } else if (reportType === 'monthly') {
      rows = buildDailyRows(filteredExpenses, 'monthly');
      columns = monthlyColumns;
    } else if (reportType === 'labour') {
      rows = filteredLabour.map(labourRow);
      summaryExpenses = filteredExpenses.filter((expense) => expense.type === 'labour');
      columns = labourColumns;
    } else if (reportType === 'material') {
      rows = filteredMaterials.map(materialRow);
      summaryExpenses = filteredExpenses.filter((expense) => expense.type === 'material');
      columns = materialColumns;
    } else if (reportType === 'other') {
      rows = filteredOthers.map(otherRow);
      summaryExpenses = filteredExpenses.filter((expense) => expense.type === 'other');
      columns = otherColumns;
    } else {
      rows = filteredExpenses
        .filter(
          (expense) =>
            expense.type !== 'other' && Math.max(expense.balance, 0) > 0,
        )
        .map((expense) => ({
          id: `${expense.type}-${expense.id}`,
          date: expense.date,
          type: expense.type,
          description: expense.description,
          person: expense.person,
          total: expense.totalAmount,
          paid: expense.amountPaid,
          pending: Math.max(expense.balance, 0),
        }));
      summaryExpenses = filteredExpenses.filter(
        (expense) => expense.type !== 'other' && Math.max(expense.balance, 0) > 0,
      );
      columns = pendingColumns;
    }

    const meta = reportTypes.find((item) => item.value === reportType)!;
    return {
      meta,
      rows,
      columns,
      summary: {
        count: summaryExpenses.length,
        ...sumUnified(summaryExpenses),
      },
    };
  }, [data, reportType, range]);

  const handleDownload = () => {
    if (report.rows.length === 0) return;

    const headers = report.columns.map((column) => column.header);
    const rows = report.rows.map((row) =>
      report.columns.map((column) => column.csv(row)),
    );
    downloadCSV(`${report.meta.value}-expenses-${fileStamp()}`, headers, rows);
  };

  const reportPresets: Array<{ value: RangePreset; label: string }> = [
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' },
    { value: 'all', label: 'All Time' },
    { value: 'custom', label: 'Custom' },
  ];

  return (
    <>
      <PageHeader
        title="Reports"
        description="Generate expense reports and download them as CSV."
        action={
          <button
            type="button"
            className={btnPrimary}
            onClick={handleDownload}
            disabled={report.rows.length === 0}
          >
            <Download className="h-4 w-4" />
            Download CSV
          </button>
        }
      />

      <div className={cn(cardClass, 'mb-5 p-4')}>
        <p className="mb-2 text-xs font-medium text-slate-500">Report type</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {reportTypes.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setReportType(item.value)}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition',
                  reportType === item.value
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-medium text-slate-500">Date range</p>
            <div className="flex flex-wrap gap-2">
              {reportPresets.map((item) => (
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

          {preset === 'custom' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="report-from" className="mb-1 block text-xs font-medium text-slate-500">
                  From
                </label>
                <input
                  id="report-from"
                  type="date"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="report-to" className="mb-1 block text-xs font-medium text-slate-500">
                  To
                </label>
                <input
                  id="report-to"
                  type="date"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary KPI grid (2 cols on mobile, 4 on desktop) */}
      <div className={cn(cardClass, 'mb-5 grid grid-cols-2 divide-y sm:divide-y-0 sm:grid-cols-4 sm:divide-x divide-slate-100')}>
        <div className="p-3 sm:p-4">
          <p className="text-xs text-slate-500 font-medium">Records</p>
          <p className="mt-1 text-base sm:text-lg font-bold text-slate-900">{report.summary.count}</p>
        </div>
        <div className="p-3 sm:p-4">
          <p className="text-xs text-slate-500 font-medium">Total Cost</p>
          <p className="mt-1 text-base sm:text-lg font-bold text-slate-900">
            {formatINR(report.summary.total)}
          </p>
        </div>
        <div className="p-3 sm:p-4">
          <p className="text-xs text-slate-500 font-medium">Amount Paid</p>
          <p className="mt-1 text-base sm:text-lg font-bold text-emerald-600">
            {formatINR(report.summary.paid)}
          </p>
        </div>
        <div className="p-3 sm:p-4">
          <p className="text-xs text-slate-500 font-medium">Pending</p>
          <p className="mt-1 text-base sm:text-lg font-bold text-rose-600">
            {formatINR(report.summary.pending)}
          </p>
        </div>
      </div>

      <div className={cardClass}>
        <div className="flex flex-col gap-2 border-b border-slate-100 p-3 sm:p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{report.meta.title}</h2>
            <p className="text-xs text-slate-500">{report.meta.description}</p>
          </div>
          <button
            type="button"
            className={cn(btnSecondary, 'w-full sm:w-auto justify-center')}
            onClick={handleDownload}
            disabled={report.rows.length === 0}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>

        {report.rows.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No data for this report"
            description="Add expenses or choose a different date range to generate this report."
          />
        ) : (
          <>
            {/* MOBILE CARD VIEW (Screens < sm) */}
            <div className="divide-y divide-slate-100 sm:hidden">
              {report.rows.map((row) => (
                <div key={row.id} className="p-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900">
                        {row.description ?? row.supplier ?? 'Record'}
                      </p>
                      {row.date && (
                        <p className="text-xs text-slate-500">
                          {formatDisplayDate(row.date)}
                        </p>
                      )}
                    </div>
                    {row.total !== undefined && (
                      <p className="text-sm font-bold text-slate-900">{formatINR(row.total)}</p>
                    )}
                  </div>

                  {/* Key Row Metrics */}
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-2 text-xs">
                    {row.paid !== undefined && (
                      <span>Paid: <span className="font-semibold text-emerald-600">{formatINR(row.paid)}</span></span>
                    )}
                    {row.pending !== undefined && (
                      <span>Pending: <span className={cn('font-semibold', row.pending > 0 ? 'text-rose-600' : 'text-emerald-600')}>{formatINR(row.pending)}</span></span>
                    )}
                    {row.workers !== undefined && (
                      <span>Workers: <span className="font-medium text-slate-700">{row.workers} ({row.days}d)</span></span>
                    )}
                    {row.quantity !== undefined && (
                      <span>Qty: <span className="font-medium text-slate-700">{row.quantity} {row.unit}</span></span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* DESKTOP TABLE VIEW (Screens >= sm) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className={tableHeadClass}>
                  <tr>
                    {report.columns.map((column) => (
                      <th
                        key={column.header}
                        className={cn(
                          'px-4 py-3',
                          column.align === 'right' && 'text-right',
                        )}
                      >
                        {column.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.rows.map((row) => (
                    <tr key={row.id} className="transition hover:bg-slate-50/70">
                      {report.columns.map((column) => (
                        <td
                          key={column.header}
                          className={cn(
                            tableCellClass,
                            column.align === 'right' && 'text-right',
                          )}
                        >
                          {column.render(row)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
