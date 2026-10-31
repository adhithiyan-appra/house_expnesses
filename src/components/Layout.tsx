import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  CalendarDays,
  HardHat,
  History,
  LayoutDashboard,
  Menu,
  Package,
  Receipt,
  Settings,
  Wallet,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTotals } from '../lib/calculations';
import { cn, formatINR, formatLongDate, todayISO } from '../lib/format';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/labour', label: 'Labour Expenses', icon: HardHat },
  { to: '/materials', label: 'Material Expenses', icon: Package },
  { to: '/other', label: 'Other Expenses', icon: Receipt },
  { to: '/history', label: 'Expense History', icon: History },
  { to: '/budget', label: 'Budget', icon: Wallet },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { data } = useApp();
  const totals = getTotals(data);
  const remaining = data.totalBudget - totals.totalSpent;
  const usage =
    data.totalBudget > 0
      ? Math.min(100, Math.max(0, (totals.totalSpent / data.totalBudget) * 100))
      : 0;

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">
            {data.projectName || 'My House Construction'}
          </p>
          <p className="text-xs text-slate-500">Expense Tracker</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={cn(
                    'h-5 w-5 shrink-0',
                    isActive ? 'text-blue-600' : 'text-slate-400',
                  )}
                />
                <span className="truncate">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <NavLink
          to="/budget"
          onClick={onNavigate}
          className="block rounded-xl border border-slate-200 bg-slate-50 p-3 transition hover:border-blue-200 hover:bg-blue-50"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500">Budget remaining</span>
            <Wallet className="h-3.5 w-3.5 text-slate-400" />
          </div>
          {data.totalBudget > 0 ? (
            <>
              <p
                className={cn(
                  'mt-1 text-sm font-semibold',
                  remaining < 0 ? 'text-rose-600' : 'text-slate-900',
                )}
              >
                {formatINR(remaining)}
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    usage >= 100 ? 'bg-rose-500' : usage >= 80 ? 'bg-amber-500' : 'bg-emerald-500',
                  )}
                  style={{ width: `${usage}%` }}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">
                {usage.toFixed(0)}% of {formatINR(data.totalBudget)}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm font-medium text-blue-600">Set your budget</p>
          )}
        </NavLink>
      </div>
    </div>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { data } = useApp();
  const current =
    navItems.find((item) =>
      item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to),
    ) ?? navItems[0];

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-slate-200 lg:block">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-[1px] lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] border-r border-slate-200 shadow-xl transition-transform duration-200 lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close navigation"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent onNavigate={() => setMobileOpen(false)} />
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 lg:hidden"
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{current.label}</p>
                <p className="truncate text-xs text-slate-500">{data.projectName}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <CalendarDays className="hidden h-4 w-4 sm:block" />
              <span className="hidden sm:inline">{formatLongDate(todayISO())}</span>
              <span className="sm:hidden">
                {new Date().toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                })}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
