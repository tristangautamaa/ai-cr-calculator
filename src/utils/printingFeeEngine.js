/**
 * Keywords that mark an item as printable (eligible for printing fee).
 */
const PRINTABLE_KEYWORDS = ['STICKER', 'PRINT', 'CETAK', 'LABEL', 'FORM', 'GRAFIS', 'FLEXY']

export const PRINTING_FEE_RATE = 0.10

/**
 * Determine if a line item is a "Jasa Cetak" (printing service) entry.
 * @param {string} name
 * @returns {boolean}
 */
export function isJasaCetak(name) {
  return name.toUpperCase().includes('JASA CETAK')
}

/**
 * Determine if an item is printable based on its name.
 * Jasa Cetak lines are excluded — they are the fee, not the printed goods.
 * @param {string} name
 * @returns {boolean}
 */
export function isPrintable(name) {
  if (isJasaCetak(name)) return false
  const upper = name.toUpperCase()
  return PRINTABLE_KEYWORDS.some((kw) => upper.includes(kw))
}

/**
 * Calculate printing fee from a list of parsed items.
 * @param {Array} items - parsed item objects
 * @returns {number} printing fee amount
 */
export function calculatePrintingFee(items) {
  const printingBase = items
    .filter((item) => item.printable)
    .reduce((sum, item) => sum + item.total, 0)
  return Math.round(printingBase * PRINTING_FEE_RATE)
}

/**
 * Calculate the computed printing fee (10%) for items within a single category.
 * Supports the default vendor as well as comparison vendors.
 * @param {Array} categoryItems
 * @param {string} vendorId
 * @returns {number}
 */
export function calculateCategoryPrintingFee(categoryItems, vendorId = 'vendor_1') {
  const base = categoryItems
    .filter((item) => item.printable)
    .reduce((sum, item) => {
      const lineTotal = vendorId === 'vendor_1'
        ? item.total
        : (item.vendorData?.[vendorId]?.total ?? 0)
      return sum + lineTotal
    }, 0)
  return Math.round(base * PRINTING_FEE_RATE)
}

/**
 * Create the printing fee line item.
 * @param {number} fee
 * @returns {object}
 */
export function createPrintingFeeRow(fee) {
  return {
    id: '__printing_fee__',
    name: 'PRINTING FEE',
    quantity: 1,
    unit: 'JOB',
    price: null,
    total: fee,
    category: 'PRINTING FEE',
    printable: false,
    isPrintingFee: true,
  }
}
