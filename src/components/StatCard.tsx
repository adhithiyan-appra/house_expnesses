import type { LucideIcon } from 'lucide-react';
import { cn } from '../lib/format';
import { cardClass } from '../lib/styles';

type Tone = 'blue' | 'emerald' | 'rose' | 'amber' | 'violet' | 'slate';

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  subtext?: string;
  tone?: Tone;
  valueClassName?: string;
}

const toneClasses: Record<Tone, string> = {
  blue: 'bg-blue-50 text-blue-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  rose: 'bg-rose-50 text-rose-600',
  amber: 'bg-amber-50 text-amber-600',
  violet: 'bg-violet-50 text-violet-600',
  slate: 'bg-slate-100 text-slate-600',
};

export default function StatCard({
  label,
  value,
  icon: Icon,
  subtext,
  tone = 'blue',
  valueClassName,
}: StatCardProps) {
  return (
    <div className={cn(cardClass, 'p-3 sm:p-5 flex flex-col justify-between')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-500 sm:text-xs">
            {label}
          </p>
          <p
            className={cn(
              'mt-1 truncate text-lg font-bold tracking-tight text-slate-900 sm:mt-1.5 sm:text-2xl',
              valueClassName,
            )}
            title={value}
          >
            {value}
          </p>
        </div>
        <div
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9',
            toneClasses[tone],
          )}
        >
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </div>
      </div>
      {subtext && (
        <p className="mt-1.5 truncate text-[11px] text-slate-500 sm:mt-2 sm:text-xs">
          {subtext}
        </p>
      )}
    </div>
  );
}
