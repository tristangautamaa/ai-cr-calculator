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
 * Detect format type based on column count
 * @param {Array} columns
 * @returns {string} 'old' for 9-column format, 'new' for 30+ column format
 */
function detectFormat(columns) {
  if (columns.length >= 28) return 'new'
  if (columns.length >= 9) return 'old'
  return null
}

/**
 * Parse new format (30+ columns)
 * Column layout (0-indexed):
 *   18: item name (may include code prefix like [4906])
 *   19: quantity
 *   20: unit
 *   23: vendor 1 unit price
 *   24: vendor 1 total price
 *   25: vendor 2 unit price (optional)
 *   26: vendor 2 total price (optional)
 *
 * @param {Array} columns
 * @returns {Object} parsed item data or null
 */
function parseNewFormat(columns) {
  if (columns.length < 25) return null

  const rawName = columns[18]?.trim() || ''
  if (!rawName || rawName.toLowerCase() === 'description' || rawName.toLowerCase() === 'name') return null

  const name = cleanName(rawName)
  const rawQty = columns[19]?.trim() || ''
  const quantity = parseNumber(rawQty)
  const unit = columns[20]?.trim() || ''
  const price = parseNumber(columns[23])
  const total = parseNumber(columns[24])

  if (!name) return null

  // Check for vendor 2 data (columns 25-26)
  const vendor2Price = columns.length > 25 ? parseNumber(columns[25]) : 0
  const vendor2Total = columns.length > 26 ? parseNumber(columns[26]) : 0
  const hasVendor2 = vendor2Price > 0 || vendor2Total > 0

  return {
    name,
    rawQty,
    quantity,
    unit,
    price,
    total,
    vendor2: hasVendor2 ? { price: vendor2Price, total: vendor2Total } : null
  }
}

/**
 * Parse old format (9 columns)
 * Column layout (0-indexed):
 *   3: item name
 *   5: quantity
 *   6: unit
 *   7: price per item
 *   8: line total
 *
 * @param {Array} columns
 * @returns {Object} parsed item data or null
 */
function parseOldFormat(columns) {
  if (columns.length < 9) return null

  const rawName = columns[3]?.trim() || ''
  if (!rawName || rawName.toLowerCase() === 'name' || rawName.toLowerCase() === 'description') return null

  const name = cleanName(rawName)
  const rawQty = columns[5]?.trim() || ''
  const quantity = parseNumber(rawQty)
  const unit = columns[6]?.trim() || ''
  const price = parseNumber(columns[7])
  const total = parseNumber(columns[8])

  if (!name) return null

  return { name, rawQty, quantity, unit, price, total }
}

/**
 * Sort items by category and then by name to group same items together
 * @param {Array} items
 * @returns {Array} sorted items
 */
function groupItemsByName(items) {
  return items.sort((a, b) => {
    // JASA CETAK always comes last
    if (a.isJasaCetak && !b.isJasaCetak) return 1
    if (!a.isJasaCetak && b.isJasaCetak) return -1
    if (a.isJasaCetak && b.isJasaCetak) return a.name.localeCompare(b.name)

    // Sort by name to group same items together
    return a.name.localeCompare(b.name)
  })
}

/**
 * Parse raw tab-separated ticket data from K2/PSS.
 *
 * Supports two formats:
 * - Old format (9 columns): checkbox, line, code, name, desc, qty, unit, price, total
 * - New format (30+ columns): with name at col 18, qty at 19, unit at 20, prices at 23/26
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
    const format = detectFormat(columns)

    if (!format) continue

    let parsed = null
    if (format === 'new') {
      parsed = parseNewFormat(columns)
    } else {
      parsed = parseOldFormat(columns)
    }

    if (!parsed) continue

    const { name, rawQty, quantity, unit, price, total, vendor2 } = parsed
    const jasaCetak = isJasaCetak(name)
    const category = jasaCetak ? 'JASA CETAK' : classifyItem(name)
    const printable = isPrintable(name)

    const item = {
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
    }

    // Add vendor 2 data if present
    if (vendor2) {
      item.vendorData = {
        vendor_2: {
          quantity,
          price: jasaCetak ? null : vendor2.price,
          total: jasaCetak ? 0 : vendor2.total,
        }
      }
    }

    items.push(item)
  }

  // Group items by name so duplicates appear together
  return groupItemsByName(items)
}

