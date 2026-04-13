import { useEffect, useMemo, useState } from 'react'
import { Copy, Download, Tag, Pencil, Check } from 'lucide-react'
import * as XLSX from 'xlsx'
import useStore from '../store/useStore'
import CategoryTable from './CategoryTableV2'
import { calculateCategoryPrintingFee } from '../utils/printingFeeEngine'

function sanitizeSheetName(name, usedNames) {
  const fallback = 'Sheet'
  const baseName = (name || fallback)
    .replace(/[\\/?*\[\]:]/g, ' ')
    .trim()
    .slice(0, 31) || fallback

  let candidate = baseName
  let counter = 2

  while (usedNames.has(candidate)) {
    const suffix = ` ${counter}`
    candidate = `${baseName.slice(0, 31 - suffix.length)}${suffix}`
    counter += 1
  }

  usedNames.add(candidate)
  return candidate
}

export default function ResultTable() {
  const { parsedItems, darkMode, editMode, toggleEditMode, vendors, addVendor, printingFeeRate, setPrintingFeeRate } = useStore()
  const [copied, setCopied] = useState(false)
  const [rateInput, setRateInput] = useState(String(printingFeeRate * 100))

  // Separate regular items from the printing fee row
  const regularItems = parsedItems.filter((i) => !i.isPrintingFee)

  // Group regular items by category
  const groupedItems = useMemo(() => {
    return regularItems.reduce((groups, item) => {
      if (!groups[item.category]) groups[item.category] = []
      groups[item.category].push(item)
      return groups
    }, {})
  }, [regularItems])

  useEffect(() => {
    setRateInput(String(Number((printingFeeRate * 100).toFixed(2))))
  }, [printingFeeRate])

  function getPrimaryVendorValues(item) {
    if (!item.isJasaCetak) {
      return {
        quantity: item.quantity,
        price: item.price ?? '',
        total: item.total,
      }
    }

    const computedFee = calculateCategoryPrintingFee(groupedItems[item.category] || [], 'vendor_1', printingFeeRate)
    return {
      quantity: 1,
      price: computedFee,
      total: computedFee,
    }
  }

  function handleCopy() {
    const header = ['Name', 'Category', 'Qty', 'Unit', 'Price (IDR)', 'Total (IDR)'].join('\t')
    const lines = regularItems.map((item) => {
      const values = getPrimaryVendorValues(item)
      return [item.name, item.category, values.quantity, item.unit, values.price, values.total].join('\t')
    })
    navigator.clipboard.writeText([header, ...lines].join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function commitPrintingFeeRate() {
    const parsedPercent = parseFloat(rateInput)
    if (!Number.isFinite(parsedPercent)) {
      setRateInput(String(Number((printingFeeRate * 100).toFixed(2))))
      return
    }
    const normalizedPercent = Math.max(parsedPercent, 0)
    setPrintingFeeRate(normalizedPercent / 100)
  }

  function handleExport() {
    const data = regularItems.map((item) => {
      const values = getPrimaryVendorValues(item)
      return {
        Category: item.category,
        Name: item.name,
        Qty: values.quantity,
        Unit: item.unit,
        'Price (IDR)': values.price,
        'Total (IDR)': values.total,
        Printable: item.printable ? 'Yes' : 'No',
      }
    })

    const wb = XLSX.utils.book_new()
    const usedSheetNames = new Set()

    const overviewSheet = XLSX.utils.json_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, overviewSheet, sanitizeSheetName('All Items', usedSheetNames))

    Object.entries(groupedItems).forEach(([category, items]) => {
      const categoryRows = items.map((item) => {
        const values = getPrimaryVendorValues(item)
        return {
          Category: item.category,
          Name: item.name,
          Qty: values.quantity,
          Unit: item.unit,
          'Price (IDR)': values.price,
          'Total (IDR)': values.total,
          Printable: item.printable ? 'Yes' : 'No',
        }
      })

      const categorySheet = XLSX.utils.json_to_sheet(categoryRows)
      XLSX.utils.book_append_sheet(wb, categorySheet, sanitizeSheetName(category, usedSheetNames))
    })

    XLSX.writeFile(wb, 'procurement_calculation.xlsx')
  }

  if (parsedItems.length === 0) return null

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className={`rounded-2xl px-5 py-3 flex items-center justify-between gap-3 border shadow-sm ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center gap-2">
          <Tag className={`w-4 h-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
          <span className={`font-semibold text-sm ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
            Calculation Result
          </span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${darkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
            {regularItems.length} items · {Object.keys(groupedItems).length} categories
          </span>
          {editMode && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 animate-pulse">
              Editing
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium ${
            darkMode
              ? 'border-gray-600 text-gray-300 bg-gray-700/40'
              : 'border-gray-200 text-gray-600 bg-gray-50'
          }`}>
            <span>Jasa Cetak</span>
            <input
              type="number"
              min="0"
              step="0.1"
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
              onBlur={commitPrintingFeeRate}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
              }}
              className={`w-16 rounded border px-2 py-1 text-right text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                darkMode
                  ? 'bg-gray-900 border-gray-600 text-gray-200'
                  : 'bg-white border-gray-300 text-gray-700'
              }`}
              aria-label="Jasa Cetak percentage"
            />
            <span className="opacity-70">%</span>
          </div>

          {/* Edit / Done toggle */}
          <button
            onClick={toggleEditMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              editMode
                ? 'bg-amber-500 border-amber-500 text-white hover:bg-amber-600'
                : darkMode
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {editMode ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
            {editMode ? 'Done' : 'Edit'}
          </button>

          <button
            onClick={addVendor}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              darkMode
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            + Add Vendor
          </button>

          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              darkMode
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Copy className="w-3.5 h-3.5" />
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #0C4DA2, #2F80ED)' }}
          >
            <Download className="w-3.5 h-3.5" />
            Export Excel
          </button>
        </div>
      </div>

      {/* One table per category */}
      {Object.entries(groupedItems).map(([category, items]) => (
        <CategoryTable
          key={category}
          category={category}
          items={items}
          darkMode={darkMode}
          editMode={editMode}
          vendors={vendors}
        />
      ))}
    </div>
  )
}
