import { Moon, Sun, Printer } from 'lucide-react'
import useStore from '../store/useStore'

export default function Header() {
  const { darkMode, toggleDarkMode } = useStore()

  return (
    <header className="relative overflow-hidden">
      <div
        className="w-full px-6 py-8"
        style={{
          background: 'linear-gradient(135deg, #0C4DA2 0%, #2F80ED 55%, #F2994A 85%, #EB5757 100%)',
        }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-10 bg-white" />
        <div className="absolute top-4 right-24 w-20 h-20 rounded-full opacity-10 bg-white" />
        <div className="absolute -bottom-8 left-1/3 w-32 h-32 rounded-full opacity-5 bg-white" />

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
      </div>
    </header>
  )
}
