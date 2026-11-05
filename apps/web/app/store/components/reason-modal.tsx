'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface ReasonModalProps {
  title: string;
  placeholder?: string;
  confirmLabel?: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export function ReasonModal({
  title,
  placeholder = 'Enter reason…',
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
}: ReasonModalProps) {
  const [reason, setReason] = useState('');
  const trimmed = reason.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-start justify-between p-5 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">
          <label className="block text-xs font-medium text-slate-600 mb-1.5">
            Reason <span className="text-rose-500">*</span>
          </label>
          <textarea
            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            rows={3}
            placeholder={placeholder}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            autoFocus
          />
          {!trimmed && (
            <p className="text-xs text-rose-500 mt-1">Reason is required</p>
          )}
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => { if (trimmed) onConfirm(trimmed); }}
            disabled={!trimmed}
            className="flex-1 px-4 py-2 text-sm font-medium text-white rounded-xl transition bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
