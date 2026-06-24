import { useState, useRef, useEffect, Fragment } from 'react'
import { ChevronDown, ChevronRight, X, RotateCcw, CheckCircle, AlertTriangle, HelpCircle, Minus, FileDown } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCurrency } from '../../utils/formatters'

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  ALL_MATCH: {
    label: 'ALL MATCH ✓',
    bg: { light: 'bg-green-50', dark: 'bg-green-900/20' },
    text: { light: 'text-green-700', dark: 'text-green-400' },
    badge: { light: 'bg-green-100 text-green-700', dark: 'bg-green-900/40 text-green-400' },
    row: { light: 'bg-green-50/50', dark: 'bg-green-900/10' },
  },
  PARTIAL_MATCH: {
    label: 'PARTIAL ~',
    bg: { light: 'bg-amber-50', dark: 'bg-amber-900/20' },
    text: { light: 'text-amber-700', dark: 'text-amber-400' },
    badge: { light: 'bg-amber-100 text-amber-700', dark: 'bg-amber-900/40 text-amber-400' },
    row: { light: 'bg-amber-50/50', dark: 'bg-amber-900/10' },
  },
  DIFFERS: {
    label: 'DIFFERS ⚠',
    bg: { light: 'bg-red-50', dark: 'bg-red-900/20' },
    text: { light: 'text-red-700', dark: 'text-red-400' },
    badge: { light: 'bg-red-100 text-red-700', dark: 'bg-red-900/40 text-red-400' },
    row: { light: 'bg-red-50/40', dark: 'bg-red-900/10' },
  },
  NO_REF: {
    label: 'NOT FOUND',
    bg: { light: 'bg-gray-50', dark: 'bg-gray-700/30' },
    text: { light: 'text-gray-500', dark: 'text-gray-400' },
    badge: { light: 'bg-gray-100 text-gray-500', dark: 'bg-gray-700 text-gray-400' },
    row: { light: '', dark: '' },
  },
}

// ── Live status computation ───────────────────────────────────────────────────

function computeLiveStatus(item, effectiveTicketPriceFn, effectiveQuotPriceFn) {
  const matches = item.quotationMatches ?? []
  const foundIndices = matches.reduce((acc, m, i) => {
    if (m?.found || effectiveQuotPriceFn(item, i) > 0) acc.push(i)
    return acc
  }, [])
  if (foundIndices.length === 0) return 'NO_REF'
  const matchingCount = foundIndices.filter((qi) => {
    const ticketRef = effectiveTicketPriceFn(item, qi)
    const quotRef = effectiveQuotPriceFn(item, qi)
    return Math.abs(quotRef - ticketRef) < 1
  }).length
  if (matchingCount === foundIndices.length) return 'ALL_MATCH'
  if (matchingCount > 0) return 'PARTIAL_MATCH'
  return 'DIFFERS'
}

// ── Editable ticket price cell ────────────────────────────────────────────────

