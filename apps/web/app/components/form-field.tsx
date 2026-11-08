'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string | null;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export default function FormField({
  label,
  htmlFor,
  required,
  error,
  hint,
  children,
  className = '',
}: FormFieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label htmlFor={htmlFor} className="block text-xs font-semibold text-slate-700">
          {label}
          {required && <span className="text-rose-500 ml-1">*</span>}
        </label>
        {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
      </div>
      <div>{children}</div>
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium mt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

