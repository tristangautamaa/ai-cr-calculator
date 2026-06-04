import { useState, useRef, useCallback } from 'react'
import {
  Upload, X, FileText, ImageIcon, Loader2, Download,
  Copy, Plus, Trash2, AlertCircle, CheckCircle2, FileSearch2,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { convertFilesToTable } from '../utils/quotationConverter'

const COLUMNS = [
  { key: 'description', label: 'Description', width: '28%' },
  { key: 'unit', label: 'Unit', width: '8%' },
  { key: 'qty', label: 'Qty', width: '7%' },
  { key: 'unitPrice', label: 'Unit Price', width: '13%' },
  { key: 'total', label: 'Total', width: '13%' },
  { key: 'notes', label: 'Notes', width: '18%' },
]

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function QuotationConverter({ darkMode }) {
  const [files, setFiles] = useState([])
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const fileInputRef = useRef(null)
  const hasApiKey = !!import.meta.env.VITE_GROQ_API_KEY

  const addFiles = useCallback((incoming) => {
    const valid = [...incoming].filter(
      (f) => f.type.startsWith('image/') || f.type === 'application/pdf'
    )
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => `${f.name}-${f.size}`))
      return [...prev, ...valid.filter((f) => !existing.has(`${f.name}-${f.size}`))]
    })
  }, [])

  const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx))

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    addFiles(e.dataTransfer.files)
  }

  const handleConvert = async () => {
    if (!files.length || loading) return
    setLoading(true)
    setError(null)
    setRows([])
    try {
      const extracted = await convertFilesToTable(files)
      setRows(extracted)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const updateRow = (id, field, value) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)))

  const deleteRow = (id) =>
    setRows((prev) => {
      const next = prev.filter((r) => r.id !== id)
      return next.map((r, i) => ({ ...r, no: i + 1 }))
    })

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      { id: `row-new-${Date.now()}`, no: prev.length + 1, description: '', unit: '', qty: '', unitPrice: '', total: '', notes: '' },
    ])

  const exportXlsx = () => {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(
      rows.map((r) => ({
        'No.': r.no,
        Description: r.description,
        Unit: r.unit,
        Qty: r.qty,
        'Unit Price': r.unitPrice,
        Total: r.total,
        Notes: r.notes,
      }))
    )
    XLSX.utils.book_append_sheet(wb, ws, 'Quotation')
    XLSX.writeFile(wb, 'quotation_converted.xlsx')
  }

  const copyTable = () => {
    const header = 'No.\tDescription\tUnit\tQty\tUnit Price\tTotal\tNotes'
    const body = rows
      .map((r) => `${r.no}\t${r.description}\t${r.unit}\t${r.qty}\t${r.unitPrice}\t${r.total}\t${r.notes}`)
      .join('\n')
    navigator.clipboard.writeText(`${header}\n${body}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const card = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
  const text = darkMode ? 'text-gray-200' : 'text-gray-700'
  const subtext = darkMode ? 'text-gray-400' : 'text-gray-500'
  const cellInput = `w-full bg-transparent outline-none text-sm px-1.5 py-0.5 rounded border border-transparent hover:border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-300 transition-colors ${text}`
  const th = `px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400 bg-gray-750' : 'text-gray-500 bg-gray-50'}`

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">

      {/* Page header */}
      <div className={`rounded-2xl px-6 py-4 border shadow-sm ${card}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${darkMode ? 'bg-blue-900/40' : 'bg-blue-50'}`}>
            <FileSearch2 className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
          </div>
          <div>
            <h2 className={`font-semibold ${text}`}>Quotation Converter</h2>
            <p className={`text-sm ${subtext}`}>
              Upload vendor price quotation images or PDFs — AI extracts them into an editable table
            </p>
          </div>
        </div>
      </div>

      {/* API key warning */}
      {!hasApiKey && (
        <div className={`rounded-xl px-5 py-4 border flex items-start gap-3 ${darkMode ? 'bg-amber-900/20 border-amber-700/40' : 'bg-amber-50 border-amber-200'}`}>
          <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className={`text-sm font-medium ${darkMode ? 'text-amber-300' : 'text-amber-800'}`}>
              API key not configured
            </p>
            <p className={`text-xs mt-0.5 ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>
              Create a <code className="font-mono">.env</code> file at the project root with{' '}
              <code className="font-mono">VITE_GROQ_API_KEY=gsk_...</code>, then restart the dev server.
              Get a free key at{' '}
              <span className="font-medium">console.groq.com</span> → "API Keys" → "Create API Key".
            </p>
          </div>
        </div>
      )}

      {/* Upload zone */}
      <div className={`rounded-2xl border shadow-sm ${card}`}>
        <div className="px-6 pt-5 pb-4">
          <div
            className={`relative rounded-xl border-2 border-dashed transition-colors cursor-pointer ${
              dragOver
                ? darkMode ? 'border-blue-400 bg-blue-900/20' : 'border-blue-400 bg-blue-50'
                : darkMode ? 'border-gray-600 hover:border-gray-500' : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center py-10 gap-3 select-none">
              <div className={`p-3 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <Upload className={`w-6 h-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              </div>
              <div className="text-center">
                <p className={`font-medium ${text}`}>Drop quotation files here</p>
                <p className={`text-sm mt-0.5 ${subtext}`}>or click to browse — JPG, PNG, WEBP, PDF</p>
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />

          {/* File list */}
          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              {files.map((file, idx) => (
                <div
                  key={`${file.name}-${file.size}-${idx}`}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${darkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-100 bg-gray-50'}`}
                >
                  {file.type.startsWith('image/') ? (
                    <ImageIcon className={`w-4 h-4 flex-shrink-0 ${darkMode ? 'text-purple-400' : 'text-purple-500'}`} />
                  ) : (
                    <FileText className={`w-4 h-4 flex-shrink-0 ${darkMode ? 'text-red-400' : 'text-red-500'}`} />
                  )}
                  <span className={`text-sm flex-1 truncate ${text}`}>{file.name}</span>
                  <span className={`text-xs ${subtext}`}>{formatBytes(file.size)}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(idx) }}
                    className={`p-1 rounded hover:bg-red-100 hover:text-red-500 transition-colors ${subtext}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Convert button */}
        <div className={`px-6 py-4 border-t flex items-center justify-between ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          <span className={`text-sm ${subtext}`}>
            {files.length === 0 ? 'No files selected' : `${files.length} file${files.length > 1 ? 's' : ''} ready`}
          </span>
          <button
            onClick={handleConvert}
            disabled={!files.length || loading || !hasApiKey}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              !files.length || loading || !hasApiKey
                ? darkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Extracting…
              </>
            ) : (
              <>
                <FileSearch2 className="w-4 h-4" />
                Convert to Table
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className={`rounded-xl px-5 py-4 border flex items-start gap-3 ${darkMode ? 'bg-red-900/20 border-red-700/40' : 'bg-red-50 border-red-200'}`}>
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className={`text-sm font-medium ${darkMode ? 'text-red-300' : 'text-red-700'}`}>Conversion failed</p>
            <p className={`text-xs mt-0.5 font-mono break-all ${darkMode ? 'text-red-400' : 'text-red-600'}`}>{error}</p>
          </div>
        </div>
      )}

      {/* Results table */}
      {rows.length > 0 && (
        <div className={`rounded-2xl border shadow-sm overflow-hidden ${card}`}>
          {/* Toolbar */}
          <div className={`px-5 py-3 flex items-center justify-between gap-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className={`w-4 h-4 ${darkMode ? 'text-green-400' : 'text-green-500'}`} />
              <span className={`font-semibold text-sm ${text}`}>Extracted Table</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${darkMode ? 'bg-green-900/40 text-green-400' : 'bg-green-100 text-green-700'}`}>
                {rows.length} row{rows.length !== 1 ? 's' : ''}
              </span>
              <span className={`text-xs ${subtext}`}>— Click any cell to edit</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={copyTable}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  copied
                    ? 'bg-green-100 text-green-700'
                    : darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={exportXlsx}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                Export XLSX
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <colgroup>
                <col style={{ width: '5%' }} />
                {COLUMNS.map((c) => <col key={c.key} style={{ width: c.width }} />)}
                <col style={{ width: '4%' }} />
              </colgroup>
              <thead>
                <tr className={darkMode ? 'border-b border-gray-700' : 'border-b border-gray-100'}>
                  <th className={`${th} text-center`}>#</th>
                  {COLUMNS.map((c) => (
                    <th key={c.key} className={th}>{c.label}</th>
                  ))}
                  <th className={th} />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className={`border-b transition-colors ${
                      darkMode ? 'border-gray-700/50 hover:bg-gray-700/30' : 'border-gray-50 hover:bg-gray-50'
                    }`}
                  >
                    <td className={`px-3 py-1 text-center text-xs ${subtext}`}>{row.no}</td>
                    {COLUMNS.map((c) => (
                      <td key={c.key} className="px-1.5 py-1">
                        <input
                          type="text"
                          value={row[c.key]}
                          onChange={(e) => updateRow(row.id, c.key, e.target.value)}
                          className={cellInput}
                        />
                      </td>
                    ))}
                    <td className="px-1.5 py-1 text-center">
                      <button
                        onClick={() => deleteRow(row.id)}
                        className={`p-1 rounded hover:bg-red-100 hover:text-red-500 transition-colors ${subtext}`}
                        title="Delete row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className={`px-5 py-3 border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
            <button
              onClick={addRow}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Row
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
