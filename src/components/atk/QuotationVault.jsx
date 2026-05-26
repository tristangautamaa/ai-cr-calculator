import { useRef, useState, useEffect } from 'react'
import {
  Trash2, Eye, X, FileSpreadsheet, AlertCircle, CheckCircle,
  Save, ChevronDown, ChevronUp, Plus, Edit2, FileText, Loader, GripVertical,
} from 'lucide-react'
import useATKStore from '../../store/useATKStore'
import useStore from '../../store/useStore'
import { parseQuotationFile } from '../../utils/xlsxParser'
import { parseQuotationText } from '../../utils/quotationTextParser'
import { extractTextFromPdf } from '../../utils/pdfParser'
import { crossValidateQuotations } from '../../utils/atkMatcher'
import { formatCurrency } from '../../utils/formatters'

// ── Shared mini modal shell ───────────────────────────────────────────────────

function MiniModal({ children, darkMode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-2xl shadow-2xl border p-6 space-y-4 ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        {children}
      </div>
    </div>
  )
}

// ── Delete confirmation modal ─────────────────────────────────────────────────

function DeleteConfirmModal({ vendorName, onCancel, onConfirm, darkMode }) {
  return (
    <MiniModal darkMode={darkMode}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
          <Trash2 className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Remove Quotation</h3>
          <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            This will clear the saved price reference for this vendor.
          </p>
        </div>
      </div>
      <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        Remove <strong>{vendorName}</strong> from your quotation vault?
      </p>
      <div className="flex gap-3 pt-1">
        <button
          onClick={onCancel}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
            darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors active:scale-95"
        >
          Remove
        </button>
      </div>
    </MiniModal>
  )
}

// ── Preview Modal ─────────────────────────────────────────────────────────────

function dataUrlToBlobUrl(dataUrl) {
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)[1]
  const bytes = atob(base64)
  const ab = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) ab[i] = bytes.charCodeAt(i)
  return URL.createObjectURL(new Blob([ab], { type: mime }))
}

