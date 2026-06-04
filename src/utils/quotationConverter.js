import * as pdfjsLib from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

async function imageFileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]
      resolve({ base64, mediaType: file.type || 'image/jpeg' })
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function pdfToBase64Images(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const images = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: 1.5 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
    const base64 = canvas.toDataURL('image/jpeg', 0.75).split(',')[1]
    images.push({ base64, mediaType: 'image/jpeg' })
  }

  return images
}

const PROMPT = `Extract the price quotation table from these images. The images may be scanned, photographed, handwritten, or printed vendor quotations.

Return ONLY a valid JSON array (no markdown, no extra text) where each element has exactly these keys:
- "no": row number as integer
- "description": item name or description as string
- "unit": unit of measurement (pcs, rim, pack, lembar, etc.) as string or null
- "qty": quantity as number or null
- "unitPrice": unit price as a plain number (no currency symbols, no separators) or null
- "total": total price as a plain number or null
- "notes": any remarks as string or null

Rules:
- Merge content from multiple pages/images into one list
- Skip header rows, subtotal rows, grand total rows, and non-item rows
- Use null for any field that is not visible or not applicable`

export async function convertFilesToTable(files) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY
  if (!apiKey) throw new Error('VITE_GROQ_API_KEY is not set in .env')

  const allImages = []
  for (const file of files) {
    if (file.type === 'application/pdf') {
      allImages.push(...(await pdfToBase64Images(file)))
    } else {
      allImages.push(await imageFileToBase64(file))
    }
  }

  const content = [
    ...allImages.map(({ base64, mediaType }) => ({
      type: 'image_url',
      image_url: { url: `data:${mediaType};base64,${base64}` },
    })),
    { type: 'text', text: PROMPT },
  ]

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [{ role: 'user', content }],
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    let message = `API error ${response.status}`
    try {
      const err = JSON.parse(body)
      message = err.error?.message || err.message || message
    } catch { /* use status fallback */ }
    throw new Error(message)
  }

  const data = await response.json()
  const text = data.choices?.[0]?.message?.content || ''

  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('Could not find JSON in API response. Raw: ' + text.slice(0, 300))

  const parsed = JSON.parse(jsonMatch[0])

  return parsed.map((row, idx) => ({
    id: `row-${Date.now()}-${idx}`,
    no: idx + 1,
    description: row.description ?? '',
    unit: row.unit ?? '',
    qty: row.qty ?? '',
    unitPrice: row.unitPrice ?? '',
    total: row.total ?? '',
    notes: row.notes ?? '',
  }))
}
