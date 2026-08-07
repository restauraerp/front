'use client';
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

export type SearchSelectOption = {
  value: string | number;
  label: string;
  /** Secondary line - SKU, phone number, whatever tells two similar rows apart. */
  hint?: string;
};

type SearchSelectProps = {
  label?: string;
  value: string | number | '';
  onChange: (value: string | number | '') => void;
  options: SearchSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  required?: boolean;
  disabled?: boolean;
  clearable?: boolean;
  className?: string;
};

/**
 * A select you can type into.
 *
 * A restaurant with sixty inventory items or thirty suppliers cannot be picked
 * from a native <select> - the list is longer than the screen and there is
 * nothing to search it with. This keeps the theme's field styling and adds the
 * filter, so the two behave the same everywhere they sit side by side.
 */
export const SearchSelect = ({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select…',
  searchPlaceholder = 'Type to search…',
  emptyText = 'Nothing matches that search.',
  required = false,
  disabled = false,
  clearable = false,
  className = '',
}: SearchSelectProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const selected = options.find((option) => String(option.value) === String(value));

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(needle) || option.hint?.toLowerCase().includes(needle),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  // The point of opening the list is to type into it.
  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  const choose = (option: SearchSelectOption) => {
    onChange(option.value);
    setOpen(false);
    setQuery('');
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!open && (event.key === 'ArrowDown' || event.key === 'Enter')) {
      event.preventDefault();
      setOpen(true);
      return;
    }

    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlighted((current) => {
        const next = event.key === 'ArrowDown' ? current + 1 : current - 1;
        return Math.max(0, Math.min(matches.length - 1, next));
      });
      return;
    }

    if (event.key === 'Enter' && matches[highlighted]) {
      event.preventDefault();
      choose(matches[highlighted]);
    }
  };

  return (
    <div className={`form-control w-full ${className}`} ref={containerRef}>
      {label && (
        <label className="label">
          <span className="label-text font-medium">
            {label}
            {required && <span className="ml-0.5 text-error">*</span>}
          </span>
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((current) => !current)}
          onKeyDown={onKeyDown}
          className={`input input-bordered flex w-full items-center justify-between gap-2 text-left ${
            disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
          }`}
        >
          <span className={`truncate ${selected ? 'text-base-content' : 'text-content-muted'}`}>
            {selected ? selected.label : placeholder}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            {clearable && selected && !disabled && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Clear selection"
                className="rounded p-0.5 text-content-muted hover:text-error"
                onClick={(event) => {
                  event.stopPropagation();
                  onChange('');
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    event.stopPropagation();
                    onChange('');
                  }
                }}
              >
                <X size={14} />
              </span>
            )}
            <ChevronDown size={16} className="text-content-muted" />
          </span>
        </button>

        {open && (
          <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-[var(--radius-field)] border border-base-300 bg-base-100 shadow-lg">
            <div className="flex items-center gap-2 border-b border-base-200 px-3 py-2">
              <Search size={14} className="shrink-0 text-content-muted" />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setHighlighted(0);
                }}
                onKeyDown={onKeyDown}
                placeholder={searchPlaceholder}
                className="w-full bg-transparent text-sm outline-none placeholder:text-content-muted"
              />
            </div>

            <ul id={listId} role="listbox" className="max-h-60 overflow-y-auto py-1">
              {matches.length === 0 ? (
                <li className="px-3 py-3 text-sm text-content-muted">{emptyText}</li>
              ) : (
                matches.map((option, index) => {
                  const isSelected = String(option.value) === String(value);
                  return (
                    <li key={option.value}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onMouseEnter={() => setHighlighted(index)}
                        onClick={() => choose(option)}
                        className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors ${
                          index === highlighted ? 'bg-primary/10' : ''
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-base-content">{option.label}</span>
                          {option.hint && (
                            <span className="block truncate text-xs text-content-muted">{option.hint}</span>
                          )}
                        </span>
                        {isSelected && <Check size={14} className="shrink-0 text-primary" />}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
