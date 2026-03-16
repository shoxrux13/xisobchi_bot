/**
 * Parses a user-entered amount string into a positive integer (minor units).
 * Supports formats: "500000", "500 000", "500,000", "500_000", "1500.50"
 * Returns null if invalid or non-positive.
 */
export function parseAmount(text: string): number | null {
  const cleaned = text.replace(/[\s_]/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  if (isNaN(n) || n <= 0 || !isFinite(n)) return null;
  return Math.round(n);
}

/**
 * Formats a bigint or number amount with thousands separator.
 * Example: 1500000 → "1 500 000"
 */
export function formatAmount(amountMinor: bigint | number): string {
  return Number(amountMinor).toLocaleString('ru-RU');
}
