import { classifyItem } from './categoryEngine'
import { isJasaCetak } from './printingFeeEngine'

// ── Number parse (K2/PSS format) ──────────────────────────────────────────────

function parseNum(val) {
  if (!val && val !== 0) return 0
  const cleaned = String(val).trim().replace(/,/g, '')
  return parseFloat(cleaned) || 0
}

// ── Article code helpers ──────────────────────────────────────────────────────

function isValidArticleCode(s) {
  return /^([0-9]{5,}|[A-Z][0-9]{4,})$/.test(String(s || '').trim())
}

function extractArticleFromName(name) {
  // Remove [N] prefix, then check if remaining starts with an article code
  const cleaned = String(name || '').replace(/^\[\d+\]\s*/, '').trim()
  const m = cleaned.match(/^([0-9]{5,}|[A-Z][0-9]{4,})\b/)
  return m ? m[1] : null
}

// ── Ticket parser (ATK-specific, extracts article codes) ──────────────────────

// Injection format: col 16 starts with [N], col 19 is a warehouse string (non-numeric).
// Layout: 16=name+article, 17=qty, 18=unit, 21=v1 unit price, 23=v2 unit price, 25=v3 unit price
function isInjectionFormat(cols) {
  return cols.length >= 25 && /^\[\d+\]/.test((cols[16] || '').trim())
}

/**
 * Parse raw ticket TSV and return all non-JASA-CETAK items with article codes.
 *
 * Col layout (old/medium format, 9–27 cols):
 *   3: name, 4: article, 5: qty, 6: unit, 7: price
 *
 * Col layout (new format, 28+ cols):
 *   18: name, 19: qty, 20: unit, 23: price
 *
 * Col layout (injection / multi-vendor format, 25+ cols, col 16 starts with [N]):
 *   16: "[N] articleCode name", 17: qty, 18: unit
 *   21: vendor-1 unit price, 23: vendor-2 unit price, 25: vendor-3 unit price
 *
 * Returns { items, excluded, vendorCount }
 *   vendorCount: max number of non-zero vendor price columns seen in any single row
 */
