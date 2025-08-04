import React, { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { Menu, X, Home, Search, Compass, Archive, Radio } from "lucide-react"
import { translations, languages } from "../data/i18n"
import { useLanguage } from "./LanguageContext"

const MobileNavbar: React.FC = () => {
  const location = useLocation()
  const { language, setLanguage } = useLanguage()
  const t = translations[language] || translations.en

  const [menuOpen, setMenuOpen] = useState(false)

  const navItems = [
    { path: "/", label: t.nav_home, icon: Home },
    { path: "/search", label: t.nav_search, icon: Search },
    { path: "/discover", label: t.nav_discover, icon: Compass },
    { path: "/live-tv", label: t.nav_live_tv, icon: Radio },
    { path: "/vault", label: t.nav_vault, icon: Archive },
  ]

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path)

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang)
    setMenuOpen(false)
  }

  return (
    <nav className="md:hidden sticky top-0 z-50 bg-white dark:bg-gray-950 shadow-sm border-b border-pink-200 dark:border-gray-700">
      <div className="flex items-center justify-between px-4 py-3" style={{ minHeight: 48 }}>
        {/* Vertically centered by flex and minHeight */}
        <Link to="/" className="text-xl font-bold text-pink-500 flex items-center h-full">
          LunaStream
        </Link>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="text-gray-700 dark:text-white"
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {menuOpen && (
        <div className="px-4 pb-3 space-y-2">
          {navItems.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                isActive(path)
                  ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white"
                  : "text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </Link>
          ))}

          {/* Language Selector */}
          <div className="mt-4 pt-2 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Language</p>
            <div className="flex flex-wrap gap-2">
              {languages.map(({ name, shortname, flag }) => (
                <button
                  key={shortname}
                  onClick={() => handleLanguageChange(shortname)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    language === shortname
                      ? "bg-pink-500 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-pink-100 dark:hover:bg-gray-700"
                  }`}
                >
                  <span className="text-base">{flag}</span>
                  <span>{name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

export default MobileNavbar
