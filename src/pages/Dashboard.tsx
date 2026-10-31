import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  CalendarDays,
  HardHat,
  IndianRupee,
  Package,
  PiggyBank,
  Receipt,
  Wallet,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import DetailsModal from '../components/DetailsModal';
import { useApp } from '../context/appContext';
import type { UnifiedExpense } from '../types';
import {
  getMonthlyTotals,
  getPaymentState,
  getTodayTotal,
  getTotals,
  getUnifiedExpenses,
} from '../lib/calculations';
import {
  cn,
  formatDisplayDate,
  formatINR,
  formatINRCompact,
  formatLongDate,
  todayISO,
} from '../lib/format';
import { btnSecondary, cardClass } from '../lib/styles';

const typeMeta = {
  labour: { label: 'Labour', icon: HardHat, className: 'bg-blue-50 text-blue-600' },
  material: { label: 'Material', icon: Package, className: 'bg-amber-50 text-amber-600' },
  other: { label: 'Other', icon: Receipt, className: 'bg-violet-50 text-violet-600' },
};

export default function Dashboard() {
  const { data } = useApp();
  const [viewingExpense, setViewingExpense] = useState<UnifiedExpense | null>(null);

  const totals = useMemo(() => getTotals(data), [data]);
  const todayTotal = useMemo(() => getTodayTotal(data), [data]);
  const monthly = useMemo(() => getMonthlyTotals(data, 6), [data]);
  const recent = useMemo(() => getUnifiedExpenses(data).slice(0, 6), [data]);

  const remaining = data.totalBudget - totals.totalSpent;
  const usage =
    data.totalBudget > 0
      ? Math.min(100, Math.max(0, (totals.totalSpent / data.totalBudget) * 100))
      : 0;
  const hasMonthlyExpenses = monthly.some((item) => item.total > 0);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="A clear view of your house construction spending."
        action={
          <Link to="/history" className={cn(btnSecondary, 'w-full sm:w-auto text-center justify-center')}>
            View history
          </Link>
        }
      />

      {/* 2-Column Summary Cards Grid on Mobile (320px–600px), 3 columns on Desktop */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 lg:grid-cols-3">
        <StatCard
          label="Total Budget"
          value={formatINR(data.totalBudget)}
          icon={Wallet}
          subtext={data.totalBudget > 0 ? `${usage.toFixed(0)}% used` : 'Set a budget'}
          tone="blue"
        />
        <StatCard
          label="Total Spent"
          value={formatINR(totals.totalSpent)}
          icon={IndianRupee}
          subtext={`${formatINR(totals.totalPending)} pending`}
          tone="amber"
        />
        <StatCard
          label="Remaining"
          value={formatINR(remaining)}
          icon={PiggyBank}
          subtext={
            data.totalBudget > 0
              ? `${formatINR(totals.totalPaid)} paid`
              : 'No budget set'
          }
          tone="emerald"
          valueClassName={remaining < 0 ? 'text-rose-600' : undefined}
        />
        <StatCard
          label="Today's Spent"
          value={formatINR(todayTotal)}
          icon={CalendarDays}
          subtext={formatLongDate(todayISO())}
          tone="violet"
        />
        <StatCard
          label="Labour Cost"
          value={formatINR(totals.labourTotal)}
          icon={HardHat}
          subtext={`${data.labour.length} entr${data.labour.length === 1 ? 'y' : 'ies'}`}
          tone="blue"
        />
        <StatCard
          label="Materials Cost"
          value={formatINR(totals.materialTotal)}
          icon={Package}
          subtext={`${data.materials.length} entr${data.materials.length === 1 ? 'y' : 'ies'}`}
          tone="amber"
        />
      </div>

      {/* Charts & Recent Expenses Section */}
      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* Monthly Expense Chart */}
        <div className={cn(cardClass, 'p-3.5 sm:p-5 xl:col-span-2')}>
          <div className="mb-3 sm:mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Monthly Expenses</h2>
              <p className="text-xs text-slate-500">Last 6 months by category</p>
            </div>
            <Link to="/reports" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
              Reports &rarr;
            </Link>
          </div>

          {hasMonthlyExpenses ? (
            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => formatINRCompact(Number(value))}
                  />
                  <Tooltip
                    formatter={(value) => formatINR(Number(value))}
                    contentStyle={{
                      borderRadius: 10,
                      border: '1px solid #e2e8f0',
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                  <Bar dataKey="labour" name="Labour" stackId="expenses" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="material" name="Materials" stackId="expenses" fill="#f59e0b" />
                  <Bar dataKey="other" name="Other" stackId="expenses" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              icon={BarChart3}
              title="No monthly data yet"
              description="Add labour, material, or other expenses to see your monthly chart."
            />
          )}
        </div>

        {/* Recent Expenses List (Mobile Cards) */}
        <div className={cn(cardClass, 'flex flex-col')}>
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Recent Expenses</h2>
              <p className="text-xs text-slate-500">Tap any item to view details</p>
            </div>
            <Link to="/history" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>

          {recent.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No expenses yet"
              description="Start by adding your first labour or material expense."
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {recent.map((expense) => {
                const meta = typeMeta[expense.type];
                const Icon = meta.icon;
                const state =
                  expense.type === 'other'
                    ? 'paid'
                    : getPaymentState(expense.totalAmount, expense.amountPaid);

                return (
                  <button
                    key={`${expense.type}-${expense.id}`}
                    type="button"
                    onClick={() => setViewingExpense(expense)}
                    className="flex w-full items-start gap-3 px-3.5 py-3 text-left transition hover:bg-slate-50/80 active:bg-slate-100 sm:px-5"
                  >
                    <div
                      className={cn(
                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                        meta.className,
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {expense.description}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {formatDisplayDate(expense.date)} · {meta.label}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-slate-900">
                        {formatINR(expense.totalAmount)}
                      </p>
                      <div className="mt-1 flex justify-end">
                        <StatusBadge state={state} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Details Modal on Tap */}
      <DetailsModal
        expense={viewingExpense}
        onClose={() => setViewingExpense(null)}
      />
    </>
  );
}
