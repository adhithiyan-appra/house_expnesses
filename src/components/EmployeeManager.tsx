import { useMemo, useState } from 'react';
import { Eye, Pencil, Plus, Trash2, Users } from 'lucide-react';
import type { Employee, LabourRecord } from '../types';
import { useApp } from '../context/appContext';
import { cn, formatINR } from '../lib/format';
import { btnPrimary, cardClass } from '../lib/styles';
import ConfirmDialog from './ConfirmDialog';
import EmployeeForm from './forms/EmployeeForm';

interface EmployeeManagerProps {
  onViewEntries: (employeeName: string) => void;
}

function employeeRecords(records: LabourRecord[], employee: Employee) {
  return records.filter(
    (record) =>
      record.employeeId === employee.id ||
      (!record.employeeId &&
        record.employeeName.toLowerCase() === employee.name.toLowerCase()),
  );
}

export default function EmployeeManager({
  onViewEntries,
}: EmployeeManagerProps) {
  const { data, deleteEmployee } = useApp();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState<Employee | null>(null);

  const summaries = useMemo(
    () =>
      data.employees.map((employee) => {
        const records = employeeRecords(data.labour, employee);
        return {
          employee,
          entries: records.length,
          days: records.reduce((sum, item) => sum + item.workingDays, 0),
          pending: records.reduce(
            (sum, item) => sum + Math.max(item.balance, 0),
            0,
          ),
        };
      }),
    [data.employees, data.labour],
  );

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (employee: Employee) => {
    setEditing(employee);
    setFormOpen(true);
  };

  const handleDelete = () => {
    if (!deleting) return;
    if (deleteEmployee(deleting.id)) setDeleting(null);
  };

  const deletingEntries = deleting
    ? employeeRecords(data.labour, deleting).length
    : 0;

  return (
    <>
      <div className={cn(cardClass, 'mb-5')}>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Employees
              </h2>
              <p className="text-xs text-slate-500">
                {data.employees.length === 0
                  ? 'Add employees once, then reuse their details for daily entries.'
                  : `${data.employees.length} saved employee${
                      data.employees.length === 1 ? '' : 's'
                    } available for labour entries.`}
              </p>
            </div>
          </div>
          <button
            type="button"
            className={cn(btnPrimary, 'w-full justify-center sm:w-auto')}
            onClick={openAdd}
          >
            <Plus className="h-4 w-4" />
            Add employee
          </button>
        </div>

        {summaries.length === 0 ? (
          <div className="p-5 text-center">
            <p className="text-sm font-medium text-slate-700">
              No employees saved yet
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Add a worker to quickly fill their category and daily wage in
              future labour entries.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 p-3.5 sm:grid-cols-2 sm:p-4 xl:grid-cols-3">
            {summaries.map(({ employee, entries, days, pending }) => (
              <div
                key={employee.id}
                className="rounded-xl border border-slate-200 p-3.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {employee.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {employee.labourType}
                      {employee.mobile ? ` · ${employee.mobile}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                    {formatINR(employee.dailyWage)}/day
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-2 text-center">
                  <div>
                    <p className="text-[10px] text-slate-500">Entries</p>
                    <p className="text-xs font-semibold text-slate-900">
                      {entries}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">Days</p>
                    <p className="text-xs font-semibold text-slate-900">
                      {days}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">Pending</p>
                    <p
                      className={cn(
                        'text-xs font-semibold',
                        pending > 0 ? 'text-rose-600' : 'text-emerald-600',
                      )}
                    >
                      {formatINR(pending)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => onViewEntries(employee.name)}
                    disabled={entries === 0}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View records
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(employee)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-50"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(employee)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>

                {employee.notes && (
                  <p className="mt-2 truncate text-xs italic text-slate-500">
                    &quot;{employee.notes}&quot;
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {formOpen && (
        <EmployeeForm
          initial={editing}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      )}

      <ConfirmDialog
        isOpen={Boolean(deleting)}
        title="Delete employee?"
        message={
          deletingEntries > 0
            ? `${deleting?.name} has ${deletingEntries} labour entr${
                deletingEntries === 1 ? 'y' : 'ies'
              }. Delete or reassign those entries before removing this employee.`
            : `Delete ${deleting?.name} from your saved employees? Existing expense records will not be changed.`
        }
        confirmLabel="Delete employee"
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
