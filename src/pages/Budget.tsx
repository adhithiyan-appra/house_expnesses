import { useMemo, useState, type FormEvent } from 'react';
import {
  HardHat,
  IndianRupee,
  Package,
  Percent,
  PiggyBank,
  Receipt,
  Save,
  Wallet,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import { useApp } from '../context/appContext';
import { getTotals } from '../lib/calculations';
import { cn, formatINR, toNumber } from '../lib/format';
import {
  btnPrimary,
  cardClass,
  helpClass,
  inputClass,
  labelClass,
} from '../lib/styles';

export default function Budget() {
  const { data, updateProject } = useApp();
  const [budget, setBudget] = useState(String(data.totalBudget || ''));
  const [error, setError] = useState('');

  const totals = useMemo(() => getTotals(data), [data]);
  const remaining = data.totalBudget - totals.totalSpent;
  const usage =
    data.totalBudget > 0 ? (totals.totalSpent / data.totalBudget) * 100 : 0;
  const usageClamped = Math.min(100, Math.max(0, usage));

  const categories = [
    {
      label: 'Labour',
      value: totals.labourTotal,
      icon: HardHat,
      bar: 'bg-blue-500',
      text: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Materials',
      value: totals.materialTotal,
      icon: Package,
      bar: 'bg-amber-500',
      text: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Other',
      value: totals.otherTotal,
      icon: Receipt,
      bar: 'bg-violet-500',
      text: 'text-violet-600',
      bg: 'bg-violet-50',
    },
  ];

  const handleSave = (event: FormEvent) => {
    event.preventDefault();
    const value = toNumber(budget);
    if (value < 0) {
      setError('Budget cannot be negative.');
      return;
    }
    setError('');
    updateProject({ totalBudget: value });
  };

  return (
    <>
      <PageHeader
        title="Budget"
        description="Set your construction budget and monitor how much is left."
      />

      <div className={cn(cardClass, 'mb-5 p-4 sm:p-5')}>
        <form
          onSubmit={handleSave}
          className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
        >
          <div className="w-full sm:max-w-sm">
            <label htmlFor="total-budget" className={labelClass}>
              Total construction budget (₹)
            </label>
            <input
              id="total-budget"
              type="number"
              min="0"
              step="1"
              value={budget}
              onChange={(event) => setBudget(event.target.value)}
              className={inputClass}
              placeholder="Enter total budget"
            />
            <p className={helpClass}>
              Dashboard and budget totals update automatically as expenses change.
            </p>
          </div>
          <button type="submit" className={cn(btnPrimary, 'w-full sm:w-auto justify-center')}>
            <Save className="h-4 w-4" />
            Save Budget
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 lg:grid-cols-4">
        <StatCard
          label="Total Budget"
          value={formatINR(data.totalBudget)}
          icon={Wallet}
          subtext={data.projectName}
          tone="blue"
        />
        <StatCard
          label="Total Spent"
          value={formatINR(totals.totalSpent)}
          icon={IndianRupee}
          subtext={`${formatINR(totals.totalPaid)} paid`}
          tone="amber"
        />
        <StatCard
          label="Remaining Amount"
          value={formatINR(remaining)}
          icon={PiggyBank}
          subtext={
            data.totalBudget > 0
              ? remaining >= 0
                ? 'Still available'
                : 'Over budget'
              : 'Set a budget to begin'
          }
          tone="emerald"
          valueClassName={remaining < 0 ? 'text-rose-600' : undefined}
        />
        <StatCard
          label="Budget Usage"
          value={data.totalBudget > 0 ? `${usage.toFixed(1)}%` : '—'}
          icon={Percent}
          subtext={
            data.totalBudget > 0
              ? usage > 100
                ? 'Over budget'
                : `${(100 - usage).toFixed(1)}% remaining`
              : 'No budget set'
          }
          tone={usage > 100 ? 'rose' : 'violet'}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className={cn(cardClass, 'p-4 sm:p-5 xl:col-span-2')}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Budget overview</h2>
              <p className="text-xs text-slate-500">How your spending compares to the budget</p>
            </div>
            <span
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-semibold',
                usage > 100
                  ? 'bg-rose-50 text-rose-700'
                  : usage >= 80
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-emerald-50 text-emerald-700',
              )}
            >
              {data.totalBudget > 0 ? `${usage.toFixed(0)}%` : 'No budget'}
            </span>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                usage >= 100 ? 'bg-rose-500' : usage >= 80 ? 'bg-amber-500' : 'bg-emerald-500',
              )}
              style={{ width: `${usageClamped}%` }}
            />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-slate-500">Budget</p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {formatINR(data.totalBudget)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Spent</p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {formatINR(totals.totalSpent)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Remaining</p>
              <p
                className={cn(
                  'mt-1 text-base font-semibold',
                  remaining < 0 ? 'text-rose-600' : 'text-emerald-600',
                )}
              >
                {formatINR(remaining)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Paid</p>
              <p className="mt-1 text-base font-semibold text-emerald-600">
                {formatINR(totals.totalPaid)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Pending payments</p>
              <p className="mt-1 text-base font-semibold text-rose-600">
                {formatINR(totals.totalPending)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Records</p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {data.labour.length + data.materials.length + data.others.length}
              </p>
            </div>
          </div>
        </div>

        <div className={cn(cardClass, 'p-4 sm:p-5')}>
          <h2 className="text-sm font-semibold text-slate-900">Spending breakdown</h2>
          <p className="text-xs text-slate-500">Share of total spent</p>

          <div className="mt-5 space-y-5">
            {categories.map((category) => {
              const Icon = category.icon;
              const share = totals.totalSpent > 0 ? (category.value / totals.totalSpent) * 100 : 0;

              return (
                <div key={category.label}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'flex h-7 w-7 items-center justify-center rounded-lg',
                          category.bg,
                          category.text,
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium text-slate-700">{category.label}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">
                        {formatINR(category.value)}
                      </p>
                      <p className="text-[11px] text-slate-500">{share.toFixed(1)}%</p>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn('h-full rounded-full', category.bar)}
                      style={{ width: `${share}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
