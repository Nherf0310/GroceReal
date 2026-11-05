import React from 'react';

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; dot: string }
> = {
  READY_FOR_DELIVERY: {
    label: 'Ready for Pickup',
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-800',
    dot: 'bg-amber-500',
  },
  OUT_FOR_DELIVERY: {
    label: 'Out for Delivery',
    bg: 'bg-blue-50 border-blue-200',
    text: 'text-blue-800',
    dot: 'bg-blue-500',
  },
  DELIVERED: {
    label: 'Delivered',
    bg: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-800',
    dot: 'bg-emerald-500',
  },
  DELIVERY_FAILED: {
    label: 'Delivery Failed',
    bg: 'bg-rose-50 border-rose-200',
    text: 'text-rose-800',
    dot: 'bg-rose-500',
  },
  CANCELLED: {
    label: 'Cancelled',
    bg: 'bg-slate-100 border-slate-200',
    text: 'text-slate-700',
    dot: 'bg-slate-400',
  },
  PENDING: {
    label: 'Pending',
    bg: 'bg-yellow-50 border-yellow-200',
    text: 'text-yellow-800',
    dot: 'bg-yellow-500',
  },
  CONFIRMED: {
    label: 'Confirmed',
    bg: 'bg-teal-50 border-teal-200',
    text: 'text-teal-800',
    dot: 'bg-teal-500',
  },
  PICKING: {
    label: 'Picking',
    bg: 'bg-indigo-50 border-indigo-200',
    text: 'text-indigo-800',
    dot: 'bg-indigo-500',
  },
  REJECTED: {
    label: 'Rejected',
    bg: 'bg-rose-50 border-rose-200',
    text: 'text-rose-800',
    dot: 'bg-rose-500',
  },
};

export default function StatusBadge({
  status,
  labelOverride,
}: {
  status: string;
  labelOverride?: string;
}) {
  const config = STATUS_CONFIG[status] ?? {
    label: status.replace(/_/g, ' '),
    bg: 'bg-slate-50 border-slate-200',
    text: 'text-slate-700',
    dot: 'bg-slate-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg} ${config.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {labelOverride ?? config.label}
    </span>
  );
}
