import * as pdfjsLib from 'pdfjs-dist'

// Point the worker at the bundled worker file via Vite's ?url import
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

/**
 * Extract all text content from a PDF File object.
 * Returns the raw text as a single string (pages separated by newlines).
 */
export async function extractTextFromPdf(file) {
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error(`"${file.name}" is not a PDF file. Please upload a .pdf file.`)
  }

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  const pageTexts = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()

    // Group items by their Y position (same row = same line)
    const rowMap = new Map()
    for (const item of content.items) {
      if (!item.str?.trim()) continue
      // Round Y to nearest 2pt to group items on the same visual line
      const y = Math.round(item.transform[5] / 2) * 2
      if (!rowMap.has(y)) rowMap.set(y, [])
      rowMap.get(y).push({ x: item.transform[4], str: item.str })
    }

    // Sort rows top-to-bottom (PDF Y increases upward, so sort descending)
    const sortedRows = [...rowMap.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, items]) => {
        // Sort items left-to-right within each row
        return items
          .sort((a, b) => a.x - b.x)
          .map((i) => i.str)
          .join('\t')
      })

    pageTexts.push(sortedRows.join('\n'))
  }

  return pageTexts.join('\n')
}
