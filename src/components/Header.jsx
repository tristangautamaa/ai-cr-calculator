import { Moon, Sun, Printer, ShieldCheck, FileSearch2 } from 'lucide-react'
import useStore from '../store/useStore'

export default function Header({ activePage, setActivePage }) {
  const { darkMode, toggleDarkMode } = useStore()

  const tabs = [
    { id: 'calculator', label: 'Jasa Cetak Calculator', icon: Printer },
    { id: 'atk', label: 'ATK Price Checker', icon: ShieldCheck },
    { id: 'quotation-converter', label: 'Quotation Converter', icon: FileSearch2 },
  ]

  return (
    <header className="relative overflow-hidden">
      <div
        className="w-full px-6 pt-8 pb-0"
        style={{
          background: 'linear-gradient(135deg, #0C4DA2 0%, #2F80ED 55%, #F2994A 85%, #EB5757 100%)',
        }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-10 bg-white" />
        <div className="absolute top-4 right-24 w-20 h-20 rounded-full opacity-10 bg-white" />
        <div className="absolute -bottom-8 left-1/3 w-32 h-32 rounded-full opacity-5 bg-white" />

        {/* Title row */}
        <div className="relative max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
              <Printer className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Procurement Ticket Calculator
              </h1>
              <p className="text-blue-100 text-sm mt-0.5">
                Internal Tool — Operation Excellence
              </p>
            </div>
          </div>

          <button
            onClick={toggleDarkMode}
            className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-sm"
            title="Toggle dark mode"
          >
            {darkMode ? (
              <Sun className="w-5 h-5 text-white" />
            ) : (
              <Moon className="w-5 h-5 text-white" />
            )}
          </button>
        </div>

        {/* Tab bar */}
        <div className="relative max-w-6xl mx-auto mt-5 flex items-end gap-1">
          {tabs.map(({ id, label, icon: Icon }) => {
            const active = activePage === id
            return (
              <button
                key={id}
                onClick={() => setActivePage(id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-t-xl text-sm font-semibold transition-all ${
                  active
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            )
          })}
        </div>
      </div>
    </header>
  )
}