function PreviewModal({ quotation, onClose, darkMode }) {
  const hasPdfs = quotation.pdfDataUrls?.length > 0
  const [tab, setTab] = useState(hasPdfs ? 'pdf' : 'items')
  const [pdfIndex, setPdfIndex] = useState(0)
  const [search, setSearch] = useState('')
  const [blobUrl, setBlobUrl] = useState(null)

  const activePdf = quotation.pdfDataUrls?.[pdfIndex]

  useEffect(() => {
    if (!activePdf?.dataUrl) { setBlobUrl(null); return }
    const url = dataUrlToBlobUrl(activePdf.dataUrl)
    setBlobUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [activePdf?.dataUrl])

  const filtered = search
    ? quotation.items.filter(
        (it) =>
          it.name.toLowerCase().includes(search.toLowerCase()) ||
          (it.articleCode || '').includes(search)
      )
    : quotation.items

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          <div>
            <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{quotation.vendorName}</h3>
            <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {quotation.items.length} items · saved {new Date(quotation.uploadedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab bar */}
        <div className={`flex items-center gap-1 px-5 pt-3 pb-0 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          <button
            onClick={() => setTab('items')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors ${
              tab === 'items'
                ? darkMode ? 'border-blue-400 text-blue-400' : 'border-blue-600 text-blue-600'
                : darkMode ? 'border-transparent text-gray-400 hover:text-gray-300' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Items ({quotation.items.length})
          </button>
          {hasPdfs && (
            <button
              onClick={() => setTab('pdf')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors ${
                tab === 'pdf'
                  ? darkMode ? 'border-red-400 text-red-400' : 'border-red-600 text-red-600'
                  : darkMode ? 'border-transparent text-gray-400 hover:text-gray-300' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Quotation PDF{quotation.pdfDataUrls.length > 1 ? `s (${quotation.pdfDataUrls.length})` : ''}
            </button>
          )}
        </div>

        {/* Tab: Items */}
        {tab === 'items' && (
          <>
            <div className={`px-5 py-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or article code…"
                className={`w-full px-3 py-1.5 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode ? 'bg-gray-900 border-gray-600 text-gray-200 placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400'
                }`}
              />
            </div>
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-sm">
                <thead className={`sticky top-0 border-b ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                  <tr>
                    {['#', 'Article Code', 'Item Name', 'Unit', 'Price'].map((h, i) => (
                      <th key={h} className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide ${i >= 3 ? 'text-right' : 'text-left'} ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item, idx) => (
                    <tr key={idx} className={`border-b ${darkMode ? 'border-gray-700 hover:bg-gray-750' : 'border-gray-50 hover:bg-gray-50'}`}>
                      <td className={`px-3 py-2 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{idx + 1}</td>
                      <td className={`px-3 py-2 font-mono text-xs ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{item.articleCode || '—'}</td>
                      <td className={`px-3 py-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{item.name}</td>
                      <td className={`px-3 py-2 text-right text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{item.unit || '—'}</td>
                      <td className={`px-3 py-2 text-right font-mono ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{formatCurrency(item.price)}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={5} className={`px-3 py-8 text-center text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>No items match.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Tab: PDF viewer */}
        {tab === 'pdf' && (
          <div className="flex flex-col flex-1 min-h-0">
            {quotation.pdfDataUrls.length > 1 && (
              <div className={`flex gap-2 px-5 py-2 border-b overflow-x-auto ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                {quotation.pdfDataUrls.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setPdfIndex(i)}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      pdfIndex === i
                        ? darkMode ? 'bg-red-900/30 border-red-700 text-red-400' : 'bg-red-50 border-red-300 text-red-700'
                        : darkMode ? 'border-gray-600 text-gray-400 hover:bg-gray-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <FileText className="w-3 h-3" />
                    {p.fileName}
                  </button>
                ))}
              </div>
            )}
            <div className="flex-1 min-h-0 p-3">
              {blobUrl ? (
                <iframe
                  key={blobUrl}
                  src={blobUrl}
                  title={activePdf?.fileName}
                  className="w-full h-full rounded-xl"
                  style={{ minHeight: '520px', border: darkMode ? '1px solid #374151' : '1px solid #e5e7eb' }}
                />
              ) : (
                <div className={`flex items-center justify-center h-full text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  PDF not available — re-upload the quotation to enable this view.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Save Confirmation Modal ───────────────────────────────────────────────────

function SaveConfirmModal({ draft, crossVal, onCancel, onConfirm, darkMode }) {
  const totalXlsx = draft.xlsxFiles.reduce((s, f) => s + f.items.length, 0)
  const scannedCount = draft.pdfFiles.filter((f) => f.isScanned).length
  const totalPdf = draft.pdfFiles.reduce((s, f) => s + f.items.length, 0)
  const totalMerged = draft.mergedItems?.length ?? 0
  const mismatchCount = crossVal?.issues?.filter((i) => i.type === 'PRICE_MISMATCH').length ?? 0

  return (
    <MiniModal darkMode={darkMode}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
          <Save className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Confirm Save Quotation</h3>
          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>This will be stored as your price reference.</p>
        </div>
      </div>

      <div className={`rounded-xl p-4 space-y-2 text-sm ${darkMode ? 'bg-gray-750' : 'bg-gray-50'}`}>
        <div className="flex justify-between">
          <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Vendor</span>
          <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{draft.vendorName || '(unnamed)'}</span>
        </div>
        {draft.xlsxFiles.length > 0 && (
          <div className="flex justify-between">
            <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>XLSX files</span>
            <span className={darkMode ? 'text-gray-200' : 'text-gray-700'}>{draft.xlsxFiles.length} file{draft.xlsxFiles.length !== 1 ? 's' : ''} · {totalXlsx} items</span>
          </div>
        )}
        {draft.pdfFiles.length > 0 && (
          <div className="flex justify-between">
            <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>PDF files</span>
            <span className={darkMode ? 'text-gray-200' : 'text-gray-700'}>
              {draft.pdfFiles.length} file{draft.pdfFiles.length !== 1 ? 's' : ''}
              {totalPdf > 0 && ` · ${totalPdf} items`}
              {scannedCount > 0 && ` · ${scannedCount} scanned`}
            </span>
          </div>
        )}
        <div className={`flex justify-between font-semibold border-t pt-2 ${darkMode ? 'border-gray-600 text-white' : 'border-gray-200 text-gray-900'}`}>
          <span>Total unique items</span>
          <span>{totalMerged}</span>
        </div>
      </div>

      {mismatchCount > 0 && (
        <div className={`flex items-start gap-2 p-3 rounded-xl text-sm ${darkMode ? 'bg-red-900/20 border border-red-700 text-red-400' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span><strong>{mismatchCount} price mismatch{mismatchCount !== 1 ? 'es' : ''}</strong> detected between XLSX and PDF. Review before saving.</span>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button onClick={onCancel} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-md active:scale-95"
          style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}
        >
          Confirm & Save
        </button>
      </div>
    </MiniModal>
  )
}

// ── Cross-validation panel ────────────────────────────────────────────────────

function CrossValDisplay({ crossVal, darkMode }) {
  const [expanded, setExpanded] = useState(false)
  if (!crossVal) return null

  const { matched, issues } = crossVal
  const mismatches = issues.filter((i) => i.type === 'PRICE_MISMATCH')
  const missingInPdf = issues.filter((i) => i.type === 'MISSING_IN_TEXT')
  const missingInXlsx = issues.filter((i) => i.type === 'MISSING_IN_XLSX')
  const allGood = mismatches.length === 0

  return (
    <div className={`rounded-xl border text-sm ${
      allGood
        ? darkMode ? 'border-green-700 bg-green-900/20' : 'border-green-200 bg-green-50'
        : darkMode ? 'border-amber-700 bg-amber-900/20' : 'border-amber-200 bg-amber-50'
    }`}>
      <button onClick={() => setExpanded((v) => !v)} className="w-full flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          {allGood
            ? <CheckCircle className="w-4 h-4 text-green-500" />
            : <AlertCircle className="w-4 h-4 text-amber-500" />}
          <span className={`font-semibold text-sm ${allGood ? darkMode ? 'text-green-400' : 'text-green-700' : darkMode ? 'text-amber-400' : 'text-amber-700'}`}>
            {matched} items matched perfectly
            {mismatches.length > 0 && ` · ${mismatches.length} price mismatch${mismatches.length !== 1 ? 'es' : ''}`}
            {missingInPdf.length > 0 && ` · ${missingInPdf.length} not in PDF`}
          </span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {expanded && (
        <div className={`border-t px-4 py-3 space-y-3 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          {mismatches.length > 0 && (
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>Price Mismatches</p>
              <div className="space-y-1.5">
                {mismatches.map((issue, i) => (
                  <div key={i} className={`flex items-center justify-between gap-2 text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span className="truncate">
                      <span className={`font-mono mr-1.5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{issue.articleCode || '—'}</span>
                      {issue.name}
                    </span>
                    <span className="shrink-0 font-mono">
                      <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>XLSX: </span>
                      <span className={`font-semibold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>{formatCurrency(issue.xlsxPrice)}</span>
                      <span className={`mx-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>vs</span>
                      <span className={`font-semibold ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>{formatCurrency(issue.textPrice)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {missingInPdf.length > 0 && (
            <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              <strong className={darkMode ? 'text-gray-400' : 'text-gray-500'}>{missingInPdf.length} XLSX items</strong> not found in PDF — normal if PDF is a partial price list.
            </p>
          )}
          {missingInXlsx.length > 0 && (
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                In PDF but not in XLSX ({missingInXlsx.length})
              </p>
              {missingInXlsx.slice(0, 5).map((issue, i) => (
                <p key={i} className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <span className={`font-mono mr-1 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{issue.articleCode || '—'}</span>
                  {issue.name} — {formatCurrency(issue.textPrice)}
                </p>
              ))}
              {missingInXlsx.length > 5 && <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>…and {missingInXlsx.length - 5} more</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Vendor Draft Editor ───────────────────────────────────────────────────────

function VendorDraftEditor({ slotIndex, initialDraft, existingId, onSaved, onCancel, darkMode }) {
  const colors = ['#2F80ED', '#27AE60', '#F2994A']

  const [vendorName, setVendorName] = useState(initialDraft?.vendorName ?? '')
  const [xlsxFiles, setXlsxFiles] = useState(initialDraft?.files ?? []) // [{fileName, items}]
  const [xlsxErrors, setXlsxErrors] = useState({})                      // {fileName: errMsg}
  const [loadingXlsx, setLoadingXlsx] = useState(false)

  // Each PDF: { fileName, items, isScanned }
  const [pdfFiles, setPdfFiles] = useState([])
  const [pdfErrors, setPdfErrors] = useState({})                        // {fileName: errMsg}
  const [loadingPdf, setLoadingPdf] = useState(false)

  const [crossVal, setCrossVal] = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)

  const xlsxRef = useRef()
  const pdfRef = useRef()

  const xlsxItems = xlsxFiles.flatMap((f) => f.items)
  const pdfItems = pdfFiles.flatMap((f) => f.items)

  // Recompute cross-validation whenever sources change
  useEffect(() => {
    if (xlsxItems.length > 0 && pdfItems.length > 0) {
      setCrossVal(crossValidateQuotations(xlsxItems, pdfItems))
    } else {
      setCrossVal(null)
    }
  }, [xlsxFiles, pdfFiles]) // eslint-disable-line react-hooks/exhaustive-deps

  // Merged items: XLSX + PDF, deduplicated by articleCode or name
  const mergedItems = (() => {
    const seen = new Set()
    const result = []
    for (const item of [...xlsxItems, ...pdfItems]) {
      const key = item.articleCode || item.name
      if (!seen.has(key)) { seen.add(key); result.push(item) }
    }
    return result
  })()

  // ── XLSX upload ──────────────────────────────────────────────────────────────

  async function handleAddXlsx(e) {
    const newFiles = Array.from(e.target.files || [])
    if (!newFiles.length) return
    e.target.value = ''
    setLoadingXlsx(true)

    const newErrors = {}
    const newEntries = []

    for (const file of newFiles) {
      try {
        const { items, vendorNameGuess } = await parseQuotationFile(file)
        if (items.length === 0) throw new Error('No items found. Check that the file has a "Harga" or "Price" column header.')
        newEntries.push({ fileName: file.name, items })
        if (!vendorName && vendorNameGuess) setVendorName(vendorNameGuess)
      } catch (err) {
        newErrors[file.name] = err.message
      }
    }

    setXlsxFiles((prev) => [...prev, ...newEntries])
    setXlsxErrors((prev) => {
      const next = { ...prev, ...newErrors }
      for (const entry of newEntries) delete next[entry.fileName]
      return next
    })
    setLoadingXlsx(false)
  }

  function removeXlsxFile(idx) {
    setXlsxFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  // ── PDF upload ───────────────────────────────────────────────────────────────

  async function handleAddPdf(e) {
    const incoming = Array.from(e.target.files || [])
    if (!incoming.length) return
    e.target.value = ''
    setLoadingPdf(true)

    const newErrors = {}
    const newEntries = []

    for (const file of incoming) {
      try {
        const [text, dataUrl] = await Promise.all([
          extractTextFromPdf(file),
          new Promise((resolve) => {
            const reader = new FileReader()
            reader.onload = (e) => resolve(e.target.result)
            reader.readAsDataURL(file)
          }),
        ])
        const items = parseQuotationText(text)
        newEntries.push({ fileName: file.name, items, isScanned: items.length === 0, dataUrl })
      } catch (err) {
        newErrors[file.name] = err.message
      }
    }

    setPdfFiles((prev) => [...prev, ...newEntries])
    setPdfErrors((prev) => {
      const next = { ...prev, ...newErrors }
      for (const entry of newEntries) delete next[entry.fileName]
      return next
    })
    setLoadingPdf(false)
  }

  function removePdfFile(idx) {
    setPdfFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  function handleConfirm() {
    const quotation = {
      id: existingId ?? `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      vendorName: vendorName.trim() || `Vendor ${slotIndex + 1}`,
      sourceFiles: [
        ...xlsxFiles.map((f) => f.fileName),
        ...pdfFiles.map((f) => f.fileName),
      ],
      uploadedAt: new Date().toISOString(),
      items: mergedItems,
      pdfDataUrls: pdfFiles
        .filter((f) => f.dataUrl)
        .map((f) => ({ fileName: f.fileName, dataUrl: f.dataUrl })),
    }
    onSaved(quotation)
    setShowConfirm(false)
  }

  // Can save if any file has been uploaded (even scanned PDFs with 0 items)
  const canSave = xlsxFiles.length > 0 || pdfFiles.length > 0

  return (
    <>
      <div className={`rounded-xl border p-4 space-y-4 ${darkMode ? 'bg-gray-750 border-gray-600' : 'bg-white border-gray-200'}`}>

        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ background: colors[slotIndex] }}>
            V{slotIndex + 1}
          </div>
          <input
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            placeholder="Vendor name…"
            className={`flex-1 px-2.5 py-1.5 rounded-lg border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              darkMode ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
            }`}
          />
          {onCancel && (
            <button onClick={onCancel} className={`p-1.5 rounded-lg ${darkMode ? 'text-gray-500 hover:bg-gray-700' : 'text-gray-400 hover:bg-gray-100'}`}>
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ── XLSX section ── */}
        <div className="space-y-2">
          <div className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            XLSX Price Files
          </div>

          {xlsxFiles.map((f, idx) => (
            <div key={idx} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <FileSpreadsheet className="w-3.5 h-3.5 text-green-500 shrink-0" />
              <span className={`flex-1 truncate font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{f.fileName}</span>
              <span className={`shrink-0 font-semibold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{f.items.length} items</span>
              <button onClick={() => removeXlsxFile(idx)} className={`shrink-0 p-0.5 rounded ${darkMode ? 'text-gray-600 hover:text-red-400' : 'text-gray-300 hover:text-red-500'}`}>
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {Object.entries(xlsxErrors).map(([fname, err]) => (
            <div key={fname} className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs ${darkMode ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'}`}>
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span><strong>{fname}:</strong> {err}</span>
            </div>
          ))}

          <button
            onClick={() => xlsxRef.current?.click()}
            disabled={loadingXlsx}
            className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg border-2 border-dashed text-xs font-medium transition-colors ${
              darkMode ? 'border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300' : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-600'
            }`}
          >
            {loadingXlsx ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            {loadingXlsx ? 'Parsing XLSX…' : 'Add XLSX file(s)'}
          </button>
          <input ref={xlsxRef} type="file" accept=".xlsx,.xls" multiple className="hidden" onChange={handleAddXlsx} />
        </div>

        {/* ── PDF section ── */}
        <div className="space-y-2">
          <div className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            PDF Quotation(s)
            <span className={`ml-1.5 font-normal normal-case ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              — upload official quotation PDF(s) for cross-check
            </span>
          </div>

          {pdfFiles.map((f, idx) => (
            <div key={idx} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <FileText className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span className={`flex-1 truncate font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{f.fileName}</span>
              {f.isScanned ? (
                <span className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-medium ${darkMode ? 'bg-amber-900/40 text-amber-400' : 'bg-amber-100 text-amber-600'}`}>
                  scanned
                </span>
              ) : (
                <span className={`shrink-0 font-semibold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{f.items.length} items</span>
              )}
              <button onClick={() => removePdfFile(idx)} className={`shrink-0 p-0.5 rounded ${darkMode ? 'text-gray-600 hover:text-red-400' : 'text-gray-300 hover:text-red-500'}`}>
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {Object.entries(pdfErrors).map(([fname, err]) => (
            <div key={fname} className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs ${darkMode ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'}`}>
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span><strong>{fname}:</strong> {err}</span>
            </div>
          ))}

          <button
            onClick={() => pdfRef.current?.click()}
            disabled={loadingPdf}
            className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg border-2 border-dashed text-xs font-medium transition-colors ${
              darkMode ? 'border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300' : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-600'
            }`}
          >
            {loadingPdf ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            {loadingPdf ? 'Extracting PDF…' : 'Add PDF quotation(s)'}
          </button>
          <input ref={pdfRef} type="file" accept=".pdf" multiple className="hidden" onChange={handleAddPdf} />
        </div>

        {/* Cross-validation */}
        {crossVal && <CrossValDisplay crossVal={crossVal} darkMode={darkMode} />}

        {/* Footer: summary + save */}
        <div className="flex items-center justify-between pt-1">
          <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {mergedItems.length > 0 ? `${mergedItems.length} unique items total` : 'Add an XLSX file or PDF to continue'}
          </span>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={!canSave}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all ${
              canSave ? 'hover:shadow-md active:scale-95 cursor-pointer' : 'opacity-40 cursor-not-allowed'
            }`}
            style={{ background: canSave ? 'linear-gradient(135deg, #059669, #10b981)' : '#9ca3af' }}
          >
            <Save className="w-4 h-4" />
            Save Quotation
          </button>
        </div>
      </div>

      {showConfirm && (
        <SaveConfirmModal
          draft={{ vendorName, xlsxFiles, pdfFiles, mergedItems }}
          crossVal={crossVal}
          onCancel={() => setShowConfirm(false)}
          onConfirm={handleConfirm}
          darkMode={darkMode}
        />
      )}
    </>
  )
}

// ── Saved Vendor Card ─────────────────────────────────────────────────────────

function VendorCard({ quotation, slotIndex, darkMode, onPreview, onRemove, onEdit,
  isDragging, isDragOver, onDragStart, onDragOver, onDrop, onDragEnd }) {
  const colors = ['#2F80ED', '#27AE60', '#F2994A']
  const [confirmDelete, setConfirmDelete] = useState(false)

  const uploadDate = new Date(quotation.uploadedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
  const uploadTime = new Date(quotation.uploadedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

  return (
    <>
      <div
        draggable
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        className={`rounded-xl border p-4 flex flex-col gap-3 transition-all select-none cursor-grab active:cursor-grabbing
          ${isDragging ? 'opacity-40 scale-95' : ''}
          ${isDragOver ? 'ring-2 ring-blue-400 ring-offset-1' : ''}
          ${darkMode ? 'bg-gray-750 border-gray-600' : 'bg-white border-gray-200'}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <GripVertical className={`w-4 h-4 shrink-0 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} title="Drag to reorder" />
            <div className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ background: colors[slotIndex] }}>
              V{slotIndex + 1}
            </div>
            <div className="min-w-0">
              <p className={`font-semibold text-sm truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>{quotation.vendorName}</p>
              <p className={`text-xs truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {quotation.sourceFiles?.length ? quotation.sourceFiles.join(', ') : (quotation.fileName ?? 'quotation')}
              </p>
            </div>
          </div>
          <button
            onClick={() => setConfirmDelete(true)}
            className={`shrink-0 p-1 rounded transition-colors ${darkMode ? 'hover:bg-red-900/40 text-gray-500 hover:text-red-400' : 'hover:bg-red-50 text-gray-400 hover:text-red-500'}`}
            title="Remove"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className={`flex gap-3 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <span className={`font-semibold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{quotation.items.length} items</span>
          <span>·</span>
          <span>Saved {uploadDate} {uploadTime}</span>
        </div>

        <div className="flex gap-2">
          <button onClick={onPreview} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            <Eye className="w-3.5 h-3.5" /> Preview
          </button>
          <button onClick={onEdit} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </button>
        </div>
      </div>

      {confirmDelete && (
        <DeleteConfirmModal
          vendorName={quotation.vendorName}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => { onRemove(); setConfirmDelete(false) }}
          darkMode={darkMode}
        />
      )}
    </>
  )
}

// ── Empty slot ────────────────────────────────────────────────────────────────

function EmptySlot({ slotIndex, darkMode, onActivate }) {
  const colors = ['#2F80ED', '#27AE60', '#F2994A']
  return (
    <button
      onClick={onActivate}
      className={`rounded-xl border-2 border-dashed p-6 flex flex-col items-center justify-center gap-2 transition-all w-full ${
        darkMode ? 'border-gray-600 hover:border-gray-500 hover:bg-gray-750 text-gray-500' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-400'
      }`}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold" style={{ background: colors[slotIndex] }}>
        V{slotIndex + 1}
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">Add Vendor {slotIndex + 1}</p>
        <p className="text-xs mt-0.5">Click to open editor</p>
      </div>
    </button>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function QuotationVault() {
  const { darkMode } = useStore()
  const { quotations, commitQuotation, removeQuotation, reorderQuotations } = useATKStore()
  const [previewId, setPreviewId] = useState(null)
  const [editingSlot, setEditingSlot] = useState(null)
  const [draggedSlot, setDraggedSlot] = useState(null)
  const [dragOverSlot, setDragOverSlot] = useState(null)

  const previewQuotation = quotations.find((q) => q.id === previewId)

  function handleSaved(quotation) {
    commitQuotation(quotation)
    setEditingSlot(null)
  }

  return (
    <div className={`rounded-2xl shadow-lg overflow-hidden border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
      <div className={`px-6 py-4 border-b flex items-center gap-2 ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
        <FileSpreadsheet className={`w-4 h-4 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
        <h2 className={`font-semibold text-sm ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Vendor Quotations</h2>
        <span className={`ml-auto text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Up to 3 vendors · XLSX price list + PDF quotation</span>
        {quotations.length > 0 && (
          <div className={`flex items-center gap-1.5 text-xs ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
            <CheckCircle className="w-3.5 h-3.5" />
            {quotations.length} saved
          </div>
        )}
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((slotIdx) => {
            const quotation = quotations[slotIdx]
            const isEditing = editingSlot === slotIdx

            if (isEditing) {
              const initDraft = quotation
                ? {
                    vendorName: quotation.vendorName,
                    files: (quotation.sourceFiles ?? [quotation.fileName]).filter(Boolean).map((fn) => ({
                      fileName: fn,
                      items: quotation.items,
                    })),
                  }
                : null

              return (
                <VendorDraftEditor
                  key={`editor_${slotIdx}`}
                  slotIndex={slotIdx}
                  initialDraft={initDraft}
                  existingId={quotation?.id}
                  onSaved={handleSaved}
                  onCancel={() => setEditingSlot(null)}
                  darkMode={darkMode}
                />
              )
            }

            if (quotation) {
              return (
                <VendorCard
                  key={quotation.id}
                  quotation={quotation}
                  slotIndex={slotIdx}
                  darkMode={darkMode}
                  onPreview={() => setPreviewId(quotation.id)}
                  onRemove={() => removeQuotation(quotation.id)}
                  onEdit={() => setEditingSlot(slotIdx)}
                  isDragging={draggedSlot === slotIdx}
                  isDragOver={dragOverSlot === slotIdx && draggedSlot !== slotIdx}
                  onDragStart={() => setDraggedSlot(slotIdx)}
                  onDragOver={(e) => {
                    e.preventDefault()
                    if (draggedSlot !== null && draggedSlot !== slotIdx) setDragOverSlot(slotIdx)
                  }}
                  onDrop={() => {
                    if (draggedSlot !== null && draggedSlot !== slotIdx) reorderQuotations(draggedSlot, slotIdx)
                    setDraggedSlot(null)
                    setDragOverSlot(null)
                  }}
                  onDragEnd={() => { setDraggedSlot(null); setDragOverSlot(null) }}
                />
              )
            }

            return (
              <EmptySlot
                key={`empty_${slotIdx}`}
                slotIndex={slotIdx}
                darkMode={darkMode}
                onActivate={() => setEditingSlot(slotIdx)}
              />
            )
          })}
        </div>
      </div>

      {previewQuotation && (
        <PreviewModal quotation={previewQuotation} onClose={() => setPreviewId(null)} darkMode={darkMode} />
      )}
    </div>
  )
}
