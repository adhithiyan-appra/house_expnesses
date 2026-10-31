import {
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Database,
  Download,
  HardHat,
  Layers,
  Package,
  Plus,
  Receipt,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import ConfirmDialog from '../components/ConfirmDialog';
import { useApp } from '../context/appContext';
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_LABOUR_TYPES,
  DEFAULT_MATERIAL_TYPES,
  DEFAULT_UNITS,
} from '../constants';
import {
  parseBackup,
  serializeData,
  type BackupParseResult,
} from '../lib/storage';
import { cn } from '../lib/format';
import { downloadJSON, fileStamp } from '../lib/csv';
import {
  btnPrimary,
  btnSecondary,
  cardClass,
  helpClass,
  inputClass,
  labelClass,
} from '../lib/styles';

interface ListManagerProps {
  title: string;
  description: string;
  icon: ReactNode;
  defaults: string[];
  custom: string[];
  placeholder: string;
  onAdd: (value: string) => boolean;
  onRemove: (value: string) => boolean;
}

function ListManager({
  title,
  description,
  icon,
  defaults,
  custom,
  placeholder,
  onAdd,
  onRemove,
}: ListManagerProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;

    const lower = trimmed.toLowerCase();
    const exists =
      defaults.some((item) => item.toLowerCase() === lower) ||
      custom.some((item) => item.toLowerCase() === lower);

    if (exists) {
      setError('This option already exists.');
      return;
    }

    if (onAdd(trimmed)) {
      setValue('');
      setError('');
    }
  };

  return (
    <div className={cn(cardClass, 'p-4 sm:p-5')}>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError('');
          }}
          placeholder={placeholder}
          className={inputClass}
          aria-label={`Add ${title}`}
        />
        <button type="submit" className={btnPrimary} aria-label={`Add ${title}`}>
          <Plus className="h-4 w-4" />
        </button>
      </form>
      {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}

      <div className="mt-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Defaults
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {defaults.map((item) => (
            <span
              key={item}
              className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      {custom.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Custom
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {custom.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1 rounded-full bg-blue-50 py-1 pl-2.5 pr-1 text-xs font-medium text-blue-700"
              >
                {item}
                <button
                  type="button"
                  onClick={() => onRemove(item)}
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-blue-100"
                  aria-label={`Remove ${item}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Settings() {
  const {
    data,
    updateProject,
    addCustomValue,
    removeCustomValue,
    replaceData,
    clearAllData,
    notify,
  } = useApp();
  const [projectName, setProjectName] = useState(data.projectName);
  const [pendingRestore, setPendingRestore] = useState<BackupParseResult | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProjectSave = (event: FormEvent) => {
    event.preventDefault();
    if (!projectName.trim()) {
      notify('Project name cannot be empty', 'error');
      return;
    }
    updateProject({ projectName });
  };

  const existingRecordCount =
    data.labour.length +
    data.materials.length +
    data.others.length +
    data.employees.length +
    data.dailyNotes.length;
  const restoreMessage = pendingRestore
    ? [
        `This will replace the current ${existingRecordCount} record(s), custom options, and project settings with ${pendingRestore.recordCount} record(s) from the selected backup.`,
        ...pendingRestore.warnings,
        'Continue?',
      ].join(' ')
    : '';

  const handleBackup = () => {
    downloadJSON(
      `house-construction-backup-${fileStamp()}`,
      serializeData(data),
    );
    notify('Backup downloaded');
  };

  const handleRestoreFile = async (file: File | undefined) => {
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseBackup(text);
      if (!parsed) {
        notify('Invalid backup file', 'error');
        return;
      }
      setPendingRestore(parsed);
    } catch {
      notify('Could not read the backup file', 'error');
    }
  };

  const handleRestoreConfirm = () => {
    if (!pendingRestore) return;
    if (replaceData(pendingRestore.data)) setPendingRestore(null);
  };

  const handleClear = () => {
    if (!clearAllData()) return;
    setProjectName('My House Construction');
    setClearOpen(false);
  };

  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage project details, custom options, and your data backup."
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <div className={cn(cardClass, 'p-4 sm:p-5')}>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Project details</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  The project name appears in the sidebar and header.
                </p>
              </div>
            </div>

            <form onSubmit={handleProjectSave} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="w-full sm:max-w-md">
                <label htmlFor="project-name" className={labelClass}>
                  Project name
                </label>
                <input
                  id="project-name"
                  type="text"
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  className={inputClass}
                  placeholder="My House Construction"
                />
              </div>
              <button type="submit" className={cn(btnPrimary, 'w-full sm:w-auto justify-center')}>
                <Save className="h-4 w-4" />
                Save
              </button>
            </form>
            <p className={helpClass}>
              Set or update the total budget from the{' '}
              <Link to="/budget" className="font-medium text-blue-600 hover:text-blue-700">
                Budget page
              </Link>
              .
            </p>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-900">Custom options</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Add your own labour types, materials, categories, and units.
            </p>

            <div className="mt-3 grid grid-cols-1 gap-4 2xl:grid-cols-2">
              <ListManager
                title="Labour types"
                description="Used when adding labour expenses."
                icon={<HardHat className="h-4 w-4" />}
                defaults={DEFAULT_LABOUR_TYPES}
                custom={data.customLabourTypes}
                placeholder="e.g. Welder"
                onAdd={(value) => addCustomValue('labour', value)}
                onRemove={(value) => removeCustomValue('labour', value)}
              />
              <ListManager
                title="Material names"
                description="Used when adding material purchases."
                icon={<Package className="h-4 w-4" />}
                defaults={DEFAULT_MATERIAL_TYPES}
                custom={data.customMaterialTypes}
                placeholder="e.g. Tiles"
                onAdd={(value) => addCustomValue('material', value)}
                onRemove={(value) => removeCustomValue('material', value)}
              />
              <ListManager
                title="Expense categories"
                description="Used for other daily expenses."
                icon={<Receipt className="h-4 w-4" />}
                defaults={DEFAULT_EXPENSE_CATEGORIES}
                custom={data.customExpenseCategories}
                placeholder="e.g. Security"
                onAdd={(value) => addCustomValue('expense', value)}
                onRemove={(value) => removeCustomValue('expense', value)}
              />
              <ListManager
                title="Units"
                description="Used for material quantities."
                icon={<Layers className="h-4 w-4" />}
                defaults={DEFAULT_UNITS}
                custom={data.customUnits}
                placeholder="e.g. Trolley"
                onAdd={(value) => addCustomValue('unit', value)}
                onRemove={(value) => removeCustomValue('unit', value)}
              />
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className={cn(cardClass, 'p-4 sm:p-5')}>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Database className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Data backup</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  All data is stored in your browser&apos;s LocalStorage.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <button type="button" className={cn(btnSecondary, 'w-full')} onClick={handleBackup}>
                <Download className="h-4 w-4" />
                Download JSON Backup
              </button>
              <button
                type="button"
                className={cn(btnSecondary, 'w-full')}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                Restore from Backup
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(event) => {
                  void handleRestoreFile(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
            </div>

            <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
              <div className="flex justify-between py-0.5">
                <span>Labour records</span>
                <span className="font-medium text-slate-700">{data.labour.length}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span>Material records</span>
                <span className="font-medium text-slate-700">{data.materials.length}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span>Other records</span>
                <span className="font-medium text-slate-700">{data.others.length}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span>Employees</span>
                <span className="font-medium text-slate-700">{data.employees.length}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span>Daily notes</span>
                <span className="font-medium text-slate-700">{data.dailyNotes.length}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-rose-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                <Trash2 className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Clear data</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Permanently delete all records and reset the app.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setClearOpen(true)}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
            >
              <Trash2 className="h-4 w-4" />
              Clear All Data
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={Boolean(pendingRestore)}
        title="Restore backup?"
        message={restoreMessage}
        confirmLabel="Restore"
        onConfirm={handleRestoreConfirm}
        onClose={() => setPendingRestore(null)}
      />

      <ConfirmDialog
        isOpen={clearOpen}
        title="Clear all data?"
        message="Every labour, material, and other expense, saved employee, and daily note will be permanently deleted from this browser. Download a backup first if you want to keep a copy."
        confirmLabel="Clear everything"
        onConfirm={handleClear}
        onClose={() => setClearOpen(false)}
      />
    </>
  );
}
