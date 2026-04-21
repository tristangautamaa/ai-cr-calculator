import { useState } from 'react'
import { ClipboardPaste, Trash2, Zap, AlertCircle } from 'lucide-react'
import useStore from '../store/useStore'
import { parseTicketData } from '../utils/parser'
import { calculatePrintingFee, createPrintingFeeRow } from '../utils/printingFeeEngine'

const PLACEHOLDER = `Paste raw ticket data from K2 / PSS here...

Supports both old format (9-column) and new format (30+ column):

Old format example:
false\t10\t4592\t[4592] STICKER RITRAMA LAMINASI MATTE (LPJ)\t\t100.050\tM2\t200000\t20010000
false\t20\t343\t[343] ALBATROS LAMINASI MATTE (LPJ)\t\t5.500\tM2\t167000\t918500
false\t30\t7706\tJASA PASANG GRAFIS DEKOR\t\t13.000\tEA\t250000\t3250000

New format: Tab-separated with item name at column 18, qty at 19, unit at 20, price at 23, total at 24`

export default function RawInput() {
  const { rawInput, setRawInput, setParsedItems, setPrintingFee, clearAll, darkMode, printingFeeRate, vendors, addVendorWithoutInit } = useStore()
  const [error, setError] = useState('')

  function handleParse() {
    setError('')
    if (!rawInput.trim()) {
      setError('Please paste ticket data before parsing.')
      return
    }

    try {
      const items = parseTicketData(rawInput)
      if (items.length === 0) {
        setError('No valid rows found. Ensure data is tab-separated. Supports 9-column format or 30+ column format.')
        return
      }

      // Check if items have vendor 2 data and add vendor if needed
      const hasVendor2Data = items.some(item => item.vendorData?.vendor_2)
      if (hasVendor2Data) {
        const hasVendor2 = vendors.some(v => v.id === 'vendor_2')
        if (!hasVendor2) {
          addVendorWithoutInit('vendor_2', 'Vendor 2')
        }
      }

      const fee = calculatePrintingFee(items, printingFeeRate)
      const feeRow = createPrintingFeeRow(fee)

      setParsedItems([...items, feeRow])
      setPrintingFee(fee)
    } catch (err) {
      setError('Parse error: ' + err.message)
    }
  }

  function handleClear() {
    clearAll()
    setError('')
  }

  return (
    <div className={`rounded-2xl shadow-lg overflow-hidden border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
      {/* Card Header */}
      <div className={`px-6 py-4 border-b flex items-center gap-2 ${darkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-100 bg-gray-50'}`}>
        <ClipboardPaste className={`w-4 h-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
        <h2 className={`font-semibold text-sm ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
          Raw Ticket Data Input
        </h2>
        <span className={`ml-auto text-xs ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>
          Tab-separated from K2 / PSS
        </span>
      </div>

      <div className="p-6 space-y-4">
        <textarea
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          placeholder={PLACEHOLDER}
          className={`w-full h-52 p-4 rounded-xl border text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
            darkMode
              ? 'bg-gray-900 border-gray-600 text-gray-200 placeholder-gray-500'
              : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400'
          }`}
          spellCheck={false}
        />

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleParse}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-md active:scale-95"
            style={{ background: 'linear-gradient(135deg, #0C4DA2, #2F80ED)' }}
          >
            <Zap className="w-4 h-4" />
            Parse Ticket
          </button>

          <button
            onClick={handleClear}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:shadow-sm active:scale-95 border ${
              darkMode
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
        </div>
      </div>
    </div>
  )
}
