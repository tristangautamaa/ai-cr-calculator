import { create } from 'zustand'

const STORAGE_KEY = 'atk-quotations-v1'

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function persist(quotations) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(quotations))
  } catch {}
}

const useATKStore = create((set, get) => ({
  quotations: load(), // [{ id, vendorName, fileName, uploadedAt, items, sourceFiles }]

  // Commit a quotation to both Zustand state AND localStorage.
  // This is the only action that writes to localStorage.
  commitQuotation: (quotation) => {
    const existing = get().quotations.find((q) => q.id === quotation.id)
    let next
    if (existing) {
      next = get().quotations.map((q) => (q.id === quotation.id ? quotation : q))
    } else {
      next = [...get().quotations, quotation].slice(-3) // max 3
    }
    persist(next)
    set({ quotations: next })
  },

  removeQuotation: (id) => {
    const next = get().quotations.filter((q) => q.id !== id)
    persist(next)
    set({ quotations: next })
  },
}))

export default useATKStore
