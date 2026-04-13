/**
 * Shared formatters for currency and quantity display.
 */

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

/**
 * Format a number as Indonesian Rupiah.
 * e.g. 5500 → "Rp 5.500", 20010000 → "Rp 20.010.000"
 * @param {number|null} value
 * @returns {string}
 */
export function formatCurrency(value) {
  if (value === null || value === undefined) return '—'
  return currencyFormatter.format(value)
}

/**
 * Format a plain quantity number (no currency symbol).
 * Preserves up to 3 decimal places.
 * e.g. 5.5 → "5,5", 100.05 → "100,05", 75 → "75"
 * @param {number|null} value
 * @returns {string}
 */
export function formatQty(value) {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(value)
}
