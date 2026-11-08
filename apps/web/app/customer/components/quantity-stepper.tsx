'use client';

import React from 'react';
import { Plus, Minus } from 'lucide-react';
import { UnitType } from '../types';
import { formatQuantity } from '../lib/price-helper';

interface QuantityStepperProps {
  quantity: number;
  unitType: UnitType | string;
  unitLabel?: string;
  onChange: (quantity: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function QuantityStepper({
  quantity,
  unitType,
  unitLabel = 'each',
  onChange,
  min = 0,
  max,
  disabled = false,
  size = 'md',
}: QuantityStepperProps) {
  const isWeight = unitType === 'WEIGHT';
  const step = isWeight ? 250 : 1;

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (disabled) return;
    const next = Math.max(min, quantity - step);
    onChange(next);
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (disabled) return;
    let next = quantity + step;
    if (max !== undefined && next > max) {
      next = max;
    }
    onChange(next);
  };

  const canDecrement = !disabled && quantity > min;
  const canIncrement = !disabled && (max === undefined || quantity < max);

  const displayQuantity = isWeight
    ? formatQuantity(quantity, 'WEIGHT')
    : `${quantity}`;

  const buttonSizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-7 h-7 text-sm',
    lg: 'w-9 h-9 text-base',
  }[size];

  const textSizeClasses = {
    sm: 'text-xs min-w-[3rem]',
    md: 'text-xs min-w-[3.5rem]',
    lg: 'text-sm min-w-[4rem]',
  }[size];

  return (
    <div
      className="inline-flex items-center gap-1 bg-slate-100 rounded-xl p-1 border border-slate-200 select-none shadow-xs"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={handleDecrement}
        disabled={!canDecrement}
        aria-label="Decrease quantity"
        className={`flex items-center justify-center rounded-lg font-bold transition-all ${
          canDecrement
            ? 'bg-white text-slate-700 hover:bg-slate-200 active:scale-95 shadow-xs'
            : 'bg-transparent text-slate-300 cursor-not-allowed'
        } ${buttonSizeClasses}`}
      >
        <Minus className="w-3.5 h-3.5" />
      </button>

      <span
        className={`text-center font-bold text-slate-800 tabular-nums px-1 ${textSizeClasses}`}
        title={`${displayQuantity} (${quantity} ${isWeight ? 'grams' : unitLabel})`}
      >
        {displayQuantity}
      </span>

      <button
        type="button"
        onClick={handleIncrement}
        disabled={!canIncrement}
        aria-label="Increase quantity"
        className={`flex items-center justify-center rounded-lg font-bold transition-all ${
          canIncrement
            ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 shadow-xs'
            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
        } ${buttonSizeClasses}`}
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

