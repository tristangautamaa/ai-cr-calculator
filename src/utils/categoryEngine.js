/**
 * Category classification rules for procurement items.
 * Rules are evaluated top-down; first match wins.
 */

const CATEGORY_RULES = [
  // DISPENSER LAKBAN is an ATK tool (tape dispenser), not packaging tape — must precede the LAKBAN rule
  { keywords: ['DISPENSER LAKBAN'], category: 'ATK GENERAL' },
  { keywords: ['LAKBAN'], category: 'LAKBAN BENING' },
  { keywords: ['KARDUS', 'CARTON', 'KARTON'], category: 'KARDUS' },
  { keywords: ['WRAPPING', 'WRAP', 'PLASTIK WRAPPING'], category: 'PLASTIK WRAPPING' },
  { keywords: ['KERTAS', 'PAPER', 'HVS'], category: 'KERTAS' },
  // Specific rules first — these keywords appear as substrings inside common brand names (e.g. "INFORMA" contains "FORM")
  { keywords: ['METAL SEAL', 'CLICKER'], category: 'METAL SEAL & CLICKER' },
  { keywords: ['CONT FORM', 'CONT', 'CONTINUOUS'], category: 'CONTINUOUS FORM' },
  { keywords: ['STICKER', 'LABEL', 'TAG'], category: 'LABEL' },
  // Broad keyword — must come after specific rules that share substrings
  { keywords: ['FORM', 'CETAKAN', 'FORMULIR'], category: 'FORM FORM CETAKAN' },
  { keywords: ['BUBBLE'], category: 'BUBBLE WRAP' },
  { keywords: ['GRAFIS', 'DEKOR', 'FLEXY', 'LAMINASI', 'ALBATROS', 'RITRAMA'], category: 'PLASTIK PRODUK INFO' },
  { keywords: ['STRUK', 'THERMAL', 'RECEIPT'], category: 'STRUK THERMAL' },
  { keywords: ['LANYARD', 'YOYO'], category: 'LANYARD & YOYO' },
  { keywords: ['KANCING', 'BUTTON'], category: 'KANCING PI' },
  { keywords: ['RIBBON'], category: 'RIBBON BARCODE' },
]

export const DEFAULT_CATEGORY = 'ATK GENERAL'

/**
 * Classify an item by its name.
 * @param {string} name - item name
 * @returns {string} category label
 */
export function classifyItem(name) {
  const upper = name.toUpperCase()
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => upper.includes(kw))) {
      return rule.category
    }
  }
  return DEFAULT_CATEGORY
}

export const ALL_CATEGORIES = [
  'LAKBAN BENING',
  'KARDUS',
  'PLASTIK WRAPPING',
  'KERTAS',
  'LABEL',
  'FORM FORM CETAKAN',
  'ATK GENERAL',
  'CONTINUOUS FORM',
  'BUBBLE WRAP',
  'PLASTIK PRODUK INFO',
  'STRUK THERMAL',
  'LANYARD & YOYO',
  'KANCING PI',
  'RIBBON BARCODE',
  'METAL SEAL & CLICKER',
  'JASA CETAK',
]
