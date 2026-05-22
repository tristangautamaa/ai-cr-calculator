import * as XLSX from 'xlsx'

// ── Number parsing ────────────────────────────────────────────────────────────

function parseNumericCell(val) {
  if (typeof val === 'number') return val
  if (!val) return 0
  const s = String(val).trim()
  if (!s) return 0

  // Indonesian thousands: 37.000 or 1.228.770
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) return parseFloat(s.replace(/\./g, ''))

  // Indonesian with decimal: 37.000,00
  if (/^\d{1,3}(\.\d{3})*,\d+$/.test(s))
    return parseFloat(s.replace(/\./g, '').replace(',', '.'))

  // US thousands: 37,000 or 37,000.00
  if (/^\d{1,3}(,\d{3})*(\.\d+)?$/.test(s)) return parseFloat(s.replace(/,/g, ''))

  return parseFloat(s) || 0
}

// ── Article code extraction ───────────────────────────────────────────────────

function extractArticleCode(text) {
  if (!text) return null
  const s = String(text).trim()
  // Leading article code in a description: "10042237 AMPLOP COKLAT..." or "X183269 ..."
  const m = s.match(/^([0-9]{5,}|[A-Z][0-9]{4,})\s/)
  if (m) return m[1]
  // Whole cell is just the code
  if (/^([0-9]{5,}|[A-Z][0-9]{4,})$/.test(s)) return s
  return null
}

// ── Header detection ─────────────────────────────────────────────────────────

const PRICE_HEADERS = ['harga satuan', 'harga/unit', 'unit price', 'price/pcs', 'price / pcs', 'harga']
const NAME_HEADERS = ['nama barang', 'deskripsi lengkap', 'nama / deskripsi', 'description', 'uraian', 'barang']
const DESC_HEADERS = ['item description', 'kode item', 'kode', 'article', 'sku', 'no item']
const UNIT_HEADERS = ['satuan', 'unit', 'uom', 'sat']

// All header keywords that indicate a structured header row
const ALL_DETECT_HEADERS = [...PRICE_HEADERS, ...NAME_HEADERS, ...DESC_HEADERS]

function findHeaderRowIndex(rows) {
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const text = rows[i].map((c) => String(c || '').toLowerCase()).join(' ')
    if (ALL_DETECT_HEADERS.some((k) => text.includes(k))) return i
  }
  return -1
}

// When price column header isn't a recognized keyword (e.g., vendor name used as header),
// scan the first data rows to find which column most consistently holds price-like numbers.
function inferPriceColumn(rows, headerIdx, colMap) {
  const excluded = new Set([colMap.desc, colMap.name, colMap.unit].filter((c) => c >= 0))
  const hits = {}
  const scanLimit = Math.min(rows.length, headerIdx + 11)
  for (let i = headerIdx + 1; i < scanLimit; i++) {
    const row = rows[i]
    if (!row || row.every((c) => !c)) continue
    for (let j = 0; j < row.length; j++) {
      if (excluded.has(j)) continue
      const n = parseNumericCell(row[j])
      // Price-like: >= 100 and < 10M (excludes article codes which are typically 8-digit >= 10M)
      if (n >= 100 && n < 10_000_000) hits[j] = (hits[j] || 0) + 1
    }
  }
  let bestCol = -1, bestCount = 0
  for (const [col, count] of Object.entries(hits)) {
    if (count > bestCount || (count === bestCount && Number(col) > bestCol)) {
      bestCount = count
      bestCol = Number(col)
    }
  }
  return bestCount >= 2 ? bestCol : -1
}

function mapColumns(headerRow) {
  const m = { desc: -1, name: -1, price: -1, unit: -1 }
  for (let i = 0; i < headerRow.length; i++) {
    const cell = String(headerRow[i] || '').toLowerCase().trim()

    if (m.price === -1 && PRICE_HEADERS.some((k) => cell.includes(k))) {
      m.price = i
      continue
    }
    if (m.name === -1 && NAME_HEADERS.some((k) => cell.includes(k))) {
      m.name = i
      continue
    }
    if (m.desc === -1 && DESC_HEADERS.some((k) => cell.includes(k))) {
      m.desc = i
      continue
    }
    if (m.unit === -1 && UNIT_HEADERS.some((k) => cell === k)) {
      m.unit = i
    }
  }
  return m
}

// ── Unit detection helper ─────────────────────────────────────────────────────

