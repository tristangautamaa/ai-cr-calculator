/**
 * Category classification rules for procurement items.
 * Rules are evaluated top-down; first match wins.
 */

const CATEGORY_RULES = [
  { keywords: ['LAKBAN'], category: 'LAKBAN BENING' },
  { keywords: ['KARDUS', 'CARTON', 'KARTON'], category: 'KARDUS' },
  { keywords: ['WRAPPING', 'WRAP', 'PLASTIK WRAPPING'], category: 'PLASTIK WRAPPING' },
  { keywords: ['KERTAS', 'PAPER', 'HVS'], category: 'KERTAS' },
  { keywords: ['LABEL', 'TAG'], category: 'LABEL' },
  { keywords: ['FORM', 'CETAKAN', 'FORMULIR'], category: 'FORM FORM CETAKAN' },
  { keywords: ['CONT FORM', 'CONTINUOUS'], category: 'CONT FORM' },
  { keywords: ['BUBBLE'], category: 'BUBBLE WRAP' },
  { keywords: ['STICKER', 'GRAFIS', 'DEKOR', 'FLEXY', 'LAMINASI', 'ALBATROS', 'RITRAMA'], category: 'PLASTIK PRODUK INFO' },
  { keywords: ['STRUK', 'THERMAL', 'RECEIPT'], category: 'STRUK THERMAL' },
  { keywords: ['LANYARD', 'YOYO'], category: 'LANYARD & YOYO' },
  { keywords: ['KANCING', 'BUTTON'], category: 'KANCING PI' },
  { keywords: ['RIBBON'], category: 'RIBBON BARCODE' },
  { keywords: ['METAL SEAL', 'CLICKER', 'SEAL'], category: 'METAL SEAL & CLICKER' },
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
  'CONT FORM',
  'BUBBLE WRAP',
  'PLASTIK PRODUK INFO',
  'STRUK THERMAL',
  'LANYARD & YOYO',
  'KANCING PI',
  'RIBBON BARCODE',
  'METAL SEAL & CLICKER',
  'JASA CETAK',
]
