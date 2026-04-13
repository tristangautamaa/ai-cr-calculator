import { useMemo } from 'react'
import { TrendingUp, Printer, DollarSign, Receipt } from 'lucide-react'
import useStore from '../store/useStore'
import { formatCurrency } from '../utils/formatters'

export default function SummaryCard() {
  const { parsedItems, printingFee, darkMode } = useStore()

  const subtotal = useMemo(() => {
    return parsedItems
      .filter((i) => !i.isPrintingFee)
      .reduce((sum, i) => sum + i.total, 0)
  }, [parsedItems])

  const grandTotal = subtotal + printingFee
  const printableCount = parsedItems.filter((i) => !i.isPrintingFee && i.printable).length
  const itemCount = parsedItems.filter((i) => !i.isPrintingFee).length

  if (parsedItems.length === 0) return null

  const card = `rounded-2xl p-5 shadow-sm border ${
    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
  }`

  return (
    <div className={`rounded-2xl shadow-sm border overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
      {/* Header */}
      <div className={`px-6 py-4 border-b flex items-center gap-2 ${darkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-100 bg-gray-50'}`}>
        <Receipt className={`w-4 h-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
        <span className={`font-semibold text-sm ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
          Summary
        </span>
      </div>

      {/* Summary rows */}
      <div className="divide-y">
        {/* Subtotal */}
        <div className={`flex items-center justify-between px-6 py-4 ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-100">
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                Subtotal Items
              </p>
              <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {itemCount} line items
              </p>
            </div>
          </div>
          <span className={`text-lg font-bold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
            {formatCurrency(subtotal)}
          </span>
        </div>

        {/* Printing Fee */}
        <div className={`flex items-center justify-between px-6 py-4 ${darkMode ? 'bg-orange-900/10' : 'bg-orange-50/60'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-100">
              <Printer className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <p className={`text-sm font-medium ${darkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                Printing Fee <span className="font-normal opacity-75">(10%)</span>
              </p>
              <p className={`text-xs ${darkMode ? 'text-orange-500' : 'text-orange-400'}`}>
                Based on {printableCount} printable item{printableCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <span className="text-lg font-bold text-orange-600">
            {formatCurrency(printingFee)}
          </span>
        </div>

        {/* Grand Total */}
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ background: 'linear-gradient(135deg, #0C4DA2, #2F80ED)' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/20">
              <DollarSign className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Grand Total</p>
              <p className="text-xs text-blue-200">Subtotal + Printing Fee</p>
            </div>
          </div>
          <span className="text-2xl font-bold text-white">
            {formatCurrency(grandTotal)}
          </span>
        </div>
      </div>
    </div>
  )
}
