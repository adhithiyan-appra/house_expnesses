import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Check, ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react';
import type { MaterialCategory } from '../types';
import { cn } from '../lib/format';
import { helpClass, inputClass } from '../lib/styles';

interface MaterialSelectProps {
  id: string;
  value: string;
  categories: MaterialCategory[];
  onChange: (name: string) => void;
  onAdd: () => void;
  onEdit: (category: MaterialCategory) => void;
  onDelete: (category: MaterialCategory) => void;
  disabled?: boolean;
}

export default function MaterialSelect({
  id,
  value,
  categories,
  onChange,
  onAdd,
  onEdit,
  onDelete,
  disabled = false,
}: MaterialSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedKey = value.trim().toLowerCase();
  const queryKey = query.trim().toLowerCase();
  const filterTerm = queryKey && queryKey !== selectedKey ? queryKey : '';
  const filtered = useMemo(() => {
    if (!filterTerm) return categories;
    return categories.filter((category) =>
      category.name.toLowerCase().includes(filterTerm),
    );
  }, [categories, filterTerm]);

  const closeList = () => {
    setOpen(false);
    setQuery('');
  };

  const openList = () => {
    if (disabled) return;
    setOpen(true);
    setQuery(value);
  };

  const selectCategory = (category: MaterialCategory) => {
    onChange(category.name);
    closeList();
    inputRef.current?.blur();
  };

  const handleBlur = () => {
    window.setTimeout(() => {
      if (!wrapperRef.current?.contains(document.activeElement)) {
        closeList();
      }
    }, 0);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      closeList();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) openList();
      return;
    }
    if (event.key === 'Enter' && open) {
      const exact = categories.find(
        (category) => category.name.toLowerCase() === queryKey,
      );
      const target = exact ?? filtered[0];
      if (target) {
        event.preventDefault();
        selectCategory(target);
      }
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-options`}
          aria-autocomplete="list"
          autoComplete="off"
          value={open ? query : value}
          disabled={disabled}
          onFocus={openList}
          onClick={() => {
            if (disabled) return;
            if (!open) openList();
            inputRef.current?.select();
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className={cn(inputClass, 'pr-9')}
          placeholder="Search or select a material"
          required
        />
        <ChevronDown
          className={cn(
            'pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition',
            open && 'rotate-180',
          )}
        />
      </div>

      {open && (
        <div
          id={`${id}-options`}
          className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        >
          <div
            className="max-h-56 overflow-y-auto p-1"
            role="listbox"
            aria-label="Material options"
            onMouseDown={(event) => event.preventDefault()}
          >
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-slate-500">
                No matching material found.
              </p>
            ) : (
              filtered.map((category) => {
                const selected = category.name.toLowerCase() === selectedKey;
                return (
                  <div
                    key={category.id}
                    className={cn(
                      'flex items-center gap-1 rounded-lg px-1 transition hover:bg-slate-50',
                      selected && 'bg-blue-50',
                    )}
                  >
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => selectCategory(category)}
                      className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left text-sm text-slate-700"
                    >
                      <Check
                        className={cn(
                          'h-4 w-4 shrink-0 text-blue-600',
                          !selected && 'opacity-0',
                        )}
                      />
                      <span className="truncate">{category.name}</span>
                      {!category.isDefault && (
                        <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Custom
                        </span>
                      )}
                    </button>
                    {!category.isDefault && (
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            closeList();
                            onEdit(category);
                          }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                          aria-label={`Edit ${category.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            closeList();
                            onDelete(category);
                          }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                          aria-label={`Delete ${category.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              closeList();
              onAdd();
            }}
            className="flex w-full items-center gap-2 border-t border-slate-100 bg-blue-50/60 px-4 py-3 text-left text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
          >
            <Plus className="h-4 w-4" />
            Add Custom Material
          </button>
        </div>
      )}

      <p className={helpClass}>
        Search and select a material. Custom materials can be edited or deleted here.
      </p>
    </div>
  );
}
