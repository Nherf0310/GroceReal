'use client';

import { useCurrency } from '../context/currency-context';

export default function CurrencyToggle() {
  const { currency, setCurrency } = useCurrency();

  return (
    <div className="inline-flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs font-semibold">
      <button
        type="button"
        onClick={() => setCurrency('USD')}
        className={`px-2 py-1 rounded-md transition-colors ${
          currency === 'USD'
            ? 'bg-white text-emerald-700 shadow-xs font-bold'
            : 'text-slate-500 hover:text-slate-900'
        }`}
        aria-label="USD Dollar"
      >
        USD $
      </button>
      <button
        type="button"
        onClick={() => setCurrency('PHP')}
        className={`px-2 py-1 rounded-md transition-colors ${
          currency === 'PHP'
            ? 'bg-white text-emerald-700 shadow-xs font-bold'
            : 'text-slate-500 hover:text-slate-900'
        }`}
        aria-label="PHP Peso"
      >
        PHP ₱
      </button>
    </div>
  );
}

