import { useState } from 'react'
import { ClipboardPaste, Zap, Trash2, AlertCircle, ShieldCheck, ChevronDown, ChevronRight, Info, X } from 'lucide-react'
import useStore from '../store/useStore'
import useATKStore from '../store/useATKStore'
import { parseTicketForATK, crossReference } from '../utils/atkMatcher'
import QuotationVault from './atk/QuotationVault'
import VerificationTable from './atk/VerificationTable'

const PLACEHOLDER = `Paste raw ticket data from K2 / PSS here…

Supports two formats (tab-separated):
• Old format (9–27 cols): name at col 3, article at col 4, qty at col 5, price at col 7
• New format (28+ cols): name at col 18, qty at col 19, unit at col 20, price at col 23

Only ATK GENERAL items are extracted. Non-ATK categories (packaging, printing, etc.) are excluded.`

export default function ATKPriceChecker() {
  const { darkMode } = useStore()
  const { quotations } = useATKStore()

  const [rawInput, setRawInput] = useState('')
  const [results, setResults] = useState(null) // null = not run yet
  const [excluded, setExcluded] = useState([])
  const [showExcluded, setShowExcluded] = useState(false)
  const [error, setError] = useState('')
  const [totalFromTicket, setTotalFromTicket] = useState(0)
  const [vendorCountWarning, setVendorCountWarning] = useState(null) // { dataVendors, loadedVendors }
  const [showTips, setShowTips] = useState(true)

  function dismissTips() {
    setShowTips(false)
  }

  function handleCheck() {
    setError('')
    if (!rawInput.trim()) {
      setError('Paste ticket data first.')
      return
    }

    try {
      const { items: ticketItems, excluded: excludedItems, vendorCount } = parseTicketForATK(rawInput)
      if (ticketItems.length === 0 && excludedItems.length === 0) {
        setError('No parseable rows found. Ensure the data is tab-separated (K2/PSS export).')
        return
      }
      if (ticketItems.length === 0) {
        setExcluded(excludedItems)
        setShowExcluded(true)
        setResults([])
        return
      }

      setTotalFromTicket(ticketItems.length)
      setExcluded(excludedItems)
      setShowExcluded(false)

      // Warn if ticket data contains more vendor prices than loaded quotations
      const loadedCount = quotations.filter(Boolean).length
      if (vendorCount > 1 && vendorCount !== loadedCount) {
        setVendorCountWarning({ dataVendors: vendorCount, loadedVendors: loadedCount })
      } else {
        setVendorCountWarning(null)
      }

      // Cross-reference against all quotations (pad to 3 slots)
      const paddedQuotations = [0, 1, 2].map((i) => quotations[i] ?? null)
      const matched = crossReference(ticketItems, paddedQuotations)
      setResults(matched)
    } catch (err) {
      setError('Parse error: ' + err.message)
    }
  }

  function handleClear() {
    setRawInput('')
    setResults(null)
    setExcluded([])
    setShowExcluded(false)
    setError('')
    setTotalFromTicket(0)
    setVendorCountWarning(null)
  }

  // Only pass actually-loaded quotations to the table (no nulls)
  const loadedQuotations = quotations.filter(Boolean)

  const differsCount = results?.filter((it) => it.status === 'DIFFERS').length ?? 0

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">

      {/* ── Tips banner ───────────────────────────────────────────────────── */}
      {showTips && (
        <div className={`rounded-2xl border p-4 flex gap-3 ${darkMode ? 'bg-blue-900/20 border-blue-700/50' : 'bg-blue-50 border-blue-200'}`}>
          <Info className={`w-5 h-5 shrink-0 mt-0.5 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold mb-2 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
              Before you start — a few reminders
            </p>
            <ul className={`text-xs space-y-2 ${darkMode ? 'text-blue-200/80' : 'text-blue-700'}`}>
              <li className="flex gap-2 items-start">
                <span className="shrink-0 font-bold">1.</span>
                <span><strong>Prices may already be uploaded.</strong> Check the upload date on each vendor card before re-uploading — only refresh if the quoted prices have actually changed.</span>
              </li>
              <li className="flex gap-2 items-start">
                <span className="shrink-0 font-bold">2.</span>
                <span><strong>Ticket data (K2/PSS) is auto-filtered to ATK GENERAL.</strong> If you&apos;re injecting canvassing data instead, pre-filter it to ATK GENERAL items only before pasting.</span>
              </li>
              <li className="flex gap-2 items-start">
                <span className="shrink-0 font-bold">3.</span>
                <span><strong>Match your vendor count.</strong> If your ticket has 2 or 3 vendor price columns, load the same number of vendor quotations (V1, V2, V3) — the top cards must align with the ticket columns.</span>
              </li>
            </ul>
          </div>
          <button
            onClick={dismissTips}
            title="Dismiss"
            className={`shrink-0 p-1 rounded transition-colors ${darkMode ? 'hover:bg-blue-800/60 text-blue-400' : 'hover:bg-blue-100 text-blue-500'}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Panel 1: Quotation Vault ───────────────────────────────────────── */}
      <QuotationVault />

      {/* ── Panel 2: Ticket Input ─────────────────────────────────────────── */}
      <div className={`rounded-2xl shadow-lg overflow-hidden border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <div className={`px-6 py-4 border-b flex items-center gap-2 ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          <ClipboardPaste className={`w-4 h-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
          <h2 className={`font-semibold text-sm ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
            Ticket Data
          </h2>
          <span className={`ml-auto text-xs ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>
            Only ATK GENERAL items are included
          </span>
        </div>

        <div className="p-6 space-y-4">
          <textarea
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder={PLACEHOLDER}
            rows={8}
            className={`w-full p-4 rounded-xl border text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
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

          {vendorCountWarning && (
            <div className={`flex items-start gap-2 p-3 rounded-xl border text-sm ${
              darkMode ? 'bg-amber-900/20 border-amber-700 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700'
            }`}>
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                This ticket data contains <strong>{vendorCountWarning.dataVendors} vendor price columns</strong> but you have{' '}
                <strong>{vendorCountWarning.loadedVendors} quotation{vendorCountWarning.loadedVendors !== 1 ? 's' : ''}</strong> loaded.
                {' '}Load <strong>{vendorCountWarning.dataVendors} vendor quotation{vendorCountWarning.dataVendors !== 1 ? 's' : ''}</strong> (one per vendor) for accurate cross-checking.
              </span>
            </div>
          )}

          {quotations.length === 0 && (
            <div className={`flex items-start gap-2 p-3 rounded-xl border text-sm ${
              darkMode ? 'bg-amber-900/20 border-amber-700 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700'
            }`}>
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              No vendor quotations loaded. Upload at least one XLSX above to enable price cross-checking.
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleCheck}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-md active:scale-95"
              style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}
            >
              <ShieldCheck className="w-4 h-4" />
              Cross-Check ATK Prices
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

      {/* ── Panel 3: Verification Table ───────────────────────────────────── */}
      {results !== null && (
        <div className={`rounded-2xl shadow-lg overflow-hidden border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <div className={`px-6 py-4 border-b flex flex-wrap items-center gap-3 ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
            <ShieldCheck className={`w-4 h-4 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
            <h2 className={`font-semibold text-sm ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
              Price Verification
            </h2>
            <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>
              {results.length} items from ticket · {loadedQuotations.length} vendor quotation{loadedQuotations.length !== 1 ? 's' : ''} loaded
              {excluded.length > 0 && ` · ${excluded.length} excluded`}
            </span>
            {differsCount > 0 && (
              <span className="ml-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
                {differsCount} price discrepanc{differsCount !== 1 ? 'ies' : 'y'} found ⚠
              </span>
            )}
          </div>

          <div className="p-6">
            <VerificationTable
              items={results}
              quotations={loadedQuotations}
              darkMode={darkMode}
            />
          </div>
        </div>
      )}

      {/* ── Panel 4: Excluded items ───────────────────────────────────────── */}
      {results !== null && excluded.length > 0 && (
        <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <button
            onClick={() => setShowExcluded((v) => !v)}
            className={`w-full flex items-center gap-2 px-6 py-4 text-left transition-colors ${
              darkMode ? 'hover:bg-gray-750' : 'hover:bg-gray-50'
            }`}
          >
            {showExcluded
              ? <ChevronDown className="w-4 h-4 text-gray-400" />
              : <ChevronRight className="w-4 h-4 text-gray-400" />}
            <span className={`text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {excluded.length} item{excluded.length !== 1 ? 's' : ''} excluded (non-ATK GENERAL)
            </span>
            <span className={`ml-auto text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              Click to {showExcluded ? 'hide' : 'review'} — verify no items were wrongly classified
            </span>
          </button>

          {showExcluded && (
            <div className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`border-b text-xs font-semibold uppercase tracking-wide ${darkMode ? 'bg-gray-750 border-gray-700 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                      <th className="px-4 py-2.5 text-left">Item Name</th>
                      <th className="px-4 py-2.5 text-left">Article</th>
                      <th className="px-4 py-2.5 text-right">Qty</th>
                      <th className="px-4 py-2.5 text-right">Unit</th>
                      <th className="px-4 py-2.5 text-right">Price</th>
                      <th className="px-4 py-2.5 text-left">Classified As</th>
                    </tr>
                  </thead>
                  <tbody>
                    {excluded.map((item, i) => (
                      <tr
                        key={i}
                        className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}
                      >
                        <td className={`px-4 py-2.5 max-w-xs truncate text-sm ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                          {item.name}
                        </td>
                        <td className={`px-4 py-2.5 font-mono text-xs ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                          {item.articleCode || '—'}
                        </td>
                        <td className={`px-4 py-2.5 text-right font-mono text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {item.qty?.toLocaleString('id-ID')}
                        </td>
                        <td className={`px-4 py-2.5 text-right text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                          {item.unit}
                        </td>
                        <td className={`px-4 py-2.5 text-right font-mono text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {item.price > 0 ? `Rp ${item.price.toLocaleString('id-ID')}` : '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {item.category}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state before first run */}
      {results === null && (
        <div className={`text-center py-14 rounded-2xl border-2 border-dashed ${
          darkMode ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-400'
        }`}>
          <div className="text-5xl mb-4">🛡️</div>
          <p className="font-medium text-sm">Upload quotations, paste ticket data, then click Cross-Check</p>
          <p className="text-xs mt-1">Price discrepancies will be flagged automatically</p>
        </div>
      )}
    </main>
  )
}
