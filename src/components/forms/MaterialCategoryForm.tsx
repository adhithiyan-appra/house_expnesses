import { useRef, useState, type FormEvent } from 'react';
import type { MaterialCategory } from '../../types';
import { useApp } from '../../context/appContext';
import { cn } from '../../lib/format';
import { btnPrimary, btnSecondary, helpClass, inputClass, labelClass } from '../../lib/styles';
import Modal from '../Modal';

interface MaterialCategoryFormProps {
  initial?: MaterialCategory | null;
  onClose: () => void;
  onSaved?: (category: MaterialCategory) => void;
}

export default function MaterialCategoryForm({
  initial,
  onClose,
  onSaved,
}: MaterialCategoryFormProps) {
  const { data, addMaterialCategory, updateMaterialCategory } = useApp();
  const [name, setName] = useState(initial?.name ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const submittingRef = useRef(false);

  const referenceCount = initial
    ? data.materials.filter(
        (record) =>
          record.materialName.toLowerCase() === initial.name.toLowerCase(),
      ).length
    : 0;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (submittingRef.current) return;

    const trimmed = name.trim();
    if (!trimmed) return setError('Please enter a material name.');

    const lower = trimmed.toLowerCase();
    if (
      data.materialCategories.some(
        (category) =>
          category.id !== initial?.id && category.name.toLowerCase() === lower,
      )
    ) {
      return setError('A material with this name already exists.');
    }

    submittingRef.current = true;
    setSaving(true);
    setError('');

    const saved = initial
      ? updateMaterialCategory(initial.id, trimmed)
      : addMaterialCategory(trimmed);

    if (saved) {
      onSaved?.(saved);
      onClose();
      return;
    }

    submittingRef.current = false;
    setSaving(false);
    setError('This material could not be saved. Please try again.');
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={initial ? 'Edit custom material' : 'Add custom material'}
      subtitle="Custom materials are saved in this browser and appear in the material dropdown."
      size="sm"
      footer={
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
            form="material-category-form"
            className={cn(
              btnPrimary,
              'w-full justify-center sm:w-auto',
              saving && 'cursor-not-allowed opacity-60',
            )}
            disabled={saving}
          >
            {saving ? 'Saving...' : initial ? 'Save changes' : 'Add material'}
          </button>
        </div>
      }
    >
      <form id="material-category-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="material-category-name" className={labelClass}>
            Material name
          </label>
          <input
            id="material-category-name"
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError('');
            }}
            className={inputClass}
            placeholder="e.g. Tiles"
            autoComplete="off"
            autoFocus
            required
          />
          <p className={helpClass}>
            Names are matched without regard to uppercase or lowercase.
          </p>
        </div>

        {initial && referenceCount > 0 && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            This material is used by {referenceCount} purchase record
            {referenceCount === 1 ? '' : 's'}. Renaming it will update those
            records too.
          </p>
        )}

        {error && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
