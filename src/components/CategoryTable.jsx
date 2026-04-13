import React, { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, AlertTriangle, X } from 'lucide-react'
import { formatCurrency } from '../utils/formatters'
import { calculateCategoryPrintingFee } from '../utils/printingFeeEngine'
import { ALL_CATEGORIES } from '../utils/categoryEngine'
import useStore from '../store/useStore'

/**
 * Inline number input that uses local state while focused,
 * syncs from the store value when not focused.
 */
function EditableNumber({ value, onCommit, className }) {
  const [local, setLocal] = useState(String(value ?? ''))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setLocal(String(value ?? ''))
  }, [value, focused])

  return (
    <input
      type="number"
      min="0"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false)
        const num = parseFloat(local) || 0
        onCommit(num)
      }}
      onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur() }}
      className={className}
    />
  )
}

/**
 * Renders a collapsible table for a single procurement category.
 */
export default function CategoryTable({ category, items, darkMode, editMode, vendors }) {
  const { updateItem, updateVendorData, deleteVendor } = useStore()
  const [collapsed, setCollapsed] = useState(false)

  // Split items: JASA CETAK lines sink to the bottom
  const regularItems = items.filter((i) => !i.isJasaCetak)
  const jasaCetakItems = items.filter((i) => i.isJasaCetak)
  const sortedItems = [...regularItems, ...jasaCetakItems]

  const hasPrintable = regularItems.some((i) => i.printable)
  const hasJasaCetak = jasaCetakItems.length > 0
  const missingJasaCetak = hasPrintable && !hasJasaCetak

  // Calculate subtotals per vendor (excluding jasa cetak items which are priceless)
  const getVendorSubtotal = (vendorId) => {
    if (vendorId === 'vendor_1') {
      return items
        .filter((item) => !item.isJasaCetak)
        .reduce((sum, item) => sum + (item.total ?? 0), 0)
    }
    return items
      .filter((item) => !item.isJasaCetak)
      .reduce((sum, item) => sum + (item.vendorData?.[vendorId]?.total ?? 0), 0)
  }
  const categorySubtotal = getVendorSubtotal('vendor_1')
  const computedPrintingFee = hasPrintable ? calculateCategoryPrintingFee(items) : 0

  const rowDark = (idx) => idx % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'
  const rowLight = (idx) => idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'

  const inputClass = `w-full text-right text-sm font-mono rounded border px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 ${
    darkMode
      ? 'bg-gray-900 border-gray-600 text-gray-200'
      : 'bg-white border-gray-300 text-gray-800'
  }`

  const selectClass = `w-full text-xs rounded border px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 ${
    darkMode
      ? 'bg-gray-900 border-gray-600 text-gray-300'
      : 'bg-white border-gray-300 text-gray-700'
  }`

  return (
    <div
      className={`rounded-xl overflow-hidden border shadow-sm ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      } ${missingJasaCetak ? (darkMode ? 'border-orange-500' : 'border-orange-400') : ''}`}
    >
      {/* Category Header — click to collapse */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className={`w-full flex items-center justify-between px-5 py-3 text-left transition-colors ${
          darkMode
            ? 'bg-gray-700 hover:bg-gray-650'
            : 'bg-gray-100 hover:bg-gray-200'
        }`}
      >
        <div className="flex items-center gap-2">
          {collapsed
            ? <ChevronRight className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            : <ChevronDown className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          }
          <span className={`font-semibold text-sm tracking-wide uppercase ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
            {category}
          </span>
          <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
            {items.length}
          </span>
          {hasPrintable && (
            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${darkMode ? 'bg-orange-900 text-orange-300' : 'bg-orange-100 text-orange-700'}`}>
              Jasa Cetak {formatCurrency(computedPrintingFee)}
            </span>
          )}
          {missingJasaCetak && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700">
              <AlertTriangle className="w-3 h-3" />
              No Jasa Cetak line item
            </span>
          )}
        </div>
        <span className={`text-sm font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
          {formatCurrency(categorySubtotal)}
        </span>
      </button>

      {/* Table */}
      {!collapsed && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={darkMode ? 'bg-gray-750 border-b border-gray-700' : 'bg-gray-50 border-b border-gray-100'}>
                <th className={`px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Name {editMode && <span className="normal-case font-normal opacity-60">/ Category</span>}
                </th>
                <th className={`px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Unit
                </th>
                {vendors && vendors.map((vendor) => (
                  <th key={vendor.id} colSpan={3} className={`px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <div className="flex items-center justify-center gap-2">
                      <span>{vendor.name}</span>
                      {vendor.id !== 'vendor_1' && (
                        <button
                          onClick={() => deleteVendor(vendor.id)}
                          title="Delete vendor"
                          className={`p-0.5 rounded hover:bg-red-500/20 transition-colors ${darkMode ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-600'}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
              {vendors && vendors.length > 0 && (
                <tr className={darkMode ? 'bg-gray-800 border-b border-gray-700' : 'bg-gray-100 border-b border-gray-100'}>
                  <th></th>
                  <th></th>
                  {vendors.map((vendor) => (
                    <React.Fragment key={`${vendor.id}-sub`}>
                      <th className={`px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>Qty</th>
                      <th className={`px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>Price</th>
                      <th className={`px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>Total</th>
                    </React.Fragment>
                  ))}
                </tr>
              )}
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
              {sortedItems.map((item, idx) => (
                <tr
                  key={item.id}
                  className={`transition-colors hover:bg-blue-50/20 ${
                    item.isJasaCetak
                      ? (darkMode ? 'bg-orange-900/20' : 'bg-orange-50')
                      : (darkMode ? rowDark(idx) : rowLight(idx))
                  }`}
                >
                  {/* Name + badges + (edit mode) category selector */}
                  <td className="px-4 py-2.5">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm ${item.isJasaCetak ? (darkMode ? 'text-orange-300' : 'text-orange-700') : (darkMode ? 'text-gray-200' : 'text-gray-800')}`}>
                          {item.name}
                        </span>

                        {/* PRINT badge — toggleable in edit mode */}
                        {!item.isJasaCetak && editMode && (
                          <button
                            onClick={() => updateItem(item.id, { printable: !item.printable })}
                            title={item.printable ? 'Click to remove print flag' : 'Click to mark as printable'}
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold transition-colors border ${
                              item.printable
                                ? 'bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200'
                                : 'bg-gray-100 text-gray-400 border-gray-300 hover:bg-orange-50 hover:text-orange-500 hover:border-orange-200'
                            }`}
                          >
                            PRINT {item.printable ? '✓' : '+'}
                          </button>
                        )}

                        {/* PRINT badge — read-only when not editing */}
                        {!item.isJasaCetak && !editMode && item.printable && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-700">
                            PRINT
                          </span>
                        )}

                        {item.isJasaCetak && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-orange-200 text-orange-800">
                            JASA CETAK
                          </span>
                        )}
                      </div>

                      {/* Category dropdown — only in edit mode */}
                      {editMode && (
                        <select
                          value={item.category}
                          onChange={(e) => updateItem(item.id, { category: e.target.value })}
                          onClick={(e) => e.stopPropagation()}
                          className={selectClass}
                        >
                          {ALL_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </td>

                  {/* Unit */}
                  <td className={`px-4 py-2.5 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {item.unit}
                  </td>

                  {/* Vendor Columns */}
                  {vendors && vendors.map((vendor) => {
                    const isVendor1 = vendor.id === 'vendor_1'
                    const vendorItem = isVendor1
                      ? { quantity: item.quantity, price: item.price, total: item.total }
                      : item.vendorData?.[vendor.id] || { quantity: 0, price: 0, total: 0 }
                    return (
                      <React.Fragment key={`${item.id}-${vendor.id}`}>
                        {/* Qty */}
                        <td className={`px-4 py-2.5 text-right text-sm font-mono ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {editMode ? (
                            <EditableNumber
                              value={vendorItem.quantity}
                              onCommit={(val) => isVendor1 ? updateItem(item.id, { quantity: val }) : updateVendorData(item.id, vendor.id, { quantity: val })}
                              className={inputClass}
                            />
                          ) : (
                            isVendor1 ? (item.rawQty ?? vendorItem.quantity) : vendorItem.quantity
                          )}
                        </td>

                        {/* Price */}
                        <td className={`px-4 py-2.5 text-right text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {item.isJasaCetak ? (
                            <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>—</span>
                          ) : editMode ? (
                            <EditableNumber
                              value={vendorItem.price ?? 0}
                              onCommit={(val) => isVendor1 ? updateItem(item.id, { price: val }) : updateVendorData(item.id, vendor.id, { price: val })}
                              className={inputClass}
                            />
                          ) : (
                            formatCurrency(vendorItem.price)
                          )}
                        </td>

                        {/* Total — always read-only */}
                        <td className={`px-4 py-2.5 text-right text-sm font-medium ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                          {formatCurrency(vendorItem.total)}
                        </td>
                      </React.Fragment>
                    )
                  })}
                </tr>
              ))}
            </tbody>

            {/* Category subtotal footer */}
            <tfoot>
              {hasPrintable && (
                <tr className={`border-t ${darkMode ? 'border-orange-700 bg-orange-900/20' : 'border-orange-200 bg-orange-50'}`}>
                  <td colSpan={2} className={`px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                    Computed Jasa Cetak (10%)
                  </td>
                  {vendors && vendors.map((vendor) => (
                    <React.Fragment key={`jasa-cetak-${vendor.id}`}>
                      <td className={`px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                        —
                      </td>
                      <td className={`px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                        —
                      </td>
                      <td className={`px-4 py-2 text-right text-sm font-bold ${darkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                        {vendor.id === 'vendor_1' ? formatCurrency(computedPrintingFee) : '—'}
                      </td>
                    </React.Fragment>
                  ))}
                </tr>
              )}
              <tr className={`border-t ${darkMode ? 'border-gray-600 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
                <td colSpan={2} className={`px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Category Subtotal
                </td>
                {vendors && vendors.map((vendor) => (
                  <React.Fragment key={`subtotal-${vendor.id}`}>
                    <td></td>
                    <td></td>
                    <td className={`px-4 py-2.5 text-right text-sm font-bold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                      {formatCurrency(getVendorSubtotal(vendor.id))}
                    </td>
                  </React.Fragment>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
