import { CheckCircle2, CircleAlert, Info } from 'lucide-react';
import { useApp } from '../context/appContext';
import { cn } from '../lib/format';

export default function Toast() {
  const { toast } = useApp();
  if (!toast) return null;

  const Icon = toast.type === 'success' ? CheckCircle2 : toast.type === 'error' ? CircleAlert : Info;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] w-[calc(100%-2rem)] max-w-sm">
      <div
        key={toast.id}
        className={cn(
          'flex items-start gap-3 rounded-xl border bg-white p-4 shadow-lg',
          toast.type === 'success' && 'border-emerald-200',
          toast.type === 'error' && 'border-rose-200',
          toast.type === 'info' && 'border-slate-200',
        )}
        role="status"
      >
        <Icon
          className={cn(
            'mt-0.5 h-5 w-5 shrink-0',
            toast.type === 'success' && 'text-emerald-600',
            toast.type === 'error' && 'text-rose-600',
            toast.type === 'info' && 'text-slate-500',
          )}
        />
        <p className="text-sm font-medium text-slate-700">{toast.message}</p>
      </div>
    </div>
  );
}