export function parseTicketForATK(raw) {
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  const items = []
  const excluded = []
  let maxVendorCount = 1

  for (const line of lines) {
    const cols = line.split('\t')
    if (cols.length < 9) continue

    let rawName = '', articleCode = null, qty = 0, unit = '', price = 0
    let vendorPrices = null // only set for injection format

    if (isInjectionFormat(cols)) {
      // Multi-vendor injection format
      rawName = (cols[16] || '').trim()
      qty = parseNum(cols[17])
      unit = (cols[18] || '').trim()

      const v1 = parseNum(cols[21])
      const v2 = parseNum(cols[23])
      const v3 = cols.length > 25 ? parseNum(cols[25]) : 0

      const rowVendorCount = (v1 > 0 ? 1 : 0) + (v2 > 0 ? 1 : 0) + (v3 > 0 ? 1 : 0)
      if (rowVendorCount > maxVendorCount) maxVendorCount = rowVendorCount

      price = v1 > 0 ? v1 : v2 > 0 ? v2 : v3
      // Per-vendor prices so cross-reference compares each vendor against their own data price
      vendorPrices = [v1, v2, v3]

      // Extract article code from "[N] articleCode name" and strip both prefixes for the clean name
      const stripped = rawName.replace(/^\[\d+\]\s*/, '').trim()
      const codeMatch = stripped.match(/^([0-9]{5,}|[A-Z][0-9]{4,})\b/)
      if (codeMatch) {
        articleCode = codeMatch[1]
        rawName = stripped.replace(codeMatch[1], '').trim()
      } else {
        rawName = stripped
      }
    } else if (cols.length >= 28) {
      // New format
      rawName = (cols[18] || '').trim()
      qty = parseNum(cols[19])
      unit = (cols[20] || '').trim()

      const v1 = parseNum(cols[23])
      const v2 = cols.length > 25 ? parseNum(cols[25]) : 0
      const v3 = cols.length > 27 ? parseNum(cols[27]) : 0

      const rowVendorCount = (v1 > 0 ? 1 : 0) + (v2 > 0 ? 1 : 0) + (v3 > 0 ? 1 : 0)
      if (rowVendorCount > maxVendorCount) maxVendorCount = rowVendorCount

      price = v1 > 0 ? v1 : v2 > 0 ? v2 : v3
      if (rowVendorCount > 1) vendorPrices = [v1, v2, v3]

      const col4 = (cols[4] || '').trim()
      articleCode = isValidArticleCode(col4) ? col4 : extractArticleFromName(rawName)
    } else {
      // Old/medium format
      rawName = (cols[3] || '').trim()
      const col4 = (cols[4] || '').trim()
      articleCode = isValidArticleCode(col4) ? col4 : extractArticleFromName(rawName)
      qty = parseNum(cols[5])
      unit = (cols[6] || '').trim()
      price = parseNum(cols[7])
    }

    // Strip [N] prefix from name (for old/new formats that still have it)
    const name = rawName.replace(/^\[\d+\]\s*/, '').trim()
    if (!name) continue

    const category = isJasaCetak(name) ? 'JASA CETAK' : classifyItem(name)

    if (category !== 'ATK GENERAL') {
      excluded.push({ name, articleCode, qty, unit, price, category, ...(vendorPrices ? { vendorPrices } : {}) })
      continue
    }

    items.push({
      id: `atk_${items.length}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      articleCode,
      qty,
      unit,
      price,
      category,
      ...(vendorPrices ? { vendorPrices } : {}),
    })
  }

  return { items, excluded, vendorCount: maxVendorCount }
}

/**
 * Re-recognize a previously-excluded item as ATK GENERAL and cross-reference it.
 * Used when the auto-classifier wrongly excluded an item.
 * Returns a single enriched item (same shape as crossReference output).
 */
export function reclassifyExcludedAsATK(excludedItem, quotations) {
  const ticketItem = {
    id: `atk_reclass_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: excludedItem.name,
    articleCode: excludedItem.articleCode,
    qty: excludedItem.qty,
    unit: excludedItem.unit,
    price: excludedItem.price,
    category: 'ATK GENERAL',
    ...(excludedItem.vendorPrices ? { vendorPrices: excludedItem.vendorPrices } : {}),
  }
  const [matched] = crossReference([ticketItem], quotations)
  return matched
}

// ── Fuzzy name similarity ─────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'UK', 'MM', 'CM', 'NO', 'ISI', 'MERK', 'BAHAN', 'SIZE', 'PCS', 'PAC',
  'PACK', 'ROLL', 'ROL', 'EA', 'SET', 'UNIT', 'LEMBAR', 'LBR', 'TUBE',
  '1', '2', '3', '4', '5', 'X', 'DAN', 'DI', 'DAN', 'UNTUK', 'TYPE',
])

