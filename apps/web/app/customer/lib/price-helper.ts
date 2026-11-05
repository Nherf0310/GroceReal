import { Currency, formatMoney } from '../../lib/currency';
import { UnitType } from '../types';

/**
 * Calculates line price in cents.
 * For WEIGHT items: grams x price per kg / 1000, rounded to the nearest cent.
 * For EACH items: units x price per unit.
 */
export function calculateItemPrice(
  priceInCents: number,
  quantity: number,
  unitType: UnitType | string
): number {
  if (unitType === 'WEIGHT') {
    return Math.round((priceInCents * quantity) / 1000);
  }
  return Math.round(priceInCents * quantity);
}

/**
 * Formats a weight or unit quantity for display.
 * Weight quantities: shows in kg (or grams if < 1000g). E.g. "0.25 kg" or "1.5 kg".
 * Unit quantities: shows e.g. "2 packs", "1 each".
 */
export function formatQuantity(
  quantity: number,
  unitType: UnitType | string,
  unitLabel: string = 'each'
): string {
  if (unitType === 'WEIGHT') {
    const inKg = quantity / 1000;
    // Format nicely without trailing zeros if integer, e.g. 1 kg or 0.25 kg
    const formattedKg = Number.isInteger(inKg)
      ? `${inKg} kg`
      : `${inKg.toFixed(2).replace(/\.?0+$/, '')} kg`;
    return formattedKg;
  }
  return `${quantity} ${unitLabel}`;
}

/**
 * Formats product unit price string.
 * Weight: formatMoney(price, currency) + "/kg"
 * Unit: formatMoney(price, currency) + "/" + unitLabel
 */
export function formatUnitPrice(
  priceInCents: number,
  unitType: UnitType | string,
  unitLabel: string = 'each',
  currency: Currency = 'USD'
): string {
  const formatted = formatMoney(priceInCents, currency);
  if (unitType === 'WEIGHT') {
    return `${formatted}/kg`;
  }
  return `${formatted}/${unitLabel}`;
}

/**
 * Formats estimated price label for weight items or standard price for unit items.
 * Weight: "Est. " + formatMoney(...)
 */
export function formatEstimatedPrice(
  priceInCents: number,
  quantity: number,
  unitType: UnitType | string,
  currency: Currency = 'USD'
): string {
  const cents = calculateItemPrice(priceInCents, quantity, unitType);
  const formatted = formatMoney(cents, currency);
  if (unitType === 'WEIGHT') {
    return `Est. ${formatted}`;
  }
  return formatted;
}

