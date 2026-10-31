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
    <div className={cn(cardClass, 'p-4 sm:p-5')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p
            className={cn(
              'mt-1.5 truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl',
              valueClassName,
            )}
          >
            {value}
          </p>
        </div>
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            toneClasses[tone],
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {subtext && <p className="mt-2 truncate text-xs text-slate-500">{subtext}</p>}
    </div>
  );
}
