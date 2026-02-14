"use client";

type DateInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

export default function DateInput({ value, onChange, placeholder, className, disabled }: DateInputProps) {
  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder={placeholder ?? 'YYYY-MM-DD'}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      className={`border rounded px-2 py-1 text-sm bg-slate-950 text-slate-100 placeholder:text-slate-500 ${
        className ?? ''
      }`}
    />
  );
}
