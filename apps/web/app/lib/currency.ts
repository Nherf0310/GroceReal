export type Currency = 'USD' | 'PHP';

export const BASE_CURRENCY: Currency = 'USD';
export const SUPPORTED: Currency[] = ['USD', 'PHP'];

// placeholder, update to the real rate
export const USD_TO_PHP_RATE: number =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_USD_PHP_RATE
    ? parseFloat(process.env.NEXT_PUBLIC_USD_PHP_RATE) || 56
    : 56;

export function convert(
  cents: number,
  fromCurrency: Currency = BASE_CURRENCY,
  toCurrency: Currency = BASE_CURRENCY
): number {
  if (fromCurrency === toCurrency) return cents;
  if (fromCurrency === 'USD' && toCurrency === 'PHP') {
    return Math.round(cents * USD_TO_PHP_RATE);
  }
  if (fromCurrency === 'PHP' && toCurrency === 'USD') {
    return Math.round(cents / USD_TO_PHP_RATE);
  }
  return cents;
}

export function formatMoney(cents: number, currency: Currency = BASE_CURRENCY): string {
  const locale = currency === 'PHP' ? 'en-PH' : 'en-US';
  const amount = (cents || 0) / 100;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

