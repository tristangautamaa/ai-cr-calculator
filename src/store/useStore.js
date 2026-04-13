import { create } from 'zustand'
import { calculatePrintingFee } from '../utils/printingFeeEngine'

const useStore = create((set) => ({
  rawInput: '',
  parsedItems: [],
  printingFee: 0,
  darkMode: false,
  editMode: false,
  vendors: [{ id: 'vendor_1', name: 'Vendor 1' }],
  vendorNamesByCategory: {},

  setRawInput: (value) => set({ rawInput: value }),
  setParsedItems: (items) => set({ parsedItems: items }),
  setPrintingFee: (fee) => set({ printingFee: fee }),
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
  toggleEditMode: () => set((state) => ({ editMode: !state.editMode })),
  clearAll: () => set({ rawInput: '', parsedItems: [], printingFee: 0, editMode: false, vendorNamesByCategory: {} }),
  updateCategoryVendorName: (category, vendorId, name) =>
    set((state) => ({
      vendorNamesByCategory: {
        ...state.vendorNamesByCategory,
        [category]: {
          ...state.vendorNamesByCategory[category],
          [vendorId]: name,
        },
      },
    })),

  updateItem: (id, changes) =>
    set((state) => {
      const updatedItems = state.parsedItems.map((item) => {
        if (item.id !== id) return item
        const updated = { ...item, ...changes }
        // Recalculate total whenever qty or price changes (but keep jasa cetak at 0)
        if ('quantity' in changes || 'price' in changes) {
          updated.total = updated.isJasaCetak ? 0 : Math.round((updated.quantity ?? 0) * (updated.price ?? 0))
        }
        return updated
      })
      // Sync the printing fee row total
      const nonFeeItems = updatedItems.filter((i) => !i.isPrintingFee)
      const fee = calculatePrintingFee(nonFeeItems)
      const finalItems = updatedItems.map((item) =>
        item.isPrintingFee ? { ...item, total: fee } : item
      )
      return { parsedItems: finalItems, printingFee: fee }
    }),

  updateVendorData: (id, vendorId, changes) =>
    set((state) => {
      const updatedItems = state.parsedItems.map((item) => {
        if (item.id !== id) return item
        const updated = { ...item }
        if (!updated.vendorData) updated.vendorData = {}
        if (!updated.vendorData[vendorId]) {
          updated.vendorData[vendorId] = { quantity: 0, price: 0, total: 0 }
        }
        const vendorItem = { ...updated.vendorData[vendorId], ...changes }
        // Recalculate vendor total if qty or price changes (but keep jasa cetak at 0)
        if ('quantity' in changes || 'price' in changes) {
          vendorItem.total = updated.isJasaCetak ? 0 : Math.round((vendorItem.quantity ?? 0) * (vendorItem.price ?? 0))
        }
        updated.vendorData[vendorId] = vendorItem
        return updated
      })
      return { parsedItems: updatedItems }
    }),

  addVendor: () =>
    set((state) => {
      const vendorNumber = state.vendors.length + 1
      const newVendor = { id: `vendor_${vendorNumber}`, name: `Vendor ${vendorNumber}` }
      // Initialize new vendor data for all items (copy from vendor_1, but jasa cetak items stay at 0)
      const updatedItems = state.parsedItems.map((item) => {
        if (item.isPrintingFee) return item
        const updated = { ...item }
        if (!updated.vendorData) updated.vendorData = {}
        updated.vendorData[newVendor.id] = {
          quantity: item.quantity ?? 0,
          price: item.isJasaCetak ? null : (item.price ?? 0),
          total: item.isJasaCetak ? 0 : (item.total ?? 0),
        }
        return updated
      })
      return { vendors: [...state.vendors, newVendor], parsedItems: updatedItems }
    }),

  deleteVendor: (vendorId) =>
    set((state) => {
      if (vendorId === 'vendor_1') return state
      // Remove vendor from list
      const updatedVendors = state.vendors.filter((v) => v.id !== vendorId)
      // Remove vendor data from all items
      const updatedItems = state.parsedItems.map((item) => {
        if (!item.vendorData || !item.vendorData[vendorId]) return item
        const updated = { ...item }
        const newVendorData = { ...updated.vendorData }
        delete newVendorData[vendorId]
        updated.vendorData = newVendorData
        return updated
      })
      const updatedVendorNamesByCategory = Object.fromEntries(
        Object.entries(state.vendorNamesByCategory).map(([category, names]) => {
          const nextNames = { ...names }
          delete nextNames[vendorId]
          return [category, nextNames]
        })
      )

      return { vendors: updatedVendors, parsedItems: updatedItems, vendorNamesByCategory: updatedVendorNamesByCategory }
    }),
}))

export default useStore
