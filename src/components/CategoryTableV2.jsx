import React, { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, AlertTriangle, X } from 'lucide-react'
import { formatCurrency } from '../utils/formatters'
import { calculateCategoryPrintingFee, formatPrintingFeeRateLabel } from '../utils/printingFeeEngine'
import { ALL_CATEGORIES } from '../utils/categoryEngine'
import useStore from '../store/useStore'

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
        onCommit(parseFloat(local) || 0)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.target.blur()
      }}
      className={className}
    />
  )
}

export default function CategoryTableV2({ category, items, darkMode, editMode, vendors }) {
  const { updateItem, updateVendorData, deleteVendor, updateCategoryVendorName, updateJasaCetakRate, vendorNamesByCategory, printingFeeRate } = useStore()
  const [collapsed, setCollapsed] = useState(false)
  const [editingVendorId, setEditingVendorId] = useState(null)
  const [vendorDraft, setVendorDraft] = useState('')

  const regularItems = items.filter((item) => !item.isJasaCetak)
  const jasaCetakItems = items.filter((item) => item.isJasaCetak)
  const sortedItems = [...regularItems, ...jasaCetakItems]

  const hasPrintable = regularItems.some((item) => item.printable)
  const hasJasaCetak = jasaCetakItems.length > 0
  const missingJasaCetak = hasPrintable && !hasJasaCetak

  const getComputedPrintingFee = (vendorId = 'vendor_1') => (
    hasPrintable ? calculateCategoryPrintingFee(items, vendorId, printingFeeRate) : 0
  )

  const getVendorCategoryTotal = (vendorId) => {
    const baseTotal = vendorId === 'vendor_1'
      ? regularItems.reduce((sum, item) => sum + (item.total ?? 0), 0)
      : regularItems.reduce((sum, item) => sum + (item.vendorData?.[vendorId]?.total ?? 0), 0)

    return baseTotal + getComputedPrintingFee(vendorId)
  }

  const headerTotal = getVendorCategoryTotal('vendor_1')
  const computedPrintingFee = getComputedPrintingFee()

  const rowDark = (idx) => (idx % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750')
  const rowLight = (idx) => (idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60')

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

  const categoryVendorNames = vendorNamesByCategory[category] || {}

  function startVendorRename(vendor) {
    setEditingVendorId(vendor.id)
    setVendorDraft(categoryVendorNames[vendor.id] ?? vendor.name)
  }

  function commitVendorRename(vendor) {
    const nextName = vendorDraft.trim() || vendor.name
    updateCategoryVendorName(category, vendor.id, nextName)
    setEditingVendorId(null)
    setVendorDraft('')
  }

  function cancelVendorRename() {
    setEditingVendorId(null)
    setVendorDraft('')
  }

  return (
    <div
      className={`rounded-xl overflow-hidden border shadow-sm ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      } ${missingJasaCetak ? (darkMode ? 'border-orange-500' : 'border-orange-400') : ''}`}
    >
      <button
        onClick={() => setCollapsed((value) => !value)}
        className={`w-full flex items-center justify-between px-5 py-3 text-left transition-colors ${
          darkMode ? 'bg-gray-700 hover:bg-gray-650' : 'bg-gray-100 hover:bg-gray-200'
        }`}
      >
        <div className="flex items-center gap-2">
          {collapsed ? (
            <ChevronRight className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          ) : (
            <ChevronDown className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          )}
          <span className={`font-semibold text-sm tracking-wide uppercase ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
            {category}
          </span>
          <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
            {items.length}
          </span>
          {hasPrintable && (
            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${darkMode ? 'bg-orange-900 text-orange-300' : 'bg-orange-100 text-orange-700'}`}>
              Jasa Cetak {formatCurrency(computedPrintingFee)} ({formatPrintingFeeRateLabel(printingFeeRate)})
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
          {formatCurrency(headerTotal)}
        </span>
      </button>

      {!collapsed && (
        <div className="overflow-x-auto subtle-scrollbar">
          <table className="w-full min-w-[1120px] table-fixed">
            <colgroup>
              <col style={{ width: '44%' }} />
              <col style={{ width: '8%' }} />
              {vendors?.map((vendor) => (
                <React.Fragment key={`col-${vendor.id}`}>
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '12%' }} />
                </React.Fragment>
              ))}
            </colgroup>
            <thead>
              <tr className={darkMode ? 'bg-gray-750 border-b border-gray-700' : 'bg-gray-50 border-b border-gray-100'}>
                <th className={`px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Name {editMode && <span className="normal-case font-normal opacity-60">/ Category</span>}
                </th>
                <th className={`px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Unit
                </th>
                {vendors?.map((vendor) => (
                  <th key={vendor.id} colSpan={3} className={`px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <div className="flex items-center justify-center gap-2">
                      {editingVendorId === vendor.id ? (
                        <input
                          autoFocus
                          type="text"
                          value={vendorDraft}
                          onChange={(e) => setVendorDraft(e.target.value)}
                          onBlur={() => commitVendorRename(vendor)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              commitVendorRename(vendor)
                            }
                            if (e.key === 'Escape') {
                              e.preventDefault()
                              cancelVendorRename()
                            }
                          }}
                          className={`w-28 rounded border px-2 py-1 text-center text-xs font-semibold normal-case focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                            darkMode
                              ? 'bg-gray-900 border-gray-600 text-gray-200'
                              : 'bg-white border-gray-300 text-gray-700'
                          }`}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => startVendorRename(vendor)}
                          className={`rounded px-1 py-0.5 text-xs font-semibold normal-case tracking-wider transition-colors ${
                            darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                          }`}
                          title="Click to rename vendor"
                        >
                          {categoryVendorNames[vendor.id] ?? vendor.name}
                        </button>
                      )}
                      {vendor.id !== 'vendor_1' && (
                        <button
                          onClick={() => deleteVendor(vendor.id)}
                          title="Delete vendor"
                          className={`p-0.5 rounded hover:bg-red-500/20 transition-colors ${
                            darkMode ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-600'
                          }`}
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
                  <td className="px-4 py-2.5 align-top">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm break-words ${item.isJasaCetak ? (darkMode ? 'text-orange-300' : 'text-orange-700') : (darkMode ? 'text-gray-200' : 'text-gray-800')}`}>
                          {item.name}
                        </span>

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
                            PRINT {item.printable ? '' : '+'}
                          </button>
                        )}

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

                  <td className={`px-4 py-2.5 text-sm align-top ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {!item.isJasaCetak && item.unit}
                  </td>

                  {vendors?.map((vendor) => {
                    const isVendor1 = vendor.id === 'vendor_1'

                    if (item.isJasaCetak) {
                      // For jasa cetak items, calculate fee using the item's own rate
                      const rate = item.jasaCetakRate ?? printingFeeRate
                      const baseTotal = vendor.id === 'vendor_1'
                        ? regularItems.reduce((sum, i) => sum + (i.total ?? 0), 0)
                        : regularItems.reduce((sum, i) => sum + (i.vendorData?.[vendor.id]?.total ?? 0), 0)
                      const computedFee = Math.round(baseTotal * rate)
                      const isFirstVendor = vendor.id === vendors[0]?.id

                      return (
                        <React.Fragment key={`${item.id}-${vendor.id}`}>
                          <td className={`px-4 py-2.5 text-right text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {isFirstVendor && editMode ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  value={String((item.jasaCetakRate * 100).toFixed(2))}
                                  onChange={(e) => {
                                    const percent = parseFloat(e.target.value) || 0
                                    updateJasaCetakRate(item.id, Math.max(percent, 0) / 100)
                                  }}
                                  className={`w-16 rounded border px-2 py-1 text-right text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                                    darkMode
                                      ? 'bg-gray-900 border-gray-600 text-gray-200'
                                      : 'bg-white border-gray-300 text-gray-700'
                                  }`}
                                />
                                <span className="text-xs opacity-70">%</span>
                              </div>
                            ) : isFirstVendor && !editMode ? (
                              `${(item.jasaCetakRate * 100).toFixed(1)}%`
                            ) : null}
                          </td>
                          <td></td>
                          <td className={`px-4 py-2.5 text-right text-sm font-medium ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                            {formatCurrency(computedFee)}
                          </td>
                        </React.Fragment>
                      )
                    }

                    // Regular items
                    const vendorItem = isVendor1
                      ? { quantity: item.quantity, price: item.price, total: item.total }
                      : item.vendorData?.[vendor.id] || { quantity: 0, price: 0, total: 0 }

                    return (
                      <React.Fragment key={`${item.id}-${vendor.id}`}>
                        <td className={`px-4 py-2.5 text-right text-sm font-mono ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {editMode ? (
                            <EditableNumber
                              value={vendorItem.quantity}
                              onCommit={(value) => (
                                isVendor1
                                  ? updateItem(item.id, { quantity: value })
                                  : updateVendorData(item.id, vendor.id, { quantity: value })
                              )}
                              className={inputClass}
                            />
                          ) : (
                            isVendor1 ? (item.rawQty ?? vendorItem.quantity) : vendorItem.quantity
                          )}
                        </td>

                        <td className={`px-4 py-2.5 text-right text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {editMode ? (
                            <EditableNumber
                              value={vendorItem.price ?? 0}
                              onCommit={(value) => (
                                isVendor1
                                  ? updateItem(item.id, { price: value })
                                  : updateVendorData(item.id, vendor.id, { price: value })
                              )}
                              className={inputClass}
                            />
                          ) : (
                            formatCurrency(vendorItem.price)
                          )}
                        </td>

                        <td className={`px-4 py-2.5 text-right text-sm font-medium ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                          {formatCurrency(vendorItem.total)}
                        </td>
                      </React.Fragment>
                    )
                  })}
                </tr>
              ))}
            </tbody>

            <tfoot>
              {missingJasaCetak && (
                <tr className={`border-t ${darkMode ? 'border-orange-700 bg-orange-900/20' : 'border-orange-200 bg-orange-50'}`}>
                  <td colSpan={2} className={`px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                    Computed Jasa Cetak ({formatPrintingFeeRateLabel(printingFeeRate)})
                  </td>
                  {vendors?.map((vendor) => (
                    <React.Fragment key={`jasa-cetak-${vendor.id}`}>
                      <td className={`px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                        -
                      </td>
                      <td className={`px-4 py-2 text-right text-sm font-bold ${darkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                        {formatCurrency(getComputedPrintingFee(vendor.id))}
                      </td>
                      <td className={`px-4 py-2 text-right text-sm font-bold ${darkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                        {formatCurrency(getComputedPrintingFee(vendor.id))}
                      </td>
                    </React.Fragment>
                  ))}
                </tr>
              )}
              <tr className={`border-t ${darkMode ? 'border-gray-600 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
                <td colSpan={2} className={`px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Category Total
                </td>
                {vendors?.map((vendor) => (
                  <React.Fragment key={`subtotal-${vendor.id}`}>
                    <td></td>
                    <td></td>
                    <td className={`px-4 py-2.5 text-right text-sm font-bold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                      {formatCurrency(getVendorCategoryTotal(vendor.id))}
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