function tokenize(s) {
  return s
    .toUpperCase()
    .split(/[\s\-\/\(\),.;:]+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
}

function jaccard(a, b) {
  const setA = new Set(tokenize(a))
  const setB = new Set(tokenize(b))
  if (setA.size === 0 || setB.size === 0) return 0
  const intersection = [...setA].filter((w) => setB.has(w)).length
  const union = new Set([...setA, ...setB]).size
  return intersection / union
}

// ── Cross-reference ───────────────────────────────────────────────────────────

const FUZZY_THRESHOLD = 0.35

/**
 * For each ticket item, find the best match in each quotation.
 * Returns enriched items with `quotationMatches` (one per quotation slot) and `status`.
 *
 * quotationMatches[i]:
 *   { found: false }
 *   OR
 *   { found: true, price, unit, matchSource, confidence, matchedRow }
 *
 * status: 'ALL_MATCH' | 'PARTIAL_MATCH' | 'DIFFERS' | 'NO_REF'
 */
export function crossReference(ticketItems, quotations) {
  return ticketItems.map((item) => {
    const quotationMatches = quotations.map((quotation) => {
      if (!quotation?.items?.length) return { found: false }

      // 1) Exact article code match
      if (item.articleCode) {
        const exact = quotation.items.find((q) => q.articleCode === item.articleCode)
        if (exact) {
          return {
            found: true,
            price: exact.price,
            unit: exact.unit,
            matchSource: 'Art. Code (exact)',
            confidence: 1.0,
            matchedRow: exact,
          }
        }
      }

      // 2) Fuzzy name match — try vendor display name, standard ATK altName, and rawDesc
      let best = null
      let bestScore = 0
      for (const q of quotation.items) {
        const score = Math.max(
          jaccard(item.name, q.name),
          q.altName ? jaccard(item.name, q.altName) : 0,
          q.rawDesc ? jaccard(item.name, q.rawDesc) : 0,
        )
        if (score > bestScore) { bestScore = score; best = q }
      }

      if (bestScore >= FUZZY_THRESHOLD) {
        return {
          found: true,
          price: best.price,
          unit: best.unit,
          matchSource: `Name (${Math.round(bestScore * 100)}%)`,
          confidence: bestScore,
          matchedRow: best,
        }
      }

      return { found: false }
    })

    // Determine status — for injection format, compare each vendor against their own data price
    const foundIndices = quotationMatches.reduce((acc, m, i) => { if (m.found) acc.push(i); return acc }, [])
    let status = 'NO_REF'
    if (foundIndices.length > 0) {
      const matchingCount = foundIndices.filter((qi) => {
        const ref = item.vendorPrices?.[qi] || item.price
        return Math.abs(quotationMatches[qi].price - ref) < 1
      }).length
      if (matchingCount === foundIndices.length) status = 'ALL_MATCH'
      else if (matchingCount > 0) status = 'PARTIAL_MATCH'
      else status = 'DIFFERS'
    }

    return { ...item, quotationMatches, status }
  })
}

// ── Cross-validate two quotation sources ──────────────────────────────────────

/**
 * Compare items parsed from an XLSX against items parsed from pasted text.
 * Used to flag discrepancies before the user saves a quotation.
 *
 * Returns:
 *   {
 *     matched: number,        // items found in both sources with matching price
 *     issues: Issue[]
 *   }
 *
 * Issue shapes:
 *   { type: 'PRICE_MISMATCH',   articleCode, name, xlsxPrice, textPrice }
 *   { type: 'MISSING_IN_TEXT',  articleCode, name, xlsxPrice }
 *   { type: 'MISSING_IN_XLSX',  articleCode, name, textPrice }
 */
export function crossValidateQuotations(xlsxItems, textItems) {
  if (!xlsxItems?.length || !textItems?.length) {
    return { matched: 0, issues: [] }
  }

  const issues = []
  let matched = 0

  // Index text items by article code for fast lookup
  const textByCode = new Map()
  for (const t of textItems) {
    if (t.articleCode) textByCode.set(t.articleCode, t)
  }

  // For each XLSX item, find corresponding text item
  const matchedTextIds = new Set()

  for (const x of xlsxItems) {
    let textMatch = null

    // 1) Exact article code
    if (x.articleCode && textByCode.has(x.articleCode)) {
      textMatch = textByCode.get(x.articleCode)
    }

    // 2) Fuzzy name
    if (!textMatch) {
      let best = null
      let bestScore = 0
      for (const t of textItems) {
        const score = Math.max(
          jaccard(x.name, t.name),
          x.altName ? jaccard(x.altName, t.name) : 0,
        )
        if (score > bestScore) { bestScore = score; best = t }
      }
      if (bestScore >= 0.4) textMatch = best
    }

    if (textMatch) {
      matchedTextIds.add(textMatch)
      if (Math.abs(textMatch.price - x.price) >= 1) {
        issues.push({
          type: 'PRICE_MISMATCH',
          articleCode: x.articleCode || textMatch.articleCode,
          name: x.name,
          xlsxPrice: x.price,
          textPrice: textMatch.price,
        })
      } else {
        matched++
      }
    } else {
      issues.push({
        type: 'MISSING_IN_TEXT',
        articleCode: x.articleCode,
        name: x.name,
        xlsxPrice: x.price,
      })
    }
  }

  // Text items with no XLSX counterpart
  for (const t of textItems) {
    if (!matchedTextIds.has(t)) {
      issues.push({
        type: 'MISSING_IN_XLSX',
        articleCode: t.articleCode,
        name: t.name,
        textPrice: t.price,
      })
    }
  }

  return { matched, issues }
}
