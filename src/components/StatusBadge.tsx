import { cn } from '../lib/format';

interface StatusBadgeProps {
  state: 'paid' | 'partial' | 'pending';
}

export default function StatusBadge({ state }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
        state === 'paid' && 'bg-emerald-50 text-emerald-700',
        state === 'partial' && 'bg-amber-50 text-amber-700',
        state === 'pending' && 'bg-rose-50 text-rose-700',
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          state === 'paid' && 'bg-emerald-500',
          state === 'partial' && 'bg-amber-500',
          state === 'pending' && 'bg-rose-500',
        )}
      />
      {state === 'paid' ? 'Paid' : state === 'partial' ? 'Partial' : 'Pending'}
    </span>
  );
}
