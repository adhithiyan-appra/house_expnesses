import { useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { useApp } from '../context/appContext';
import { cn, formatDisplayDate, todayISO } from '../lib/format';
import {
  btnPrimary,
  btnSecondary,
  helpClass,
  inputClass,
  labelClass,
} from '../lib/styles';
import ConfirmDialog from './ConfirmDialog';
import Modal from './Modal';

interface DailyNoteModalProps {
  onClose: () => void;
}

export default function DailyNoteModal({ onClose }: DailyNoteModalProps) {
  const { data, saveDailyNote, deleteDailyNote } = useApp();
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState(
    () => data.dailyNotes.find((item) => item.date === todayISO())?.note ?? '',
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const existing = data.dailyNotes.find((item) => item.date === date);

  const handleDateChange = (value: string) => {
    setDate(value);
    setError('');
    setNote(data.dailyNotes.find((item) => item.date === value)?.note ?? '');
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;

    if (!note.trim()) {
      setError('Please enter a daily note.');
      return;
    }

    setSaving(true);
    setError('');
    if (saveDailyNote(date, note)) {
      onClose();
      return;
    }

    setSaving(false);
    setError('This daily note could not be saved. Please try again.');
  };

  const handleDelete = () => {
    if (!existing) return;
    if (deleteDailyNote(existing.id)) {
      setDeleteOpen(false);
      onClose();
    }
  };

  return (
    <>
      <Modal
        isOpen
        onClose={onClose}
        title="Daily site note"
        subtitle="Add one general note for the construction work on a day."
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <button
              type="button"
              className={cn(
                btnSecondary,
                'w-full justify-center border-rose-200 text-rose-700 hover:bg-rose-50 sm:w-auto',
              )}
              onClick={() => setDeleteOpen(true)}
              disabled={!existing || saving}
            >
              <Trash2 className="h-4 w-4" />
              Delete note
            </button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className={cn(btnSecondary, 'w-full justify-center sm:w-auto')}
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="daily-note-form"
                className={cn(
                  btnPrimary,
                  'w-full justify-center sm:w-auto',
                  saving && 'cursor-not-allowed opacity-60',
                )}
                disabled={saving}
              >
                {saving ? 'Saving...' : existing ? 'Update note' : 'Save note'}
              </button>
            </div>
          </div>
        }
      >
        <form id="daily-note-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="daily-note-date" className={labelClass}>
              Date
            </label>
            <input
              id="daily-note-date"
              type="date"
              value={date}
              onChange={(event) => handleDateChange(event.target.value)}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label htmlFor="daily-note-text" className={labelClass}>
              General note for this day
            </label>
            <textarea
              id="daily-note-text"
              value={note}
              onChange={(event) => {
                setNote(event.target.value);
                setError('');
              }}
              className={cn(inputClass, 'min-h-28 resize-y')}
              placeholder="e.g. Ground-floor brickwork started. Half day due to rain."
              required
            />
            <p className={helpClass}>
              {existing
                ? `A note is already saved for ${formatDisplayDate(date)}. Saving will update it.`
                : `This note will be saved separately from individual labour expense notes.`}
            </p>
          </div>

          {data.dailyNotes.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Recent site notes
              </p>
              <div className="mt-2 space-y-2">
                {[...data.dailyNotes]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .slice(0, 3)
                  .map((item) => (
                    <div key={item.id} className="text-xs">
                      <span className="font-medium text-slate-700">
                        {formatDisplayDate(item.date)}
                      </span>
                      <span className="text-slate-500"> · {item.note}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteOpen}
        title="Delete daily note?"
        message={`Delete the general site note for ${
          existing ? formatDisplayDate(existing.date) : formatDisplayDate(date)
        }? Individual labour expense notes will not be changed.`}
        confirmLabel="Delete note"
        onConfirm={handleDelete}
        onClose={() => setDeleteOpen(false)}
      />
    </>
  );
}
