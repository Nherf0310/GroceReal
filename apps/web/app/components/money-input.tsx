'use client';

import React, { useState } from 'react';
import { useCurrency } from '../context/currency-context';
import { formatMoney, convert } from '../lib/currency';
import { AlertCircle } from 'lucide-react';

interface MoneyInputProps {
  label?: string;
  id?: string;
  value: number; // integer cents in USD
  onChange: (cents: number) => void;
  error?: string | null;
  required?: boolean;
  min?: number;
  disabled?: boolean;
  placeholder?: string;
  hint?: React.ReactNode;
}

export default function MoneyInput({
  label = 'Price (USD)',
  id,
  value,
  onChange,
  error,
  required,
  min = 0,
  disabled,
  placeholder = '0.00',
  hint,
}: MoneyInputProps) {
  const { currency } = useCurrency();
  const [prevValue, setPrevValue] = useState(value);
  const [textValue, setTextValue] = useState<string>(
    value ? (value / 100).toString() : ''
  );

  if (prevValue !== value) {
    setPrevValue(value);
    setTextValue(value ? (value / 100).toString() : '');
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setTextValue(raw);
    const parsed = parseFloat(raw);
    if (isNaN(parsed) || parsed < 0) {
      onChange(0);
    } else {
      const cents = Math.round(parsed * 100);
      onChange(cents);
    }
  };

  const phpEquivalent =
    currency === 'PHP' && value > 0
      ? `≈ ${formatMoney(convert(value, 'USD', 'PHP'), 'PHP')}`
      : null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="block text-xs font-semibold text-slate-700">
          {label}
          {required && <span className="text-rose-500 ml-1">*</span>}
        </label>
        {phpEquivalent ? (
          <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
            {phpEquivalent}
          </span>
        ) : hint ? (
          <span className="text-[11px] text-slate-400">{hint}</span>
        ) : null}
      </div>

      <div className="relative rounded-xl shadow-xs">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <span className="text-xs font-semibold text-slate-400">USD</span>
        </div>
        <input
          type="number"
          step="0.01"
          min={min}
          id={id}
          disabled={disabled}
          value={textValue}
          onChange={handleChange}
          placeholder={placeholder}
          className={`block w-full rounded-xl border pl-12 pr-3 py-2 text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition ${
            error
              ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20'
              : 'border-slate-300 focus:border-emerald-500'
          } ${disabled ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
        />
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium mt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
