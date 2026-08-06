'use client';
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ImageUp, RefreshCw, Trash2 } from 'lucide-react';

type ImageUploadProps = {
  label?: string;
  /** The image already saved on the record, as a ready-to-use src. */
  currentUrl?: string;
  /** The newly picked file, owned by the parent form. */
  file: File | null;
  onFileChange: (file: File | null) => void;
  accept?: string;
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
 * Image field for the admin forms: a drop zone until something is chosen, then
 * a preview row with the file's details and the actions that apply to it.
 *
 * The browser's own file input is unusable as a design element - it renders a
 * grey "Choose File" button that ignores the theme and says nothing about what
 * is already saved - so it is kept hidden and driven from this UI.
 */
export const ImageUpload = ({
  label = 'Image',
  currentUrl = '',
  file,
  onFileChange,
  accept = 'image/*',
  maxSizeMb = 5,
  hint,
  disabled = false,
}: ImageUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  const filePreview = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file]);

  // Object URLs are held by the browser until revoked, so each preview is
  // released as soon as it is replaced or the field goes away.
  useEffect(() => () => {
    if (filePreview) URL.revokeObjectURL(filePreview);
  }, [filePreview]);

  const accepts = (candidate: File) => {
    if (!candidate.type.startsWith('image/')) {
      setError('That file is not an image. Choose a PNG, JPG or WEBP.');
      return false;
    }

    if (candidate.size > maxSizeMb * 1024 * 1024) {
      setError(`That image is ${formatSize(candidate.size)}. The limit is ${maxSizeMb} MB.`);
      return false;
    }

    setError('');
    return true;
  };

  const select = (candidate: File | undefined) => {
    if (!candidate || !accepts(candidate)) return;
    onFileChange(candidate);
  };

  const browse = () => {
    if (!disabled) inputRef.current?.click();
  };

  const clear = () => {
    onFileChange(null);
    setError('');
    // Without this the same file cannot be re-picked - the input still holds
    // it, so choosing it again fires no change event.
    if (inputRef.current) inputRef.current.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (!disabled) select(e.dataTransfer.files?.[0]);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setDragging(true);
  };

  const preview = filePreview || currentUrl;
  const isNew = Boolean(file);

  return (
    <div className="form-control w-full">
      <label className="label" htmlFor={inputId}>
        <span className="label-text font-medium">{label}</span>
      </label>

      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => select(e.target.files?.[0])}
      />

      {preview ? (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={() => setDragging(false)}
          className={`flex flex-col gap-4 rounded-[var(--radius-field)] border p-3 transition-colors sm:flex-row sm:items-center ${
            dragging ? 'border-primary bg-primary/5' : 'border-base-300 bg-base-100'
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt={isNew ? 'Selected image preview' : 'Current image'}
            className="h-24 w-24 shrink-0 rounded-lg border border-base-200 bg-base-200 object-cover"
          />

          <div className="min-w-0 flex-1">
            <span className={`badge badge-sm ${isNew ? 'badge-warning' : 'badge-ghost'} font-medium`}>
              {isNew
                ? currentUrl
                  ? 'New — replaces the current image on save'
                  : 'Ready to upload'
                : 'Current image'}
            </span>
            <p className="mt-2 truncate text-sm font-medium text-base-content">
              {isNew ? file!.name : 'Saved with this record'}
            </p>
            <p className="text-xs text-content-muted">
              {isNew
                ? `${formatSize(file!.size)} · ${file!.type.replace('image/', '').toUpperCase()}`
                : 'Upload a new image to replace it.'}
            </p>
          </div>

          <div className="flex shrink-0 gap-2">
            <button type="button" className="btn btn-sm btn-ghost gap-1.5" onClick={browse} disabled={disabled}>
              <RefreshCw size={14} />
              {isNew ? 'Change' : 'Replace'}
            </button>
            {isNew && (
              <button type="button" className="btn btn-sm btn-ghost gap-1.5 text-error" onClick={clear}>
                <Trash2 size={14} />
                Discard
              </button>
            )}
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled}
          onClick={browse}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              browse();
            }
          }}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={() => setDragging(false)}
          className={`flex flex-col items-center justify-center gap-1.5 rounded-[var(--radius-field)] border-2 border-dashed px-6 py-8 text-center transition-colors focus:outline-none focus-visible:ring-3 focus-visible:ring-primary/20 ${
            disabled
              ? 'cursor-not-allowed border-base-300 bg-base-200/60 opacity-60'
              : dragging
                ? 'cursor-pointer border-primary bg-primary/5'
                : 'cursor-pointer border-base-300 bg-base-200/40 hover:border-primary/60 hover:bg-primary/5'
          }`}
        >
          <ImageUp size={26} className="text-primary" strokeWidth={1.75} />
          <span className="text-sm font-medium text-base-content">
            Drag an image here, or <span className="text-primary">browse</span>
          </span>
          <span className="text-xs text-content-muted">
            {hint ?? `PNG, JPG or WEBP · up to ${maxSizeMb} MB`}
          </span>
        </div>
      )}

      {error && <p className="mt-2 text-xs font-medium text-error">{error}</p>}
    </div>
  );
};