function TicketPriceCell({ itemId, vendorIndex, price, darkMode, onPriceChange, draftValue, onDraftChange, onCommit }) {
  const inputRef = useRef(null)
  const escaping = useRef(false)
  const isEditing = draftValue !== undefined

  useEffect(() => {
    if (isEditing) {
      escaping.current = false
      inputRef.current?.select()
    }
  }, [isEditing])

  function startEdit() {
    onDraftChange(String(price))
  }

  function commit() {
    if (!escaping.current) {
      const val = parseFloat((draftValue || '').replace(/,/g, ''))
      if (!isNaN(val) && val >= 0) onPriceChange(itemId, vendorIndex, val)
    }
    onCommit()
  }

  function handleKey(e) {
    if (e.key === 'Enter') { escaping.current = false; inputRef.current?.blur() }
    if (e.key === 'Escape') { escaping.current = true; inputRef.current?.blur() }
  }

  if (isEditing) {
    return (
      <td className="px-1 py-1.5 text-right">
        <input
          ref={inputRef}
          type="number"
          value={draftValue}
          onChange={(e) => onDraftChange(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKey}
          className={`w-24 text-right text-sm font-mono px-2 py-1 rounded border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
            darkMode
              ? 'bg-gray-700 border-gray-500 text-gray-100'
              : 'bg-white border-gray-300 text-gray-800'
          }`}
        />
      </td>
    )
  }

  return (
    <td
      onClick={startEdit}
      title="Click to edit"
      className={`px-3 py-2.5 text-right text-sm font-mono font-semibold cursor-text select-none rounded transition-colors ${
        darkMode
          ? 'text-gray-200 hover:bg-gray-700'
          : 'text-gray-800 hover:bg-blue-50'
      }`}
    >
      {formatCurrency(price)}
    </td>
  )
}

// ── Vendor quotation price cell (editable) ────────────────────────────────────

function VendorPriceCell({ itemId, vendorIndex, match, ticketPrice, effectiveQuotPrice, darkMode, onQuotationPriceChange, draftValue, onDraftChange, onCommit }) {
  const inputRef = useRef(null)
  const escaping = useRef(false)

  const isManuallyPriced = !match?.found && effectiveQuotPrice > 0
  const hasPrice = match?.found || isManuallyPriced
  const isEditing = draftValue !== undefined

  useEffect(() => {
    if (isEditing) {
      escaping.current = false
      inputRef.current?.select()
    }
  }, [isEditing])

  function startEdit() {
    onDraftChange(String(effectiveQuotPrice || ''))
  }

  function commit() {
    if (!escaping.current) {
      const val = parseFloat((draftValue || '').replace(/,/g, ''))
      if (!isNaN(val) && val >= 0) onQuotationPriceChange(itemId, vendorIndex, val)
    }
    onCommit()
  }

  function handleKey(e) {
    if (e.key === 'Enter') { escaping.current = false; inputRef.current?.blur() }
    if (e.key === 'Escape') { escaping.current = true; inputRef.current?.blur() }
  }

  if (isEditing) {
    return (
      <td className="px-1 py-1.5 text-right">
        <input
          ref={inputRef}
          type="number"
          value={draftValue}
          onChange={(e) => onDraftChange(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKey}
          className={`w-24 text-right text-sm font-mono px-2 py-1 rounded border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
            darkMode
              ? 'bg-gray-700 border-gray-500 text-gray-100'
              : 'bg-white border-gray-300 text-gray-800'
          }`}
        />
      </td>
    )
  }

  if (!hasPrice) {
    return (
      <td
        onClick={startEdit}
        title="Click to fill in price manually"
        className={`px-3 py-2.5 text-center text-sm cursor-text transition-colors ${
          darkMode
            ? 'text-gray-600 hover:bg-gray-700 hover:text-gray-400'
            : 'text-gray-300 hover:bg-blue-50 hover:text-gray-500'
        }`}
      >
        —
      </td>
    )
  }

  const priceMatch = Math.abs(effectiveQuotPrice - ticketPrice) < 1

  return (
    <td
      onClick={startEdit}
      title="Click to edit"
      className={`px-3 py-2.5 text-right text-sm font-mono font-medium cursor-text transition-colors ${
        priceMatch
          ? darkMode ? 'text-green-400 hover:bg-green-900/20' : 'text-green-600 hover:bg-green-50'
          : darkMode ? 'text-red-400 hover:bg-red-900/20' : 'text-red-600 hover:bg-red-50'
      }`}
    >
      {formatCurrency(effectiveQuotPrice)}
      {isManuallyPriced && (
        <span className={`ml-1 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>*</span>
      )}
    </td>
  )
}

// ── Expanded match detail row ─────────────────────────────────────────────────

function ExpandedDetail({ item, quotations, effectiveTicketPriceFn, effectiveQuotPriceFn, darkMode }) {
  const themeBase = darkMode ? 'bg-gray-750 border-gray-700' : 'bg-blue-50/60 border-gray-200'
  const colors = ['text-blue-500', 'text-green-500', 'text-amber-500']

  return (
    <tr>
      <td colSpan={100} className={`border-b ${themeBase} px-0`}>
        <div className="pl-16 pr-6 py-3 space-y-2">
          {quotations.map((quotation, qi) => {
            const match = item.quotationMatches?.[qi]
            if (!match) return null
            const ticketRef = effectiveTicketPriceFn(item, qi)
            const quotRef = effectiveQuotPriceFn(item, qi)

            return (
              <div key={quotation.id} className="flex items-start gap-3">
                <span className={`shrink-0 text-xs font-bold mt-0.5 ${colors[qi]}`}>
                  V{qi + 1}
                </span>
                {match.found ? (
                  <div className="min-w-0">
                    <p className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {match.matchedRow?.rawDesc || match.matchedRow?.name}
                    </p>
                    <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      Matched via <span className={`font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{match.matchSource}</span>
                      {' · '}
                      Price: <span className={`font-semibold font-mono ${
                        Math.abs(quotRef - ticketRef) < 1
                          ? darkMode ? 'text-green-400' : 'text-green-600'
                          : darkMode ? 'text-red-400' : 'text-red-600'
                      }`}>{formatCurrency(quotRef)}</span>
                      {' · '}{match.unit || '—'}
                    </p>
                  </div>
                ) : (
                  <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    Not found in {quotation.vendorName}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </td>
    </tr>
  )
}

// ── Main table row ────────────────────────────────────────────────────────────

function ItemRow({ item, rowNumber, quotations, hasVendorPrices, darkMode, onRemove, expanded, onToggle, effectiveTicketPriceFn, effectiveQuotPriceFn, onPriceChange, onQuotationPriceChange,
  ticketDrafts, onTicketDraftChange, onTicketDraftCommit, quotDrafts, onQuotDraftChange, onQuotDraftCommit }) {
  const liveStatus = computeLiveStatus(item, effectiveTicketPriceFn, effectiveQuotPriceFn)
  const cfg = STATUS_CONFIG[liveStatus] ?? STATUS_CONFIG.NO_REF
  const mode = darkMode ? 'dark' : 'light'

  return (
    <>
      <tr
        onClick={onToggle}
        className={`cursor-pointer border-b transition-colors ${
          darkMode ? 'border-gray-700 hover:bg-gray-750' : 'border-gray-100 hover:bg-gray-50'
        } ${cfg.row[mode]}`}
      >
        {/* Expand toggle */}
        <td className={`pl-3 pr-1 py-2.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          {expanded
            ? <ChevronDown className="w-3.5 h-3.5" />
            : <ChevronRight className="w-3.5 h-3.5" />}
        </td>

        {/* # */}
        <td className={`px-2 py-2.5 text-xs text-right ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          {rowNumber}
        </td>

        {/* Article code */}
        <td className={`px-3 py-2.5 font-mono text-xs ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
          {item.articleCode || '—'}
        </td>

        {/* Item name */}
        <td className={`px-3 py-2.5 text-sm max-w-xs ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
          <div className="flex flex-col">
            <span className="truncate">{item.name}</span>
            <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{item.category}</span>
          </div>
        </td>

        {/* Qty */}
        <td className={`px-3 py-2.5 text-right text-sm font-mono ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          {item.qty?.toLocaleString('id-ID')}
        </td>

        {/* Unit */}
        <td className={`px-3 py-2.5 text-right text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {item.unit}
        </td>

        {hasVendorPrices ? (
          <>
            {quotations.map((q, qi) => (
              <TicketPriceCell
                key={`t_${q.id}`}
                itemId={item.id}
                vendorIndex={qi}
                price={effectiveTicketPriceFn(item, qi)}
                darkMode={darkMode}
                onPriceChange={onPriceChange}
                draftValue={ticketDrafts[`${item.id}_${qi}`]}
                onDraftChange={(val) => onTicketDraftChange(`${item.id}_${qi}`, val)}
                onCommit={() => onTicketDraftCommit(`${item.id}_${qi}`)}
              />
            ))}
            {quotations.map((q, qi) => (
              <VendorPriceCell
                key={`qv_${q.id}`}
                itemId={item.id}
                vendorIndex={qi}
                match={item.quotationMatches?.[qi]}
                ticketPrice={effectiveTicketPriceFn(item, qi)}
                effectiveQuotPrice={effectiveQuotPriceFn(item, qi)}
                darkMode={darkMode}
                onQuotationPriceChange={onQuotationPriceChange}
                draftValue={quotDrafts[`${item.id}_${qi}`]}
                onDraftChange={(val) => onQuotDraftChange(`${item.id}_${qi}`, val)}
                onCommit={() => onQuotDraftCommit(`${item.id}_${qi}`)}
              />
            ))}
          </>
        ) : (
          <>
            <TicketPriceCell
              itemId={item.id}
              vendorIndex={0}
              price={effectiveTicketPriceFn(item, 0)}
              darkMode={darkMode}
              onPriceChange={onPriceChange}
              draftValue={ticketDrafts[`${item.id}_0`]}
              onDraftChange={(val) => onTicketDraftChange(`${item.id}_0`, val)}
              onCommit={() => onTicketDraftCommit(`${item.id}_0`)}
            />
            {quotations.map((q, qi) => (
              <VendorPriceCell
                key={q.id}
                itemId={item.id}
                vendorIndex={qi}
                match={item.quotationMatches?.[qi]}
                ticketPrice={effectiveTicketPriceFn(item, qi)}
                effectiveQuotPrice={effectiveQuotPriceFn(item, qi)}
                darkMode={darkMode}
                onQuotationPriceChange={onQuotationPriceChange}
                draftValue={quotDrafts[`${item.id}_${qi}`]}
                onDraftChange={(val) => onQuotDraftChange(`${item.id}_${qi}`, val)}
                onCommit={() => onQuotDraftCommit(`${item.id}_${qi}`)}
              />
            ))}
          </>
        )}

        {/* Status */}
        <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap ${cfg.badge[mode]}`}>
            {cfg.label}
          </span>
        </td>

        {/* Remove */}
        <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onRemove}
            title="Remove from ATK list"
            className={`p-1 rounded transition-colors ${
              darkMode
                ? 'text-gray-600 hover:text-red-400 hover:bg-red-900/30'
                : 'text-gray-300 hover:text-red-500 hover:bg-red-50'
            }`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </td>
      </tr>

      {expanded && (
        <ExpandedDetail
          item={item}
          quotations={quotations}
          effectiveTicketPriceFn={effectiveTicketPriceFn}
          effectiveQuotPriceFn={effectiveQuotPriceFn}
          darkMode={darkMode}
        />
      )}
    </>
  )
}

// ── Summary bar ───────────────────────────────────────────────────────────────

function SummaryBar({ items, removedCount, onShowRemoved, onGeneratePDF, darkMode, effectiveTicketPriceFn, effectiveQuotPriceFn }) {
  const counts = items.reduce((acc, it) => {
    const status = computeLiveStatus(it, effectiveTicketPriceFn, effectiveQuotPriceFn)
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {})

  return (
    <div className={`flex flex-wrap items-center gap-4 px-4 py-3 rounded-xl text-sm ${darkMode ? 'bg-gray-750' : 'bg-gray-50'}`}>
      <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        {items.length} items
      </span>
      {counts.ALL_MATCH > 0 && (
        <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs">
          {counts.ALL_MATCH} match
          <CheckCircle className="w-3.5 h-3.5" />
        </span>
      )}
      {counts.PARTIAL_MATCH > 0 && (
        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs">
          {counts.PARTIAL_MATCH} partial
          <Minus className="w-3.5 h-3.5" />
        </span>
      )}
      {counts.DIFFERS > 0 && (
        <span className="flex items-center gap-1 text-red-600 dark:text-red-400 text-xs font-semibold">
          {counts.DIFFERS} PRICE DIFFERS
          <AlertTriangle className="w-3.5 h-3.5" />
        </span>
      )}
      {counts.NO_REF > 0 && (
        <span className="flex items-center gap-1 text-xs" style={{ color: darkMode ? '#6b7280' : '#9ca3af' }}>
          {counts.NO_REF} not found
        </span>
      )}

      <div className="ml-auto flex items-center gap-2">
        {removedCount > 0 && (
          <button
            onClick={onShowRemoved}
            className={`flex items-center gap-1 text-xs font-medium ${
              darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <RotateCcw className="w-3 h-3" />
            {removedCount} excluded — click to restore
          </button>
        )}
        <button
          onClick={onGeneratePDF}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            darkMode
              ? 'bg-blue-600 hover:bg-blue-500 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          <FileDown className="w-3.5 h-3.5" />
          Generate Summary
        </button>
      </div>
    </div>
  )
}

// ── Main Export ───────────────────────────────────────────────────────────────

export default function VerificationTable({ items, quotations, darkMode }) {
  const [removedIds, setRemovedIds] = useState(new Set())
  const [expandedId, setExpandedId] = useState(null)
  const [showRemoved, setShowRemoved] = useState(false)
  const [priceOverrides, setPriceOverrides] = useState({})
  const [quotationPriceOverrides, setQuotationPriceOverrides] = useState({})
  const [ticketDrafts, setTicketDrafts] = useState({})
  const [quotDrafts, setQuotDrafts] = useState({})

  const hasVendorPrices = items?.some((it) => it.vendorPrices) ?? false

  function handlePriceChange(itemId, vendorIndex, newPrice) {
    setPriceOverrides((prev) => ({ ...prev, [`${itemId}_${vendorIndex}`]: newPrice }))
  }

  function handleQuotationPriceChange(itemId, vendorIndex, newPrice) {
    setQuotationPriceOverrides((prev) => ({ ...prev, [`${itemId}_${vendorIndex}`]: newPrice }))
  }

  function handleTicketDraftChange(key, val) {
    setTicketDrafts((prev) => ({ ...prev, [key]: val }))
  }

  function handleTicketDraftCommit(key) {
    setTicketDrafts((prev) => { const n = { ...prev }; delete n[key]; return n })
  }

  function handleQuotDraftChange(key, val) {
    setQuotDrafts((prev) => ({ ...prev, [key]: val }))
  }

  function handleQuotDraftCommit(key) {
    setQuotDrafts((prev) => { const n = { ...prev }; delete n[key]; return n })
  }

  function getEffectiveTicketPrice(item, vendorIndex) {
    const key = `${item.id}_${vendorIndex}`
    if (priceOverrides[key] !== undefined) return priceOverrides[key]
    return item.vendorPrices?.[vendorIndex] ?? item.price
  }

  function getEffectiveQuotationPrice(item, vendorIndex) {
    const key = `${item.id}_${vendorIndex}`
    if (quotationPriceOverrides[key] !== undefined) return quotationPriceOverrides[key]
    return item.quotationMatches?.[vendorIndex]?.price ?? 0
  }

  if (!items || items.length === 0) {
    return (
      <div className={`text-center py-12 rounded-2xl border-2 border-dashed ${
        darkMode ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-400'
      }`}>
        <div className="text-4xl mb-3">🔍</div>
        <p className="font-medium text-sm">No items to verify</p>
        <p className="text-xs mt-1">Paste ticket data above and click Cross-Check</p>
      </div>
    )
  }

  const activeItems = items.filter((it) => !removedIds.has(it.id))
  const removedItems = items.filter((it) => removedIds.has(it.id))

  function removeItem(id) {
    setRemovedIds((prev) => new Set([...prev, id]))
    if (expandedId === id) setExpandedId(null)
  }

  function restoreItem(id) {
    setRemovedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  function generatePDF() {
    const doc = new jsPDF({ orientation: 'landscape' })

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('ATK Price Summary', 14, 16)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Generated: ${new Date().toLocaleString('id-ID')}`, 14, 22)

    // Ticket price indices: one per vendor when ticket carries vendor prices, else a single column
    const ticketIndices = hasVendorPrices ? quotations.map((_, i) => i) : [0]
    const qtyOf = (item) => Number(item.qty) || 0
    const isQuotPriced = (item, i) =>
      (item.quotationMatches?.[i]?.found ?? false) || getEffectiveQuotationPrice(item, i) > 0

    // Each vendor contributes an adjacent Unit + Total (Qty × Unit) pair
    const ticketColDefs = ticketIndices.flatMap((i) => [
      { header: hasVendorPrices ? `Ticket V${i + 1}` : 'Ticket', dataKey: `tv${i}` },
      { header: hasVendorPrices ? `Ticket V${i + 1} Total` : 'Ticket Total', dataKey: `tvt${i}` },
    ])

    const quotColDefs = quotations.flatMap((q, i) => [
      { header: q.vendorName.toUpperCase(), dataKey: `qv${i}` },
      { header: `${q.vendorName.toUpperCase()} Total`, dataKey: `qvt${i}` },
    ])

    const columns = [
      { header: 'ARTICLE', dataKey: 'article' },
      { header: 'ITEM DESCRIPTION', dataKey: 'name' },
      { header: 'QTY', dataKey: 'qty' },
      { header: 'UNIT', dataKey: 'unit' },
      ...ticketColDefs,
      ...quotColDefs,
    ]

    const rows = activeItems.map((item) => {
      const qty = qtyOf(item)

      const ticketCols = {}
      ticketIndices.forEach((i) => {
        const unit = getEffectiveTicketPrice(item, i)
        ticketCols[`tv${i}`] = formatCurrency(unit)
        ticketCols[`tvt${i}`] = formatCurrency(unit * qty)
      })

      const quotCols = {}
      quotations.forEach((_, i) => {
        const priced = isQuotPriced(item, i)
        const unit = getEffectiveQuotationPrice(item, i)
        quotCols[`qv${i}`] = priced ? formatCurrency(unit) : '—'
        quotCols[`qvt${i}`] = priced ? formatCurrency(unit * qty) : '—'
      })

      return {
        article: item.articleCode ?? '—',
        name: item.name,
        qty: qty.toLocaleString('id-ID'),
        unit: item.unit ?? '',
        ...ticketCols,
        ...quotCols,
      }
    })

    // Grand total sums line totals (Qty × Unit); unit columns are left blank
    const totalRow = { article: 'GRAND TOTAL', name: '', qty: '', unit: '' }
    ticketIndices.forEach((i) => {
      totalRow[`tv${i}`] = ''
      totalRow[`tvt${i}`] = formatCurrency(
        activeItems.reduce((sum, item) => sum + getEffectiveTicketPrice(item, i) * qtyOf(item), 0)
      )
    })
    quotations.forEach((_, i) => {
      totalRow[`qv${i}`] = ''
      totalRow[`qvt${i}`] = formatCurrency(
        activeItems.reduce(
          (sum, item) => sum + (isQuotPriced(item, i) ? getEffectiveQuotationPrice(item, i) * qtyOf(item) : 0),
          0
        )
      )
    })

    // Right-align all price cells; bold the Total columns to set them apart
    const columnStyles = {
      article: { fontStyle: 'bold', cellWidth: 22 },
      name: { cellWidth: 55 },
      qty: { halign: 'right', cellWidth: 12 },
      unit: { halign: 'center', cellWidth: 12 },
    }
    columns.forEach((c) => {
      if (c.dataKey.startsWith('tvt') || c.dataKey.startsWith('qvt')) {
        columnStyles[c.dataKey] = { halign: 'right', fontStyle: 'bold', textColor: [15, 40, 120] }
      } else if (c.dataKey.startsWith('tv') || c.dataKey.startsWith('qv')) {
        columnStyles[c.dataKey] = { halign: 'right', textColor: [90, 90, 90] }
      }
    })

    autoTable(doc, {
      startY: 28,
      columns,
      body: rows,
      foot: [totalRow],
      showFoot: 'lastPage',
      styles: { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak', valign: 'middle' },
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold', fontSize: 7, halign: 'center' },
      footStyles: { fillColor: [15, 40, 120], textColor: 255, fontStyle: 'bold', fontSize: 8, halign: 'right' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles,
    })

    // Note below the grand total
    const finalY = doc.lastAutoTable?.finalY ?? 28
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(120, 120, 120)
    doc.text('* Grand total is not inclusive of tax.', 14, finalY + 7)

    doc.save('summary.pdf')
  }

  const thBase = `px-3 py-2.5 text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`
  const vColors = ['text-blue-500', 'text-green-500', 'text-amber-500']

  return (
    <div className="space-y-3">
      <SummaryBar
        items={activeItems}
        removedCount={removedItems.length}
        onShowRemoved={() => setShowRemoved((v) => !v)}
        onGeneratePDF={generatePDF}
        darkMode={darkMode}
        effectiveTicketPriceFn={getEffectiveTicketPrice}
        effectiveQuotPriceFn={getEffectiveQuotationPrice}
      />

      {/* Legend */}
      <div className={`flex flex-wrap gap-4 text-xs px-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
        <span>Click any row to see match detail</span>
        <span className="flex items-center gap-1">
          <span className={`text-xs font-mono px-1 py-0.5 rounded ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-500'}`}>Rp 72.000</span>
          Any price cell — click to edit
        </span>
        <span>— (dash cells) — click to fill in manually</span>
        <span className={`${darkMode ? 'text-green-400' : 'text-green-600'}`}>■ Green = matches ticket price</span>
        <span className={`${darkMode ? 'text-red-400' : 'text-red-600'}`}>■ Red = differs from ticket price</span>
      </div>

      {/* Main table */}
      <div className={`rounded-2xl border overflow-hidden shadow-sm ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b ${darkMode ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <th className="w-6" />
                <th className={`${thBase} text-right w-8`}>#</th>
                <th className={`${thBase} text-left`}>Article</th>
                <th className={`${thBase} text-left`}>Item Name</th>
                <th className={`${thBase} text-right`}>Qty</th>
                <th className={`${thBase} text-right`}>Unit</th>
                {hasVendorPrices ? (
                  <>
                    {quotations.map((q, qi) => (
                      <th key={`th_t_${q.id}`} className={`${thBase} text-center ${vColors[qi]}`}>
                        Ticket V{qi + 1}
                      </th>
                    ))}
                    {quotations.map((q, qi) => (
                      <th key={`th_q_${q.id}`} className={`${thBase} text-center ${vColors[qi]}`}>
                        V{qi + 1} {q.vendorName}
                      </th>
                    ))}
                  </>
                ) : (
                  <>
                    <th className={`${thBase} text-center`}>Ticket Price</th>
                    {quotations.map((q, qi) => (
                      <th key={q.id} className={`${thBase} text-center ${vColors[qi]}`}>
                        V{qi + 1} {q.vendorName}
                      </th>
                    ))}
                  </>
                )}
                <th className={`${thBase} text-left`}>Status</th>
                <th className={`${thBase} text-right w-8`} />
              </tr>
            </thead>
            <tbody>
              {activeItems.map((item, idx) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  rowNumber={idx + 1}
                  quotations={quotations}
                  hasVendorPrices={hasVendorPrices}
                  darkMode={darkMode}
                  onRemove={() => removeItem(item.id)}
                  expanded={expandedId === item.id}
                  onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  effectiveTicketPriceFn={getEffectiveTicketPrice}
                  effectiveQuotPriceFn={getEffectiveQuotationPrice}
                  onPriceChange={handlePriceChange}
                  onQuotationPriceChange={handleQuotationPriceChange}
                  ticketDrafts={ticketDrafts}
                  onTicketDraftChange={handleTicketDraftChange}
                  onTicketDraftCommit={handleTicketDraftCommit}
                  quotDrafts={quotDrafts}
                  onQuotDraftChange={handleQuotDraftChange}
                  onQuotDraftCommit={handleQuotDraftCommit}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Removed items */}
      {showRemoved && removedItems.length > 0 && (
        <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className={`px-4 py-3 border-b text-sm font-medium ${darkMode ? 'border-gray-700 text-gray-400' : 'border-gray-100 text-gray-500'}`}>
            Excluded items — click ↩ to restore
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {removedItems.map((item) => (
              <div key={item.id} className={`flex items-center gap-3 px-4 py-2.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                <span className="text-xs font-mono">{item.articleCode || '—'}</span>
                <span className="text-sm flex-1 truncate">{item.name}</span>
                <button
                  onClick={() => restoreItem(item.id)}
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                    darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                  }`}
                >
                  <RotateCcw className="w-3 h-3" />
                  Restore
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
