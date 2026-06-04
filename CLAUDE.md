# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AI CR Calculator** is an internal React app for procurement teams to parse ticket data from K2/PSS systems, calculate printing fees, and conduct vendor price comparisons. It supports multiple data formats and enables exporting results to PDF.

### Common Development Commands

```bash
npm run dev          # Start Vite dev server (localhost:5173)
npm run build        # Build production bundle to dist/
npm run lint         # Run ESLint checks
npm run preview      # Preview production build locally
```

## Architecture & Data Flow

### Multi-Tab Application Structure

The app uses a page-routing pattern in `App.jsx`:
- **Calculator** (default): Main ticket parsing and cost calculation interface
- **ATK Price Checker**: Quotation vault and price verification for specific vendors
- **Quotation Converter**: Cross-format quotation transformation tool

Active tab is managed via `activePage` state in App component.

### State Management (Zustand)

Central store in `store/useStore.js` manages:
- **Raw Data**: `rawInput` (pasted ticket text), `parsedItems` (parsed line items)
- **Vendors**: Multi-vendor comparison data; each item has optional `vendorData` keyed by vendor ID
- **Printing Fee**: Calculated at 10% (configurable rate) of printable items' total
- **UI State**: Dark mode toggle, edit mode for inline row editing
- **Category Mapping**: `vendorNamesByCategory` for per-category vendor name overrides

**Key mutations**:
- `updateItem(id, changes)` — updates a parsed item; auto-recalculates totals if qty/price change
- `updateVendorData(id, vendorId, changes)` — updates vendor-specific pricing for an item
- `updateJasaCetakRate(id, rate)` — updates the Jasa Cetak (printing service) rate
- `addVendor()` — adds a new vendor and initializes data across all items
- `setPrintingFeeRate(rate)` — updates printing fee percentage; recalculates fee for all items

### Parsing Pipeline

Ticket data flows through `src/utils/parser.js`:

1. **Format Detection** (`detectFormat(columns)`): Identifies data structure
   - **Old format** (9 columns): Legacy K2/PSS export
   - **New format** (28+ columns): Current K2/PSS export with multi-vendor pricing

2. **Parsing Logic**:
   - Extracts item name (column 18), quantity (19), unit (20)
   - For new format: reads vendor 1 price (col 23), vendor 2 price (col 25), etc.
   - Cleans item names by stripping leading codes like `[343]`
   - Parses currency using US format (commas = thousands, dot = decimal)

3. **Item Classification** (via `categoryEngine.js`):
   - Assigns category based on keywords and item name patterns
   - Flags items as `printable` (if name contains STICKER/PRINT/CETAK/LABEL/FORM/GRAFIS/FLEXY)
   - Detects `isJasaCetak` items (printing service lines, always have zero quantity/price)

4. **Printing Fee Calculation** (via `printingFeeEngine.js`):
   - Default rate is 10% of printable items' total
   - Printed as a special row with `isPrintingFee: true`
   - Automatically recalculated when any printable item amount changes
   - Rate is customizable via store mutation

### Vendor Comparison Workflow

When multiple vendors are added:
- Each item maintains `vendorData: { vendor_1: {...}, vendor_2: {...}, ... }`
- `ResultTable` / `CategoryTableV2` render side-by-side columns per vendor
- `updateVendorData()` updates individual vendor pricing without touching base item
- Jasa Cetak items always have total = 0 for all vendors (no charge)

### Special Item Types

- **Printing Fee Row** (`isPrintingFee: true`): Auto-calculated, read-only, not editable
- **Jasa Cetak Items** (`isJasaCetak: true`): Printing service lines; always quantity 1, total 0, rate-driven; used to mark which lines are subject to the printing fee calculation
- **Regular Line Items**: Quantity × Price = Total; editable in edit mode

## Key Utilities

| File | Purpose |
|------|---------|
| `parser.js` | Main ticket parser; format detection and column mapping |
| `printingFeeEngine.js` | Printing fee calculation; keyword-based printability detection |
| `categoryEngine.js` | Item classification and category rules |
| `xlsxParser.js` | Parse Excel quotation files for ATK Price Checker |
| `pdfParser.js` | Extract text from PDF quotations |
| `quotationTextParser.js` | Parse plain-text quotation formats |
| `atkMatcher.js` | ATK-specific item matching and lookup logic |
| `quotationConverter.js` | Convert between quotation formats |
| `formatters.js` | UI formatting helpers (currency, percentages, etc.) |

## Important Implementation Details

### Number Parsing
K2/PSS exports use US format (comma = thousands separator, dot = decimal):
- `"5,500.00"` → 5500
- `"55,000.00"` → 55000

The `parseNumber(value)` utility handles this globally.

### Total Recalculation
When `quantity` or `price` changes for any item:
- Base item total is recalculated unless `isJasaCetak` (always 0)
- Printing fee row is automatically synced to the new total
- Vendor-specific totals are calculated independently

### Jasa Cetak Behavior
Items flagged `isJasaCetak` are printing service lines that:
- Have a percentage rate instead of a unit price
- Always show total = 0 (they're fees, not goods)
- Do not contribute to the printing fee base calculation
- Can have their rate edited per-item via `updateJasaCetakRate()`

### Edit Mode
When `editMode: true`:
- Inline cells in `ResultTable` become editable
- Changes flow through `updateItem()` or `updateVendorData()`
- Saving happens on blur or Enter key (component-specific)
- Edit mode toggle is global across all tabs

## Component Hierarchy

- **App**: Tab routing and top-level layout
- **Header**: Tab navigation, dark mode toggle, clear button
- **RawInput**: Textarea for pasting raw ticket data, "Parse Ticket" button
- **ResultTable**: Main results view; switches between SummaryCard and CategoryTableV2 based on mode
- **CategoryTableV2**: Tabular per-category view with vendor columns
- **JasaCetakBreakdownView**: Detailed breakdown of printing service rates
- **ATKPriceChecker**: Vendor quotation vault and price verification
  - **QuotationVault**: XLSX file upload and lookup table
  - **VerificationTable**: Cross-reference table for ATK price validation
- **QuotationConverter**: Format conversion tool for quotations

## Styling

Uses Tailwind CSS 4 with a custom dark mode class (`.dark` on the root div). Most components accept a `darkMode` prop to conditionally apply dark theme classes.
