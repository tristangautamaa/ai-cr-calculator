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
  // Track the most recently seen non-JASA-CETAK category so we can
  // assign JASA CETAK lines to the category they belong to.
  let lastCategory = DEFAULT_CATEGORY

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
    // JASA CETAK lines inherit the last seen category; regular items classify normally
    const category = jasaCetak ? lastCategory : classifyItem(name)
    if (!jasaCetak) lastCategory = category

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
    })
  }

  return redistributeJasaCetak(items)
}

/**
 * Enforce max 1 JASA CETAK line per category.
 *
 * After positional assignment, duplicates can occur when multiple JASA CETAK
 * lines appear back-to-back (they all inherit the same lastCategory).
 * This redistributes extras to categories that have printable items but no
 * JASA CETAK yet, in the order those categories first appear. Truly excess
 * JASA CETAK lines (more than the number of printable categories) are dropped.
 *
 * @param {Array} items
 * @returns {Array}
 */
function redistributeJasaCetak(items) {
  const regularItems = items.filter((i) => !i.isJasaCetak)
  const jasaCetakItems = items.filter((i) => i.isJasaCetak)

  if (jasaCetakItems.length === 0) return items

  // Categories with printable items, in first-appearance order
  const printableCategoriesOrdered = []
  const seen = new Set()
  for (const item of regularItems) {
    if (item.printable && !seen.has(item.category)) {
      printableCategoriesOrdered.push(item.category)
      seen.add(item.category)
    }
  }

  // Assign at most one JASA CETAK per category; extras try to fill unassigned ones
  const assigned = new Set()
  const result = [...regularItems]
  const leftovers = []

  for (const jc of jasaCetakItems) {
    if (!assigned.has(jc.category)) {
      assigned.add(jc.category)
      result.push(jc)
    } else {
      leftovers.push(jc)
    }
  }

  for (const jc of leftovers) {
    const target = printableCategoriesOrdered.find((cat) => !assigned.has(cat))
    if (target) {
      assigned.add(target)
      result.push({ ...jc, category: target })
    }
    // else: truly excess — discard
  }

  return result
}