const UNIT_RE = /^(EA|RIM|ROL|ROLL|BOX|PACK|PAC|TUBE|LBR|PCS|SET|LEMBAR|UNIT|LUSIN|KODI)$/i

function findUnit(cells) {
  for (const c of cells) {
    const s = String(c || '').trim()
    if (UNIT_RE.test(s)) return s.toUpperCase()
  }
  return ''
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Parse a vendor quotation XLSX file.
 * Returns { items: [{articleCode, name, price, unit, rawDesc}], vendorNameGuess }
 */
export function parseQuotationFile(file) {
  return new Promise((resolve, reject) => {
    const lower = file.name.toLowerCase()
    if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls')) {
      reject(new Error(
        `"${file.name}" is not an Excel file. Upload an .xlsx or .xls file. ` +
        `If you only have a PDF, copy the table text and paste it into the quotation text area below.`
      ))
      return
    }

    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' })
        const sheet = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

        // Try to guess vendor name from first few rows
        let vendorNameGuess = ''
        for (let i = 0; i < Math.min(rows.length, 5); i++) {
          const text = rows[i].map((c) => String(c || '').trim()).join(' ').trim()
          if (text.length > 5 && text.length < 80 && !/harga|price|satuan|no\s/i.test(text)) {
            vendorNameGuess = text
            break
          }
        }

        const headerIdx = findHeaderRowIndex(rows)
        const items = []

        if (headerIdx >= 0) {
          const colMap = mapColumns(rows[headerIdx])
          if (colMap.price === -1) colMap.price = inferPriceColumn(rows, headerIdx, colMap)

          for (let i = headerIdx + 1; i < rows.length; i++) {
            const row = rows[i]
            if (!row || row.every((c) => !c)) continue

            const descCell = colMap.desc >= 0 ? String(row[colMap.desc] || '').trim() : ''
            const nameCell = colMap.name >= 0 ? String(row[colMap.name] || '').trim() : ''

            // Article code: prefer the desc column (often contains code + name), else name column
            const articleCode = extractArticleCode(descCell) || extractArticleCode(nameCell)

            // Clean display name: prefer dedicated name column, else strip code from desc
            let name = nameCell
            if (!name && descCell) {
              name = descCell.replace(/^([0-9A-Z]+)\s+/, '').trim() || descCell
            }
            if (!name) continue

            // altName: col B description without article code prefix — used as fallback for fuzzy matching
            // since col B uses standard ATK catalog naming that matches K2/PSS ticket names
            const altName = descCell
              ? (articleCode ? descCell.replace(articleCode, '').trim() : descCell)
              : ''

            // Price
            let price = 0
            if (colMap.price >= 0) {
              price = parseNumericCell(row[colMap.price])
            } else {
              // Fallback: rightmost number in price-like range (excludes article codes >= 10M)
              for (let j = row.length - 1; j >= 0; j--) {
                const n = parseNumericCell(row[j])
                if (n >= 100 && n < 10_000_000) { price = n; break }
              }
            }

            // Unit
            const unit =
              colMap.unit >= 0
                ? String(row[colMap.unit] || '').trim().toUpperCase()
                : findUnit(row)

            if (name && price > 0) {
              items.push({ articleCode, name, altName, price, unit, rawDesc: descCell || nameCell })
            }
          }
        } else {
          // No header found — heuristic parse
          for (const row of rows) {
            if (!row || row.every((c) => !c)) continue
            const cells = row.map((c) => String(c || '').trim())

            // Longest text cell → name/desc
            const longestIdx = cells.reduce(
              (best, c, i) => (c.length > (cells[best]?.length ?? 0) ? i : best),
              0
            )
            const descCell = cells[longestIdx] || ''
            if (descCell.length < 4) continue

            const articleCode = extractArticleCode(descCell)
            const name = descCell.replace(/^([0-9A-Z]+)\s+/, '').trim() || descCell

            let price = 0
            for (let j = cells.length - 1; j >= 0; j--) {
              const n = parseNumericCell(cells[j])
              if (n >= 100 && n < 10_000_000) { price = n; break }
            }

            const unit = findUnit(cells)

            if (name && price > 0) {
              items.push({ articleCode, name, price, unit, rawDesc: descCell })
            }
          }
        }

        resolve({ items, vendorNameGuess })
      } catch (err) {
        reject(err)
      }
    }

    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}
