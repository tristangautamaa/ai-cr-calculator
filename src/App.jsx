import { useState } from 'react'
import useStore from './store/useStore'
import Header from './components/Header'
import RawInput from './components/RawInput'
import ResultTable from './components/ResultTable'
import ATKPriceChecker from './components/ATKPriceChecker'

export default function App() {
  const { darkMode, parsedItems } = useStore()
  const [activePage, setActivePage] = useState('calculator')

  return (
    <div className={`min-h-screen transition-colors duration-200 ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <Header activePage={activePage} setActivePage={setActivePage} />

      {activePage === 'calculator' && (
        <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
          <RawInput />

          {parsedItems.length > 0 && <ResultTable />}

          {parsedItems.length === 0 && (
            <div className={`text-center py-16 rounded-2xl border-2 border-dashed ${
              darkMode ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-400'
            }`}>
              <div className="text-5xl mb-4">📋</div>
              <p className="font-medium">Paste your ticket data above and click Parse Ticket</p>
              <p className="text-sm mt-1">Supports tab-separated data exported from K2 / PSS</p>
            </div>
          )}
        </main>
      )}

      {activePage === 'atk' && <ATKPriceChecker />}

      <footer className={`text-center py-6 text-xs ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
        Procurement Ticket Calculator — Operation Excellence Internal Tool
      </footer>
    </div>
  )
}
