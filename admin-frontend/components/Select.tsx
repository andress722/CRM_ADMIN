"use client";

import { useEffect, useMemo, useRef, useState } from 'react';

export type SelectOption = {
  value: string;
  label: string;
};

type SelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
};

export default function Select({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  className,
  buttonClassName,
  menuClassName,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedLabel = useMemo(() => {
    return options.find((option) => option.value === value)?.label ?? '';
  }, [options, value]);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <div ref={wrapperRef} className={`relative ${className ?? ''}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between gap-2 border rounded px-2 py-1 text-sm bg-slate-950 text-slate-100 disabled:opacity-60 ${
          buttonClassName ?? ''
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={value ? 'text-slate-100' : 'text-slate-400'}>
          {value ? selectedLabel : placeholder ?? 'Selecionar'}
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4 text-slate-400"
        >
          <path d="M5.5 7.5l4.5 4.5 4.5-4.5" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute left-0 right-0 mt-1 max-h-56 overflow-auto rounded border border-slate-700 bg-slate-950 text-slate-100 shadow-lg z-30 ${
            menuClassName ?? ''
          }`}
        >
          {placeholder && (
            <button
              type="button"
              role="option"
              aria-selected={value === ''}
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className="flex w-full items-center px-3 py-2 text-left text-sm text-slate-400 hover:bg-slate-800"
            >
              {placeholder}
            </button>
          )}
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={value === option.value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`flex w-full items-center px-3 py-2 text-left text-sm hover:bg-slate-800 ${
                value === option.value ? 'bg-slate-800/60 text-slate-100' : 'text-slate-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
