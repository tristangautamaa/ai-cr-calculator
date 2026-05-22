/**
 * Parse vendor quotation pasted as plain text (e.g. copied from a PDF).
 * Handles tab-separated and multi-space-separated layouts.
 * Returns [{articleCode, name, price, rawLine}]
 */

function parseNumericToken(s) {
  if (!s) return 0
  const t = s.trim()
  // Indonesian thousands: 37.000 or 1.228.770
  if (/^\d{1,3}(\.\d{3})+$/.test(t)) return parseFloat(t.replace(/\./g, ''))
  // Indonesian with decimal: 37.000,00
  if (/^\d{1,3}(\.\d{3})*,\d+$/.test(t)) return parseFloat(t.replace(/\./g, '').replace(',', '.'))
  // US thousands: 37,000 or 37,000.00
  if (/^\d{1,3}(,\d{3})*(\.\d+)?$/.test(t)) return parseFloat(t.replace(/,/g, ''))
  // Plain integer or float
  const n = parseFloat(t.replace(/,/g, ''))
  return isNaN(n) ? 0 : n
}

function isArticleCode(s) {
  return /^([0-9]{5,}|[A-Z][0-9]{4,})$/.test(s.trim())
}

const HEADER_WORDS = new Set(['no', 'harga', 'satuan', 'item', 'description', 'nama', 'barang', 'price', 'unit', 'qty'])

function isHeaderLine(tokens) {
  const lower = tokens.map((t) => t.toLowerCase())
  return lower.filter((t) => HEADER_WORDS.has(t)).length >= 2
}

export function parseQuotationText(text) {
  if (!text || !text.trim()) return []

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const items = []

  for (const line of lines) {
    // Split on tabs first, else on 2+ spaces
    const tokens = line.includes('\t')
      ? line.split('\t').map((t) => t.trim()).filter(Boolean)
      : line.split(/\s{2,}/).map((t) => t.trim()).filter(Boolean)

    if (tokens.length < 2) continue
    if (isHeaderLine(tokens)) continue

    // Find article code — first token matching the pattern
    let articleCode = null
    let articleIdx = -1
    for (let i = 0; i < tokens.length; i++) {
      // Sometimes article code is embedded at start of a token like "10042237 AMPLOP COKLAT"
      const embedded = tokens[i].match(/^([0-9]{5,}|[A-Z][0-9]{4,})\s+/)
      if (embedded) {
        articleCode = embedded[1]
        articleIdx = i
        break
      }
      if (isArticleCode(tokens[i])) {
        articleCode = tokens[i]
        articleIdx = i
        break
      }
    }

    // Find price — the largest numeric value in range [1000, 100_000_000]
    // Scan right-to-left (price is usually near the end)
    let price = 0
    let priceIdx = -1
    for (let i = tokens.length - 1; i >= 0; i--) {
      const n = parseNumericToken(tokens[i])
      if (n >= 1000 && n <= 100_000_000) {
        price = n
        priceIdx = i
        break
      }
    }

    if (price === 0) continue // can't use a line with no extractable price

    // Name: collect all tokens that are not the article code, not the price token,
    // not a standalone row number, not a short unit string
    const UNIT_RE = /^(EA|RIM|ROL|ROLL|BOX|PACK|PAC|TUBE|LBR|PCS|SET|LEMBAR|UNIT|LUSIN|KODI)$/i
    const nameParts = []
    for (let i = 0; i < tokens.length; i++) {
      if (i === articleIdx || i === priceIdx) continue
      const t = tokens[i]
      if (/^\d{1,3}$/.test(t)) continue // row numbers
      if (UNIT_RE.test(t)) continue
      if (parseNumericToken(t) >= 1000) continue // other numeric columns (total, etc.)
      // If article code is embedded in this token, strip it
      const stripped = t.replace(/^([0-9]{5,}|[A-Z][0-9]{4,})\s+/, '')
      if (stripped) nameParts.push(stripped)
    }

    const name = nameParts.join(' ').trim()
    if (!name && !articleCode) continue

    items.push({
      articleCode,
      name: name || (articleCode ?? ''),
      price,
      rawLine: line,
    })
  }

  return items
}
