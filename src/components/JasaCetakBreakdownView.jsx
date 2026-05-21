import { useMemo } from 'react'
import { Printer, TrendingUp, DollarSign } from 'lucide-react'
import { formatCurrency } from '../utils/formatters'
import { formatPrintingFeeRateLabel } from '../utils/printingFeeEngine'

function CategoryBreakdown({ category, items, darkMode, rate }) {
  const regularItems = items.filter((i) => !i.isJasaCetak)
  const hasPrintable = regularItems.some((i) => i.printable)

  if (!hasPrintable) return null

  const categorySubtotal = regularItems.reduce((sum, i) => sum + (i.total ?? 0), 0)
  const printableBase = regularItems.filter((i) => i.printable).reduce((sum, i) => sum + (i.total ?? 0), 0)
  const categoryJC = Math.round(printableBase * rate)
  const categoryTanpaJC = categorySubtotal - categoryJC

  const thCls = `px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`
  const thLeftCls = `px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`
  const thOrangeCls = `px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-orange-400' : 'text-orange-600'}`
  const tdNumCls = 'px-3 py-2.5 text-right text-sm font-mono'
  const tdLeftCls = 'px-3 py-2.5 text-left text-sm'

  return (
    <div className={`rounded-xl overflow-hidden border shadow-sm ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className={`px-5 py-3 flex items-center justify-between ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
        <span className={`font-semibold text-sm tracking-wide uppercase ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
          {category}
        </span>
        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${darkMode ? 'bg-orange-900 text-orange-300' : 'bg-orange-100 text-orange-700'}`}>
          Jasa Cetak {formatCurrency(categoryJC)} ({formatPrintingFeeRateLabel(rate)})
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className={`border-b ${darkMode ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
              <th className={thLeftCls}>Item</th>
              <th className={thCls}>Unit</th>
              <th className={thCls}>Qty</th>
              <th className={thCls}>Harga</th>
              <th className={thCls}>Subtotal</th>
              <th className={thOrangeCls}>Harga Tanpa JC</th>
              <th className={thOrangeCls}>Subtotal Tanpa JC</th>
              <th className={thOrangeCls}>JC / Unit</th>
              <th className={thOrangeCls}>Subtotal JC</th>
            </tr>
          </thead>
          <tbody>
            {regularItems.map((item, idx) => {
              const isPrint = item.printable
              const hargaTanpaJC = isPrint ? Math.round((item.price ?? 0) * (1 - rate)) : null
              const subtotalTanpaJC = isPrint ? Math.round((item.total ?? 0) * (1 - rate)) : null
              const jcPerUnit = isPrint ? Math.round((item.price ?? 0) * rate) : null
              const subtotalJC = isPrint ? Math.round((item.total ?? 0) * rate) : null

              const rowCls = idx % 2 === 0
                ? darkMode ? 'bg-gray-800' : 'bg-white'
                : darkMode ? 'bg-gray-750' : 'bg-gray-50/60'

              const dashCls = darkMode ? 'text-gray-600' : 'text-gray-300'
              const orangeCls = darkMode ? 'text-orange-400' : 'text-orange-600'

              return (
                <tr key={item.id} className={rowCls}>
                  <td className={`${tdLeftCls} ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>{item.name}</span>
                      {isPrint && (
                        <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${darkMode ? 'bg-orange-900 text-orange-300' : 'bg-orange-100 text-orange-700'}`}>
                          JASA CETAK
                        </span>
                      )}
                    </div>
                  </td>
                  <td className={`${tdNumCls} ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{item.unit}</td>
                  <td className={`${tdNumCls} ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {item.quantity?.toLocaleString('id-ID')}
                  </td>
                  <td className={`${tdNumCls} ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                    {formatCurrency(item.price)}
                  </td>
                  <td className={`${tdNumCls} font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                    {formatCurrency(item.total)}
                  </td>
                  <td className={`${tdNumCls} ${isPrint ? orangeCls : dashCls}`}>
                    {isPrint ? formatCurrency(hargaTanpaJC) : '—'}
                  </td>
                  <td className={`${tdNumCls} ${isPrint ? orangeCls : dashCls}`}>
                    {isPrint ? formatCurrency(subtotalTanpaJC) : '—'}
                  </td>
                  <td className={`${tdNumCls} ${isPrint ? orangeCls : dashCls}`}>
                    {isPrint ? formatCurrency(jcPerUnit) : '—'}
                  </td>
                  <td className={`${tdNumCls} ${isPrint ? orangeCls : dashCls}`}>
                    {isPrint ? formatCurrency(subtotalJC) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className={`border-t ${darkMode ? 'border-gray-600 bg-gray-700/50' : 'border-gray-200 bg-gray-50'}`}>
              <td colSpan={4} className={`px-3 py-2.5 text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Category Total
              </td>
              <td className={`${tdNumCls} font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                {formatCurrency(categorySubtotal)}
              </td>
              <td className={`${tdNumCls} text-xs ${darkMode ? 'text-gray-600' : 'text-gray-300'}`}>—</td>
              <td className={`${tdNumCls} font-bold ${darkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                {formatCurrency(categoryTanpaJC)}
              </td>
              <td className={`${tdNumCls} text-xs ${darkMode ? 'text-gray-600' : 'text-gray-300'}`}>—</td>
              <td className={`${tdNumCls} font-bold ${darkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                {formatCurrency(categoryJC)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

export default function JasaCetakBreakdownView({ darkMode, groupedItems, printingFeeRate }) {
  const printableCategories = useMemo(() => {
    return Object.entries(groupedItems)
      .filter(([cat, items]) => cat !== 'JASA CETAK' && items.some((i) => i.printable))
      .sort(([a], [b]) => a.localeCompare(b))
  }, [groupedItems])

  const totals = useMemo(() => {
    let grandTotal = 0
    let grandTotalJC = 0

    Object.entries(groupedItems).forEach(([cat, items]) => {
      if (cat === 'JASA CETAK') return
      items.filter((i) => !i.isJasaCetak).forEach((item) => {
        grandTotal += item.total ?? 0
        if (item.printable) {
          grandTotalJC += Math.round((item.total ?? 0) * printingFeeRate)
        }
      })
    })

    return { grandTotal, grandTotalJC, grandTotalTanpaJC: grandTotal - grandTotalJC }
  }, [groupedItems, printingFeeRate])

  if (printableCategories.length === 0) {
    return (
      <div className={`rounded-xl p-8 text-center border ${darkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white border-gray-200 text-gray-500'}`}>
        No printable items found.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {printableCategories.map(([category, items]) => (
        <CategoryBreakdown
          key={category}
          category={category}
          items={items}
          darkMode={darkMode}
          rate={printingFeeRate}
        />
      ))}

      {/* Grand Summary */}
      <div className={`rounded-xl overflow-hidden border shadow-sm ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className={`px-5 py-3 border-b flex items-center gap-2 ${darkMode ? 'border-gray-700 bg-gray-700' : 'border-gray-100 bg-gray-100'}`}>
          <span className={`font-semibold text-sm ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
            Summary
          </span>
        </div>
        <div className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
          <div className={`flex items-center justify-between px-6 py-4 ${darkMode ? 'bg-orange-900/10' : 'bg-orange-50/60'}`}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-orange-100">
                <Printer className="w-4 h-4 text-orange-600" />
              </div>
              <p className={`text-sm font-medium ${darkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                Jasa Cetak Total{' '}
                <span className="font-normal opacity-75">({formatPrintingFeeRateLabel(printingFeeRate)})</span>
              </p>
            </div>
            <span className="text-lg font-bold text-orange-600">
              {formatCurrency(totals.grandTotalJC)}
            </span>
          </div>

          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-100">
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                Total Tanpa Jasa Cetak
              </p>
            </div>
            <span className={`text-lg font-bold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
              {formatCurrency(totals.grandTotalTanpaJC)}
            </span>
          </div>

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
                <p className="text-xs text-blue-200">Total Tanpa JC + Jasa Cetak</p>
              </div>
            </div>
            <span className="text-2xl font-bold text-white">
              {formatCurrency(totals.grandTotal)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
