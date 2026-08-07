'use client';
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { FileImage, Plus, Trash2 } from 'lucide-react';

export type ExistingImage = { id: number; url: string };

type MultiImageUploadProps = {
  label?: string;
  /** Images already saved on the record. */
  existing?: ExistingImage[];
  /** Ids the user has removed - the parent sends these to the API on save. */
  removedIds?: number[];
  onRemoveExisting?: (id: number) => void;
  files: File[];
  onFilesChange: (files: File[]) => void;
  accept?: string;
  maxFiles?: number;
  maxSizeMb?: number;
  hint?: string;
  disabled?: boolean;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Several images against one record - receipts, delivery notes, invoice photos.
 *
 * The single-image field ([[ImageUpload]]) replaces what is there; this one adds
 * to it, because the paperwork for one delivery is often three photos and
 * dropping the second when the third arrives would lose it.
 */
export const MultiImageUpload = ({
  label = 'Images',
  existing = [],
  removedIds = [],
  onRemoveExisting,
  files,
  onFilesChange,
  accept = 'image/*',
  maxFiles = 10,
  maxSizeMb = 5,
  hint,
  disabled = false,
}: MultiImageUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  const kept = existing.filter((image) => !removedIds.includes(image.id));

  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);

  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  const add = (incoming: FileList | null) => {
    if (!incoming || disabled) return;

    const accepted: File[] = [];
    let problem = '';

    for (const file of Array.from(incoming)) {
      if (!file.type.startsWith('image/')) {
        problem = `${file.name} is not an image.`;
        continue;
      }
      if (file.size > maxSizeMb * 1024 * 1024) {
        problem = `${file.name} is ${formatSize(file.size)} - the limit is ${maxSizeMb} MB.`;
        continue;
      }
      accepted.push(file);
    }

    const room = maxFiles - kept.length - files.length;

    if (accepted.length > room) {
      problem = `Only ${maxFiles} images can be attached.`;
    }

    setError(problem);
    if (room > 0) onFilesChange([...files, ...accepted.slice(0, room)]);

    // Otherwise re-picking a file that was just removed fires no change event.
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, current) => current !== index));
    setError('');
  };

  const total = kept.length + files.length;

  return (
    <div className="form-control w-full">
      <label className="label" htmlFor={inputId}>
        <span className="label-text font-medium">{label}</span>
        <span className="label-text-alt text-content-muted">
          {total} of {maxFiles}
        </span>
      </label>

      <input
        id={inputId}
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => add(event.target.files)}
      />

      <div
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          add(event.dataTransfer.files);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        className={`rounded-[var(--radius-field)] border-2 border-dashed p-3 transition-colors ${
          dragging ? 'border-primary bg-primary/5' : 'border-base-300 bg-base-200/40'
        }`}
      >
        <div className="flex flex-wrap gap-3">
          {kept.map((image) => (
            <figure key={`saved-${image.id}`} className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt="Saved receipt"
                className="h-24 w-24 rounded-lg border border-base-200 bg-base-100 object-cover"
              />
              <figcaption className="absolute inset-x-0 bottom-0 rounded-b-lg bg-base-content/70 px-1 py-0.5 text-center text-[10px] font-medium text-base-100">
                Saved
              </figcaption>
              {onRemoveExisting && !disabled && (
                <button
                  type="button"
                  aria-label="Remove this receipt"
                  onClick={() => onRemoveExisting(image.id)}
                  className="btn btn-xs btn-circle btn-error absolute -right-2 -top-2 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </figure>
          ))}

          {files.map((file, index) => (
            <figure key={`new-${file.name}-${index}`} className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previews[index]}
                alt={file.name}
                className="h-24 w-24 rounded-lg border border-base-200 bg-base-100 object-cover"
              />
              <figcaption className="absolute inset-x-0 bottom-0 rounded-b-lg bg-warning/90 px-1 py-0.5 text-center text-[10px] font-medium text-warning-content">
                New
              </figcaption>
              {!disabled && (
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => removeFile(index)}
                  className="btn btn-xs btn-circle btn-error absolute -right-2 -top-2 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </figure>
          ))}

          <button
            type="button"
            disabled={disabled || total >= maxFiles}
            onClick={() => inputRef.current?.click()}
            className={`flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-center transition-colors ${
              disabled || total >= maxFiles
                ? 'cursor-not-allowed border-base-300 text-content-muted opacity-60'
                : 'cursor-pointer border-base-300 text-content-muted hover:border-primary/60 hover:bg-primary/5 hover:text-primary'
            }`}
          >
            {total === 0 ? <FileImage size={20} /> : <Plus size={20} />}
            <span className="text-xs font-medium">{total === 0 ? 'Add receipts' : 'Add more'}</span>
          </button>
        </div>

        <p className="mt-2 text-xs text-content-muted">
          {hint ?? `Drag photos or scans here · PNG, JPG or WEBP · up to ${maxSizeMb} MB each`}
        </p>
      </div>

      {error && <p className="mt-2 text-xs font-medium text-error">{error}</p>}
    </div>
  );
};
