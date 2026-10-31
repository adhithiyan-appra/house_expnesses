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
  MoreHorizontal,
  Package,
  Plus,
  Receipt,
  Settings,
  Wallet,
  X,
} from 'lucide-react';
import { useApp } from '../context/appContext';
import { getTotals } from '../lib/calculations';
import { cn, formatINR, formatLongDate, todayISO } from '../lib/format';
import Modal from './Modal';
import LabourForm from './forms/LabourForm';
import MaterialForm from './forms/MaterialForm';
import OtherForm from './forms/OtherForm';

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
  const [quickAddChoiceOpen, setQuickAddChoiceOpen] = useState(false);
  const [activeForm, setActiveForm] = useState<'labour' | 'material' | 'other' | null>(null);

  const location = useLocation();
  const { data } = useApp();
  const current =
    navItems.find((item) =>
      item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to),
    ) ?? navItems[0];

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  const handleOpenForm = (type: 'labour' | 'material' | 'other') => {
    setQuickAddChoiceOpen(false);
    setActiveForm(type);
  };

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-slate-200 lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-[2px] transition-opacity lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] border-r border-slate-200 shadow-2xl transition-transform duration-200 ease-in-out lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none"
          aria-label="Close navigation"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent onNavigate={() => setMobileOpen(false)} />
      </aside>

      {/* Main Content Area */}
      <div className="flex min-h-screen flex-col lg:pl-64">
        {/* Sticky Mobile/Desktop Header */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 sm:px-6 sm:py-3.5 lg:px-8">
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 lg:hidden"
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-sm font-bold tracking-tight text-slate-900 sm:text-base">
                  {current.label}
                </h1>
                <p className="truncate text-[11px] text-slate-500 sm:text-xs">
                  {data.projectName || 'House Construction'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Quick Add Button */}
              <button
                type="button"
                onClick={() => setQuickAddChoiceOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 active:bg-blue-800 sm:px-3.5 sm:py-2 sm:text-sm"
                aria-label="Quick add new expense"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Expense</span>
                <span className="sm:hidden">Add</span>
              </button>

              {/* Date Badge */}
              <div className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 md:flex">
                <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                <span>{formatLongDate(todayISO())}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Children - pb-24 ensures bottom navigation bar does not overlap content on mobile */}
        <main className="flex-1 px-3 py-4 pb-24 sm:px-6 sm:py-6 sm:pb-12 lg:px-8 lg:py-8 lg:pb-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Visible on mobile/tablet screens < lg) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <div className="grid h-16 grid-cols-5 items-center px-1">
          {/* 1. Dashboard */}
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium transition',
                isActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900',
              )
            }
          >
            <LayoutDashboard className="h-5 w-5" />
            <span>Home</span>
          </NavLink>

          {/* 2. Labour */}
          <NavLink
            to="/labour"
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium transition',
                isActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900',
              )
            }
          >
            <HardHat className="h-5 w-5" />
            <span>Labour</span>
          </NavLink>

          {/* 3. Center Quick Add Button */}
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => setQuickAddChoiceOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white shadow-md transition hover:bg-blue-700 active:scale-95"
              aria-label="Quick add expense"
            >
              <Plus className="h-6 w-6" />
            </button>
          </div>

          {/* 4. Materials */}
          <NavLink
            to="/materials"
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium transition',
                isActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900',
              )
            }
          >
            <Package className="h-5 w-5" />
            <span>Materials</span>
          </NavLink>

          {/* 5. Menu Drawer Trigger */}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-900 active:text-blue-600"
            aria-label="More navigation options"
          >
            <MoreHorizontal className="h-5 w-5" />
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* Quick Add Action Selector Modal */}
      <Modal
        isOpen={quickAddChoiceOpen}
        onClose={() => setQuickAddChoiceOpen(false)}
        title="Add Construction Expense"
        subtitle="Select the type of expense to record"
        size="sm"
      >
        <div className="grid grid-cols-1 gap-3 py-1">
          <button
            type="button"
            onClick={() => handleOpenForm('labour')}
            className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-3.5 text-left transition hover:border-blue-300 hover:bg-blue-50/50 active:bg-blue-50"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <HardHat className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">Labour Expense</p>
              <p className="text-xs text-slate-500">Track daily wages, workers, and contractor dues</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleOpenForm('material')}
            className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-3.5 text-left transition hover:border-amber-300 hover:bg-amber-50/50 active:bg-amber-50"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Package className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">Material Purchase</p>
              <p className="text-xs text-slate-500">Record cement, steel, sand, bricks & supplies</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleOpenForm('other')}
            className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-3.5 text-left transition hover:border-violet-300 hover:bg-violet-50/50 active:bg-violet-50"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <Receipt className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">Other / Daily Expense</p>
              <p className="text-xs text-slate-500">Worker food, tea, JCB rent, water tankers, permits</p>
            </div>
          </button>
        </div>
      </Modal>

      {/* Active Form Modals launched from Global Quick Add */}
      {activeForm === 'labour' && (
        <LabourForm onClose={() => setActiveForm(null)} />
      )}
      {activeForm === 'material' && (
        <MaterialForm onClose={() => setActiveForm(null)} />
      )}
      {activeForm === 'other' && (
        <OtherForm onClose={() => setActiveForm(null)} />
      )}
    </div>
  );
}
