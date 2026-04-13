import { classifyItem, DEFAULT_CATEGORY } from './categoryEngine'
import { isPrintable, isJasaCetak } from './printingFeeEngine'

/**
 * Parse a currency/quantity string into a plain number.
 * K2/PSS exports in US format: comma = thousands separator, dot = decimal.
 * Examples: "5,500.00" → 5500 | "55,000.00" → 55000 | "10.000" → 10 | "200000" → 200000
 * @param {string} value
 * @returns {number}
 */
function parseNumber(value) {
  if (!value || value.trim() === '') return 0
  // Remove thousand-separator commas, then parse (dot stays as decimal point)
  const cleaned = value.trim().replace(/,/g, '')
  const result = parseFloat(cleaned)
  return isNaN(result) ? 0 : result
}

/**
 * Clean an item name by stripping leading codes like "[343]" or similar.
 * @param {string} name
 * @returns {string}
 */
function cleanName(name) {
  return name.replace(/^\[\d+\]\s*/, '').trim()
}

/**
 * Parse raw tab-separated ticket data from K2/PSS.
 *
 * Column layout (0-indexed):
 *   0: checkbox (false)
 *   1: line number (10, 20, 30...)
 *   2: item code
 *   3: item name (may include code prefix like [4592])
 *   4: (empty or description)
 *   5: quantity
 *   6: unit
 *   7: price per item
 *   8: line total
 *
 * @param {string} raw - pasted text from K2/PSS
 * @returns {Array} parsed items
 */
export function parseTicketData(raw) {
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  const items = []

  for (const line of lines) {
    const columns = line.split('\t')

    // Need at least 9 columns
    if (columns.length < 9) continue

    // Skip header rows
    const col3 = columns[3]?.trim() || ''
    if (!col3 || col3.toLowerCase() === 'name' || col3.toLowerCase() === 'description') continue

    const rawName = col3
    const name = cleanName(rawName)
    const rawQty = columns[5]?.trim() || ''   // keep original string for display
    const quantity = parseNumber(rawQty)
    const unit = columns[6]?.trim() || ''
    const price = parseNumber(columns[7])
    const total = parseNumber(columns[8])

    if (!name) continue

    const jasaCetak = isJasaCetak(name)
    // JASA CETAK items go to their home "JASA CETAK" category; regular items classify normally
    const category = jasaCetak ? 'JASA CETAK' : classifyItem(name)

    const printable = isPrintable(name)

    items.push({
      id: `item_${items.length}_${Date.now()}`,
      name,
      rawQty,
      quantity,
      unit,
      price: jasaCetak ? null : price,
      total: jasaCetak ? 0 : total,
      category,
      printable,
      isPrintingFee: false,
      isJasaCetak: jasaCetak,
      jasaCetakRate: jasaCetak ? 0.10 : undefined,
    })
  }

  return items
}

